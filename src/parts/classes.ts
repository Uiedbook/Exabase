import { copyFile, opendir, rename, unlink } from "node:fs/promises";
import {
  LOG_file_type,
  Msg,
  Msgs,
  QueryType,
  SchemaRelationOptions,
  SchemaOptions,
  qType,
  relationship_name,
  trx,
  wQueue,
  SchemaColumnOptions,
  SearchIndexOptions,
} from "../types";
import { validateData } from "./validator.js";
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
  findMessagesByProperties,
  generate_id,
  binarysearch_mutate,
  findMessageByUnique,
} from "./fs-utils";
import { Packr } from "msgpackr";
import { existsSync, mkdirSync } from "node:fs";
import { freemem } from "node:os";
import { it } from "node:test";

export class Utils {
  static MANIFEST = {
    name: "Exabase",
    port: 8080,
    schemas: [],
    mode: "REPLICATION",
    extension_level: 1,
    ringbearers: [],
  };
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

export class Schema {
  tableName: string;
  RCT?: boolean;
  columns: {
    [x: string]: SchemaColumnOptions;
  } = {};
  searchIndexOptions?: SearchIndexOptions;
  relationship?: Record<relationship_name, SchemaRelationOptions> = {};
  _unique_field: Record<string, true> | undefined = {};
  _foreign_field: Record<string, string> | undefined = undefined;
  migrationFN:
    | ((data: Record<string, string>) => true | Record<string, string>)
    | undefined;
  //! maybe add pre & post processing hooks
  constructor(options: SchemaOptions) {
    this.tableName = options.tableName.trim().toUpperCase();
    if (options.tableName) {
      this._unique_field = {};
      this.relationship = options.relationship;
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
      //? check if theres a unique key entered else make it undefined to avoid truthiness
      if (Object.keys(this._unique_field).length === 0) {
        this._unique_field = undefined;
      }
      //? keep a easy track of relationships
      if (options.relationship) {
        this.relationship = options.relationship;
      }
    }
  }
  _constructRelationships(allSchemas: Schema[]) {
    if (this.tableName) {
      //? keep a easy track of relationships
      if (this.relationship) {
        this._foreign_field = {};
        for (const key in this.relationship) {
          if (typeof this.relationship![key].target === "string") {
            const namee = this.relationship![key].target.toUpperCase();
            const findschema = allSchemas.find(
              (schema) => schema.tableName === namee
            );
            if (findschema) {
              this._foreign_field[key] = namee;
            } else {
              throw new ExabaseError(
                " tableName:",
                namee,
                " not found on any schema, please recheck the relationship definition of the ",
                this.tableName,
                " schema"
              );
            }
          } else {
            throw new ExabaseError(
              " Error on schema ",
              this.tableName,
              " relationship target must be a string "
            );
          }
        }
      }
    }
  }
  _ValidateSearchIndex() {
    // ? search index columns checks
    if (this.tableName) {
      //? keep a easy track of relationships
      if (this.searchIndexOptions) {
        for (const key in this.searchIndexOptions) {
          if (!this.columns[key]) {
            throw new ExabaseError(
              " tableName:",
              key,
              " not found on table",
              this.tableName,
              ", please recheck the defined columns!"
            );
          }
        }
      }
    }
    // ? index validation
    /*
    
    
    */
  }
  _validate(data: any, type?: string) {
    // console.log(this.columns, data);
    const v = validateData(data, this!.columns);
    if (typeof v === "string") {
      throw new ExabaseError(
        type,
        " on table :",
        this.tableName,
        " aborted, reason - ",
        v
      );
    }
    if (!data._id && type === "UPDATE") {
      throw new ExabaseError(
        type + " on table :",
        this.tableName,
        " aborted, reason - _id is required"
      );
    }

    return v;
  }
}

//? this is okay because it's reusable
export class Transaction<Model> {
  private _Manager: Manager;
  private _query: QueryType[] = [];
  constructor(Manager: Manager) {
    this._Manager = Manager;
  }
  static getTimestamp(data: { _id: string }) {
    if (data._id) {
      return new Date(parseInt(this.toString().slice(0, 8), 16) * 1000);
    }
    return;
  }
  find(
    field?:
      | {
          [x: string]: any;
        }
      | string,
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
        value = field[k as string];
        break;
      }
      const fieldT = (this._Manager._schema.columns as any)[key as string];
      if (fieldT) {
        if (fieldT && fieldT.unique) {
          query["unique"] = {
            [key]: value,
          };
        } else {
          // ? search the query instead
          query.search = { [key]: value };
        }
      } else {
        // ? check if props exists
        throw new ExabaseError(
          `column field ${key} does not exists in ${this._Manager._schema.tableName}`
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
    }) as Promise<Model[]>;
  }

