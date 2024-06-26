// deno-lint-ignore-file no-explicit-any
import { open, write, fsync, close, chown as _chown, rename } from "node:fs";
import { resolve as _resolve } from "node:path";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { freemem } from "node:os";
//
import {
  type Msg,
  type Msgs,
  type SchemaColumnOptions,
  type Xtree_flag,
  type columnValidationType,
  type fTable,
  type iTable,
} from "./types.js";
import { Utils, ExaError, ExaType } from "./classes.js";

export const loadLog = async (filePath: string) => {
  try {
    const data = await readFile(filePath);
    return (Utils.packr.decode(data) || []) as Msgs;
  } catch (_error) {
    // console.log({ filePath, error });
    return [] as Msgs;
  }
};
export const loadLogSync = (filePath: string) => {
  try {
    const data = readFileSync(filePath);
    const d = Utils.packr.decode(data) || [];
    return d;
  } catch (_error) {
    // console.log(error, filePath);
    return [];
  }
};

export async function updateMessage(
  dir: string,
  _unique_field: Record<string, true> | undefined,
  message: Msg
) {
  if (_unique_field) {
    const someIdex = await findIndex(dir + "UINDEX", _unique_field, message);
    // ? checking for existing specified unique identifiers
    if (Array.isArray(someIdex) && someIdex[1] !== message._id) {
      throw new ExaError(
        "UPDATE on table :",
        dir,
        " aborted, reason - unique field's ",
        someIdex[0],
        " value ",
        someIdex[1],
        " exists!"
      );
    }
  }
  if (_unique_field) {
    await updateIndex(dir, _unique_field, message as any);
  }
  return message;
}
export async function prepareMessage(
  dir: string,
  _unique_field: Record<string, true> | undefined,
  message: Msg
) {
  if (_unique_field) {
    const someIdex = await findIndex(dir + "UINDEX", _unique_field, message);

    if (Array.isArray(someIdex)) {
      throw new ExaError(
        "INSERT on table :",
        dir,
        " aborted, reason - unique field's '",
        someIdex[0],
        "' value '",
        message[someIdex[0] as keyof Msg],
        "' exists!"
      );
    }
  }
  message._id = ExaId();
  if (_unique_field) {
    await updateIndex(dir, _unique_field, message);
  }
  return message;
}

export async function deleteMessage(
  _id: string,
  dir: string,
  _unique_field: Record<string, true> | undefined,
  _foreign_field: boolean,
  fn: string,
  RCTiedlog: Msgs
) {
  const message = await findMessage(
    fn,
    {
      select: _id,
    },
    RCTiedlog
  );
  if (message) {
    if (_unique_field) await dropIndex(dir + "UINDEX", message, _unique_field);
    if (_foreign_field) await dropForeignKeys(dir + "FINDEX", _id);
  }
  return message || ({ _wal_ignore_flag: true } as unknown as Msg);
}


export async function findMessage(
  fileName: string,
  fo: {
    select: string;
    populate?: Record<string, string>;
  },
  messages: Msgs
) {
  const { select, populate } = fo;

  //? binary search it
  let left = 0;
  let right = messages.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midId = messages[mid]?._id;
    if (midId === select) {
      const message = messages[mid];
      if (populate) {
        const _foreign = await populateForeignKeys(
          fileName,
          message._id,
          populate
        );
        for (const key in _foreign) {
          (message[key as keyof typeof message] as any) = _foreign[key];
        }
      }
      return message;
    } else if (midId < select) {
      left = mid + 1;
    } else if (midId === undefined) {
      return undefined;
    } else {
      right = mid - 1;
    }
  }
}

