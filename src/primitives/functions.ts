import { chown as _chown, promises as fsp, statSync } from "node:fs";
import { resolve as _resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
// ?
import { GLOBAL_OBJECT, ExaError } from "./classes.ts";
import {
  type Msg,
  type Msgs,
  type SchemaColumnOptions,
  type Xtree_flag,
  type columnValidationType,
} from "./types.ts";
export const loadLog = async (filePath: string) => {
  try {
    const data = await readFile(filePath);
    return (GLOBAL_OBJECT.packr.decode(data) || []) as Msgs;
  } catch (_error) {
    // console.log({ filePath, _error }, 1);
    return [] as Msgs;
  }
};
export const loadLogSync = (filePath: string, defaults: any = []) => {
  try {
    return GLOBAL_OBJECT.packr.decode(readFileSync(filePath)) || [];
  } catch (_error) {
    // console.log({ filePath, _error });
    return defaults;
  }
};

export const getFileSize = (file: string): number => {
  try {
    return statSync(file).size;
  } catch (err) {
    return 0;
  }
};

export async function findMessage(
  query: {
    one?: string;
    populate?: Record<string, { table: string; type: "MANY" | "ONE" }>;
  },
  messages: Msgs
) {
  const { one = "", populate } = query;
  if (messages[0]?._id === one) {
    const message = messages[0];
    if (populate) {
      await populateForeignKeys(message, populate);
    }
    return message;
  }

  //? binary search it
  let left = 0;
  let right = messages.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midId = messages[mid]?._id;
    if (midId === one) {
      const message = messages[mid];
      if (populate) {
        await populateForeignKeys(message, populate);
      }
      return message;
    } else if (midId < one) {
      left = mid + 1;
    } else if (midId === undefined) {
      return undefined;
    } else {
      right = mid - 1;
    }
  }
}

export const conserveForeignKeys = async (
  message: Msg,
  join: {
    [x: string]: {
      table: string;
      type: "ONE" | "MANY";
    };
  }
) => {
  for (const key in join) {
    const relation = join[key];
    if (relation.type === "ONE") {
      if (typeof message[key as "_id"] === "object") {
        //  @ts-ignore
        await findForeignKeys(relation.table, message[key]._id);
        //  @ts-ignore
        message[key] = message[key]._id;
      }
    } else {
      const msgArr = message[key as "_id"] as unknown as string[];
      const msgLen = msgArr.length;
      if (Array.isArray(msgArr)) {
        for (let i = 0; i < msgLen; i++) {
          if (typeof msgArr[i] === "object") {
            //  @ts-ignore
            await findForeignKeys(relation.table, msgArr[i]._id);
            //  @ts-ignore
            msgArr[i] = msgArr[i]._id;
            //  @ts-ignore
            message[key] = msgArr;
          }
        }
      } else {
        //  @ts-ignore
        message[key] = [];
      }
    }
  }
};

const findForeignKeys = async (table: string, one: string) => {
  const foreign_message = await GLOBAL_OBJECT.EXABASE_MANAGERS[table].runner({
    one,
  });
  if (!foreign_message) {
    throw new ExaError(
      "relationship failed: '",
      one,
      "' not found on table ",
      table
    );
  }
};

export const setPopulateOptions = (
  populate: Record<string, true> | true,
  fields: Record<string, { table: string; type: "ONE" | "MANY" }> = {}
) => {
  if (populate === true) {
    return fields;
  }
  const relationship: Record<
    string,
    {
      table: string;
      type: "ONE" | "MANY";
    }
  > = {};
  if (Array.isArray(populate)) {
    for (let i = 0; i < populate.length; i++) {
      const lab = populate[0];
      const relationshipName = fields[lab];
      if (relationshipName) {
        relationship[lab] = {
          table: fields[lab].table,
          type: fields[lab].type,
        };
      } else {
        throw new ExaError("can't POPULATE missing relationship " + lab);
      }
    }
  } //
  return relationship;
};

