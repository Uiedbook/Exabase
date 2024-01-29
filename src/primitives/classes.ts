import { copyFile, opendir, rename, unlink } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { Packr } from "msgpackr";
import {
  type LOG_file_type,
  type Msg,
  type Msgs,
  type QueryType,
  type SchemaRelationOptions,
  type SchemaOptions,
  type wQueue,
  type SchemaColumnOptions,
  type SearchIndexOptions,
  type ExaDoc,
} from "./types";
import {
  findMessage,
  updateMessage,
  insertMessage,
  deleteMessage,
  addForeignKeys,
  writeDataToFile,
  readDataFromFile,
  binarysorted_insert,
  removeForeignKeys,
  generate_id,
  binarysearch_mutate,
  findMessageByUnique,
  FileLockTable,
  readDataFromFileSync,
  findMessages,
  validateData,
} from "./functions";
import { Sign, Verify } from "node:crypto";

export class Utils {
  static MANIFEST: {
    schemas: Schema<any>[];
    bearer: string;
    rings: string[];
    EXABASE_KEYS: { privateKey: String; publicKey: String };
    sign?: Sign;
    verify?: Verify;
  } = {
    schemas: [],
    bearer: "",
    rings: [],
    EXABASE_KEYS: { privateKey: "", publicKey: "" },
    sign: undefined,
    verify: undefined,
  };
  static EXABASE_RING_STATE: Record<string, Manager> = {};
  static EXABASE_MANAGERS: Record<string, Manager> = {};
  static packr = new Packr();
  //? Regularity Cache Tank or whatever.
  static RCT: Record<string, Record<string, Msgs | undefined> | boolean> = {
    none: false, //? none is default for use with identifiers that has no need to cache
  };
}

export class ExabaseError extends Error {
  constructor(...err: any[]) {
    const message = ExabaseError.geterr(err);
    super(message);
  }
  private static geterr(err: string[]) {
    return String(err.join(""));
  }
}