// ! TODO: i think relationship has a bug, gonna find and fix it.
export const addForeignKeys = async (
  fileName: string,
  reference: {
    _id: string;
    foreign_table: string;
    foreign_id: string;
    relationshipType: "MANY" | "ONE";
    relationship: string;
  },
  RCTiedlog: any
) => {
  const message = await findMessage(
    fileName,
    {
      select: reference._id,
    },
    RCTiedlog
  );
  if (!message) {
    throw new ExaError(
      "Adding relation on table :",

      " aborted, reason - item _id '",
      reference._id,
      "' not found!"
    );
  }

  const foreign_message = await Utils.EXABASE_MANAGERS[
    reference.foreign_table.toUpperCase()
  ]._query.findOne(reference.foreign_id);

  if (!foreign_message) {
    throw new ExaError(
      "Adding relation on table :",

      " aborted, reason - foreign_id '",
      reference.foreign_id,
      "' from foreign table '",
      reference.foreign_table,
      "' via it's relationship '",
      reference.relationship,
      "' not found!"
    );
  }
  fileName = fileName.split("/").slice(0, 2).join("/") + "/FINDEX";
  //? update foreign key table
  let messages = (await loadLog(fileName)) as unknown as fTable;

  if (Array.isArray(messages)) {
    messages = {};
  }
  let messageX = messages[reference._id];
  if (typeof messageX !== "object") {
    messageX = {};
  }
  if (reference.relationshipType === "ONE") {
    messageX[reference.relationship] = reference.foreign_id;
  } else {
    if (Array.isArray(messageX[reference.relationship])) {
      if (
        (messageX[reference.relationship] as Array<string>).indexOf(
          reference.foreign_id
        ) === -1
      ) {
        (messageX[reference.relationship] as Array<string>).push(
          reference.foreign_id
        );
      }
    } else {
      messageX[reference.relationship] = [reference.foreign_id];
    }
  }
  //? over-writing the structure
  messages[reference._id] = messageX;
  await SynFileWritWithWaitList.write(fileName, Utils.packr.encode(messages));
};

export const populateForeignKeys = async (
  // ! looks like a bug
  fileName: string,
  _id: string,
  relationships: Record<string, string>
  //? comes as relationship: foreign_table
) => {
  fileName = fileName.split("/").slice(0, 2).join("/") + "/FINDEX";
  //? get foreign keys from table
  let messages = (await loadLog(fileName)) as unknown as fTable;
  if (Array.isArray(messages)) {
    messages = {};
  }
  //? load the messages from their various tables
  const rela: Record<string, Record<string, any>[] | Record<string, any>> = {};
  if (relationships) {
    for (const relationship in relationships) {
      if (messages[_id] && messages[_id][relationship]) {
        const fk = messages[_id][relationship];
        if (fk) {
          if (Array.isArray(fk)) {
            const marray = fk.map((id) => {
              return Utils.EXABASE_MANAGERS[
                relationships[relationship]
              ]._query.findOne(id);
            });
            const msgs = await Promise.all(marray);
            rela[relationship] = msgs.flat();
          } else {
            const msgs = await Utils.EXABASE_MANAGERS[
              relationships[relationship].toUpperCase()
            ]._query.findOne(fk);
            rela[relationship] = msgs as Record<string, any>;
          }
        }
      }
    }
  }
  return rela;
};
export const removeForeignKeys = async (
  fileName: string,
  reference: {
    _id: string;
    foreign_id: string;
    foreign_table: string;
    relationship: string;
  }
) => {
  //? update foreign key table
  fileName = fileName.split("/").slice(0, 2).join("/") + "/FINDEX";
  const messages = (await loadLog(fileName)) as unknown as fTable;
  if (messages[reference._id]) {
    if (Array.isArray(messages[reference._id][reference.relationship])) {
      messages[reference._id][reference.relationship] = (
        messages[reference._id][reference.relationship] as Array<string>
      ).filter((item) => item !== reference.foreign_id);
    } else {
      delete messages[reference._id][reference.relationship];
    }
    await SynFileWritWithWaitList.write(fileName, Utils.packr.encode(messages));
  }
};
const dropForeignKeys = async (fileName: string, _id: string) => {
  //? update foreign key table
  const messages = (await loadLog(fileName)) as unknown as fTable;
  if (messages[_id]) {
    delete messages[_id];
  }
  await SynFileWritWithWaitList.write(fileName, Utils.packr.encode(messages));
};
const updateIndex = async (
  fileName: string,
  _unique_field: Record<string, true>,
  message: Msg
) => {
  fileName = fileName.split("/").slice(0, 2).join("/") + "/UINDEX";
  let messages = (await loadLog(fileName)) as unknown as iTable;
  if (Array.isArray(messages)) {
    messages = {};
  }
  for (const type in _unique_field) {
    if (!messages[type]) {
      messages[type] = {};
    }

    messages[type][message[type as keyof Msg]] = message._id;
  }

  await SynFileWritWithWaitList.write(fileName, Utils.packr.encode(messages));
};

