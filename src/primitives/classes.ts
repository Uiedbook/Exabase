import { opendir, unlink } from "node:fs/promises";
import { existsSync, mkdirSync, rmdirSync, statSync } from "node:fs";
import { Packr, Unpackr } from "msgpackr";
import { type LOG_file, type Msg, type QueryType } from "./types.ts";
import {
  bucketSort,
  ExaId,
  loadLog,
  loadLogSync,
  msgId,
  SynFileWritWithWaitList,
} from "./functions.ts";
import type { S3 } from "./blob-lib.ts";
import { isNativeAccelerationEnabled } from "msgpackr";
if (!isNativeAccelerationEnabled)
  console.warn(
    "Native acceleration not enabled, verify that install finished properly"
  );

export class GLOBAL_OBJECT {
  static EXABASE_MANAGERS: Record<string, Manager> = {};
  static MEMORY_PERCENT: number;
  static pack = new Packr({ useRecords: false }).pack;
  static unpack = new Unpackr().unpack;
  static db: any;
  static logCount: number;
  static s3: S3;
  static writeWindow: number;
}

export class ExaError extends Error {
  constructor(...err: any[]) {
    const message = ExaError.geterr(err);
    super(message);
  }
  private static geterr(err: string[]) {
    return String(`Exabase: ${err.join("")}`);
  }
}

export class Manager {
  public name: string;
  public tableDir: string = "";
  public isActive = false;
  public LogFiles: LOG_file = {};
  public LOG_CACHE: Record<string, XTree> = {};
  constructor(db_dir: string, table: string) {
    this.name = table;
    // ? setup steps
    this.tableDir = db_dir + "/" + this.name + "/";
    //? setup table directories
    if (!existsSync(this.tableDir)) {
      mkdirSync(this.tableDir);
    }
  }
  drop() {
    rmdirSync(this.tableDir, { recursive: true });
  }

  // deserialize(buffer: Buffer): Struct {
  //   return GLOBAL_OBJECT.unpack(buffer);
  // }
  async synchronize() {
    try {
      const dir = await opendir(this.tableDir!);
      for await (const dirent of dir) {
        // ? here we destroy invalid sync files, availability of such files
        // ? signifies an application crash stopping exabase from completing a commit
        if (dirent.name.includes("-SYNC")) {
          await unlink(this.tableDir + dirent.name);
          continue;
        }
        if (dirent.isFile()) {
          const fn = dirent.name;
          if (fn.includes("LOG")) {
            const name = this.tableDir + fn;
            const length = loadLogSync(name, []).length;
            this.LogFiles[fn] = { size: statSync(name).size, length };
          }
        }
      }
      console.log(
        "Exabase: table " + this.tableDir.split("/")[1] + " is now ready!"
      );
    } catch (err) {
      console.log({ err });
    }
  }
  // TODO: make async
  async aggregate(count = false, query: Record<string, any>, take: number) {
    if (count) {
      let results = 0;
      for (const key in this.LogFiles) {
        const log = await this.load(key);
        results += log.count(query);
      }
      return results;
    }
    let results2 = [];
    for (const key in this.LogFiles) {
      const log = await this.load(key);
      results2.push(log.search(query));
      if (results2.length > take) break;
    }
    return results2.flat();
  }

  async load(log: string) {
    let tree = this.LOG_CACHE[log];
    if (tree) return tree;
    const file = this.tableDir + log;
    const data = await loadLog(file);
    console.log({ data });
    const nodes = Object.keys(data?.nodes);
    console.log({ nodesl: data?.nodes, nodes });
    for (let i = 0; i < nodes.length; i++) {
      const attr = nodes[i];
      console.log(data?.nodes?.[attr]);
      // data.nodes[attr] = new Set(data.nodes[attr]);
      // data.nodes.set[attr] = new Set(data.nodes[attr]);
    }
    tree = new XTree({ file, log });
    if (data?.base) tree.base = new Map(Object.entries(data.base || {}));
    if (data?.nodes) tree.nodes = new Map(Object.entries(data.nodes || []));
    this.LOG_CACHE[log] = tree;
    return tree;
  }
  getLogForInsert() {
    for (const filename in this.LogFiles) {
      const logFile = this.LogFiles[filename];
      //? size check is for inserts
      if (logFile.size < 1024000 /*1mb*/) {
        return this.load(filename);
      }
    }
    //? Create a new log file with an incremented number of LOG filename
    const nln = Object.keys(this.LogFiles).length + 1;
    const log = "LOG" + nln;
    this.LogFiles[log] = { size: 0, length: 0 };
    return this.load(log);
  }

