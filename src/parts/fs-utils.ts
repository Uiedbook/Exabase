import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { LOG_file_type, Msg, Msgs, fTable, iTable } from "../types";
import { Utils, ExabaseError } from "./classes";
import { existsSync } from "node:fs";
import { copyFile, rename, unlink } from "node:fs/promises";
import { Buffer } from "node:buffer";

export const readDataFromFile = async (RCT_KEY: string, filePath: string) => {
  if (Utils.RCT[RCT_KEY]) {
    if ((Utils.RCT[RCT_KEY] as Record<string, Msgs>)[filePath]) {
      return (Utils.RCT[RCT_KEY] as Record<string, Msgs>)[filePath]!;
    }
  }
  try {
    const data = await readFile(filePath);
    const d = Utils.packr.decode(data) || [];
    if (Utils.RCT[RCT_KEY] !== false) {
      (Utils.RCT[RCT_KEY] as Record<string, Msgs>)[filePath] = d;
    }
    return d;
  } catch (error) {
    return [] as Msgs;
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
    const someIdex = await findIndex(dir + "/INDEXES", _unique_field, message);
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
    const someIdex = await findIndex(dir + "/INDEXES", _unique_field, message);
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
  data: Msg,
  dir: string,
  _unique_field: Record<string, true> | undefined
) {
  if (_unique_field) {
    await dropIndex(dir, data, _unique_field);
  }
  return { _id: data._id, _wal_flag: "d" } as Msg;
}

export async function findMessage(
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
      messages = messages.map(
        async (m: { [x: string]: Record<string, any>; _id: any }) => {
          const _foreign = await populateForeignKeys(fileName, m._id, populate);
          for (const key in _foreign) {
            m[key] = _foreign[key];
          }
          return m;
        }
      );
      messages = await Promise.all(messages);
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
      if (populate) {
        const _foreign = await populateForeignKeys(
          fileName,
          messages[mid]._id,
          populate
        );
        for (const key in _foreign) {
          messages[mid][key] = _foreign[key];
        }
      }
      return [messages[mid]];
    } else if (midId < select) {
      left = mid + 1;
    } else if (midId === undefined) {
      return undefined;
    } else {
      right = mid - 1;
    }
  }
}

export async function findMessagesByProperties(
  RCT_KEY: string,
  fileName: any,
  fo: {
    skip?: number;
    populate?: Record<string, string>;
    take?: number;
    search?: Record<string, any>;
  },
  files: LOG_file_type
) {
  let foundList = [],
    len = 0,
    continued = false;
  const { take, skip, populate, search } = fo;
  let skipped = false;
  const keys = Object.keys(files);
  for (let i = 0; i < keys.length; i++) {
    if (continued) {
      break;
    }
    const file = "/" + keys[i];
    let tru = false;
    const messages = await readDataFromFile(RCT_KEY, fileName + file);
    if (skip && !skipped) {
      //? remove skip
      messages.splice(0, skip);
      //? skip only once
      skipped = true;
    }
    for (let i = 0; i < messages.length; i++) {
      tru = true;
      const message = messages[i];
      for (const key in search) {
        if (message[key] !== search[key]) {
          tru = false;
          break;
        }
      }
      if (tru === true) {
        foundList.push(message);
        len += 1;
      }
      if (len === take) {
        continued = true;
        break;
      }
    }
    if (populate) {
      foundList = foundList.map(async (m: any) => {
        const _foreign = await populateForeignKeys(fileName, m._id, populate);
        for (const key in _foreign) {
          m[key] = _foreign[key];
        }
        return m;
      });
      foundList = await Promise.all(foundList);
    }
  }
  return foundList;
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
    reference.foreign_table
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
  fileName = fileName.split("/").slice(0, 2).join("/") + "/FOREIGN";
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
  fileName = fileName.split("/").slice(0, 2).join("/") + "/FOREIGN";
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
              relationships[relationship]
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
  fileName = fileName.split("/").slice(0, 2).join("/") + "/FOREIGN";
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
  fileName = fileName.split("/").slice(0, 2).join("/") + "/INDEXES";
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
    if (messages[uf][data[uf]]) {
      return [uf, [data[uf]]];
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
  await FileLockTable.write(fileName + "/INDEXES", messages);
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

like the FOREIGN key table 
and the INDEXES table files

the below data structure allows to synchronise these file access
*/

export const FileLockTable = {
  table: {} as Record<string, boolean>,
  async write(fileName: string, content: any) {
    //
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
