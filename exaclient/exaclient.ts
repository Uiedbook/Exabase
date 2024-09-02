import {
  type Msg,
  type Msgs,
  type QueryType,
  type SchemaRelationOptions,
  type SchemaOptions,
  type SchemaColumnOptions,
  type ExaDoc,
  type SchemaRelation,
} from "../dist/primitives/types.js";
import { validator } from "../dist/primitives/functions.js";

class ExaError extends Error {
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
  _trx: Query<Model>;
  columns: {
    [x: string]: SchemaColumnOptions;
  } = {};
  relationship: SchemaRelation = {};
  _unique_field?: Record<string, true> = undefined;
  _foreign_field?: Record<string, string> = {};
  constructor(options: SchemaOptions<Model>) {
    //? mock query
    this._trx = new Query({} as any);
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
    return this._trx;
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
  _table: string = "";
  constructor(Manager: Manager) {
    this._Manager = Manager;
    this._table = Manager._name;
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
    return this._Manager._query_builder(query) as Promise<ExaDoc<Model>[]>;
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

    return this._Manager._query_builder(query) as Promise<ExaDoc<Model>>;
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
    return this._Manager._query_builder(query) as Promise<ExaDoc<Model>[]>;
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
    const saved = this._Manager._query_builder(query) as Promise<ExaDoc<Model>>;

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
    const saved = this._Manager._query_builder(query) as Promise<ExaDoc<Model>>;

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
    return this._Manager._query_builder(query) as Promise<number>;
  }
  /**
   * Exabase query
   * count the number for log files availble in the Table
   * each log file store 16kb of data
   * @returns
   */
  logCount() {
    return { logCount: true };
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
    return this._Manager._query_builder(query) as Promise<void>;
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
    return this._Manager._query_builder(query) as Promise<void>;
  }
}

export class Manager {
  public _schema: ExaSchema<any>;
  public _name: string;
  public _query: Query<any>;
  public table: string;
  public logging: boolean = false;
  constructor(schema: ExaSchema<any>) {
    this._schema = schema;
    this._name = schema.table;
    this._query = new Query<any>(this);
    schema._trx = this._query;
    // ? setup indexTable for searching
    const columns = schema.columns;
    const indexTable: Record<string, boolean> = {};
    for (const key in columns) {
      indexTable[key] = columns[key].index || false;
    }
    // ? avoid indexing  _wal_ignore_flag & _id ok?
    indexTable["_id"] = false;
    indexTable["_wal_ignore_flag"] = false;
  }

  _validate(data: any) {
    const v = validator(data, this._schema.columns);
    if (typeof v === "string")
      throw new ExaError(this._schema.table, " table error '", v, "'");
    return v;
  }

  async _query_builder(
    query: QueryType<Msg>
  ): Promise<Msg | Msgs | number | void> {
    if (query["insert"] || query["update"]) {
      this._validate(query.insert || query.update);
    }
    if (this.logging) console.log({ query });
    const res = await fetch("", {
      headers: {},
      body: JSON.stringify(query),
      method: "POST",
      mode: "no-cors",
    });
    const data = await res.json();
    if (!data.exa_error) {
      return data;
    }
    throw new ExaError(data.exa_error);
  }
}
