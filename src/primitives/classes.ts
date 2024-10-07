import { opendir, unlink } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { Packr } from "msgpackr";
import {
  type LOG_file_type,
  type Msg,
  type Msgs,
  type QueryType,
  type SchemaRelationOptions,
  type SchemaOptions,
  type SchemaColumnOptions,
  type Xtree_flag,
  type SchemaRelation,
  type wTrainType,
  type xPersistType,
} from "./types.ts";
import {
  findMessage,
  loadLog,
  binarySorted_insert,
  binarySearch_mutate,
  loadLogSync,
  validator,
  resizeRCT,
  SynFileWrit,
  SynFileWritWithWaitList,
  bucketSort,
  populateForeignKeys,
  setPopulateOptions,
  getFileSize,
  deepMerge,
  ExaId,
  conserveForeignKeys,
} from "./functions.ts";

export class GLOBAL_OBJECT {
  static EXABASE_MANAGERS: Record<string, Manager> = {};
  static MEMORY_PERCENT: number;
  static packr = new Packr();
  //? Regularity Cache Tank or whatever.
  static RCT: Record<string, Record<string, Msgs | undefined> | boolean> = {
    none: false, //? none is default for use with identifiers that has no need to cache
  };
  static db: any;
  static rct_level: number;
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

export class ExaSchema<Model> {
  table: Uppercase<string>;
  columns: {
    [x: string]: SchemaColumnOptions;
  } = {};
  relationship: SchemaRelation = {};
  unique_field?: Record<string, true> = undefined;
  foreign_field: Record<string, { table: string; type: "ONE" | "MANY" }> = {};
  constructor(options: SchemaOptions<Model>) {
    this.table = options?.table?.trim() as Uppercase<string>;
    // ? parse definitions
    if (this.table) {
      this.unique_field = {};
      this.columns = { ...(options?.columns || {}) };
      //? setting up _id type on initialization
      (this.columns as any)._id = { type: String };
      //? setting up secondary types on initialization
      for (const key in this.columns) {
        //? keep a easy track of relationships
        if (this.columns[key].relationType) {
          this.relationship[key] = this.columns[key] as SchemaRelationOptions;
          this.columns[key] = {
            relationship: key,
            type: Object as any,
            relationType: this.columns[key].relationType,
            default: this.columns[key].relationType === "MANY" ? [] : null,
            required: this.columns[key].required,
          };
        }
        //? validating default values
        if (this.columns[key].default !== undefined) {
          // ? check for type
          const v = validator(
            { [key]: this.columns[key].default },
            {
              [key]: {
                ...this.columns[key],
                default: undefined,
                required: false,
              },
            }
          );
          if (typeof v === "string")
            throw new ExaError("table ", this.table, " error ", v);
        }
        //? let's keep a record of the unique fields we correctly have
        if (this.columns[key].unique) {
          this.unique_field[key] = true;
          this.columns[key].index = true;
        }
      }
      //? check if theres a unique key entered else make it undefined to avoid a truthiness bug
      if (Object.keys(this.unique_field).length === 0) {
        this.unique_field = undefined;
      }
    } else {
      throw new ExaError("No table name provided!");
    }
    if (!GLOBAL_OBJECT.db) {
      throw new ExaError("database has not yet been created!");
    }
    GLOBAL_OBJECT.db.induce(this);
  }
}

export class Manager {
  public schema: ExaSchema<any>;
  public name: string;
  public tableDir: string = "";
  public isRelatedConstructed = false;
  public isActive = false;
  public RCT: Record<string, Msgs | undefined> = {};
  public LogFiles: LOG_file_type = {};
  public xIndex: XTree;
  constructor(schema: ExaSchema<any>) {
    this.schema = schema;
    this.name = schema.table;
    const columns = schema.columns;
    // ? setup indexTable for searching
    const indexTable: Record<string, boolean> = {};
    for (const key in columns) {
      indexTable[key] = columns[key].index || false;
    }
    // ? avoid indexing _id ok?
    indexTable["_id"] = false;
    this.xIndex = new XTree({
      indexTable,
    });
  }