export const populateForeignKeys = async (
  message: Msg,
  join: {
    [x: string]: {
      table: string;
      type: "ONE" | "MANY";
    };
  }
) => {
  for (const key in join) {
    if (join[key].type === "MANY") {
      const fk = message[key as "_id"];
      if (fk && Array.isArray(fk)) {
        const array = fk.map((id) =>
          GLOBAL_OBJECT.EXABASE_MANAGERS[join[key].table].runner({
            one: id,
          })
        );
        const msgs = await Promise.all(array);
        message[key as "_id"] = msgs as any;
      }
    }
    if (join[key].type === "ONE") {
      const fk = message[key as "_id"];
      if (typeof fk === "string") {
        const array = await GLOBAL_OBJECT.EXABASE_MANAGERS[
          join[key].table
        ].runner({ one: fk });
        message[key as "_id"] = array as any;
      }
    }
  }
};

export function deepMerge(target: any, source: any): any {
  if (source === undefined || source === null) return target;
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const targetValue = target[key];
      const sourceValue = source[key];

      if (Array.isArray(sourceValue)) {
        target[key] = Array.isArray(targetValue)
          ? [...new Set([...targetValue, ...sourceValue])]
          : [...sourceValue];
      } else if (typeof sourceValue === "object" && sourceValue !== null) {
        target[key] =
          typeof targetValue === "object" && targetValue !== null
            ? deepMerge(targetValue, sourceValue)
            : { ...sourceValue };
      } else {
        target[key] = sourceValue;
      }
    }
  }
  return target;
}

