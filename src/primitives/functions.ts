import { promises as fsp, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve as _resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";
// ?
import { GLOBAL_OBJECT } from "./classes.ts";
import { type Msg, type Struct } from "./types.ts";

export const loadLog = async (filePath: string) => {
  try {
    const data = await readFile(filePath);
    return (GLOBAL_OBJECT.unpack(data) || {}) as Struct;
  } catch (_error) {
    // console.log({ filePath, _error }, 1);
    return {} as Struct;
  }
};

export const loadLogSync = (filePath: string, defaults: any = []) => {
  try {
    return GLOBAL_OBJECT.unpack(readFileSync(filePath)) || [];
  } catch (_error) {
    // console.log({ filePath, _error });
    return defaults;
  }
};

const PROCESS_UNIQUE = randomBytes(5);

export const ExaId = (log: string): string => {
  const logLength = log.length;
  const buffer = Buffer.allocUnsafe(12 + logLength);
  let index = ~~(Math.random() * 0xffffff);
  const time = ~~(Date.now() / 1000);
  const inc = (index = (index + 1) % 0xffffff);
  // 4-byte timestamp
  buffer.writeUInt32BE(time, 0);
  // 5-byte process unique
  buffer.set(PROCESS_UNIQUE, 4);
  // 3-byte counter
  buffer.writeUIntBE(inc, 9, 3);
  // Encode log string into the buffer
  buffer.write(log, 12, logLength, "utf8");
  // Convert to hexadecimal string
  return buffer.toString("hex");
};

// export const decodeExaId = (
//   id: string,
// ): {
//   timestamp: number;
//   processUnique: string;
//   counter: number;
//   log: string;
// } => {
//   // Convert hex string back to Buffer
//   const buffer = Buffer.from(id, "hex");
//   // Decode the timestamp (4 bytes)
//   const timestamp = buffer.readUInt32BE(0) * 1000;
//   // Decode the process-unique identifier (5 bytes)
//   const processUnique = Buffer.from(buffer.subarray(4, 9)).toString("hex");
//   // Decode the incrementing counter (3 bytes)
//   const counter = buffer.readUIntBE(9, 3);
//   // Decode the log string (remaining bytes)
//   const log = Buffer.from(buffer.subarray(12)).toString("utf8");
//   return {
//     timestamp,
//     processUnique,
//     counter,
//     log,
//   };
// };

export const msgId = (_id: string): string =>
  Buffer.from(_id, "hex").subarray(12).toString("utf8");

// ? other functions
//? ------------------------------------
export function resizeLOG_CACHE(data: Record<string, any>) {
  const level: number = GLOBAL_OBJECT.logCount;
  const keys = Object.keys(data);
  if (keys.length > level) {
    const limit = Math.min(level * 0.5, 50);
    for (let i = 0; i < limit; i++) {
      delete data[keys[i]];
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
    const tmpfile = file + "-SYNC";
    try {
      fd = await fsp.open(tmpfile, "w");
      await fd.write(new Uint8Array(data), 0, data.length, 0);
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
  if (str.length > 5) str = str.slice(0, 5);
  let out = 0;
  for (let pos = 0, len = str.length; pos < len; pos++) {
    out += str.charCodeAt(pos);
  }
  return out;
};

// ? bucket sort for sorting
export function bucketSort(
  arr: Msg[],
  prop: keyof Msg,
  order: "ASC" | "DESC"
): Msg[] {
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
  const buckets: Msg[][] = Array.from({ length: bucketCount }, () => []);
  for (let i = 0; i < arr.length; i++) {
    const data: Msg = arr[i];
    const bucketIndex = Math.floor(
      (numb(data[prop].toString()) - minValue) / bucketSize
    );
    buckets[bucketIndex].push(data);
  }
  // ? merge buckets
  const result: Msg[] = [];
  for (const bucket of buckets) {
    if (bucket.length > 0) {
      result.push(...mergeSort(bucket, prop));
    }
  }
  return order === "DESC" ? result.reverse() : result;
}

function mergeSort(arr: Msg[], prop: keyof Msg): Msg[] {
  if (arr.length <= 1) return arr;
  const middle = Math.floor(arr.length / 2);
  const left = arr.slice(0, middle);
  const right = arr.slice(middle);
  return merge(mergeSort(left, prop), mergeSort(right, prop), prop);
}

function merge(left: Msg[], right: Msg[], prop: keyof Msg): Msg[] {
  const result: Msg[] = [];
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

const a = new Map();
Array.from(a.values());
