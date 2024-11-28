import { opendir, unlink } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { Packr } from "msgpackr";
import {
  type LOG_file_type,
  type Msg,
  type Msgs,
  type QueryType,
  type SchemaColumnOptions,
  type SchemaOptions,
  type SchemaRelation,
  type SchemaRelationOptions,
  type wTrainType,
  type xPersistType,
  type Xtree_flag,
} from "./types.ts";
import {
  binarySearch_mutate,
  binarySorted_insert,
  bucketSort,
  conserveForeignKeys,
  deepMerge,
  ExaId,
  findMessage,
  getFileSize,
  intersect,
  loadLog,
  loadLogSync,
  msgId,
  populateForeignKeys,
  resizeRCT,
  setPopulateOptions,
  SynFileWrit,
  SynFileWritWithWaitList,
  validator,
} from "./functions.ts";
import type { S3 } from "./blob-lib.ts";

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
          if (typeof v === "string") {
            throw new ExaError("table ", this.table, " error ", v);
          }
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
          this.LogFiles[fn] = { size: getFileSize(name) };
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
      if (logFile.size < 102400 /*100kb*/) {
        return filename;
      }
    }
    //? Create a new log file with an incremented number of LOG filename
    const nln = Object.keys(this.LogFiles).length + 1;
    const lfid = "LOG-" + nln;
    this.LogFiles[lfid] = { size: 0 };
    return lfid;
  }
  validate(data: any) {
    if (!this.isRelatedConstructed) {
      this.constructRelationships();
    }
    const v = validator(data, this.schema.columns);
    // ? setup relationship
    if (typeof v === "string") {
      throw new ExaError(this.schema.table, " table error '", v, "'");
    }
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
        await this.xIndex.createIndex(message);
        binarySorted_insert(message, messages);
      } else {
        // ? update search index
        if (flag === "d") {
          await this.xIndex.removeIndex(message, true);
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
      resolveFNs.map((a) => a());
      this.runningQueue = false;
    }
  }
  async find(query: QueryType<Record<string, any>>) {
    let RCTied;
    if (query.many) {
      const skip = query.skip || 0;
      const take = query.take || 1000;
      let result: any[] = [];
      for (let log = 1; log <= Object.keys(this.LogFiles).length; log++) {
        const file = "LOG-" + log;
        let RCTied = this.RCT[file];
        if (!RCTied) {
          RCTied = await loadLog(this.tableDir + file);
          this.RCT[file] = RCTied;
        }
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
    if (query.one) {
      const file = msgId(query.one);
      RCTied = this.RCT[file];
      if (!RCTied) {
        RCTied = await loadLog(this.tableDir + file);
        this.RCT[file] = RCTied;
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
        const searchConstruct = {} as Msg;
        for (const key in this.schema.unique_field) {
          searchConstruct[key] = message[key];
        }
        const someIdex = this.xIndex.search(searchConstruct);
        if (someIdex.length && someIdex[0] !== message._id) {
          throw new ExaError(
            "INSERT on table ",
            this.tableDir,
            " is not unique "
          );
        }
      }
      const log = this.getLogForInsert();
      message._id = ExaId(log);
      // ?   conserve foreign relationships
      await conserveForeignKeys(message, this.schema.foreign_field);
      return this.queue(log, message, "i");
    }
    if (query["update"]) {
      const message = this.validate(query.update);
      // ? unique index checks and updates
      if (this.schema.unique_field) {
        const searchConstruct = {} as Msg;
        for (const key in this.schema.unique_field) {
          searchConstruct[key] = message[key];
        }
        const someIdex = this.xIndex.search(searchConstruct);
        if (someIdex.length && someIdex[0] !== message._id) {
          throw new ExaError(
            "UPDATE on table ",
            this.tableDir,
            " is not unique"
          );
        }
      }
      const file = msgId(message._id);
      if (typeof file !== "string") {
        throw new ExaError("item to update not found");
      }
      const oldMessage = (await this.find({ one: query.update._id })) as Msg;
      if (!oldMessage) {
        throw new ExaError("item to update not found");
      } else {
        await this.xIndex.removeIndex(oldMessage, false);
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
      const file = msgId(query.delete);
      if (typeof file !== "string") {
        throw new ExaError("item to delete not found");
      }
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
  indexTable: Record<string, boolean>;
  constructor(init: { indexTable: Record<string, boolean> }) {
    this.indexTable = init.indexTable;
  }
  search(search: Msg, _take: number = Infinity) {
    const Indexes: number[][] = [];
    //  ? get the search keys
    for (const key in search) {
      if (!this.indexTable[key]) continue;
      const value = search[key] as "_id";
      if (this.tree[key]) {
        // ? allow text term searching
        if (typeof value === "string") {
          const labels = Object.keys(this.tree[key].map).filter((cur) =>
            cur.includes(value)
          );
          for (const label of labels) {
            Indexes.push(this.tree[key].map[label]);
          }
        } else {
          // ? allow other data type searching
          Indexes.push(this.tree[key].map[value] || []);
        }
      }
    }
    //  ? get return the keys if the length is 1

    if (Indexes.length === 0) return [];
    if (Indexes.length === 1) return Indexes[0].map((idx) => this.keys[idx]);
    //  ? get return the keys if the length is more than one
    return intersect(Indexes).map((idx) => this.keys[idx]);
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
  createIndex(data: Msg) {
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
  removeIndex(data: Msg, drop: boolean) {
    //  ? remove other attributes indexes
    let idk = this.keys.indexOf(data._id);
    if (idk === -1) return;
    for (const key in data) {
      if (!this.tree[key]) continue;
      this.tree[key].drop(data[key as "_id"], idk);
    }
    if (drop) {
      this.keys.splice(idk, 1);
    }
    return this.persist();
  }
  private persist() {
    const obj: xPersistType = {
      keys: this.keys,
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
    const tree: Record<string, Record<string, number[]>> = {};

    // Load logs in parallel
    const logData = await Promise.all(
      logFiles.map((log) => loadLogSync(persistKey + log, {}))
    );

    for (const data of logData) {
      if (data.keys) Array.prototype.push.apply(this.keys, data.keys);
      if (data.maps) deepMerge(tree, data.maps);
    }

    for (const key in tree) {
      if (this.tree[key]) {
        this.tree[key].map = deepMerge(this.tree[key].map, tree[key]);
      } else {
        this.tree[key] = new XNode(tree[key]);
      }
    }
  }
}