//? binary search it
export const binarySearch_find = (_id: string, messages: { _id: string }[]) => {
  let left = 0;
  let right = messages.length - 1;
  for (; left <= right; ) {
    const mid = (left + right) >>> 1;

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
export const binarySearch_mutate = (
  message: Msg,
  messages: Msgs,
  flag: Xtree_flag
) => {
  if (messages.length === 1) {
    if (message._id === messages[0]._id) {
      flag === "d" ? messages.splice(0, 1) : (messages[0] = message);
    }
    return messages;
  }

  const _id = message._id;
  let left = 0;
  let right = messages.length - 1;
  for (; left <= right; ) {
    const mid = (left + right) >>> 1;
    const midId = messages[mid]._id;
    if (midId === _id) {
      //? run mutation
      if (flag === "u") {
        messages[mid] = Object.assign(messages[mid], message);
      } else {
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
export function binarySorted_insert<T extends { _id: string }>(
  item: T,
  arr: T[]
): number {
  let low = 0;
  let high = arr.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (arr[mid]._id < item._id) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  arr.splice(low, 0, item);
  return low;
}

const PROCESS_UNIQUE = randomBytes(5);
const buffer = Buffer.alloc(12);
export const ExaId = (): string => {
  let index = ~~(Math.random() * 0xffffff);
  const time = ~~(Date.now() / 1000);
  const inc = (index = (index + 1) % 0xffffff);
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
export function validator(
  data: Record<string, any> = {},
  schema: Record<string, SchemaColumnOptions> = {}
) {
  //? check for valid input
  if (typeof data !== "object") return "input is invalid ";

  const out: Record<string, any> = {};
  let info: string | undefined;
  for (const prop in schema) {
    const value = schema[prop];
    const { type, max, min, err, required, RegExp } =
      value as columnValidationType;
    // ?
    if (prop === "_id") {
      out["_id"] = data["_id"];
      continue;
    }
    data[prop] = data[prop] || value.default || data[prop];

    // ?
    // ? check for nullability
    if (
      data[prop] === undefined ||
      data[prop] === null ||
      data[prop]?.length === 0
    ) {
      if (!required) {
        out[prop] = data[prop];
        continue;
      } else {
        info = err || `${prop} is required`;
        break;
      }
    }
    // ? check for type
    if (
      typeof type === "string" &&
      typeof data[prop] !== type &&
      !value.relationship
    ) {
      info = `${prop} type is invalid -  ${String(typeof data[prop])}`;
      break;
    }
    //? checks for String and Number max
    if (max && (data[prop]?.["length"] || data[prop] > max)) {
      info = err || `${prop} must not be lesser than ${max}`;
      break;
    }
    //? checks for String and Number min
    if (min && (data[prop]?.["length"] || data[prop] > min)) {
      info = err || `${prop} must not be larger than ${min}`;
      break;
    }
    // ? regex check
    if (typeof RegExp === "object" && !RegExp.test(data[prop])) {
      info = err || `${prop} is invalid`;
      break;
    }
    out[prop] = data[prop];
  }
  return info || out;
}

// ? other functions
//? ------------------------------------
export function resizeRCT(data: Record<string, any>) {
  const level: number = GLOBAL_OBJECT.rct_level;
  const keys = Object.keys(data);
  if (keys.length > level) {
    const limit = Math.min(level * 0.5, 50);
    for (let i = 0; i < limit; i++) {
      delete data[keys[i]];
    }
  }
}
//? SynFileWrit tree
export async function SynFileWrit(file: string, data: Buffer) {
  if (data.length > 1) {
    let fd;
    const tmpfile = file + "-SYNC";
    try {
      fd = await fsp.open(tmpfile, "w");

      await fd.write(data, 0, data.length, 0);
      await fd.sync();
      await fsp.rename(tmpfile, file);
    } finally {
      if (fd !== undefined) {
        await fd.close();
      }
    }
  } else {
    fsp.unlink(file);
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
    const tmpfile = file + "-SYNC";
    try {
      fd = await fsp.open(tmpfile, "w");
      await fd.write(data, 0, data.length, 0);
      await fd.sync();
      await fsp.rename(tmpfile, file);
    } finally {
      if (fd !== undefined) {
        await fd.close();
      }
    }
    // ? adjusting the wait list
    this.waiters[file].shift(); // ? waiting list does not leak
    if (this.waiters[file].length > 0) {
      this.waiters[file][0](undefined);
    }
  },
};

const numb = (str: string) => {
  let out = 0;
  for (let pos = 0, len = str.length; pos < len; pos++) {
    out += str.charCodeAt(pos);
  }
  return out;
};

// ? bucket sort for sorting
export function bucketSort(
  arr: Msgs,
  prop: keyof Msg,
  order: "ASC" | "DESC"
): Msgs {
  if (arr.length === 0) return arr;
  //? Calculate numb values once and store them
  const numbValues = arr.map((item) => numb(item[prop].toString()));
  //? Find min and max values to determine the range of the buckets
  const minValue = Math.min(...numbValues);
  const maxValue = Math.max(...numbValues);
  //? Adjust the bucket size based on data distribution
  const bucketCount = Math.max(Math.floor(arr.length / 2), 1);
  const bucketSize = Math.ceil((maxValue - minValue + 1) / bucketCount);
  // ? create buckets
  const buckets: Msgs[] = Array.from({ length: bucketCount }, () => []);
  for (let i = 0; i < arr.length; i++) {
    const data: Msg = arr[i];
    const bucketIndex = Math.floor(
      (numb(data[prop].toString()) - minValue) / bucketSize
    );
    buckets[bucketIndex].push(data);
  }
  // ? merge buckets
  const result: Msgs = [];
  for (const bucket of buckets) {
    if (bucket.length > 0) {
      result.push(...mergeSort(bucket, prop));
    }
  }
  return order === "DESC" ? result.reverse() : result;
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
  let li = 0;
  let ri = 0;
  while (li < left.length && ri < right.length) {
    if (left[li][prop] < right[ri][prop]) {
      result.push(left[li]);
      li++;
    } else {
      result.push(right[ri]);
      ri++;
    }
  }
  return result.concat(left.slice(li)).concat(right.slice(ri));
}
