import { opendir, unlink } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { Packr } from "msgpackr";
import * as tar from "tar";
import {
  type LOG_file_type,
  type Msg,
  type Msgs,
  type QueryType,
  type SchemaRelationOptions,
  type SchemaOptions,
  type SchemaColumnOptions,
  type ExaDoc,
  type Xtree_flag,
  type SchemaRelation,
  type wTrainType,
} from "./types.js";
import {
  findMessage,
  updateMessage,
  deleteMessage,
  addForeignKeys,
  loadLog,
  binarysorted_insert,
  removeForeignKeys,
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
} from "./functions.js";

export class Utils {
  static EXABASE_MANAGERS: Record<string, Manager> = {};
  static packr = new Packr();
  //? Regularity Cache Tank or whatever.
  static RCT: Record<string, Record<string, Msgs | undefined> | boolean> = {
    none: false, //? none is default for use with identifiers that has no need to cache
  };
}

export class ExaError extends Error {
  constructor(...err: any[]) {
    const message = ExaError.geterr(err);
    super(message);
  }
  private static geterr(err: string[]) {
    return String(`\x1b[31mExabase: ${err.join("")}\x1b[0m`);
  }
}

export class ExaSchema<Model> {
  table: Uppercase<string>;
  RCT?: boolean;
  _trx: Query<Model>;
  columns: {
    [x: string]: SchemaColumnOptions;
  } = {};
  relationship: SchemaRelation = {};
  _unique_field?: Record<string, true> = undefined;
  _foreign_field?: Record<string, string> = {};
  _premature: boolean = true;
  constructor(options: SchemaOptions<Model>) {
    //? mock query
    this._trx = new Query({} as any);
    this.table = options?.table?.trim()?.toUpperCase() as Uppercase<string>;
    // ? parse definitions
    if (this.table) {
      this._unique_field = {};
      this.RCT = options.RCT;
      this.columns = { ...(options?.columns || {}) };
      //? setting up _id type on initialization
      (this.columns as any)._id = { type: String };
      //? setting up secondary types on initialization
      //? Date
      for (const key in this.columns) {
        //? keep a easy track of relationships
        if (this.columns[key].RelationType) {
          this.relationship[key] = this.columns[key] as SchemaRelationOptions;
          delete this.columns[key];
          continue;
        }

        //? validating default values
        if (this.columns[key].default) {
          // ? check for type
          const v = validator(
            { [key]: this.columns[key].default },
            { [key]: { ...this.columns[key], default: undefined } }
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
    }
    // ? parse definitions end
  }
  /**
   * Exabase
   * ---
   * query object
   * @returns {Query<Model>}
   */
  get query(): Query<Model> {
    if (!this._premature) return this._trx;
    throw new ExaError(
      "ExaSchema - " +
        this.table +
        " is not yet connected to an Exabase Instance"
    );
  }
  /**
   * Exabase query
   * Get the timestamp this data was inserted into the database
   * @param data
   * @returns Date
   */
  static getTimestamp(_id: string) {
    return new Date(parseInt(_id.slice(0, 8), 16) * 1000);
  }
}

// ? for creating custom types
export class ExaType {
  v: (data: any) => boolean = () => false;
  constructor(validator: (data: any) => boolean) {
    this.v = validator;
  }
}

export class Query<Model> {
  private _Manager: Manager;
  private _OnCommitCB?: (
    commit: Promise<ExaDoc<Model>> | Promise<ExaDoc<Model[]>>
  ) => void;
  //? avaible immidiately connected
  _table: string = "";
  premature: boolean = true;
  constructor(Manager: Manager) {
    this._Manager = Manager;
    if (Manager) {
      this.premature = false;
      this._table = Manager._name;
    }
  }

  /**
   * Exabase query
   * find items on the database,
   * field can be _id string or unique props object
   * @param field
   * @param options
   * @returns
   */
  findMany(
    field?: Partial<Model> | string,
    options?: {
      populate?: string[] | boolean;
      take?: number;
      skip?: number;
      sortBy?: {
        [x in keyof Partial<Model>]: "ASC" | "DESC";
      };
      /**
       * INFO: exabase doesn't walk the log files until search is complete, no multi-log db would do so either.
       * we only tranverse the first log file or last in reverse mode for findMany("*", {<options>})
       * it's a good idea to allow users to access middle log files
       * in this case they can use logCount to know the number of logs and provide logIndex option to iterate
       * through via .findMany()
       */
      logIndex?: number;
      // reverse?: true | false;
    }
  ) {
    // ? creating query payload
    const query: QueryType<Model> = {
      select: "*",
      table: this._table,
    };
    // ? inputing relationship payload
    if (typeof field === "object") {
      query.select = undefined;
      const key: string = Object.keys(field)[0];
      const value = field[key as keyof typeof field];
      const fieldT = (this._Manager._schema.columns as any)[key as string];
      if (fieldT && fieldT.unique) {
        query["unique"] = {
          [key]: value,
        };
      } else {
        throw new ExaError(
          `column field ${key} is not unique, please try searching instead`
        );
      }
    }
    // ? populate options
    if (typeof options === "object") {
      query.skip = options.skip;
      query.take = options.take;
      query.sortBy = options.sortBy;
      const fields = this._Manager._schema._foreign_field!;
      if (options.populate === true) {
        query.populate = {};
        for (const lab in fields) {
          query.populate[lab] = fields[lab];
        }
      } else {
        if (Array.isArray(options.populate)) {
          query.populate = {};
          for (let i = 0; i < options.populate.length; i++) {
            const lab = options.populate[0];
            const relaName = fields[lab];
            if (relaName) {
              query.populate[lab] = fields[lab];
            } else {
              throw new ExaError("can't POPULATE unknown relationship " + lab);
            }
          }
        }
      }
    }
    return this._Manager._trx_runner(query) as Promise<ExaDoc<Model>[]>;
  }
  /**
   * Exabase query
   * find items on the database,
   * field can be _id string or unique props object
   * @param field
   * @param options
   * @returns
   */
  findOne(
    field: Partial<Model> | string,
    options?: {
      populate?: string[] | boolean;
    }
  ) {
    // ? creating query payload
    const query: QueryType<Model> = {
      select: field,
      table: this._table,
    };
    // ? inputting relationship payload
    if (typeof field === "object") {
      query.select = undefined;
      const key: string = Object.keys(field)[0];
      const value = field[key as keyof typeof field];
      const fieldT = (this._Manager._schema.columns as any)[key as string];
      if (fieldT && fieldT.unique) {
        query["unique"] = {
          [key]: value,
        };
      } else {
        throw new ExaError(
          `column field ${key} is not unique, please try searching instead`
        );
      }
    }
    // ? populate options
    if (typeof options === "object") {
      const fields = this._Manager._schema._foreign_field!;
      if (options.populate === true) {
        query.populate = {};
        for (const lab in fields) {
          query.populate[lab] = fields[lab];
        }
      } else {
        if (Array.isArray(options.populate)) {
          query.populate = {};
          for (let i = 0; i < options.populate.length; i++) {
            const lab = options.populate[0];
            const relaName = fields[lab];
            if (relaName) {
              query.populate[lab] = fields[lab];
            } else {
              throw new ExaError("can't POPULATE missing relationship " + lab);
            }
          }
        }
      }
    }

    return this._Manager._trx_runner(query) as Promise<ExaDoc<Model>>;
  }
  /**
   * Exabase query
   * search items on the database,
   * @param searchQuery
   * @param options
   * @returns
   */
  search(
    searchQuery: Partial<Model>,
    options?: {
      populate?: string[] | boolean;
      take?: number;
      skip?: number;
      sortBy?: {
        [x in keyof Partial<Model>]: "ASC" | "DESC";
      };
    }
  ) {
    if (typeof searchQuery !== "object" && !Array.isArray(searchQuery))
      throw new ExaError("invalid search query ", searchQuery);
    const query: QueryType<Model> = { search: searchQuery, table: this._table };
    // ? populate options
    if (typeof options === "object") {
      query.skip = options.skip;
      query.take = options.take;
      // query.reverse = options.reverse;
      query.sortBy = options.sortBy;
      const fields = this._Manager._schema._foreign_field!;
      if (options.populate === true) {
        query.populate = {};
        for (const lab in fields) {
          query.populate[lab] = fields[lab];
        }
      } else {
        if (Array.isArray(options.populate)) {
          query.populate = {};
          for (let i = 0; i < options.populate.length; i++) {
            const lab = options.populate[0];
            const relaName = fields[lab];
            if (relaName) {
              query.populate[lab] = fields[lab];
            } else {
              throw new ExaError("can't POPULATE missing relationship " + lab);
            }
          }
        }
      }
    }
    return this._Manager._trx_runner(query) as Promise<ExaDoc<Model>[]>;
  }
  /**
   * Exabase query
   * insert or update items on the database
   * @param data
   * @returns
   */
  save(data: Partial<ExaDoc<Model>>) {
    const query: QueryType<Model> = {
      [typeof data?._id === "string" ? "update" : "insert"]: data,
      table: this._table,
    };
    const saved = this._Manager._trx_runner(query) as Promise<ExaDoc<Model>>;
    if (this._OnCommitCB) {
      this._OnCommitCB(saved);
    }
    return saved;
  }
  /**
   * Exabase query
   * delete items on the database,
   * @param _id
   * @returns
   */
  delete(_id: string) {
    if (typeof _id !== "string") {
      throw new ExaError(
        "cannot continue with delete query '",
        _id,
        "' is not a valid Exabase _id value"
      );
    }
    const query: QueryType<Model> = {
      delete: _id,
      table: this._table,
    };
    const saved = this._Manager._trx_runner(query) as Promise<ExaDoc<Model>>;
    if (this._OnCommitCB) {
      this._OnCommitCB(saved);
    }
    return saved;
  }
  /**
   * Exabase query
   * count items on the database
   * @returns
   */
  count(pops?: Partial<Model>) {
    const query: QueryType<Model> = {
      count: pops || true,
      table: this._table,
    };
    return this._Manager._trx_runner(query) as Promise<number>;
  }
  /**
   * Exabase query
   * count the number for log files availble in the Table
   * each log file store 16kb of data
   * @returns
   */
  logCount() {
    return Object.keys(this._Manager._LogFiles).length;
  }
  /**
   * Exabase query
   * connect relationship in the table on the database
   * @param options
   * @returns
   */
  addRelation(options: {
    _id: string;
    foreign_id: string;
    relationship: string;
  }) {
    const rela = this._Manager._schema.relationship![options.relationship];

    if (!rela) {
      throw new ExaError(
        "No relationship definition called ",
        options.relationship,
        " on ",
        this._Manager._schema.table,
        " schema"
      );
    }

    if (typeof options.foreign_id !== "string") {
      throw new ExaError("foreign_id field is invalid.");
    }
    const query: QueryType<Model> = {
      reference: {
        _id: options._id,
        _new: true,
        relationshipType: rela.RelationType,
        foreign_id: options.foreign_id,
        relationship: options.relationship,
        foreign_table: rela.target,
      },
      table: this._table,
    };
    return this._Manager._trx_runner(query) as Promise<void>;
  }
  /**
   * Exabase query
   * disconnect relationship in the table on the database
   * @param options
   * @returns
   */
  removeRelation(options: {
    _id: string;
    foreign_id: string;
    relationship: string;
  }) {
    const rela = this._Manager._schema.relationship![options.relationship];
    if (!rela) {
      throw new ExaError(
        "No relationship definition called ",
        options.relationship,
        " on ",
        this._Manager._schema.table,
        " schema"
      );
    }
    // ?
    const query: QueryType<Model> = {
      reference: {
        _id: options._id,
        _new: false,
        relationshipType: rela.RelationType,
        foreign_id: options.foreign_id,
        relationship: options.relationship,
        foreign_table: rela.target,
      },
      table: this._table,
    };
    return this._Manager._trx_runner(query) as Promise<void>;
  }

  // onCommit(
  //   cb: (commit: Promise<ExaDoc<Model>> | Promise<ExaDoc<Model[]>>) => void
  // ) {
  //   if (typeof cb === "function") {
  //     this._OnCommitCB = cb;
  //   } else {
  //     throw new ExaError("Invalid oncommit function");
  //   }
  // }
}

export class Manager {
  public _schema: ExaSchema<any>;
  public _name: string;
  public _query: Query<any>;
  public tableDir: string = "";
  public RCTied: boolean = true;
  //? Regularity Cache Tank or whatever.
  public RCT: Record<string, Msgs | undefined> = {};
  //? number of RCTied log files
  public rct_level: number;
  public _LogFiles: LOG_file_type = {};
  public _search: XTree;
  public logging: boolean = false;
  // public waiters: Record<string, (() => void)[]> = {};
  // private clock_vector = { x0: null, xn: null };
  constructor(schema: ExaSchema<any>, level: number) {
    this._schema = schema;
    this._name = schema.table;
    this._query = new Query<any>(this);
    schema._trx = this._query;
    //? set RCT key
    this.RCTied = schema.RCT || false;
    this.rct_level = level;
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
  _setup(init: {
    _exabaseDirectory: string;
    logging: boolean;
    schemas: ExaSchema<any>[];
  }) {
    // ? setup steps
    this.tableDir = init._exabaseDirectory + "/" + this._schema.table + "/";
    this.logging = init.logging;
    // ? provide Xtree search index dir
    const persistKey = this.tableDir + "XINDEX";
    this._search.persistKey = persistKey;
    this._search.tree = XTree.restore(persistKey);
    // ? setup relationship
    this._constructRelationships(init.schemas);
    //? setup table directories
    if (!existsSync(this.tableDir)) {
      mkdirSync(this.tableDir);
    } else {
      //? this is a chain process
      // ? first get logs from disk
      // ? recover and flush WAL
      // ? sync search index
      return this._sync_logs();
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
      }, 50);
    }
    return q as Promise<number | void | Msgs | Msg>;
  }
  async write(queries: wTrainType[], file: string) {
    this.runningQueue = true;

    const resolveFNs = [];

    // ? do the writing by
    // let messages = this.RCTied ? this.RCT[file] : undefined;
    // if (!messages) {
    const messages = await loadLog(this.tableDir + file);
    // }

    for (const [resolve, message, flag] of queries) {
      if (flag === "i") {
        binarysorted_insert(message, messages);
        this._search.insert(message);
      } else {
        binarysearch_mutate(message, messages, flag);
        // ? update search index
        if (flag === "d") {
          this._search.disert(message);
        } else {
          this._search.upsert(message);
        }
      }

      //? resize RCT
      // ? update this active RCT
      if (this.RCTied) {
        this.RCT[file] = messages;
      }

      // ? update _logFile metadata index
      this._LogFiles[file].size = messages.length;
      this._LogFiles[file].last_id = messages.at(-1)?._id!;
      resolveFNs.push(() => resolve(message));
    }

    // ? run awaiting queries
    if (this.waiters[file].length) {
      this.write(this.waiters[file].splice(0), file);
    } else {
      if (this.RCTied) {
        resizeRCT(this.rct_level, this.RCT);
      }
      // ? synchronies writer
      await SynFileWrit(this.tableDir + file, Utils.packr.encode(messages));
      resolveFNs.map((a) => a());
      this._search.persist();
      this.runningQueue = false;
    }
  }
  async _sync_logs() {
    const dir = await opendir(this.tableDir!);
    const logfiles: string[] = [];
    let size = 0;
    for await (const dirent of dir) {
      // ? here we destroy invalid sync files, availability of such files
      // ? signifies an application crash stopping exabase from completing a commit
      // ? the commit operation can then be restarted from the wal files still in the wal directory
      if (dirent.name.includes("-SYNC")) {
        await unlink(this.tableDir + dirent.name);
        continue;
      }
      if (dirent.isFile()) {
        const fn = dirent.name;
        logfiles.push(fn);
        // ! check for this files keys, some are probably not used anymore
        // ? f = foreign, u = unique, x = search indexes
        if ("FINDEX-UINDEX-XINDEX".includes(fn)) {
          continue;
        }
        const LOG = await loadLog(this.tableDir + dirent.name);
        const last_id = LOG.at(-1)?._id || "";
        this._LogFiles[fn] = { last_id, size: LOG.length };
        size += LOG.length;
      }
    }
    await this._sync_searchindex(size);
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
    if (logId === "*") {
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
  _constructRelationships(allSchemas: ExaSchema<any>[]) {
    if (this._schema.table) {
      //? keep a easy track of relationships
      if (this._schema.relationship) {
        this._schema._foreign_field = {};
        for (const key in this._schema.relationship) {
          if (typeof this._schema.relationship![key].target === "string") {
            const namer = this._schema.relationship![key].target.toUpperCase();
            const findSchema = allSchemas.find(
              (schema) => schema.table === namer
            );
            if (findSchema) {
              this._schema._foreign_field[key] = namer;
            } else {
              throw new ExaError(
                " table: ",
                namer,
                " schema not found or connected, please check the relationship definition of the ",
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
  }

  _validate(data: any) {
    const v = validator(data, this._schema.columns);
    if (typeof v === "string")
      throw new ExaError(this._schema.table, " table error '", v, "'");
    return v;
  }
  async _select(query: QueryType<Record<string, any>>) {
    const file = this._getReadingLog(query.select as string);
    let RCTied = this.RCTied ? this.RCT[file] : undefined;
    if (!RCTied) {
      RCTied = await loadLog(this.tableDir + file);
      if (this.RCTied) {
        this.RCT[file] = RCTied;
      }
    }

    // ? INFO: exabase doen't walk the log files until search is complete, no multi-log db would do so either.
    // ? we only tranverse the first log file or last for findMany("*", {<options>})
    // ? it's a good idea to allow users to access middle log files
    // ? in this case they can use logCount to know the number of logs and provide logIndex option to iterate through via .findMany()
    if (query.logIndex) {
      RCTied = await loadLog(this.tableDir + "LOG-" + query.logIndex);
    }

    if (query.select === "*") {
      // ? skip results
      if (query.skip) {
        RCTied = RCTied.slice(query.skip);
      }
      // ? cutdown results
      if (query.take) {
        RCTied = RCTied.slice(0, query.take);
      }
      // ? sort results using bucketed merge.sort agorimth
      if (query.sortBy) {
        const key = Object.keys(query.sortBy)[0] as "_id";
        RCTied = bucketSort(RCTied, key, query.sortBy[key] as "ASC");
      }
      // ? populate relations
      if (query.populate) {
        return Promise.all(
          RCTied.map(async (item) => {
            const foreignKeys = await populateForeignKeys(
              file,
              item._id,
              query.populate!
            );
            return { ...item, ...foreignKeys };
          })
        );
      }
      // ?
      return RCTied;
    }
    return findMessage(this.tableDir, query as any, RCTied) as Promise<Msg>;
  }
  async _trx_runner(
    query: QueryType<Msg>
  ): Promise<Msg | Msgs | number | void> {
    if (this.logging) console.log({ query });

    if (query["select"]) {
      return this._select(query);
    }

    if (query["insert"]) {
      this._validate(query.insert);
      const message = await prepareMessage(
        this.tableDir,
        this._schema._unique_field,
        query.insert as Msg
      );
      return this.queue(this._getInsertLog(), message, "i");
    }

    if (query["update"]) {
      this._validate(query.update);
      const message = await updateMessage(
        this.tableDir,
        this._schema._unique_field,
        query.update as Msg
      );
      return this.queue(this._getReadingLog(message._id), message, "u");
    }

    if (query["search"]) {
      const indexes = this._search.search(
        query.search as Msg,
        query.take,
        query.skip
      );
      return Promise.all(
        indexes.map(
          (_id: string) =>
            this._select({
              select: _id,
              populate: query.populate,
              sortBy: query.sortBy,
            }) as Promise<Msg>
        )
      );
    }

    if (query["unique"]) {
      const select = await findMessageByUnique(
        this.tableDir + "UINDEX",
        this._schema._unique_field!,
        query.unique
      );
      if (select) {
        const file = this._getReadingLog(select!);
        return findMessage(
          this.tableDir,
          {
            select,
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
      const file = this._getReadingLog(query.delete);
      const message = await deleteMessage(
        query.delete,
        this.tableDir,
        this._schema._unique_field,
        !!this._schema.relationship,
        this.tableDir + file,
        this.RCT[file] ?? (await loadLog(this.tableDir + file))
      );

      if (message) {
        this._search.disert(message);
        return this.queue(file, message, "d");
      } else {
        throw new ExaError("item not found, left.");
      }
    }

    if (query["reference"]) {
      const file = this._getReadingLog(query.reference._id);
      if (query.reference._new) {
        return addForeignKeys(
          this.tableDir + file,
          query.reference,
          this.RCT[file] ?? (await loadLog(this.tableDir + file))
        );
      }
      return removeForeignKeys(this.tableDir + file, query.reference);
    }
    if (query["logCount"]) {
      return Object.keys(this._LogFiles).length;
    }
  }
}

class XNode {
  keys: string[] = [];
  map: Record<string, number[]> = {};
  constructor(keys?: string[], map?: Record<string, number[]>) {
    this.keys = keys || [];
    this.map = map || {};
  }
  insert(val: string, id: string) {
    const idx = this.keys.push(id);
    if (!this.map[val]) {
      this.map[val] = [];
    }
    this.map[val].push(idx - 1);
  }
  disert(val: string, id: string) {
    const idx = this.keys.indexOf(id);
    if (this.map[val]) {
      this.map[val] = this.map[val].filter((a) => a !== idx);
      this.keys.splice(idx, 1);
    }
  }
  upsert(val: string, id: string) {
    const idx = this.keys.indexOf(id);
    if (!this.map[val]) {
      this.map[val] = [];
    }
    this.map[val].push(idx - 1);
  }
}

export class XTree {
  persistKey?: string;
  tree: Record<string, XNode> = {};
  // used for keep searchable keys of data that should be indexed in the db.
  indexTable: Record<string, boolean>;
  constructor(init: { indexTable: Record<string, boolean> }) {
    this.indexTable = init.indexTable;
  }
  restart() {
    this.tree = {} as Record<string, XNode>;
  }
  search(search: Msg, take: number = Infinity, skip: number = 0) {
    let idx: string[] = [];
    for (const key in search) {
      if (!this.indexTable[key]) continue;
      if (this.tree[key]) {
        const index = this.tree[key].map[search[key as "_id"]];
        if (index?.length === 0) continue;
        for (const i of index) {
          this.tree[key].keys[i] && idx.push(this.tree[key].keys[i]);
        }
        if (skip && idx.length >= skip) {
          idx.splice(0, skip);
          skip = 0; //? ok captain
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
    const unique = new Set<string>();
    for (const key in this.tree) {
      const keys = this.tree[key].keys;
      for (const key in keys) {
        for (let i = 0; i < keys[key].length; i++) {
          const element = keys[key][i];
          unique.add(element);
        }
      }
    }

    return unique.size === size;
  }
  insert(data: Msg) {
    // ? save keys in their corresponding nodes
    if (typeof data === "object" && !Array.isArray(data)) {
      for (const key in data) {
        if (!this.indexTable[key]) continue;
        if (!this.tree[key]) {
          this.tree[key] = new XNode();
        }
        this.tree[key].insert(data[key as keyof Msg], data._id);
      }
    }
  }
  disert(data: Msg) {
    if (typeof data === "object" && !Array.isArray(data)) {
      for (const key in data) {
        if (!this.indexTable[key]) continue;
        if (!this.tree[key]) continue;
        this.tree[key].disert(data[key as keyof Msg], data["_id"]);
      }
    }
  }
  upsert(newdata: Msg) {
    if (typeof newdata === "object") {
      for (const key in newdata) {
        if (!this.indexTable[key]) continue;
        if (!this.tree[key]) continue;
        this.tree[key].upsert(newdata[key as keyof Msg], newdata["_id"]);
      }
    }
  }

  persist() {
    const obj: { keys: string[]; map: Record<string, any> }[] = [];
    const map = Object.keys(this.tree);
    for (let i = 0; i < map.length; i++) {
      obj[i] = { map: this.tree[map[i]].map, keys: this.tree[map[i]].keys };
    }
    return SynFileWritWithWaitList.write(
      this.persistKey!,
      Utils.packr.encode(obj)
    );
  }
  static restore(persistKey: string) {
    const data = loadLogSync(persistKey, {});
    const tree: Record<string, any> = {};
    if (data) {
      for (const key in data) {
        tree[key] = new XNode(data[key].keys, data[key].map);
      }
    }

    return tree;
  }
}

export class backup {
  static saveBackup(name: string) {
    return (file = "database-backup.tgz") => {
      return tar.create(
        {
          file,
          gzip: true,
        },
        [name]
      );
    };
  }
  static unzipBackup(file = "database-backup.tgz") {
    return () => {
      return tar.x({
        gzip: true,
        f: file,
        // ? When extracting, keep the existing file on disk if it's newer than the file in the archive.
        keepNewer: true,
      });
    };
  }
}