export class Schema<Model> {
  tableName: string;
  RCT?: boolean;
  _trx: Query<Model>;
  columns: {
    [x: string]: SchemaColumnOptions;
  } = {};
  searchIndexOptions?: SearchIndexOptions;
  relationship?: Record<string, SchemaRelationOptions>;
  _unique_field?: Record<string, true> = undefined;
  _foreign_field?: Record<string, string> = {};
  migrationFN:
    | ((data: Record<string, string>) => true | Record<string, string>)
    | undefined;
  _premature: boolean = true;
  //! maybe add pre & post processing hooks
  constructor(options: SchemaOptions<Model>) {
    //? mock query
    this._trx = new Query({} as any);
    this.tableName = options.tableName.trim().toUpperCase();
    if (options.tableName) {
      this._unique_field = {};
      //? keep a easy track of relationships
      this.searchIndexOptions = options.searchIndexOptions;
      this.RCT = options.RCT;
      this.migrationFN = options.migrationFN;
      this.columns = { ...(options?.columns || {}) };
      //? setting up _id type on initialisation
      (this.columns as any)._id = { type: String };
      //? setting up secondary types on initialisation
      //? Date
      for (const key in options.columns) {
        if (options.columns[key].type === Date) {
          options.columns[key].type = ((d: string | number | Date) =>
            new Date(d).toString().includes("Inval") === false) as any;
        }
        //? validating default values
        if (options.columns[key].default) {
          // ? check for type
          if (
            typeof options.columns[key].default !==
            typeof (options.columns[key].type as StringConstructor)()
          ) {
            throw new ExabaseError(
              " schema property default value '",
              options.columns[key].default,
              "' for ",
              key,
              " on the ",
              this.tableName,
              " tableName has a wrong type"
            );
          }
        }
        //? JSON
        if (options.columns[key].type === JSON) {
          options.columns[key].type = ((d: string) =>
            typeof d === "string") as any;
        }
        //? more later
        //? let's keep a record of the unique fields we currectly have
        if (options.columns[key].unique) {
          this._unique_field[key] = true;
        }
      }
      //? check if theres a unique key entered else make it undefined to avoid a truthiness bug
      if (Object.keys(this._unique_field).length === 0) {
        this._unique_field = undefined;
      }
      //? keep a easy track of relationships
      if (options.relationship) {
        this.relationship = options.relationship;
      }
    }
  }
  /**
   * Exabase
   * ---
   * querys object
   * @returns {Query<Model>}
   */
  get query(): Query<Model> {
    if (!this._premature) return this._trx;
    throw new ExabaseError(
      "Schema - " +
        this.tableName +
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

//? this is okay because it's reusable
export class Query<Model> {
  private _Manager: Manager;
  private _query: QueryType[] = [];
  premature: boolean = true;
  constructor(Manager: Manager) {
    this._Manager = Manager;
    if (Manager) {
      this.premature = false;
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
    }
  ) {
    // ? creating query payload
    const query: QueryType = {
      select: typeof field === "string" ? field : "*",
    };
    // ? inputing relationship payload
    if (typeof field === "object") {
      query.select = undefined;
      let key: string = "",
        value: any;
      for (const k in field) {
        key = k;
        value = field[k];
        break;
      }
      const fieldT = (this._Manager._schema.columns as any)[key as string];
      if (fieldT && fieldT.unique) {
        query["unique"] = {
          [key]: value,
        };
      } else {
        throw new ExabaseError(
          `column field ${key} is not unique, please try searching instead`
        );
      }
    }
    // ? populate options
    if (typeof options === "object") {
      query.populate = {};
      query.skip = options.skip;
      query.take = options.take;
      const fields = this._Manager._schema._foreign_field!;
      if (options.populate === true) {
        for (const lab in fields) {
          query.populate[lab] = fields[lab];
        }
      } else {
        if (Array.isArray(options.populate)) {
          for (let i = 0; i < options.populate.length; i++) {
            const lab = options.populate[0];
            const relaName = fields[lab];
            if (relaName) {
              query.populate[lab] = fields[lab];
            } else {
              throw new ExabaseError(
                "can't POPULATE missing realtionship " + lab
              );
            }
          }
        }
      }
    }

    return new Promise((r) => {
      this._Manager._run(query, r, "nm");
    }) as Promise<ExaDoc<Model>[]>;
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
    const query: QueryType = {
      select: typeof field === "string" ? field : undefined,
    };
    // ? inputing relationship payload
    if (typeof field === "object") {
      let key: string = "",
        value: any;
      for (const k in field) {
        key = k;
        value = field[k];
        break;
      }
      const fieldT = (this._Manager._schema.columns as any)[key as string];
      if (fieldT && fieldT.unique) {
        query["unique"] = {
          [key]: value,
        };
      } else {
        throw new ExabaseError(
          `column field ${key} is not unique, please try searching instead`
        );
      }
    }
    // ? populate options
    if (typeof options === "object") {
      query.populate = {};
      const fields = this._Manager._schema._foreign_field!;
      if (options.populate === true) {
        for (const lab in fields) {
          query.populate[lab] = fields[lab];
        }
      } else {
        if (Array.isArray(options.populate)) {
          for (let i = 0; i < options.populate.length; i++) {
            const lab = options.populate[0];
            const relaName = fields[lab];
            if (relaName) {
              query.populate[lab] = fields[lab];
            } else {
              throw new ExabaseError(
                "can't POPULATE missing realtionship " + lab
              );
            }
          }
        }
      }
    }

    return new Promise((r) => {
      this._Manager._run(query, r, "nm");
    }) as Promise<ExaDoc<Model>>;
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
    }
  ) {
    if (typeof searchQuery !== "object" && !Array.isArray(searchQuery))
      throw new ExabaseError("invalid search query ", searchQuery);
    let query: QueryType = { search: searchQuery };
    // ? populate options
    if (typeof options === "object") {
      query.skip = options.skip;
      query.take = options.take;
      query.populate = {};
      const fields = this._Manager._schema._foreign_field!;
      if (options.populate === true) {
        for (const lab in fields) {
          query.populate[lab] = fields[lab];
        }
      } else {
        if (Array.isArray(options.populate)) {
          for (let i = 0; i < options.populate.length; i++) {
            const lab = options.populate[0];
            const relaName = fields[lab];
            if (relaName) {
              query.populate[lab] = fields[lab];
            } else {
              throw new ExabaseError(
                "can't POPULATE missing realtionship " + lab
              );
            }
          }
        }
      }
    }
    return new Promise((r) => {
      this._Manager._run(query, r, "nm");
    }) as Promise<ExaDoc<Model>[]>;
  }
  /**
   * Exabase query
   * insert or update items on the database,
   * @param data
   * @returns
   */
  save(data: Partial<ExaDoc<Model>>) {
    let query: QueryType;
    if ((data as any)._id) {
      query = {
        update: this._Manager._validate(data, "UPDATE"),
      };
    } else {
      query = {
        insert: this._Manager._validate(data, "INSERT"),
      };
    }
    return new Promise((r) => {
      this._Manager._run(query, r, "m");
    }) as Promise<ExaDoc<Model>>;
  }
  /**
   * Exabase query
   * delete items on the database,
   * @param _id
   * @returns
   */
  delete(_id: string) {
    if (typeof _id !== "string") {
      throw new ExabaseError(
        "cannot continue with delete query '",
        _id,
        "' is not a valid Exabase _id value"
      );
    }
    const query: QueryType = {
      delete: _id,
    };
    return new Promise((r) => {
      this._Manager._run(query, r, "m");
    }) as Promise<ExaDoc<Model>>;
  }
  /**
   * Exabase query
   * count items on the database
   * @returns
   */
  count(pops?: Partial<Model>) {
    const query: QueryType = {
      count: pops || true,
    };
    return new Promise((r) => {
      this._Manager._run(query, r, "nm");
    }) as Promise<number>;
  }
  /**
   * Exabase query
   * clear the wal of the table on the database
   */
  flush() {
    //! this guy has a bug gonna fix that later
    return this._Manager._partition_wal_compiler();
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
      throw new ExabaseError(
        "No relationship definition called ",
        options.relationship,
        " on ",
        this._Manager._schema.tableName,
        " schema"
      );
    }

    if (typeof options.foreign_id !== "string") {
      throw new ExabaseError("foreign_id field is invalid.");
    }
    const query: QueryType = {
      reference: {
        _id: options._id,
        _new: true,
        type: rela.type,
        foreign_id: options.foreign_id,
        relationship: options.relationship,
        foreign_table: rela.target,
      },
    };
    return new Promise((r) => {
      this._Manager._run(query, r, "nm");
    });
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
      throw new ExabaseError(
        "No relationship definition called ",
        options.relationship,
        " on ",
        this._Manager._schema.tableName,
        " schema"
      );
    }
    const query: QueryType = {
      reference: {
        _id: options._id,
        _new: false,
        type: rela.type,
        foreign_id: options.foreign_id,
        relationship: options.relationship,
        foreign_table: rela.target,
      },
    };
    return new Promise((r) => {
      this._Manager._run(query, r, "nm");
    });
  }
  /**
   * Exabase query
   * batch write operations on the database
   * @param data
   * @param type
   */
  batch(data: Partial<Model>[], type: "INSERT" | "UPDATE" | "DELETE") {
    if (Array.isArray(data) && "INSERT-UPDATE-DELETE".includes(type)) {
      return this._prepare_for(data, type);
    } else {
      throw new ExabaseError(
        `Invalid inputs for .batch method, data should be array and type should be any of  "INSERT", "UPDATE",  "DELETE" .`
      );
    }
  }
  private _prepare_for(
    data: Partial<Model>[],
    type: "INSERT" | "UPDATE" | "DELETE"
  ) {
    for (let i = 0; i < data.length; i++) {
      let item = data[i];
      if (type === "DELETE") {
        if ((item as any)._id) {
          item = (item as any)._id;
          if (typeof item !== "string") {
            throw new ExabaseError(
              "cannot continue with delete query '",
              item,
              "' is not a valid Exabase _id value"
            );
          }
          this._query.push({
            [type.toLowerCase()]: item,
          });
        }
      } else {
        this._query.push({
          [type.toLowerCase()]: this._Manager._validate(item, type),
        });
      }
    }
  }
  /**
   * Exabase query
   * execute a batch operation on the database
   */
  exec() {
    if (this._query.length !== 0) {
      return new Promise((r) => {
        this._Manager._run(this._query.splice(0), r, "m");
      }) as Promise<Model[]>;
    }
    return [] as unknown as Promise<ExaDoc<Model>[]>;
  }
}