  save(data: Model) {
    let query: QueryType;
    if ((data as any)._id) {
      query = {
        update: this._Manager._schema._validate(data, "UPDATE"),
      };
    } else {
      query = {
        insert: this._Manager._schema._validate(data, "INSERT"),
      };
    }
    return new Promise((r) => {
      this._Manager._run(query, r, "m");
    }) as Promise<Model>;
  }
  delete(_id: string) {
    if (!_id || typeof _id !== "string") {
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
    }) as Promise<Model | undefined>;
  }
  count() {
    const query: QueryType = {
      count: true,
    };
    return new Promise((r) => {
      this._Manager._run(query, r, "nm");
    }) as Promise<number>;
  }
  flush() {
    return this._Manager._partition_wal_compiler();
  }
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
  async batch(data: Model[], type: "INSERT" | "UPDATE" | "DELETE") {
    if (Array.isArray(data) && "INSERT-UPDATE-DELETE".includes(type)) {
      await this._prepare_for(data, type);
    } else {
      throw new ExabaseError(
        `Invalid inputs for .batch method, data should be array and type should be any of  "INSERT", "UPDATE",  "DELETE" .`
      );
    }
  }
  private async _prepare_for(
    data: Model[],
    type: "INSERT" | "UPDATE" | "DELETE"
  ) {
    const validations = data.map((item) => {
      if (type === "DELETE") {
        if ((item as any)._id) {
          item = (item as any)._id;
        }
        if (!item || typeof item !== "string") {
          throw new ExabaseError(
            "cannot continue with delete query '",
            item,
            "' is not a valid Exabase _id value"
          );
        }
        return {
          [type.toLowerCase()]: item,
        };
      }
      return {
        [type.toLowerCase()]: this._Manager._schema._validate(item, type),
      };
    });
    data.length &&
      this._query.push(
        ...((await Promise.all(validations)) as Partial<
          Record<qType, any>
        > as any[])
      );
  }
  exec() {
    if (this._query.length) {
      return new Promise((r) => {
        this._Manager._run(this._query.splice(0), r, "m");
      }) as Promise<Model[]>;
    }
    return [] as unknown as Promise<Model[]>;
  }
}

export class Manager {
  _schema: Schema;
  public _transaction: Transaction<any>;
  private wQueue: wQueue = [];
  private wDir?: string;
  private tableDir: string = "";
  private RCT_KEY: string;
  private _full_lv_bytesize: number;
  private _LogFiles: LOG_file_type = {};
  private _LsLogFile?: string;
  logging: boolean = false;
  constructor(schema: Schema, usablemManagerMem: number) {
    this._schema = schema;
    this._transaction = new Transaction<any>(this);
    //? get the theorical max items in one log file
    // ? an arbitiary bit size per column for a schema in real time = 20
    this._full_lv_bytesize = Math.round(
      usablemManagerMem / (Object.keys(schema.columns || []).length * 20)
    );
    //? set RCT key
    this.RCT_KEY = this._schema.tableName;
  }
  async _setup(init: { _exabaseDirectory: string; logging: boolean }) {
    // ? setup steps
    this.tableDir = init._exabaseDirectory + "/" + this._schema.tableName + "/";
    this.wDir = this.tableDir + "WAL/";
    this.logging = init.logging;
    //? setting up RCT for this manager
    Utils.RCT[this.RCT_KEY] = this._schema.RCT ? {} : false;
    //? setup table directories
    if (!existsSync(this.tableDir)) {
      mkdirSync(this.tableDir);
      mkdirSync(this.wDir);
    } else {
      //? this is a chain process
      // ? first get logs from disk
      // ? recover and flush WAL
      await this._sync_logs();
    }
    return true;
  }