  async find(
    query: QueryType<Record<string, any>>
  ): Promise<(Msg | undefined)[]> {
    if (!query.get?.["_id"]) {
      if (!query.get?.["*"]) {
        return this.aggregate(
          false,
          query.get as Msg,
          1000
        ) as unknown as Msg[];
      }
      let result: Msg[] = this.aggregate(
        false,
        {},
        (query.take || 1000) + (query.skip || 0)
      ) as unknown as Msg[];
      if (query.skip) {
        result = result.slice(query.skip);
      }
      // ? sort results using bucketed merge.sort algorithm
      if (query.sort) {
        const key = Object.keys(query.sort)[0] as "_id";
        result = bucketSort(result, key, query.sort[key] as "ASC");
      }
      // ?
      return result;
    }
    return [];
  }
  async findOne(query: { where: { _id: string } }): Promise<Msg | undefined> {
    if (query.where?.["_id"]) {
      const file = msgId(query.where?.["_id"]);
      const log = await this.load(file);
      return log.base.get(query.where?.["_id"]);
    }
  }

  async runner(query: QueryType<Msg>): Promise<Msg[] | Msg | number | void> {
    if (query.get) {
      return this.find(query) as Promise<Msg[]>;
    }
    if (typeof query["insert"] === "object") {
      const log = await this.getLogForInsert();
      query.insert["_id"] = ExaId(log.log);
      return log.index(query.insert as Msg);
    }
    if (query.update?._id?.length) {
      const file = msgId(query.update._id);
      const log = await this.load(file);
      return log.index(query.update as Msg);
    }
    if (query["count"]) {
      return this.aggregate(true, query["count"] as any, 0);
    }
    if (query["delete"]) {
      const file = msgId(query.delete);
      const log = await this.load(file);
      return log.index({ _id: query.delete }, true);
    }
    console.log(query);
    throw new ExaError("Invalid query");
  }
}

class XTree {
  log: string;
  file: string;
  base: Map<string, Msg>; // Base storage mapping IDs to data
  nodes: Map<
    string, // The attribute this node indexes
    Map<any, Set<string>> // Maps attribute values to sets of IDs
  >;
  constructor(init: { log: string; file: string }) {
    this.base = new Map<string, any>(); // ID is now always a string
    this.nodes = new Map<string, any>();
    this.log = init.log;
    this.file = init.file;
  }

  // Add or update data in the tree
  index(data: Msg, drop: boolean = false) {
    const id: string = data._id;
    // Drop existing mappings first if they exist
    const prevData = this.base.get(id);
    if (prevData) this.drop(id);
    if (drop) return;
    this.base.set(id, data);
    for (const [attribute, value] of Object.entries(data)) {
      if (attribute === "_id") continue;
      // if (!this.indexTable[attribute]) continue;
      let node = this.nodes.get(attribute);
      if (!node) {
        node = new Map<any, Set<string>>();
        this.nodes.set(attribute, node);
      }
      if (!node.values) {
        node.set(value, new Set<string>());
      }
      node.get(value)!.add(id);
    }
    SynFileWritWithWaitList.write(this.file, this.serialize());
    return data;
  }

  // Drop all mappings for an ID
  private drop(id: string): void {
    const data = this.base.get(id);
    if (!data) return;
    for (const [attribute, value] of Object.entries(data)) {
      const node = this.nodes.get(attribute);
      if (!node || !node.has(value)) continue;
      const idSet = node.get(value)!;
      idSet.delete(id);
      console.log({ idSet, id, data });

      if (idSet.size === 0) {
        node.delete(value); // Deferred cleanup
      }
      if (node.size === 0) {
        this.nodes.delete(attribute);
      }
    }
    this.base.delete(id);
  }