const findIndex = async (
  fileName: string,
  _unique_field: Record<string, true>,
  data: Record<string, any>
) => {
  const messages = (await loadLog(fileName)) as unknown as iTable;
  if (Array.isArray(messages)) {
    return false;
  }
  for (const uf in _unique_field) {
    if (!messages[uf]) {
      return false;
    }
    /*
    {
    ? here's a real example of what the messages variable looks like
    ? so not an array but an object of property indexes
   { 
    email: {
      'friday1@gmail.com': '656cd09b48e1c473de50b059',
      'friday2@gmail.com': '656cd10a48e1c473de50b05b'
    }
  }
    */
    if (messages[uf][data[uf]]) {
      return [uf, messages[uf][data[uf]]];
    }
  }
  return false;
};

export const findMessageByUnique = async (
  fileName: string,
  _unique_field: Record<string, true>,
  data: Record<string, any>
) => {
  const messages = (await loadLog(fileName)) as unknown as iTable;

  if (Array.isArray(messages)) {
    return undefined;
  }
  for (const uf in _unique_field) {
    if (!messages[uf]) {
      return undefined;
    }
    if (messages[uf][data[uf]]) {
      return messages[uf][data[uf]];
    }
  }
  return undefined;
};
const dropIndex = async (
  fileName: string,
  data: Record<string, any>,
  _unique_field: Record<string, true>
) => {
  if (!_unique_field) {
    return;
  }
  let messages = (await loadLog(fileName)) as unknown as iTable;
  if (Array.isArray(messages)) {
    messages = {};
  }
  for (const key in _unique_field) {
    if (!messages[key]) {
      continue;
    }
    delete messages[key][data[key]];
  }
  await SynFileWritWithWaitList.write(fileName, Utils.packr.encode(messages));
};