export class Manager {
  _schema: Schema<any>;
  public _query: Query<any>;
  private wQueue: wQueue = [];
  private wDir?: string;
  private tableDir: string = "";
  private RCT_KEY: string;
  private _full_lv_bytesize: number;
  private _LogFiles: LOG_file_type = {};
  private _LsLogFile?: string;
  private _search: XTree;
  logging: boolean = false;
  private clock_vector = { x0: null, xn: null };
  constructor(schema: Schema<any>, usablemManagerMem: number) {
    this._schema = schema;
    this._search = new XTree({ persitKey: "" });
    this._query = new Query<any>(this);
    schema._trx = this._query;
    //? get the theorical max items in one log file
    // ? an arbitiary bit size per column for a schema in real time = 20
    this._full_lv_bytesize = Math.round(
      usablemManagerMem / (Object.keys(schema.columns || []).length * 20)
    );
    //? set RCT key
    this.RCT_KEY = this._schema.tableName;
  }
  _setup(init: {
    _exabaseDirectory: string;
    logging: boolean;
    schemas: Schema<any>[];
  }) {
    // ? setup steps
    this.tableDir = init._exabaseDirectory + "/" + this._schema.tableName + "/";
    this.wDir = this.tableDir + "WAL/";
    this.logging = init.logging;
    // ? setting up Xtree search index
    this._search = new XTree({ persitKey: this.tableDir + "XINDEX" });
    //? setting up RCT for this manager
    Utils.RCT[this.RCT_KEY] = this._schema.RCT ? {} : false;
    //? setup table directories
    // ? setup relationship
    this._constructRelationships(init.schemas);
    if (!existsSync(this.tableDir)) {
      mkdirSync(this.tableDir);
      mkdirSync(this.wDir);
    } else {
      //? this is a chain process
      // ? first get logs from disk
      // ? recover and flush WAL
      // ? sync search index
      return this._sync_logs();
    }
  }