  // Multi-attribute search
  search(query: Record<string, any>): Msg[] {
    const entries = Object.entries(query);
    if (entries.length === 0) {
      return Array.from(this.base.values());
    }
    // Start with the smallest set for optimal intersection
    let smallestSet: Set<string> | null = null;
    let smallestSize = Infinity;
    const results: Set<string>[] = [];
    for (const [key, value] of entries) {
      const node = this.nodes.get(key);
      const values = node?.get(value);
      if (!node || !values) return [];
      results.push(values);
      if (values.size < smallestSize) {
        smallestSize = values.size;
        smallestSet = values;
      }
    }
    if (results.length === 0) return [];
    // Intersect using Sets
    main: for (const values of results) {
      for (const id of smallestSet!) {
        if (!values?.has(id)) {
          smallestSet!.delete(id);
          if (smallestSet!.size === 0) break main;
          break;
        }
      }
    }
    return Array.from(smallestSet!).map((id) => this.base.get(id)!);
  }
  // Multi-attribute relational operations
  operator<T extends Record<string, any>>(
    query: T,
    operator: Record<keyof T, "eq" | "lt" | "gt" | "lte" | "gte" | "like">
  ): Msg[] {
    const entries = Object.entries(query);
    if (entries.length === 0) {
      return Array.from(this.base.values());
    }
    const results: Set<string>[] = [];
    // Start with the smallest set for optimal intersection
    let smallestSet: Set<string> | null = null;
    let smallestSize = Infinity;
    for (const [key, value] of entries) {
      const node = this.nodes.get(key);
      if (!node) return []; // Key not found, return empty results
      const combinedSet = new Set<string>();
      const op = operator[key]; //  get the operator
      for (const [k, valSet] of node) {
        let match = false;
        switch (op) {
          case "like":
            match = k.includes(value);
            break;
          case "gt":
            match = k > value;
            break;
          case "lt":
            match = k < value;
            break;
          case "gte":
            match = k >= value;
            break;
          case "lte":
            match = k <= value;
            break;
          case "eq":
          default: //  defaults to eq
            match = k === value;
            break;
        }
        if (match) {
          for (const item of valSet || []) {
            combinedSet.add(item);
          }
        }
      }
      if (combinedSet.size > 0) {
        results.push(combinedSet);
        // Finding the smallest Set
        if (combinedSet.size < smallestSize) {
          smallestSize = combinedSet.size;
          smallestSet = combinedSet;
        }
      }
    }
    //  return if no results
    if (results.length === 0) return [];
    // Intersect using Sets
    main: for (const values of results) {
      for (const id of smallestSet!) {
        if (!values?.has(id)) {
          smallestSet!.delete(id);
          if (smallestSet!.size === 0) break main;
          break;
        }
      }
    }
    // map data to values
    return Array.from(smallestSet!).map((id) => this.base.get(id)!);
  }

  // Multi-attribute count
  count(query: Record<string, any> | true): number {
    if (query === true) {
      return this.base.size;
    }
    const entries = Object.entries(query);
    // Start with the smallest set for optimal intersection
    let smallestSet: Set<string> | null = null;
    let smallestSize = Infinity;
    for (const [key, value] of entries) {
      const node = this.nodes.get(key);
      const values = node?.get(value);
      if (!node || !values) return 0;
      if (values.size < smallestSize) {
        smallestSize = values.size;
        smallestSet = values;
      }
    }
    // Intersect using Sets
    const result = new Set(smallestSet);
    for (const [key, value] of entries) {
      const node = this.nodes.get(key);
      const values = node?.get(value);
      for (const id of result) {
        if (!values?.has(id)) {
          result.delete(id);
        }
      }
    }
    return result.size;
  }

  serialize(): Buffer {
    return GLOBAL_OBJECT.pack({
      base: this.base,
      nodes: this.nodes,
    });
  }
}
