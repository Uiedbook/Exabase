import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { copyFile, rename, unlink } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { freemem } from "node:os";
//
import {
  Msg,
  Msgs,
  SchemaColumnOptions,
  columnValidationType,
  fTable,
  iTable,
} from "./types";
import { Utils, ExabaseError } from "./classes";

export const readDataFromFile = async (RCT_KEY: string, filePath: string) => {
  if (Utils.RCT[RCT_KEY]) {
    if ((Utils.RCT[RCT_KEY] as Record<string, Msgs>)[filePath]) {
      return (Utils.RCT[RCT_KEY] as Record<string, Msgs>)[filePath]!;
    }
  }
  try {
    const data = await readFile(filePath);
    const d = (Utils.packr.decode(data) || []) as Msgs;
    if (Utils.RCT[RCT_KEY] !== false) {
      (Utils.RCT[RCT_KEY] as Record<string, Msgs>)[filePath] = d;
    }
    return d;
  } catch (error) {
    return [] as Msgs;
  }
};
export const readDataFromFileSync = (filePath: string) => {
  try {
    const data = readFileSync(filePath);
    const d = Utils.packr.decode(data) || [];
    return d;
  } catch (error) {
    return [];
  }
};

export const writeDataToFile = (
  filePath: string,
  data: Record<string, any>
) => {
  return writeFile(filePath, Utils.packr.encode(data));
};