  async _sync_logs() {
    const dir = await opendir(this.tableDir!);
    const logfiles = [];
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
        const LOG = await readDataFromFile(
          this.RCT_KEY,
          this.tableDir + dirent.name
        );
        const last_id = LOG.at(-1)?._id || "";
        this._LogFiles[fn] = { last_id, size: LOG.length };
        size += LOG.length;
        if (!this._LsLogFile) {
          this._LsLogFile = fn;
        } else {
          if (
            Number(fn.split("-")[1]) > Number(this._LsLogFile.split("-")[1])
          ) {
            this._LsLogFile = fn;
          }
        }
      }
    }
    //! wal dir wal merger logic
    await this._startup_run_wal_sync();
    await this._sync_searchindex(size);
    // ! resizing has been disconnected till further considerations
    //? get current _full_lv_bytesize and rescale if nessecessary
    // await ResizeLogFiles(logfiles, this._full_lv_bytesize, this.tableDir!);
  }
  async _startup_run_wal_sync() {
    if (!existsSync(this.wDir!)) {
      mkdirSync(this.wDir!);
      return;
    }
    const dir = await opendir(this.wDir!);
    let isThereSomeThingToFlush = false;
    for await (const dirent of dir) {
      if (dirent.isFile()) {
        if (!isThereSomeThingToFlush) {
          isThereSomeThingToFlush = true;
          console.log(
            "Exabase is flushing uncommitted querys after last shutdown"
          );
        }
        // ? some of these trs will be [] in cases where there was a crash and data retrival failed
        // ? hence the responce was not a success
        // ? therefore only a database remains consistent in the face of crashes

        const trs = await readDataFromFile(
          this.RCT_KEY,
          this.wDir + dirent.name
        );
        this.wQueue.push([dirent.name, trs]);
      }
    }
    if (isThereSomeThingToFlush) {
      await this._partition_wal_compiler();
    }
  }
  async _sync_searchindex(size: number) {
    // ? search index columns checks
    const sindexes = [];
    if (this._schema.tableName) {
      //? keep a easy track of relationships
      if (this._schema.searchIndexOptions) {
        for (const key in this._schema.searchIndexOptions) {
          if (!this._schema.columns[key]) {
            throw new ExabaseError(
              " tableName:",
              key,
              " not found on table",
              this._schema.tableName,
              ", please recheck the defined columns!"
            );
          } else {
            sindexes.push(key);
          }
        }
      }
    }
    // ? index  validation
    if (!this._search.confirmLength(size)) {
      console.log("Re-calculating search index due to changes in log size");
      this._search.restart(); // reset indexes to zero
      for (const file in this._LogFiles) {
        const LOG = await readDataFromFile(this.RCT_KEY, this.tableDir + file);
        this._search.bulkInsert(LOG); // index all available items
      }
    }
  }
  async _run_wal_sync(querys: wQueue) {
    //? persist active logs in memory
    const degrees: Record<string, Msgs> = {};
    //? a list of used wal files
    const usedWalFiles: string[] = [];
    const walers = querys.map(async ([key, query]) => {
      usedWalFiles.push(key);
      if (Array.isArray(query)) {
        for (let i = 0; i < query.length; i++) {
          const d = query[i];
          if (!d._wal_flag) {
            if ((d as any)._wal_ignore_flag) {
              continue;
            }
            console.error({ item: d });
            throw new ExabaseError("element has not wal flag");
          }
          //? log file
          const fn = this._getLog(d._id);
          if (!degrees[fn]) {
            // ? load log file
            degrees[fn] = await readDataFromFile(
              this.RCT_KEY,
              this.tableDir + fn
            );
          }
          //?  {mount vector clock here}
          if (d._wal_flag === "i") {
            degrees[fn] = await binarysorted_insert(d, degrees[fn]);
          } else {
            degrees[fn] = await binarysearch_mutate(d, degrees[fn]);
          }
        }
      } else {
        //? log file
        const fn = this._getLog(query._id);
        if (!degrees[fn]) {
          // ? load log file
          degrees[fn] = await readDataFromFile(
            this.RCT_KEY,
            this.tableDir + fn
          );
        }
        if (query._wal_flag === "i") {
          degrees[fn] = await binarysorted_insert(query, degrees[fn]);
        } else {
          degrees[fn] = await binarysearch_mutate(query, degrees[fn]);
        }
      }
    });

    // ? compile wals
    await Promise.all(walers);
    //? save new consistent DB Logs to disk and sync RCT
    await Promise.all(
      Object.keys(degrees).map((key) => this._commit(key, degrees[key]))
    );
    //? remove data from the wal folder by deleting used commit logs
    await Promise.all(usedWalFiles.map((file) => unlink(this.wDir! + file)));
  }
  async _commit(fn: string, messages: Msgs) {
    //? the LOG copy is very neccessary for crash recovery situations.
    this._setLog(fn, messages.at(-1)?._id!, messages.length);
    // ? update this active RCT
    if (Utils.RCT[this.RCT_KEY] !== false) {
      (Utils.RCT[this.RCT_KEY] as Record<string, Msgs>)[fn] = messages;
    }
    // //? log file src
    const fnl = this.tableDir + fn;
    // ? log file copy src
    const sylog = fnl + "-SYNC";
    // ? create a copy of Log file
    if (existsSync(fnl)) {
      await copyFile(fnl, sylog);
    }
    // ? set log size
    this._setLog(fn, messages.at(-1)?._id!, messages.length);
    // ? save new consistent state
    await writeDataToFile(sylog, messages);
    // ? replace log file with sync_log file
    if ((await rename(sylog, fnl)) !== undefined) {
      // ! throw error
      console.log("bug");
    }
  }
  async _partition_wal_compiler() {
    if (this.wQueue.length === 0) {
      return;
    }
    const querys: any[] = [];
    const trxQ: any[] = [];
    for (; this.wQueue.length !== 0; ) {
      const query = this.wQueue.shift()!;
      if (Array.isArray(query[1])) {
        querys.push([query]);
      } else {
        trxQ.push(query);
        if (trxQ.length === 10) {
          querys.push([...trxQ.splice(0)]);
        }
      }
    }
    if (trxQ.length) {
      querys.push([...trxQ.splice(0)]);
    }
    let i = 0;
    const runner = async () => {
      await this._run_wal_sync(querys[i]);
      i += 1;
      if (i === querys.length) {
        return;
      }
      setImmediate(runner);
    };
    await runner();
  }

  _getLog(logId: string): string {
    const size = this._full_lv_bytesize;
    //? old code
    if (logId === "*") {
      return "LOG-1";
    }
    for (const filename in this._LogFiles) {
      const logFile = this._LogFiles[filename];
      //? getting log file name for read operations
      if (logFile.last_id > logId || logFile.last_id === logId) {
        return filename;
      }
      //? getting log file name for inset operation
      if (!logFile.last_id) {
        return filename;
      }
      if (logFile.size < size /*size check is for inserts*/) {
        return filename;
      }
    }
    //? Create a new log file with an incremented number of LOGn filename
    const cln = Number((this._LsLogFile || "LOG-0").split("-")[1]);
    const nln = cln + 1;
    const lfid = "LOG-" + nln;
    this._LogFiles[lfid] = { last_id: lfid, size: 0 };
    this._LsLogFile = lfid;
    return lfid;
  }
  _setLog(fn: string, last_id: string, size: number) {
    this._LogFiles[fn] = { last_id, size };
  }

  _constructRelationships(allSchemas: Schema<any>[]) {
    if (this._schema.tableName) {
      //? keep a easy track of relationships
      if (this._schema.relationship) {
        this._schema._foreign_field = {};
        for (const key in this._schema.relationship) {
          if (typeof this._schema.relationship![key].target === "string") {
            const namee = this._schema.relationship![key].target.toUpperCase();
            const findschema = allSchemas.find(
              (schema) => schema.tableName === namee
            );
            if (findschema) {
              this._schema._foreign_field[key] = namee;
            } else {
              throw new ExabaseError(
                " tableName:",
                namee,
                " not found on any schema, please recheck the relationship definition of the ",
                this._schema.tableName,
                " schema"
              );
            }
          } else {
            throw new ExabaseError(
              " Error on schema ",
              this._schema.tableName,
              " relationship target must be a string "
            );
          }
        }
      }
    }
  }

  _validate(data: any, type?: string) {
    const v = validateData(data, this._schema.columns);
    if (typeof v === "string") {
      throw new ExabaseError(
        type,
        " on table :",
        this._schema.tableName,
        " aborted, reason - ",
        v
      );
    }
    if (!data._id && type === "UPDATE") {
      throw new ExabaseError(
        type + " on table :",
        this._schema.tableName,
        " aborted, reason - _id is required"
      );
    }

    return v;
  }
  _select_(query: QueryType) {
    //? creating a relationship map if needed
    if (Array.isArray(query.select.relationship)) {
      const rela: Record<string, string> = {};
      for (let i = 0; i < query.select.relationship.length; i++) {
        const r = query.select.relationship;
        rela[r] = this._schema.relationship![r as string].target;
      }
      query.select.relationship = rela;
    }
    const file = this._getLog(query.select);
    return findMessage(
      this.RCT_KEY,
      this.tableDir + file,
      query as any
    ) as Promise<Msg>;
  }
  _trx_runner(
    query: QueryType,
    tableDir: string
  ): Promise<Msg | void | Msgs | number | undefined> | number | void {
    if (query["select"]) {
      //? creating a relationship map if needed
      if (Array.isArray(query.select.relationship)) {
        const rela: Record<string, string> = {};
        for (let i = 0; i < query.select.relationship.length; i++) {
          const r = query.select.relationship;
          rela[r] = this._schema.relationship![r as string].target;
        }
        query.select.relationship = rela;
      }
      const file = this._getLog(query.select);
      return findMessages(this.RCT_KEY, tableDir + file, query as any);
    }
    if (query["insert"]) {
      return insertMessage(tableDir, this._schema._unique_field, query.insert);
    }
    if (query["update"]) {
      return updateMessage(tableDir, this._schema._unique_field, query.update);
    }
    if (query["search"]) {
      const indexes = this._search.search(query.search, query.take);
      if (!indexes.length) {
        // console.log({
        //   query: query.search,
        //   indexes,
        //   base: this._search.base,
        //   tree: this._search.tree["ticket"].keys,
        // });
      }
      const searches = indexes.map((_id: string) =>
        this._select_({ select: _id, populate: query.populate })
      );
      return Promise.all(searches);
    }
    if (query["unique"]) {
      return new Promise(async (r) => {
        const select = await findMessageByUnique(
          tableDir + "UINDEX",
          this._schema._unique_field!,
          query.unique
        );
        if (select) {
          const file = this._getLog(select!);
          r(
            await findMessage(this.RCT_KEY, tableDir + file, {
              select,
              populate: query.populate,
            })
          );
        } else {
          r([]);
        }
      });
    }
    if (query["count"]) {
      if (query["count"] === true) {
        //? we can get count right here
        let size = 0;
        const obj = Object.values(this._LogFiles);
        for (let c = 0; c < obj.length; c++) {
          const element = obj[c];
          size += element.size || 0;
        }
        return size;
      } else {
        return this._search.count(query["count"]);
      }
    }
    if (query["delete"]) {
      const file = this._getLog(query.delete);
      return deleteMessage(
        query.delete,
        tableDir,
        this._schema._unique_field,
        this._schema.relationship ? true : false,
        this.RCT_KEY,
        file
      );
    }
    if (query["reference"] && query["reference"]._new) {
      const file = this._getLog(query.reference._id);
      return addForeignKeys(this.RCT_KEY, tableDir + file, query.reference);
    }
    if (query["reference"]) {
      const file = this._getLog(query.reference._id);
      return removeForeignKeys(tableDir + file, query.reference);
    }
  }
  public async _run(
    query: QueryType | QueryType[],
    r: (value: any) => void,
    type: "m" | "nm"
  ) {
    //? create a trx
    const trx = async () => {
      let trs: number | void | Msg | Msgs;
      if (!Array.isArray(query)) {
        trs = await this._trx_runner(query, this.tableDir!);
      } else {
        trs = (await Promise.all(
          query.map((q) => this._trx_runner(q, this.tableDir!))
        )) as Msgs;
      }
      if (type !== "nm" && typeof trs === "object") {
        const wid = generate_id();
        await writeDataToFile(this.wDir! + wid, trs as Msgs);
        this.wQueue.push([wid, trs as Msgs]);
        await this._search.manage(trs as Msg);
      }
      return trs;
    };
    // ? run the write ahead logging manager
    // ? so data to be read is consistent if not already
    if (type === "nm") {
      await this._partition_wal_compiler();
    }

    //? run the trx
    r(await trx());
    // console.log({ query });
    // ? log the query
    if (this.logging) {
      console.log({ query, table: this._schema.tableName, type });
    }
  }
}

