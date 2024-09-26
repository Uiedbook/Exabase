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
} from "./types.js";
import {
  findMessage,
  updateMessage,
  deleteMessage,
  loadLog,
  binarysorted_insert,
  binarysearch_mutate,
  findMessageByUnique,
  loadLogSync,
  validator,
  resizeRCT,
  prepareMessage,
  SynFileWrit,
  SynFileWritWithWaitList,
  bucketSort,
  populateForeignKeys,
  setPopulateOptions,
} from "./functions.js";

export class GLOBAL_OBJECT {
  static EXABASE_MANAGERS: Record<string, Manager> = {};
  static packr = new Packr();
  //? Regularity Cache Tank or whatever.
  static RCT: Record<string, Record<string, Msgs | undefined> | boolean> = {
    none: false, //? none is default for use with identifiers that has no need to cache
  };
  static _db: any;
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
  _unique_field?: Record<string, true> = undefined;
  _foreign_field: Record<string, { table: string; type: "ONE" | "MANY" }> = {};
  constructor(options: SchemaOptions<Model>) {
    this.table = options?.table?.trim()?.toUpperCase() as Uppercase<string>;
    // ? parse definitions
    if (this.table) {
      this._unique_field = {};
      this.columns = { ...(options?.columns || {}) };
      //? setting up _id type on initialization
      (this.columns as any)._id = { type: String };
      //? setting up secondary types on initialization
      //? Date
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

        //? more later
        //? let's keep a record of the unique fields we correctly have
        if (this.columns[key].unique) {
          this._unique_field[key] = true;
        }
      }
      //? check if theres a unique key entered else make it undefined to avoid a truthiness bug
      if (Object.keys(this._unique_field).length === 0) {
        this._unique_field = undefined;
      }
    } else {
      throw new ExaError("No table name provided!");
    }
    if (!GLOBAL_OBJECT._db) {
      throw new ExaError("database has not yet been created!");
    }
    GLOBAL_OBJECT._db._induce(this);
    // ? parse definitions end
  }
}