  async _sync_logs() {
    const dir = await opendir(this.tableDir!);
    const logfiles = [];
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
        if ("FOREIGNSEARCHUNIQUE-INDEXES".includes(fn)) {
          continue;
        }
        const LOG = await readDataFromFile(
          this.RCT_KEY,
          this.tableDir + dirent.name
        );
        const last_id = LOG.at(-1)?._id || "";
        this._LogFiles[fn] = { last_id, size: LOG.length };
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
    //? get current _full_lv_bytesize and rescale if nessecessary
    await ResizeLogFiles(logfiles, this._full_lv_bytesize, this.tableDir!);
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
            "Exabase is flushing uncommitted transactions after last shutdown"
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
  async _run_wal_sync(transactions: wQueue) {
    //? persist active logs in memory
    const degrees: Record<string, Msgs> = {};
    //? a list of used wal files
    const usedWalFiles: string[] = [];
    const walers = transactions.map(async ([key, transaction]) => {
      usedWalFiles.push(key);
      if (Array.isArray(transaction)) {
        let fg: string;
        for (let i = 0; i < transaction.length; i++) {
          const d = transaction[i];
          if (!d._wal_flag) {
            throw new ExabaseError(d, " has not wal flag");
          }
          //? log file
          const fn = this.getLog(d._id);
          fg = fn;
          if (!degrees[fn]) {
            // ? load log file
            degrees[fn] = await readDataFromFile(
              this.RCT_KEY,
              this.tableDir + fn
            );
          }

          if (d._wal_flag === "i") {
            degrees[fn] = await binarysorted_insert(d, degrees[fn]);
          } else {
            degrees[fn] = await binarysearch_mutate(d, degrees[fn]);
          }
        }
      } else {
        //? log file
        const fn = this.getLog(transaction._id);
        if (!degrees[fn]) {
          // ? load log file
          degrees[fn] = await readDataFromFile(
            this.RCT_KEY,
            this.tableDir + fn
          );
        }
        if (transaction._wal_flag === "i") {
          degrees[fn] = await binarysorted_insert(transaction, degrees[fn]);
        } else {
          degrees[fn] = await binarysearch_mutate(transaction, degrees[fn]);
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
    this.setLog(fn, messages.at(-1)?._id!, messages.length);
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
    this.setLog(fn, messages.at(-1)?._id!, messages.length);
    // ? save new consistent state
    await writeDataToFile(sylog, messages);
    // ? replace log file with sync_log file
    if ((await rename(sylog, fnl)) !== undefined) {
      // ! throw error
    }
  }
  async _partition_wal_compiler() {
    if (this.wQueue.length === 0) {
      return;
    }
    const transactions: any[] = [];
    const trxQ: any[] = [];
    for (; this.wQueue.length !== 0; ) {
      const transaction = this.wQueue.shift()!;
      if (Array.isArray(transaction[1])) {
        transactions.push([transaction]);
      } else {
        trxQ.push(transaction);
        if (trxQ.length === 10) {
          transactions.push([...trxQ.splice(0)]);
        }
      }
    }
    if (trxQ.length) {
      transactions.push([...trxQ.splice(0)]);
    }
    let i = 0;
    const runner = async () => {
      await this._run_wal_sync(transactions[i]);
      i += 1;
      if (i === transactions.length) {
        return;
      }
      setImmediate(runner);
    };
    await runner();
  }

  getLog(logId: string): string {
    const size = this._full_lv_bytesize;
    //? old code
    if (logId === "*") {
      return "LOG-1";
    }
    for (const filename in this._LogFiles) {
      const logFile = this._LogFiles[filename];
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
  setLog(fn: string, last_id: string, size: number) {
    this._LogFiles[fn] = { last_id, size };
  }
  _trx_runner(
    query: QueryType,
    tableDir: string
  ): Promise<Msg | void | Msgs> | number | void {
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
      const file = this.getLog(query.select);
      return findMessage(this.RCT_KEY, tableDir + file, query as any);
    }
    if (query["insert"]) {
      return insertMessage(tableDir, this._schema._unique_field, query.insert);
    }
    if (query["update"]) {
      return updateMessage(tableDir, this._schema._unique_field, query.update);
    }
    // ! fix
    if (query["search"]) {
      return findMessagesByProperties(
        this.RCT_KEY,
        tableDir,
        query,
        this._LogFiles
      );
    }
    if (query["unique"]) {
      return new Promise(async (r) => {
        const select = await findMessageByUnique(
          tableDir + "/UNIQUE-INDEXES",
          this._schema._unique_field!,
          query.unique
        );
        if (select) {
          const file = this.getLog(select!);
          r(findMessage(this.RCT_KEY, tableDir + file, { select }));
        } else {
          r([]);
        }
      });
    }
    if (query["count"]) {
      //! we can get count right here
      let size = 0;
      const obj = Object.values(this._LogFiles);
      for (let c = 0; c < obj.length; c++) {
        const element = obj[c];
        size += element.size || 0;
      }
      return size;
    }
    if (query["delete"]) {
      const file = this.getLog(query.delete);
      return deleteMessage(
        query.delete,
        tableDir,
        this._schema._unique_field,
        this.RCT_KEY,
        file
      );
    }
    if (query["reference"] && query["reference"]._new) {
      const file = this.getLog(query.reference._id);
      return addForeignKeys(this.RCT_KEY, tableDir + file, query.reference);
    }
    if (query["reference"]) {
      const file = this.getLog(query.reference._id);
      return removeForeignKeys(tableDir + file, query.reference);
    }
  }
  public async _run(
    query: QueryType | QueryType[],
    resolver: (value: any) => void,
    type: "m" | "nm"
  ) {
    //? create a trx
    const trx: trx = async (resolver) => {
      let trs: number | void | Msg | Msgs;
      if (!Array.isArray(query)) {
        trs = await this._trx_runner(query, this.tableDir!);
      } else {
        trs = (await Promise.all(
          query.map((q) => this._trx_runner(q, this.tableDir!))
        )) as Msgs;
      }
      if (type !== "nm") {
        const wid = generate_id();
        trs &&
          this.wQueue.push([wid, trs as Msgs]) &&
          (await writeDataToFile(this.wDir! + wid, trs as Msgs));
      }
      if (this.logging) {
        console.log({ query, result: trs });
      }
      resolver!(trs);
    };
    // ? run the write ahead logging manager
    // ? so data to be read is consistent
    if (type === "nm") {
      await this._partition_wal_compiler();
    }
    //? run the trx
    trx(resolver);
  }
}

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