  async setup(init: { exabaseDirectory: string; schemas: ExaSchema<any>[] }) {
    // ? setup steps
    this.tableDir = init.exabaseDirectory + "/" + this.schema.table + "/";
    // ? provide Xtree search index dir
    const persistKey = this.tableDir + "XLOG";
    this.xIndex.persistKey = persistKey;
    //? setup table directories
    if (!existsSync(this.tableDir)) {
      mkdirSync(this.tableDir);
    }
  }
  constructRelationships() {
    const allSchemas: ExaSchema<{}>[] = GLOBAL_OBJECT.db.schemas;
    if (this.schema.table) {
      //? keep a easy track of relationships
      if (this.schema.relationship) {
        this.schema.foreign_field = {};
        for (const key in this.schema.relationship) {
          if (typeof this.schema.relationship![key].target === "string") {
            const table = this.schema.relationship![key].target;
            const findSchema = allSchemas.find(
              (schema) => schema.table === table
            );
            if (findSchema) {
              this.schema.foreign_field[key] = {
                table,
                type: this.schema.relationship![key].relationType,
              };
            } else {
              throw new ExaError(
                "Relationship - ",
                table,
                " schema not found, make sure it is created before ",
                this.schema.table,
                " schema"
              );
            }
          } else {
            throw new ExaError(
              " Error on schema ",
              this.schema.table,
              " relationship target must be a string of a table and connected "
            );
          }
        }
      }
    }
    this.isRelatedConstructed = true;
  }
  async synchronize() {
    try {
      const dir = await opendir(this.tableDir!);
      const logFiles: string[] = [];
      const XLogFiles: string[] = [];
      for await (const dirent of dir) {
        // ? here we destroy invalid sync files, availability of such files
        // ? signifies an application crash stopping exabase from completing a commit
        if (dirent.name.includes("-SYNC")) {
          await unlink(this.tableDir + dirent.name);
          continue;
        }
        if (dirent.isFile()) {
          const fn = dirent.name;
          logFiles.push(fn);
          if ("XLOG".includes(fn)) {
            XLogFiles.push(fn);
            continue;
          }
          const name = this.tableDir + dirent.name;
          const LOG = await loadLog(name);
          const last_id = LOG.at(-1)?._id || "";
          this.LogFiles[fn] = { last_id, size: getFileSize(name) };
        }
      }
      await this.xIndex.load(this.tableDir, XLogFiles);
    } catch (err) {
      console.log({ err });
    }
  }
  getLogForInsert(): string {
    for (const filename in this.LogFiles) {
      const logFile = this.LogFiles[filename];
      //? size check is for inserts
      if (logFile.size < 3142656 /*3mb*/) {
        return filename;
      }
    }
    //? Create a new log file with an incremented number of LOG filename
    const nln = Object.keys(this.LogFiles).length + 1;
    const lfid = "LOG-" + nln;
    this.LogFiles[lfid] = { last_id: "", size: 0 };
    return lfid;
  }
  validate(data: any) {
    if (!this.isRelatedConstructed) {
      this.constructRelationships();
    }
    const v = validator(data, this.schema.columns);
    // ? setup relationship
    if (typeof v === "string")
      throw new ExaError(this.schema.table, " table error '", v, "'");
    return v as Msg;
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
      if (flag === "i") {
        await this.xIndex.createIndex(message, file);
        binarySorted_insert(message, messages);
      } else {
        // ? update search index
        if (flag === "d") {
          await this.xIndex.removeIndex(message, file, true);
        } else {
          await this.xIndex.createIndex(message);
        }
        binarySearch_mutate(message, messages, flag);
      }
      resolveFNs.push(() => resolve(message));
    }
    // ? run awaiting queries
    if (this.waiters[file].length) {
      this.write(this.waiters[file].splice(0), file);
    } else {
      //? resize RCT
      resizeRCT(this.RCT);
      // ? synchronies writer
      await SynFileWrit(
        this.tableDir + file,
        GLOBAL_OBJECT.packr.encode(messages)
      );
      // ? update this active RCT
      this.RCT[file] = messages;
      // ? update _logFile metadata index
      this.LogFiles[file].size = getFileSize(name);
      this.LogFiles[file].last_id = messages.at(-1)?._id!;
      resolveFNs.map((a) => a());
      this.runningQueue = false;
    }
  }
  async getLog(id?: string, next?: number) {
    if (next) {
      const file = "LOG-" + next;
      let RCTied = this.RCT[file];
      if (!RCTied) {
        RCTied = await loadLog(this.tableDir + file);
        this.RCT[file] = RCTied;
      }
      return RCTied;
    }
    const file = this.xIndex.log_search(id);
    let RCTied = this.RCT[file];
    if (!RCTied) {
      RCTied = await loadLog(this.tableDir + file);
      this.RCT[file] = RCTied;
    }
    return RCTied;
  }
  async find(query: QueryType<Record<string, any>>) {
    let RCTied = await this.getLog(query.one);
    if (query.many) {
      const skip = query.skip || 0;
      const take = query.take || 1000;
      let result: any[] = [];
      for (let log = 1; log <= Object.keys(this.LogFiles).length; log++) {
        const RCTied = await this.getLog(
          log === 1 ? query.one : undefined,
          log
        );
        for (let i = 0; i < RCTied.length && result.length < take; i++) {
          if (i >= skip) {
            result.push(RCTied[i]);
          }
        }
        if (result.length >= take) break;
      }
      RCTied = result;
      // ? sort results using bucketed merge.sort algorithm
      if (query.sort) {
        const key = Object.keys(query.sort)[0] as "_id";
        RCTied = bucketSort(RCTied, key, query.sort[key] as "ASC");
      }
      // ? populate relations
      if (query.populate) {
        query.populate = setPopulateOptions(
          query.populate,
          this.schema.foreign_field
        );
        return Promise.all(
          RCTied.map(async (item) => {
            await populateForeignKeys(item, query.populate!);
            return item;
          })
        );
      }
      // ?
      return RCTied;
    }
    // ? populate relations
    if (query.populate) {
      query.populate = setPopulateOptions(
        query.populate,
        this.schema.foreign_field
      );
    }
    return await findMessage(query, RCTied);
  }
  async runner(query: QueryType<Msg>): Promise<Msg | Msgs | number | void> {
    if (query.many || query.one) {
      return this.find(query);
    }
    if (query["search"]) {
      const indexes = this.xIndex.search(query.search as Msg, query.take);
      const searches = await Promise.all(
        indexes.map(
          (_id: string) =>
            this.find({
              one: _id,
              populate: query.populate,
              sort: query.sort,
            }) as Promise<Msg>
        )
      );
      if (query.sort) {
        const key = Object.keys(query.sort)[0] as "_id";
        return bucketSort(searches, key, query.sort[key] as "ASC");
      }
      return searches;
    }
    if (query["insert"]) {
      const message = this.validate(query.insert);
      // ? unique index checks and updates
      if (this.schema.unique_field) {
        const seachConstruct = {} as Msg;
        for (const key in this.schema.unique_field) {
          seachConstruct[key] = message[key];
        }
        const someIdex = this.xIndex.search(seachConstruct);
        if (someIdex.length) {
          throw new ExaError(
            "INSERT on table ",
            this.tableDir,
            " is not unique, ",
            someIdex[0]
          );
        }
      }
      message._id = ExaId();
      // ?   conserve foreign relationships
      await conserveForeignKeys(message, this.schema.foreign_field);
      return this.queue(this.getLogForInsert(), message, "i");
    }
    if (query["update"]) {
      const message = this.validate(query.update);
      if (message._id.length !== 24) {
        throw new ExaError("invalid id - " + message._id);
      }
      // ? unique index checks and updates
      if (this.schema.unique_field) {
        const seachConstruct = {} as Msg;
        for (const key in this.schema.unique_field) {
          seachConstruct[key] = message[key];
        }
        const someIdex = this.xIndex.search(seachConstruct);
        if (someIdex.length) {
          throw new ExaError(
            "UPDATE on table ",
            this.tableDir,
            " is not unique, ",
            someIdex[0]
          );
        }
      }
      const file = this.xIndex.log_search(message._id);
      if (typeof file !== "string")
        throw new ExaError("item to update not found");
      const oldMessage = (await this.find({ one: query.update._id })) as Msg;
      if (!oldMessage) {
        throw new ExaError("item to update not found");
      } else {
        await this.xIndex.removeIndex(oldMessage, file, false);
      }
      // ?   conserve foreign relationships
      await conserveForeignKeys(message, this.schema.foreign_field);
      return this.queue(file, message, "u");
    }
    if (query["count"]) {
      if (query["count"] === true) {
        return this.xIndex.keys.length;
      }
      return this.xIndex.count(query["count"] as Msg);
    }
    if (query["delete"]) {
      if (query.delete.length !== 24) {
        throw new ExaError("invalid id - " + query.delete);
      }
      const file = this.xIndex.log_search(query.delete);
      if (typeof file !== "string")
        throw new ExaError("item to delete not found");

      const message = (await this.find({ one: query.delete })) as Msg;
      if (!message) {
        throw new ExaError("item to delete not found");
      }
      return this.queue(file, message, "d");
    }
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
  persistKey?: string;
  tree: Record<string, XNode> = {};
  keys: string[] = [];
  logKeys: string[] = [];
  indexTable: Record<string, boolean>;
  constructor(init: { indexTable: Record<string, boolean> }) {
    this.indexTable = init.indexTable;
  }
  search(search: Msg, take: number = Infinity) {
    const Indexes: number[][] = [];
    for (const key in search) {
      const index = this.tree[key]?.map[search[key as "_id"]];
      if (index?.length) Indexes.push(index);
    }
    if (Indexes.length === 0) return [];
    const result = new Set<number>();
    const smallestIndex = Indexes.reduce((a, b) =>
      a.length < b.length ? a : b
    );
    for (const id of smallestIndex) {
      if (Indexes.every((index) => index.includes(id))) {
        result.add(id);
        if (result.size >= take) break;
      }
    }
    return Array.from(result).map((idx) => this.keys[idx]);
  }
  log_search(id: string = "") {
    const logKey = this.tree["_exa_log_index"].map?.[id];
    if (logKey) return this.logKeys[logKey[0]];
    return " LOG-1";
  }
  count(search: Msg) {
    let resultsCount: number = 0;
    for (const key in search) {
      if (!this.indexTable[key]) continue;
      if (this.tree[key]) {
        resultsCount += this.tree[key].map[search[key as "_id"]].length;
      }
    }
    return resultsCount;
  }
  createIndex(data: Msg, logFile?: string) {
    // ? retrieve log key index
    if (logFile) {
      let logKey = this.logKeys.indexOf(logFile);
      if (logKey === -1) {
        logKey = this.logKeys.push(logFile) - 1;
      }
      //  ? index it log file
      this.tree["_exa_log_index"].create(data._id, logKey);
    }
    // ? retrieve msg key index
    let idk = this.keys.indexOf(data._id);
    if (idk === -1) {
      idk = this.keys.push(data._id) - 1;
    }
    // ? save keys in their corresponding nodes
    for (const key in data) {
      if (!this.indexTable[key]) continue;
      if (!this.tree[key]) {
        this.tree[key] = new XNode();
      }
      this.tree[key].create(data[key as "_id"], idk);
    }
    return this.persist();
  }
  removeIndex(data: Msg, logFile: string, drop: boolean) {
    //  ? remove other attributes indexes
    let idk = this.keys.indexOf(data._id);
    if (idk === -1) return;
    for (const key in data) {
      if (!this.tree[key]) continue;
      this.tree[key].drop(data[key as "_id"], idk);
    }
    if (drop) {
      this.keys.splice(idk, 1);
      // ? remove log tree index
      const logKey = this.logKeys.indexOf(logFile);
      this.tree["_exa_log_index"].drop(data._id, logKey);
    }

    return this.persist();
  }
  private persist() {
    const obj: xPersistType = {
      keys: this.keys,
      logKeys: this.logKeys,
      maps: {},
    };
    const map = Object.keys(this.tree);
    for (let i = 0; i < map.length; i++) {
      obj.maps[map[i]] = this.tree[map[i]].map;
    }
    return SynFileWritWithWaitList.write(
      this.persistKey!,
      GLOBAL_OBJECT.packr.encode(obj)
    );
  }
  async load(persistKey: string, logFiles: string[]) {
    let tree: Record<string, Record<string, number[]>> = {};
    for (const log of logFiles) {
      const data: xPersistType = loadLogSync(persistKey + log, {});
      // ? merge  keys arrays
      Array.prototype.push.apply(this.keys, data.keys || []);
      Array.prototype.push.apply(this.logKeys, data.logKeys || []);
      // ? merge objects
      if (typeof data?.maps === "object") {
        tree = deepMerge(tree, data.maps);
      }
    }
    for (const key in tree) {
      if (this.tree[key]) {
        this.tree[key].map = deepMerge(this.tree[key].map, tree[key]);
      } else {
        this.tree[key] = new XNode(tree[key]);
      }
    }
    if (!this.tree["_exa_log_index"]) {
      this.tree["_exa_log_index"] = new XNode();
    }
  }
}