export async function updateMessage(
  dir: string,
  _unique_field: Record<string, true> | undefined,
  message: Msg
) {
  if (_unique_field) {
    const someIdex = await findIndex(dir + "/UINDEX", _unique_field, message);
    // ? checking for existing specified unique identifiers
    if (Array.isArray(someIdex) && someIdex[1] !== message._id) {
      throw new ExabaseError(
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
  message._wal_flag = "u";
  return message;
}
export async function insertMessage(
  dir: string,
  _unique_field: Record<string, true> | undefined,
  message: Msg
) {
  if (_unique_field) {
    const someIdex = await findIndex(dir + "/UINDEX", _unique_field, message);
    if (Array.isArray(someIdex)) {
      throw new ExabaseError(
        "INSERT on table :",
        dir,
        " aborted, reason - unique field's '",
        someIdex[0],
        "' value '",
        someIdex[1],
        "' exists!"
      );
    }
  }
  message._id = generate_id();
  message._wal_flag = "i";
  if (_unique_field) {
    await updateIndex(dir, _unique_field, message);
  }
  return message;
}
export async function deleteMessage(
  _id: string,
  dir: string,
  _unique_field: Record<string, true> | undefined,
  RCT_KEY: string,
  fn: string
) {
  const message = await findMessage(RCT_KEY, dir + fn, {
    select: _id,
  });
  if (_unique_field) {
    if (message) {
      await dropIndex(dir, message, _unique_field);
    }
  }
  if (message) {
    message._wal_flag = "d";
  }
  return message as Msg;
}

export async function findMessages(
  RCT_KEY: string,
  fileName: string,
  fo: {
    select: string;
    skip?: number;
    populate?: Record<string, string>;
    take?: number;
  }
) {
  const { select, take, skip, populate } = fo;
  let messages = await readDataFromFile(RCT_KEY, fileName);
  if (select === "*") {
    if (skip) {
      //? remove skip
      messages.splice(0, skip);
    }
    if (take) {
      //? reduce to take
      messages = messages.slice(0, take);
    }
    if (populate) {
      const _med = messages.map(async (m: Msg) => {
        const _foreign = await populateForeignKeys(fileName, m._id, populate);
        for (const key in _foreign) {
          (m[key as keyof typeof m] as any) = _foreign[key] as Msgs;
        }
        return m;
      });
      messages = await Promise.all(_med);
    }
    return messages;
  }

  //? binary search it
  let left = 0;
  let right = messages.length - 1;
  let mid = Math.floor((left + right) / 2);
  let midId = messages[mid]?._id;
  while (left <= right) {
    mid = Math.floor((left + right) / 2);
    midId = messages[mid]._id;
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
  return;
}
export async function findMessage(
  RCT_KEY: string,
  fileName: string,
  fo: {
    select: string;
    populate?: Record<string, string>;
  }
) {
  const { select, populate } = fo;
  let messages = await readDataFromFile(RCT_KEY, fileName);
  //? binary search it
  let left = 0;
  let right = messages.length - 1;
  let mid = Math.floor((left + right) / 2);
  let midId = messages[mid]?._id;
  while (left <= right) {
    mid = Math.floor((left + right) / 2);
    midId = messages[mid]._id;
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
  return;
}

export const addForeignKeys = async (
  RCT_KEY: string,
  fileName: string,
  reference: {
    _id: string;
    foreign_table: string;
    foreign_id: string;
    type: "MANY" | "ONE";
    relationship: string;
  }
) => {
  const message = await findMessage(RCT_KEY, fileName, {
    select: reference._id,
  });
  if (!message) {
    throw new ExabaseError(
      "Adding relation on table :",
      RCT_KEY,
      " aborted, reason - item _id '",
      reference._id,
      "' not found!"
    );
  }

  const foreign_message = await Utils.EXABASE_MANAGERS[
    reference.foreign_table.toUpperCase()
  ]._transaction.find(reference.foreign_id);

  if (!foreign_message) {
    throw new ExabaseError(
      "Adding relation on table :",
      RCT_KEY,
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
  let messages = (await readDataFromFile(
    "none",
    fileName
  )) as unknown as fTable;

  if (Array.isArray(messages)) {
    messages = {};
  }
  let messageX = messages[reference._id];
  if (typeof messageX !== "object") {
    messageX = {};
  }
  if (reference.type === "ONE") {
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
  //? over-writting the structure
  messages[reference._id] = messageX;

  await FileLockTable.write(fileName, messages);
};

export const populateForeignKeys = async (
  fileName: string,
  _id: string,
  relationships: Record<string, string>
  //? comes as relationship: foreign_table
) => {
  fileName = fileName.split("/").slice(0, 2).join("/") + "/FINDEX";
  //? get foreign keys from table
  let messages = (await readDataFromFile(
    "none",
    fileName
  )) as unknown as fTable;
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
            const marray = fk.map(async (id) => {
              return Utils.EXABASE_MANAGERS[
                relationships[relationship]
              ]._transaction.find(id);
            });
            const msgs = await Promise.all(marray);
            rela[relationship] = msgs.flat();
          } else {
            const msgs = await Utils.EXABASE_MANAGERS[
              relationships[relationship].toUpperCase()
            ]._transaction.find(fk);
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
  const messages = (await readDataFromFile(
    "none",
    fileName
  )) as unknown as fTable;
  if (messages[reference._id]) {
    if (Array.isArray(messages[reference._id][reference.relationship])) {
      messages[reference._id][reference.relationship] = (
        messages[reference._id][reference.relationship] as Array<string>
      ).filter((item) => item !== reference.foreign_id);
    } else {
      delete messages[reference._id][reference.relationship];
    }
    await FileLockTable.write(fileName, messages);
  }
};
export const updateIndex = async (
  fileName: string,
  _unique_field: Record<string, true>,
  message: Msg
) => {
  fileName = fileName.split("/").slice(0, 2).join("/") + "/UINDEX";
  let messages = (await readDataFromFile(
    "none",
    fileName
  )) as unknown as iTable;
  if (Array.isArray(messages)) {
    messages = {};
  }
  for (const type in _unique_field) {
    if (!messages[type]) {
      messages[type] = {};
    }
    messages[type][message[type as keyof Msg]] = message._id;
  }

  await FileLockTable.write(fileName, messages);
};

export const findIndex = async (
  fileName: string,
  _unique_field: Record<string, true>,
  data: Record<string, any>
) => {
  let messages = (await readDataFromFile(
    "none",
    fileName
  )) as unknown as iTable;

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
    email: {
      'friday1@gmail.com': '656cd09b48e1c473de50b059',
      'friday2@gmail.com': '656cd10a48e1c473de50b05b'
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
  let messages = (await readDataFromFile(
    "none",
    fileName
  )) as unknown as iTable;

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

export const dropIndex = async (
  fileName: string,
  data: Record<string, any>,
  _unique_field: Record<string, true>
) => {
  if (!_unique_field) {
    return;
  }
  let messages = (await readDataFromFile(
    "none",
    fileName
  )) as unknown as iTable;
  if (Array.isArray(messages)) {
    messages = {};
  }
  for (const key in _unique_field) {
    if (!messages[key]) {
      continue;
    }
    delete messages[key][data[key]];
  }
  await FileLockTable.write(fileName + "/UINDEX", messages);
};

//? binary search it
export const binarysearch_find = (_id: string, messages: { _id: string }[]) => {
  let left = 0;
  let right = messages.length - 1;
  for (; left <= right; ) {
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
export const binarysearch_mutate = async (message: Msg, messages: Msgs) => {
  const _id = message._id;
  let left = 0;
  let right = messages.length - 1;
  for (; left <= right; ) {
    const mid = Math.floor((left + right) / 2);
    const midId = messages[mid]._id;
    if (midId === _id) {
      //? run mutation
      if (message._wal_flag === "u") {
        //? remove the exabase flag
        delete (message as { _id: string; _wal_flag?: string })._wal_flag;
        messages[mid] = message;
      }
      if (message._wal_flag === "d") {
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
export const binarysorted_insert = async (message: Msg, messages: Msgs) => {
  const _id = message._id;
  let low = 0;
  let high = messages.length - 1;
  for (; low <= high; ) {
    const mid = Math.floor((low + high) / 2);
    const current = messages[mid]._id;
    if (current < _id) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  //? remove the exabase flag
  delete (message as { _id: string; _wal_flag?: string })._wal_flag;
  //? insert message
  messages.splice(low, 0, message);
  return messages;
};

const PROCESS_UNIQUE = randomBytes(5);
let index = ~~(Math.random() * 0xffffff);
export const generate_id = (): string => {
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

/** 

// ? FILE LOCK TABLE

Writes and reads to the LOG(n) files and WAL directory
are designed to be concurent.

but we cannot gurantee the changes to some certain files

like the 
- FINDEX key table 
- XINDEX key table and the 
- UINDEX key table files

the below data structure allows to synchronise these file accesses
*/

export const FileLockTable = {
  table: {} as Record<string, boolean>,
  async write(fileName: string, content: any) {
    if (this.table[fileName] === true) {
      setImmediate(() => {
        this.write(fileName, content);
      });
    } else {
      //? acquire lock access to the file
      this.table[fileName] = true;
      // ? do the writting
      await this._run(fileName, content);
      //? release lock
      this.table[fileName] = false;
    }
  },
  async _run(fileName: string, content: any) {
    const fcpn = fileName + "_COPY";
    //? create a copy of the file and write to it.
    if (existsSync(fileName)) {
      await copyFile(fileName, fcpn);
      await writeDataToFile(fcpn, content);
    } else {
      if (existsSync(fcpn)) {
        // ? delete file-copy
        await unlink(fcpn);
      }
      // ? create a file-copy
      await writeDataToFile(fcpn, content);
    }
    //? rename the file-copy to the file
    await rename(fcpn, fileName);
  },
};

// Schema validator

export function validateData(
  data: Record<string, Record<string, any>> = {},
  schema: Record<string, SchemaColumnOptions> = {}
) {
  let info: Record<string, any> | string = {};
  //? check for valid input
  if (typeof data !== "object") {
    info = " data is invalid " + data;
  }
  for (const [prop, value] of Object.entries(schema)) {
    const { type, length, width, nullable } = value as columnValidationType;
    (info as Record<string, any>)[prop] = data[prop] || value.default || null;
    if (prop === "_id") {
      continue;
    }
    // ? check for nullability
    if ((data[prop] === undefined || data[prop] === null) && nullable) {
      continue;
    }
    if ((data[prop] === undefined || data[prop] === null) && !nullable) {
      if (!value.default) {
        info = `${prop} is required`;
        break;
      }
    }
    // ?
    if (typeof data[prop] !== "undefined") {
      // ? check for empty strings
      if (
        typeof data[prop] === "string" &&
        data[prop].trim() === "" &&
        nullable
      ) {
        info = `${prop} cannot be empty `;
        break;
      }
      // ? check for type
      if (typeof type === "function" && typeof data[prop] !== typeof type()) {
        info = `${prop} type is invalid ${typeof data[prop]}`;
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
        data[prop].length > length
      ) {
        info = `${prop} is more than ${length} characters `;
      }
    }
  }
  return info;
}

//  other functions

export const getComputedUsage = (
  allowedUsagePercent: number,
  schemaLength: number
) => {
  const nuPerc = (p: number) => p / 1500; /*
      ? (100 = convert to percentage, 15 = exabase gravity constant) = 1500 units  */
  //? percent allowed to be used
  // ? what can be used by exabse
  const usableGB = freemem() * nuPerc(allowedUsagePercent || 10); /*
      ? normalise any 0% of falsy values to 10% */
  // ? usage size per schema derivation
  const usableManagerGB = usableGB / (schemaLength || 1);
  return usableManagerGB;
};

async function ResizeLogFiles(
  sources: string[],
  length: number,
  tableDir: string
) {
  let leftovers: any[] = [];
  let current_index = 1;
  let logged = false;
  for (const src of sources) {
    const data = await readDataFromFile("", src);
    if (data.length === length) {
      return;
    }
    if (!logged) {
      console.log("Resizing Log files due to change ");
      logged = true;
    }
    leftovers.push(...data);
    // @ts-ignore
    [leftovers, current_index] = await ResizeLeftOvers(
      leftovers,
      current_index,
      length,
      false
    );
  }
  // ? save leftovers last
  // ? write point
  if (leftovers.length) {
    ResizeLeftOvers(leftovers, current_index, length, true, tableDir);
  }
}

async function ResizeLeftOvers(
  leftovers: any[],
  current_index: number,
  length = 1_000,
  last = false,
  tableDir: string
) {
  while (leftovers.length >= length) {
    // ? > length
    // ? keep leftovers
    const data = [...leftovers.splice(0, length)];
    // ? write point
    await writeDataToFile(tableDir + "SCALE-" + current_index, data);
    current_index += 1;
  }
  // ? save leftovers last
  // ? write point
  if (leftovers.length && last) {
    await writeDataToFile(tableDir + "SCALE-" + current_index, leftovers);
  }
  return [leftovers, current_index];
}