class XNode {
  constructor(keys?: { value: any; indexes: number[] }[]) {
    this.keys = keys || [];
  }
  keys: { value: any; indexes: number[] }[] = [];
  insert(value: any, index: number) {
    let low = 0;
    let high = this.keys.length - 1;
    for (; low <= high; ) {
      const mid = Math.floor((low + high) / 2);
      const current = this.keys[mid].value;
      if (current === value) {
        this.keys[mid].indexes.push(index);
        return;
      }
      if (current < value) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    this.keys.splice(low, 0, { value, indexes: [index] });
  }
  disert(value: unknown, index: number) {
    let left = 0;
    let right = this.keys.length - 1;
    for (; left <= right; ) {
      const mid = Math.floor((left + right) / 2);
      const current = this.keys[mid].value;
      if (current === value) {
        this.keys[mid].indexes = this.keys[mid].indexes.filter(
          (a) => a !== index
        );
        return;
      } else if (current! < value!) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }
  upsert(value: unknown, index: number) {
    this.disert(value, index);
    this.insert(value, index);
  }
  search(value: unknown): number[] {
    let left = 0;
    let right = this.keys.length - 1;
    for (; left <= right; ) {
      const mid = Math.floor((left + right) / 2);
      const current = this.keys[mid].value;
      if (
        current === value ||
        (typeof current === "string" && current.includes(value as string))
      ) {
        return this.keys[mid].indexes;
      } else if (current! < value!) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return [];
  }
}

export class XTree {
  base: string[] = [];
  mutatingBase: boolean = false;
  persitKey: string;
  tree: Record<string, XNode> = {};

  constructor(init: { persitKey: string }) {
    this.persitKey = init.persitKey;
    const [base, tree] = XTree.restore(init.persitKey);
    if (base) {
      this.base = base;
      this.tree = tree;
    }
  }
  restart() {
    this.base = [];
    this.tree = {} as Record<string, XNode>;
  }
  search(search: Msg, take: number = Infinity, skip: number = 0) {
    const results: string[] = [];
    for (const key in search) {
      if (this.tree[key]) {
        const indexes = this.tree[key].search(search[key as keyof Msg]);
        if (skip && results.length >= skip) {
          results.splice(0, skip);
          skip = 0;
        }
        results.push(...(indexes || []).map((idx: number) => this.base[idx]));
        if (results.length >= take) break;
      }
    }
    if (results.length >= take) return results.slice(0, take);

    return results;
  }

  searchBase(_id: string) {
    let left = 0;
    let right = this.base.length - 1;
    for (; left <= right; ) {
      const mid = Math.floor((left + right) / 2);
      const current = this.base[mid];
      if (current === _id) {
        return mid;
      } else if (current! < _id!) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return;
  }

  count(search: Msg) {
    let resultsCount: number = 0;
    for (const key in search) {
      if (this.tree[key]) {
        resultsCount += this.tree[key].search(search[key as keyof Msg]).length;
      }
    }
    return resultsCount;
  }

  confirmLength(size: number) {
    return this.base.length === size;
  }

  manage(trx: Msg | Msgs) {
    if (Array.isArray(trx)) {
      switch (trx[0]._wal_flag) {
        case "i":
          return this.bulkInsert(trx as unknown as Msgs);
        case "u":
          return this.bulkUpsert(trx as unknown as Msgs);
        case "d":
          return this.bulkDisert(trx as unknown as Msgs);
        default:
          return;
      }
    } else {
      switch (trx._wal_flag) {
        case "i":
          return this.insert(trx);
        case "u":
          return this.upsert(trx);
        case "d":
          return this.disert(trx);
        default:
          return;
      }
    }
  }
  async insert(data: Msg, bulk = false) {
    if (!data["_id"]) throw new Error("bad insert");
    if (!this.mutatingBase) {
      this.mutatingBase = true;
    } else {
      setImmediate(() => {
        this.insert(data, bulk);
      });
      return;
    }
    // ? save keys in their corresponding nodes
    if (typeof data === "object" && !Array.isArray(data)) {
      for (const key in data) {
        if (key === "_id" || key === "_wal_flag" || key === "_wal_ignore_flag")
          continue;
        if (!this.tree[key]) {
          this.tree[key] = new XNode();
        }
        this.tree[key].insert(data[key as keyof Msg], this.base.length);
      }
      this.base.push(data["_id"]);
      this.mutatingBase = false;
    }
    if (!bulk) await this.persit();
  }
  async disert(data: Msg, bulk = false) {
    if (!data["_id"]) throw new Error("bad insert");
    if (!this.mutatingBase) {
    } else {
      setImmediate(() => {
        this.disert(data, bulk);
      });
      return;
    }
    const index = this.searchBase(data["_id"]);
    if (index === undefined) return;
    if (typeof data === "object" && !Array.isArray(data)) {
      for (const key in data) {
        if (key === "_id" || !this.tree[key]) continue;
        this.tree[key].disert(data[key as keyof Msg], index);
      }
      this.mutatingBase = true;
      this.base.splice(index, 1);
      this.mutatingBase = false;
    }
    if (!bulk) await this.persit();
  }
  async upsert(data: Msg, bulk = false) {
    if (!data["_id"]) throw new Error("bad insert");
    if (!this.mutatingBase) {
    } else {
      setImmediate(() => {
        this.upsert(data, bulk);
      });
      return;
    }
    const index = this.searchBase(data["_id"]);
    if (index === undefined) return;
    if (typeof data === "object" && !Array.isArray(data)) {
      for (const key in data) {
        if (key === "_id") continue;
        if (!this.tree[key]) {
          this.tree[key] = new XNode();
        }
        this.tree[key].upsert(data[key as keyof Msg], index);
      }
    }
    this.mutatingBase = true;
    if (!bulk) await this.persit();
    this.mutatingBase = false;
  }

  async bulkInsert(dataset: Msgs) {
    if (Array.isArray(dataset)) {
      for (let i = 0; i < dataset.length; i++) {
        this.insert(dataset[i], true);
      }
      await this.persit();
    }
  }
  async bulkDisert(dataset: Msgs) {
    if (Array.isArray(dataset)) {
      for (let i = 0; i < dataset.length; i++) {
        this.disert(dataset[i], true);
      }
      await this.persit();
    }
  }
  async bulkUpsert(dataset: Msgs) {
    if (Array.isArray(dataset)) {
      for (let i = 0; i < dataset.length; i++) {
        this.upsert(dataset[i], true);
      }
      await this.persit();
    }
  }

  private persit() {
    const obj: Record<string, any> = {};
    const keys = Object.keys(this.tree);
    for (let index = 0; index < keys.length; index++) {
      obj[keys[index]] = this.tree[keys[index]].keys;
    }
    return FileLockTable.write(this.persitKey, {
      base: this.base,
      tree: obj,
    });
  }
  static restore(persitKey: string) {
    const data = readDataFromFileSync(persitKey);
    const tree: Record<string, any> = {};
    if (data.tree) {
      for (const key in data.tree) {
        tree[key] = new XNode(data.tree[key]);
      }
    }
    return [data.base, tree];
  }
}