//? binary search it
export const binarysearch_find = (_id: string, messages: { _id: string }[]) => {
  let left = 0;
  let right = messages.length - 1;
  for (; left <= right;) {
    const mid = Math.floor((left + right) / 2);
    const midId = messages[mid]._id;
    if (midId === _id) {
      return mid;
    } else if (midId < _id) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return undefined;
};
//? binary search and mutate it
export const binarysearch_mutate = (
  message: Msg,
  messages: Msgs,
  flag: Xtree_flag
) => {
  if (messages.length === 1) {
    if (message._id === messages[0]._id) {
      if (flag === "d") {
        messages.pop();
      } else {
        messages[0] = message;
      }
    }
    return messages
  }

  const _id = message._id;
  let left = 0;
  let right = messages.length - 1;
  for (; left <= right;) {
    const mid = Math.floor((left + right) / 2);
    const midId = messages[mid]._id;
    if (midId === _id) {
      //? run mutation
      if (flag === "u") {
        messages[mid] = message;
      }
      if (flag === "d") {
        messages.splice(mid, 1);
      }
      break;
    } else if (midId < _id) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return messages;
};

//? binary sort insert it
export const binarysorted_insert = (message: Msg, messages: Msgs) => {
  const _id = message._id;
  let low = 0;
  let high = messages.length - 1;
  for (; low <= high;) {
    const mid = Math.floor((low + high) / 2);
    const current = messages[mid]._id;
    if (current < _id) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  //? insert message
  messages.splice(low, 0, message);

  return messages;
};

export const ExaId = (): string => {
  const PROCESS_UNIQUE = randomBytes(5);
  let index = ~~(Math.random() * 0xffffff);
  const time = ~~(Date.now() / 1000);
  const inc = (index = (index + 1) % 0xffffff);
  const buffer = Buffer.alloc(12);
  // 4-byte timestamp
  buffer[3] = time & 0xff;
  buffer[2] = (time >> 8) & 0xff;
  buffer[1] = (time >> 16) & 0xff;
  buffer[0] = (time >> 24) & 0xff;
  // 5-byte process unique
  buffer[4] = PROCESS_UNIQUE[0];
  buffer[5] = PROCESS_UNIQUE[1];
  buffer[6] = PROCESS_UNIQUE[2];
  buffer[7] = PROCESS_UNIQUE[3];
  buffer[8] = PROCESS_UNIQUE[4];
  // 3-byte counter
  buffer[11] = inc & 0xff;
  buffer[10] = (inc >> 8) & 0xff;
  buffer[9] = (inc >> 16) & 0xff;
  return buffer.toString("hex");
};
export const encode_timestamp = (timestamp: string): string => {
  const time = ~~(new Date(timestamp).getTime() / 1000);
  const buffer = Buffer.alloc(4);
  // 4-byte timestamp
  buffer[3] = time & 0xff;
  buffer[2] = (time >> 8) & 0xff;
  buffer[1] = (time >> 16) & 0xff;
  buffer[0] = (time >> 24) & 0xff;
  return buffer.toString("hex");
};

// ExaSchema validator

export function validateData(
  data: Record<string, Record<string, any>> = {},
  schema: Record<string, SchemaColumnOptions> = {}
) {
  let info: string;
  const out: Record<string, any> = {};
  //? check for valid input
  if (typeof data !== "object") {
    info = " data is invalid " + data;
  }
  for (const [prop, value] of Object.entries(schema)) {
    const { type, length, width, nullable } = value as columnValidationType;
    // ?
    data[prop] = data[prop] || value.default || data[prop];
    out[prop] = data[prop];
    // ?
    if (prop === "_id") {
      continue;
    }
    // ? check for nullability
    if ((data[prop] === undefined || data[prop] === null) && nullable) {
      continue;
    }
    if ((data[prop] === undefined || data[prop] === null) && !nullable) {
      if (value.default === undefined) {
        info = `${prop} is required`;
        break;
      }
    }
    // ?
    if (typeof data[prop] !== "undefined") {
      // ? check for empty strings
      if (
        typeof data[prop] === "string" &&
        data[prop]["trim"]() === "" &&
        nullable
      ) {
        info = `${prop} cannot be empty `;
        break;
      }
      // ? check for type
      if (
        typeof type === "function" &&
        !(typeof data[prop] === typeof (type as Function)())
      ) {
        info = `Provided ${prop} value has an invalid type value ${String(
          data[prop]
        )}`;
        break;
      }
      // ? check for exaType type
      if (type instanceof ExaType && !type.v(data[prop])) {
        info = `Provided ${prop} value has an invalid type value ${String(
          data[prop]
        )}`;
        break;
      }
      //? checks for numbers width
      if (
        width &&
        !Number.isNaN(Number(data[prop])) &&
        Number(data[prop]) < width
      ) {
        info = `Given ${prop} must not be lesser than ${width}`;
        break;
      }
      //? checks for String length
      if (
        length &&
        typeof data[prop] === "string" &&
        data[prop]["length"] > length
      ) {
        info = `${prop} is more than ${length} characters `;
        break;
      }
    }
  }

  return info! || out;
}

//  other functions

export const getComputedUsage = (
  allowedUsagePercent: number,
  schemaLength: number
) => {
  const nuParc = (p: number) => p / 1500; /*
      ? (100 = convert to percentage, 15 = ?) = 1500 units  */
  //? percent allowed to be used
  // ? what can be used by exabase
  const usableGB = freemem() * nuParc(allowedUsagePercent || 10); /*
      ? normalize any 0% of falsy values to 10% */
  // ? usage size per schema derivation
  const usableManagerGB = usableGB / (schemaLength || 1);
  return usableManagerGB;
};
export function resizeRCT(level: number, data: Record<string, any>) {
  const keys = Object.keys(data);
  //! 99 should calculated memory capacity
  if (keys.length > level) {
    const a = keys.slice(0, level * 0.5);
    for (let i = 0; i < 50; i++) {
      data[a[i]] = undefined;
    }
  }
}

//? SynFileWrit tree
export async function SynFileWrit(file: string, data: Buffer) {
  let fd;
  let tmpfile = "";
  try {
    tmpfile = file + ExaId() + "-SYNC";
    fd = await promisify(open)(tmpfile, "w");
    await promisify(write)(fd, data, 0, data.length, 0);
    await promisify(fsync)(fd);
    await promisify(rename)(tmpfile, file);
  } finally {
    if (fd) {
      await promisify(close)(fd);
    }
  }
}

//? SynFileWrit tree
export const SynFileWritWithWaitList = {
  waiters: {} as Record<string, ((value: unknown) => void)[]>,
  acquireWrite(file: string) {
    return new Promise((resolve) => {
      if (!this.waiters[file]) {
        this.waiters[file] = [];
      }
      this.waiters[file].push(resolve);
      if (this.waiters[file].length === 1) {
        resolve(undefined);
      }
    });
  },
  async write(file: string, data: Buffer) {
    await this.acquireWrite(file);
    let fd;
    let tmpfile = "";
    try {
      tmpfile = file + ExaId() + "-SYNC";
      fd = await promisify(open)(tmpfile, "w");
      await promisify(write)(fd, data, 0, data.length, 0);
      await promisify(fsync)(fd);
      await promisify(rename)(tmpfile, file);
    } finally {
      if (fd) {
        await promisify(close)(fd);
      }
    }
    // ? adjusting the wait list
    this.waiters[file].shift();
    if (this.waiters[file].length > 0) {
      this.waiters[file][0](undefined);
    }
  },
};

// ? bucket sort for sorting
export function bucketSort(
  arr: Msgs,
  prop: keyof Msg,
  order: "ASC" | "DESC"
): Msgs {
  if (arr.length === 0) return arr;
  // ? Find min and max values to determine the range of the buckets
  const minValue = Math.min(
    ...arr.map((item: Msg) => item[prop] as unknown as number)
  );
  const maxValue = Math.max(
    ...arr.map((item: Msg) => item[prop] as unknown as number)
  );

  // ? Adjust the bucket size based on data distribution
  const bucketCount = Math.floor(arr.length / 2) || 1;
  const bucketSize = Math.ceil((maxValue - minValue + 1) / bucketCount);

  // ? create buckets
  const buckets: Msgs[] = Array.from({ length: bucketCount }, () => []);

  for (let i = 0; i < arr.length; i++) {
    const data: Msg = arr[i];
    const bucketIndex = Math.floor(
      ((data[prop] as unknown as number) - minValue) / bucketSize
    );
    buckets[bucketIndex].push(data);
  }

  // ? merge buckets
  const result: Msgs = [];
  for (let i = 0; i < buckets.length; i++) {
    // ? sort using merge sort
    const sortedBucket = mergeSort(buckets[i], prop);
    result.push(...sortedBucket);
  }

  if (order === "DESC") {
    return result.reverse();
  }
  return result;
}

function mergeSort(arr: Msgs, prop: keyof Msg): Msgs {
  if (arr.length <= 1) return arr;
  const middle = Math.floor(arr.length / 2);
  const left = arr.slice(0, middle);
  const right = arr.slice(middle);
  return merge(mergeSort(left, prop), mergeSort(right, prop), prop);
}

function merge(left: Msgs, right: Msgs, prop: keyof Msg): Msgs {
  const result: Msgs = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex][prop] < right[rightIndex][prop]) {
      result.push(left[leftIndex]);
      leftIndex++;
    } else {
      result.push(right[rightIndex]);
      rightIndex++;
    }
  }
  return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
}
