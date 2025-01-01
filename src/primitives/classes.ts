import { opendir, unlink } from "node:fs/promises";
import { existsSync, mkdirSync, rmdirSync, statSync } from "node:fs";
import { Packr } from "msgpackr";
import {
  type LOG_file_type,
  type Msg,
  type Msgs,
  type QueryType,
  type wTrainType,
  type xPersistType,
  type Xtree_flag,
  type xTreeType,
} from "./types.ts";
import {
  binarySearch_mutate,
  binarySorted_insert,
  bucketSort,
  deepMerge,
  ExaId,
  findMessage,
  getFileSize,
  intersect,
  loadLog,
  loadLogSync,
  msgId,
  resizeLOG_CACHE,
  SynFileWrit,
  SynFileWritWithWaitList,
} from "./functions.ts";
import type { S3 } from "./blob-lib.ts";

export class GLOBAL_OBJECT {
  static EXABASE_MANAGERS: Record<string, Manager> = {};
  static MEMORY_PERCENT: number;
  static packr = new Packr();
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
  public isRelatedConstructed = false;
  public isActive = false;
  public LOG_CACHE: Record<string, Msgs | xTreeType | undefined> = {};
  public LogFiles: LOG_file_type = {};
  public xIndex: XTree;
  constructor(db_dir: string, table: string) {
    this.name = table;
    // ? setup steps
    this.tableDir = db_dir + "/" + this.name + "/";
    //? setup table directories
    if (!existsSync(this.tableDir)) {
      mkdirSync(this.tableDir);
    }
    // ? setup indexTable for searching
    const indexTable: Record<string, boolean> = {};
    // for (const key in schema.columns) {
    //   indexTable[key] = schema.columns[key].index || false;
    // }
    // ? avoid indexing _id ok?
    indexTable["_id"] = false;
    this.xIndex = new XTree({
      indexTable,
    });
    // ? provide Xtree search index dir
    this.xIndex.tableDir = this.tableDir;
  }
  drop() {
    rmdirSync(this.tableDir, { recursive: true });
  }
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
          if (fn.includes("XLOG-")) continue;
          if (fn.includes("LOG-")) {
            const name = this.tableDir + dirent.name;
            const length = loadLogSync(name, []).length;
            this.LogFiles[fn] = { size: getFileSize(name), length };
            await this.xIndex.sync(this.tableDir, "X" + fn);
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
  getLogForInsert(): string {
    for (const filename in this.LogFiles) {
      const logFile = this.LogFiles[filename];
      //? size check is for inserts
      if (logFile.size < 1024000 /*1mb*/) {
        return filename;
      }
    }
    //? Create a new log file with an incremented number of LOG filename
    const nln = Object.keys(this.LogFiles).length + 1;
    const lfid = "LOG-" + nln;
    this.LogFiles[lfid] = { size: 0, length: 0 };
    return lfid;
  }

  public waiters: Record<string, wTrainType[]> = {};
  runningQueue: boolean = false;
  queue(file: string, message: Msg, flag: Xtree_flag) {
    let R: ((value: unknown) => void) | undefined;
    const q = new Promise((resolve) => {
      R = resolve;
    });
    if (!this.waiters[file]) {
      this.waiters[file] = [[R!, message, flag]];
    } else {
      this.waiters[file].push([R!, message, flag]);
    }
    if (this.runningQueue === false) {
      this.write(this.waiters[file].splice(0), file);
    }
    return q as Promise<number | void | Msgs | Msg>;
  }
  async write(queries: wTrainType[], file: string) {
    this.runningQueue = true;
    const resolveFNs = [];
    // ? do the writing by
    const name = this.tableDir + file;

    const messages = await loadLog(name);

    for (const [resolve, message, flag] of queries) {
      const xFile = "X" + file;
      let cachedXlog: xTreeType = this.LOG_CACHE[xFile] as xTreeType;
      if (!cachedXlog) {
        cachedXlog = await this.xIndex.load(xFile);
        this.LOG_CACHE[xFile] = cachedXlog;
      }
      if (flag === "i") {
        await this.xIndex.createIndex(cachedXlog, message, file);
        binarySorted_insert(message, messages);
      } else {
        // ? update search index
        if (flag === "d") {
          await this.xIndex.removeIndex(cachedXlog, message, file, true);
        } else {
          await this.xIndex.createIndex(cachedXlog, message, file);
        }
        binarySearch_mutate(message, messages, flag);
      }
      resolveFNs.push(() => resolve(message));
    }
    // ? run awaiting queries
    if (this.waiters[file].length) {
      this.write(this.waiters[file].splice(0), file);
    } else {
      //? resize LOG_CACHE
      resizeLOG_CACHE(this.LOG_CACHE);
      // ? synchronies writer
      await SynFileWrit(
        this.tableDir + file,
        GLOBAL_OBJECT.packr.encode(messages)
      );
      // ? update this active LOG_CACHE
      this.LOG_CACHE[file] = messages;
      // ? update _logFile metadata index
      this.LogFiles[file].size = getFileSize(name);
      this.LogFiles[file].length = messages.length;
      resolveFNs.map((a) => a());
      this.runningQueue = false;
    }
  }

  async find(
    query: QueryType<Record<string, any>>
  ): Promise<(Msg | undefined)[]> {
    let cachedLog;
    if (!query.where?.["_id"]) {
      if (!query.where?.["*"]) {
        const indexes = await this.search(query.where as Msg, query.take);
        return Promise.all(
          indexes.map((_id: string) =>
            this.findOne({
              where: { _id },
            })
          )
        );
      }
      const skip = query.skip || 0;
      const take = query.take || 1000;
      let result: any[] = [];
      for (let log = 1; log <= Object.keys(this.LogFiles).length; log++) {
        const file = "LOG-" + log;
        let cachedLog = this.LOG_CACHE[file] as Msgs;
        if (!cachedLog) {
          cachedLog = await loadLog(this.tableDir + file);
          this.LOG_CACHE[file] = cachedLog;
        }
        for (let i = 0; i < cachedLog.length && result.length < take; i++) {
          if (i >= skip) {
            result.push(cachedLog[i]);
          }
        }
        if (result.length >= take) break;
      }
      cachedLog = result;
      // ? sort results using bucketed merge.sort algorithm
      if (query.sort) {
        const key = Object.keys(query.sort)[0] as "_id";
        cachedLog = bucketSort(cachedLog, key, query.sort[key] as "ASC");
      }
      // ?
      return cachedLog;
    }
    return [];
  }
  async findOne(query: { where: { _id: string } }): Promise<Msg | undefined> {
    if (query.where?.["_id"]) {
      const file = msgId(query.where?.["_id"]);
      const log = (await this.getLog(file)) as Msgs;
      return findMessage(query.where?.["_id"], log || []);
    }
  }
  async getLog(
    file: string,
    x: boolean = false
  ): Promise<Msgs | xTreeType | undefined> {
    if (x) {
      const xFile = "X" + file;
      let cachedXlog: xTreeType = this.LOG_CACHE[xFile] as xTreeType;
      if (!cachedXlog) {
        cachedXlog = await this.xIndex.load(xFile);
        this.LOG_CACHE[xFile] = cachedXlog;
      }
      return cachedXlog;
    }
    let cachedLog = this.LOG_CACHE[file];
    if (!cachedLog && this.LogFiles[file]) {
      cachedLog = await loadLog(this.tableDir + file);
      this.LOG_CACHE[file] = cachedLog;
    }
    return cachedLog;
  }
  async search(search: Msg, take = 1000) {
    const result: string[] = [];
    for (let log = 1; log <= Object.keys(this.LogFiles).length; log++) {
      const file = "XLOG-" + log;
      let cachedLog = this.LOG_CACHE[file] as xTreeType;
      if (!cachedLog) {
        cachedLog = await this.xIndex.load(file);
        this.LOG_CACHE[file] = cachedLog;
      }
      const indexes = this.xIndex.search(cachedLog, search, take);
      // @ts-ignore
      result.push(indexes);
      if (result.length >= take) break;
    }
    return result.flat();
  }
  async count(search: Msg) {
    let result: number = 0;
    for (let log = 1; log <= Object.keys(this.LogFiles).length; log++) {
      const file = "XLOG-" + log;
      let cachedLog = this.LOG_CACHE[file] as xTreeType;
      if (!cachedLog) {
        cachedLog = await this.xIndex.load(file);
        this.LOG_CACHE[file] = cachedLog;
      }
      result += this.xIndex.count(cachedLog, search);
    }
    return result;
  }
  async runner(query: QueryType<Msg>): Promise<Msgs | Msg | number | void> {
    if (query.get) {
      return this.find(query) as Promise<Msgs>;
    }
    if (typeof query["insert"] === "object" && !Array.isArray(query.insert)) {
      const log = this.getLogForInsert();
      query.insert["_id"] = ExaId(log);
      return this.queue(log, query.insert as Msg, "i");
    }
    if (typeof query["update"] === "object" && !Array.isArray(query.update)) {
      if (typeof query.update._id === "string" && query.update._id) {
        const file = msgId(query.update._id);
        const Xlog = (await this.getLog(file, true)) as xTreeType;
        await this.xIndex.removeIndex(Xlog, query.update as Msg, file, false);
        return this.queue(file, query.update as Msg, "u");
      }
    }
    if (query["count"]) {
      if (query["count"] === true) {
        const logFiles = Object.values(this.LogFiles);
        if (!logFiles.length) return 0;
        let len = 0;
        for (const log of logFiles) {
          len += log.length;
        }
        return len;
      }
      return this.count(query["count"] as Msg);
    }
    if (query["delete"]) {
      const file = msgId(query.where?.["_id"]);
      return this.queue(file, query.where as Msg, "d");
    }
    console.log({ query });
    throw new ExaError("Invalid query");
  }
}

class XNode {
  map: Record<string, number[]> = {};
  constructor(map?: Record<string, number[]>) {
    this.map = map || {};
  }
  create(val: string, idk: number) {
    if (!this.map[val]) {
      this.map[val] = [];
    }
    this.map[val].push(idk);
  }
  drop(val: string, idk: number) {
    if (this.map[val]) {
      const idp = this.map[val].indexOf(idk);
      this.map[val].splice(idp, 1);
      if (this.map[val].length === 0) {
        delete this.map[val];
      }
    }
  }
}

export class XTree {
  tableDir?: string;
  indexTable: Record<string, boolean>;
  constructor(init: { indexTable: Record<string, boolean> }) {
    this.indexTable = init.indexTable;
  }
  search(xtree: xTreeType, search: Msg, _take: number = Infinity) {
    const Indexes: number[][] = [];
    //  ? get the search keys
    for (const key in search) {
      if (!this.indexTable[key]) continue;
      const value = search[key] as "_id";
      if (xtree.tree[key]) {
        // ? allow text term searching
        if (typeof value === "string") {
          const labels = Object.keys(xtree.tree[key].map).filter((cur) =>
            cur.includes(value)
          );
          const pack: number[][] = [];
          for (const label of labels) {
            pack.push(xtree.tree[key].map[label]);
          }
          Indexes.push(pack.flat());
        } else {
          // ? allow other data type searching
          Indexes.push(xtree.tree[key].map[value] || []);
        }
      }
    }
    //  ? get return the keys if the length is 1
    if (Indexes.length === 0) return [];
    if (Indexes.length === 1) return Indexes[0].map((idx) => xtree.keys[idx]);
    //  ? get return the keys if the length is more than one
    return intersect(Indexes).map((idx) => xtree.keys[idx]);
  }
  count(xtree: xTreeType, search: Msg) {
    let resultsCount: number = 0;
    for (const key in search) {
      if (!this.indexTable[key]) continue;
      if (xtree.tree[key]) {
        resultsCount += xtree.tree[key].map[search[key as "_id"]].length;
      }
    }
    return resultsCount;
  }
  async createIndex(xtree: xTreeType, data: Msg, log: string) {
    // ? retrieve msg key index
    let idk = xtree.keys.indexOf(data._id);
    if (idk === -1) {
      idk = xtree.keys.push(data._id) - 1;
    }
    // ? save keys in their corresponding nodes
    for (const key in data) {
      if (!this.indexTable[key]) continue;
      if (!xtree.tree[key]) {
        xtree.tree[key] = new XNode();
      }
      xtree.tree[key].create(data[key as "_id"], idk);
    }
    await this.persist(xtree, this.tableDir + "X" + log);
  }
  async removeIndex(xtree: xTreeType, data: Msg, log: string, drop: boolean) {
    //  ? remove other attributes indexes
    let idk = xtree.keys.indexOf(data._id);
    if (idk === -1) return;
    for (const key in data) {
      if (!xtree.tree[key]) continue;
      xtree.tree[key].drop(data[key as "_id"], idk);
    }
    if (drop) {
      xtree.keys.splice(idk, 1);
    }
    return this.persist(xtree, this.tableDir + "X" + log);
  }
  private persist(xtree: xTreeType, file: string) {
    const obj: xPersistType = {
      keys: xtree.keys,
      maps: {},
    };
    const map = Object.keys(xtree.tree);
    for (let i = 0; i < map.length; i++) {
      obj.maps[map[i]] = xtree.tree[map[i]].map;
    }
    return SynFileWritWithWaitList.write(file, GLOBAL_OBJECT.packr.encode(obj));
  }
  async load(log: string) {
    let nodesTree: Record<string, Record<string, number[]>> = {};
    const xtree: xTreeType = { keys: [], tree: {} };
    //? Load logs in parallel
    const data: xPersistType = (await loadLog(this.tableDir + log)) as any;
    if (data.keys) Array.prototype.push.apply(xtree.keys, data.keys);
    if (data.maps) nodesTree = data.maps;
    for (const key in nodesTree) {
      if (xtree.tree[key]) {
        xtree.tree[key].map = deepMerge(xtree.tree[key].map, nodesTree[key]);
      } else {
        xtree.tree[key] = new XNode(nodesTree[key]);
      }
    }
    return xtree;
  }
  async sync(tableDir: string, log: string) {
    //? check if xlog-n exist and is fresher than log-n else rebuild xlog-n
    const file = tableDir + log;
    // console.log(
    //   { xlog: log, tableDir, file, log: log.slice(1) },
    //   new Date(statSync(file).atimeMs).toString(),
    //   "\n",
    //   new Date(statSync(tableDir + log.slice(1)).atimeMs).toString()
    // );
    if (statSync(file).atimeMs < statSync(tableDir + log.slice(1)).atimeMs) {
      return;
    }
    const LOG = loadLogSync(file, {});
    const xtree = await this.load(file);
    for (let i = 0; i < LOG.length; i++) {
      await this.createIndex(xtree, LOG[i], file);
    }
  }
}