// ? for creating custom types, NOT IN USE ATM
export class Manager {
  public _schema: ExaSchema<any>;
  public _name: string;
  public tableDir: string = "";
  public isRelatedConstruced = false;
  public isActive = false;
  //? Regularity Cache Tank or whatever.
  public RCT: Record<string, Msgs | undefined> = {};
  //? number of RCTied log files
  public rct_level: number = 5;
  public _LogFiles: LOG_file_type = {};
  public _search: XTree;
  constructor(schema: ExaSchema<any>) {
    this._schema = schema;
    this._name = schema.table;
    //? set RCT key
    // ? setup indexTable for searching
    const columns = schema.columns;
    const indexTable: Record<string, boolean> = {};
    for (const key in columns) {
      indexTable[key] = columns[key].index || false;
    }

    // ? avoid indexing  _wal_ignore_flag & _id ok?
    indexTable["_id"] = false;
    indexTable["_wal_ignore_flag"] = false;
    this._search = new XTree({
      indexTable,
    });
  }
  async _setup(init: { _exabaseDirectory: string; schemas: ExaSchema<any>[] }) {
    // ? setup steps
    this.tableDir = init._exabaseDirectory + "/" + this._schema.table + "/";
    // ? provide Xtree search index dir
    const persistKey = this.tableDir + "XINDEX";
    this._search.persistKey = persistKey;
    const xtreeData = XTree.restore(persistKey);
    this._search.tree = xtreeData.tree;
    this._search.keys = xtreeData.keys;
    //? setup table directories
    if (!existsSync(this.tableDir)) {
      mkdirSync(this.tableDir);
    }
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
      setTimeout(() => {
        this.write(this.waiters[file].splice(0), file);
      }, 0);
    }
    return q as Promise<number | void | Msgs | Msg>;
  }
  async write(queries: wTrainType[], file: string) {
    this.runningQueue = true;
    const resolveFNs = [];
    // ? do the writing by
    const messages = await loadLog(this.tableDir + file);
    for (const [resolve, message, flag] of queries) {
      if (flag === "i") {
        binarysorted_insert(message, messages);
        this._search.insert(message);
      } else {
        binarysearch_mutate(message, messages, flag);
        // ? update search index
        if (flag === "d") {
          this._search.disert(message, true);
        } else {
          this._search.insert(message);
        }
      }
      // ? update this active RCT
      this.RCT[file] = messages;
      // ? update _logFile metadata index
      this._LogFiles[file].size = messages.length;
      this._LogFiles[file].last_id = messages.at(-1)?._id!;
      resolveFNs.push(() => resolve(message));
    }

    // ? run awaiting queries
    if (this.waiters[file].length) {
      this.write(this.waiters[file].splice(0), file);
    } else {
      //? resize RCT
      resizeRCT(this.rct_level, this.RCT);
      // ? synchronies writer
      await SynFileWrit(
        this.tableDir + file,
        GLOBAL_OBJECT.packr.encode(messages)
      );
      resolveFNs.map((a) => a());
      this._search.persist();
      this.runningQueue = false;
    }
  }
  async _sync_logs() {
    try {
      const dir = await opendir(this.tableDir!);
      const logfiles: string[] = [];
      let size = 0;
      for await (const dirent of dir) {
        // ? here we destroy invalid sync files, availability of such files
        // ? signifies an application crash stopping exabase from completing a commit
        // ? the commit operation can then be restarted from the <file>-SYNC files still in the wal directory
        if (dirent.name.includes("-SYNC")) {
          await unlink(this.tableDir + dirent.name);
          continue;
        }
        if (dirent.isFile()) {
          const fn = dirent.name;
          logfiles.push(fn);
          // ! check for this files keys, some are probably not used anymore
          // ? f = foreign, u = unique, x = search indexes
          if ("UINDEX-XINDEX".includes(fn)) {
            continue;
          }
          const LOG = await loadLog(this.tableDir + dirent.name);
          const last_id = LOG.at(-1)?._id || "";
          this._LogFiles[fn] = { last_id, size: LOG.length };
          size += LOG.length;
        }
      }

      return this._sync_searchindex(size);
    } catch (err) {
      console.log({ err }, 3);
    }
  }

  async _sync_searchindex(size: number) {
    // ? search index columns checks
    // ? index  validation
    if (!this._search.confirmLength(size)) {
      console.log("Re-calculating search index due to changes in log size");
      this._search.restart(); //? reset indexes to zero
      //? index all available items
      for (const file in this._LogFiles) {
        const LOG = await loadLog(this.tableDir + file);
        const ln = LOG.length;
        for (let i = 0; i < ln; i++) {
          this._search.insert(LOG[i]);
        }
      }
      await this._search.persist();
    }
  }

  _getReadingLog(logId: string) {
    if (!logId) {
      return "LOG-" + Object.keys(this._LogFiles).length;
    }
    for (const filename in this._LogFiles) {
      const logFile = this._LogFiles[filename];
      //? getting log file name for read operations
      if (String(logFile.last_id) > logId || logFile.last_id === logId) {
        return filename;
      }
      //? getting log file name for inset operation
      if (!logFile.last_id) {
        return filename;
      }
      if (logFile.size < 32768 /*size check is for inserts*/) {
        return filename;
      }
    }
    return "LOG-" + Object.keys(this._LogFiles).length;
  }

  _getInsertLog(): string {
    for (const filename in this._LogFiles) {
      const logFile = this._LogFiles[filename];
      //? size check is for inserts
      if (logFile.size < 32768) {
        return filename;
      }
    }
    //? Create a new log file with an incremented number of LOGn filename
    const nln = Object.keys(this._LogFiles).length + 1;
    const lfid = "LOG-" + nln;
    this._LogFiles[lfid] = { last_id: lfid, size: 0 };
    return lfid;
  }
  _constructRelationships() {
    const allSchemas: ExaSchema<{}>[] = GLOBAL_OBJECT._db.schemas;
    if (this._schema.table) {
      //? keep a easy track of relationships
      if (this._schema.relationship) {
        this._schema._foreign_field = {};
        for (const key in this._schema.relationship) {
          if (typeof this._schema.relationship![key].target === "string") {
            const table = this._schema.relationship![key].target.toUpperCase();
            const findSchema = allSchemas.find(
              (schema) => schema.table === table
            );
            if (findSchema) {
              this._schema._foreign_field[key] = {
                table,
                type: this._schema.relationship![key].relationType,
              };
            } else {
              throw new ExaError(
                "Relationship - ",
                table,
                " schema not found, make sure it is created before ",
                this._schema.table,
                " schema"
              );
            }
          } else {
            throw new ExaError(
              " Error on schema ",
              this._schema.table,
              " relationship target must be a string of a table and connected "
            );
          }
        }
      }
    }
    this.isRelatedConstruced = true;
  }

  _validate(data: any) {
    if (!this.isRelatedConstruced) {
      this._constructRelationships();
    }
    const v = validator(data, this._schema.columns);
    // ? setup relationship
    if (typeof v === "string")
      throw new ExaError(this._schema.table, " table error '", v, "'");
    return v as Msg;
  }
  async _find(query: QueryType<Record<string, any>>) {
    const file = this._getReadingLog(query.one as string);
    let RCTied = this.RCT[file];
    if (!RCTied) {
      RCTied = await loadLog(this.tableDir + file);
      this.RCT[file] = RCTied;
    }

    if (query.many) {
      if (query.logIndex) {
        RCTied = await loadLog(this.tableDir + "LOG-" + query.logIndex);
      }
      // ? skip results
      if (query.skip) {
        RCTied = RCTied.slice(query.skip);
      }
      // ? cutdown results
      if (query.take) {
        RCTied = RCTied.slice(0, query.take);
      }
      // ? sort results using bucketed merge.sort agorimth
      if (query.sort) {
        const key = Object.keys(query.sort)[0] as "_id";
        RCTied = bucketSort(RCTied, key, query.sort[key] as "ASC");
      }
      // ? populate relations
      if (query.populate) {
        query.populate = setPopulateOptions(
          query.populate,
          this._schema._foreign_field
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
        this._schema._foreign_field
      );
    }

    return await findMessage(query, RCTied);
  }
  async _trx_runner(
    query: QueryType<Msg>
  ): Promise<Msg | Msgs | number | void> {
    if (query.many || query.one) {
      return this._find(query);
    }

    if (query["insert"]) {
      const message = await prepareMessage(
        this.tableDir,
        this._schema._unique_field,
        this._validate(query.insert) as Msg,
        this._schema._foreign_field
      );
      return this.queue(this._getInsertLog(), message, "i");
    }

    if (query["update"]) {
      const oldmsg = (await this._find({ one: query.update._id })) as Msg;
      const message = await updateMessage(
        this.tableDir,
        this._schema._unique_field,
        oldmsg,
        this._validate(query.update),
        this._schema._foreign_field
      );

      this._search.disert(oldmsg, false);
      return this.queue(this._getReadingLog(message._id), message, "u");
    }

    if (query["search"]) {
      const indexes = this._search.search(query.search as Msg, query.take);
      const searches = await Promise.all(
        indexes.map(
          (_id: string) =>
            this._find({
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

    if (query["unique"]) {
      const one = await findMessageByUnique(
        this.tableDir + "UINDEX",
        this._schema._unique_field!,
        query.unique
      );
      if (one) {
        const file = this._getReadingLog(one!);
        return findMessage(
          {
            one,
            populate: query.populate,
          },
          this.RCT[file] ?? (await loadLog(this.tableDir + file))
        );
      } else {
        return;
      }
    }

    if (query["count"]) {
      if (query["count"] === true) {
        return Object.values(this._LogFiles).reduce(
          (size, { size: fileSize }) => size + fileSize,
          0
        );
      }
      return this._search.count(query["count"] as Msg);
    }

    if (query["delete"]) {
      if (typeof query.delete !== "string") {
        throw new ExaError(
          "cannot continue with delete query '",
          query.delete,
          "' is not a valid Exabase _id value"
        );
      }
      const file = this._getReadingLog(query.delete);
      const message = await deleteMessage(
        query.delete,
        this.tableDir,
        this._schema._unique_field,
        this.RCT[file] ?? (await loadLog(this.tableDir + file))
      );
      if (message?._id) {
        return this.queue(file, message, "d");
      }
    }

    if (query["logCount"]) {
      return Object.keys(this._LogFiles).length;
    }
  }
}

class XNode {
  map: Record<string, number[]> = {};
  constructor(map?: Record<string, number[]>) {
    this.map = map || {};
  }
  insert(val: string, idk: number) {
    if (!this.map[val]) {
      this.map[val] = [];
    }
    this.map[val].push(idk);
  }
  disert(val: string, idk: number) {
    if (this.map[val]) {
      if (idk !== -1) {
        const idp = this.map[val].indexOf(idk);
        this.map[val].splice(idp, 1);
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
  restart() {
    this.tree = {} as Record<string, XNode>;
  }
  search(search: Msg, take: number = Infinity) {
    let idx: string[] = [];
    for (const key in search) {
      if (!this.indexTable[key]) continue;
      if (this.tree[key]) {
        const index = this.tree[key].map[search[key as "_id"]];
        if (!index || index?.length === 0) continue;
        for (const i of index) {
          this.keys[i] && idx.push(this.keys[i]);
        }
        if (idx.length >= take) break;
      }
    }
    if (idx.length >= take) {
      idx = idx.slice(0, take);
    }
    return idx;
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

  confirmLength(size: number) {
    return this.keys.length === size;
  }
  insert(data: Msg) {
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
      this.tree[key].insert(data[key as "_id"], idk);
    }
  }
  disert(data: Msg, drop: boolean) {
    let idk = this.keys.indexOf(data._id);
    if (idk === -1) return;
    for (const key in data) {
      if (!this.indexTable[key]) continue;
      if (!this.tree[key]) continue;
      this.tree[key].disert(data[key as "_id"], idk);
    }
    if (drop) {
      this.keys.splice(idk, 1);
    }
  }
  persist() {
    const obj: {
      keys: string[];
      maps: Record<string, Record<string, number[]>>;
    } = {
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
  static restore(persistKey: string) {
    const data = loadLogSync(persistKey, {});
    const tree: Record<string, any> = {};
    if (typeof data?.maps === "object") {
      for (const key in data.maps) {
        tree[key] = new XNode(data.maps[key]);
      }
      return { tree, keys: data.keys };
    }
    return { tree: {}, keys: [] };
  }
}
