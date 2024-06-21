import { ExaType, ExaSchema, Query } from "./primitives/classes.js";

/**
 * Interface for Exabase init  */
export type ExabaseOptions = {
  /**
   * Exabase DBMS
   * ---
   * RCT Memory cache percentage  */
  EXABASE_MEMORY_PERCENT?: number;
  /**
   * Exabase DBMS
   * ---
   * name  */
  name?: string;
  /**
   * a url that points to another node this node can hydrate from if out of date  */
  bearer?: string;
  /**
   * type of ring
   */
  mode?: "REPLICATION" | "EXTENSION";
  /**
   * Exabase DBMS
   * ---
   * Data schemas
   */
  schemas: ExaSchema<any>[];
  /**
   * Exabase DBMS
   * ---
   * log each query?
   */
  logging?: boolean;
  /**
   * Exabase DBMS
   * ---
   * Exabase signing keys
   */
  EXABASE_KEYS?: { privateKey: string; publicKey: string };
  /**
   * Exabase DBMS
   * ---
   * Filename of the exabase backup file in the root directory.
   *
   * When extracting, tar will keep the existing file on disk if it's newer than the file in the database archive.
   *  */
  restoreFromBackup?: string;

  /**
   * Exabase DBMS
   * ---
   * Filename of the exabase backup file in the root directory.
   *
   * When extracting, tar will keep the existing file on disk if it's newer than the file in the database archive.
   *  */
  freshNodeUrl?: string;
};

/**
 * Interface for schema metadata mappings  */
export interface SchemaOptions<Model> {
  /**
   * Table name.
   */
  tableName: string;
  /**
   * Exabase RCT
   * ---
   *
   * Enables Regularity Cache Tank for this table?.
   *
   * ***
   * synopsis
   * ***
   * Exabase RCT is a log file level cache, which makes log files retrieve cheap
   *
   * this is integrated because Exabase is not does not cache in any form by default and Exabase only implement RCT cach only
   */
  RCT?: boolean;

  /**
   * Indicates properties and  relationship definitions for the schema
   */
  columns: {
    [x in keyof Partial<Model>]: SchemaColumnOptions;
  };
}

/**
 * Indicates the relationship
 */
export type SchemaRelation = Record<string, SchemaRelationOptions>;
/**
 * Indicates the relationship name
 */
export type SchemaRelationOptions = {
  /**
   * Indicates with which schema this relation is connected to.
   *
   * the tableName of that schema
   */
  target: string;
  /**
   * Type of relation. Can be one of the value of the RelationTypes class.
   */
  RelationType: "MANY" | "ONE";
};

/**
 * Interface for schema column type mappings  */
export interface SchemaColumnOptions {
  /**
   * Column type. Must be one of the value from the ColumnTypes class.
   */
  type: ColumnType;
  /**
   * Column type's length. For example type = "string" and length = 100
   */
  length?: number;
  /**
   * For example, 4 specifies a number of four digits.
   */
  width?: number;
  /**
   * Indicates if column's value can be set to NULL.
   */
  nullable?: boolean;
  /**
   * Exabase DBMS
   * ---
   * Default value.
   */
  default?: any;
  /**
   * Indicates if column's value is unique
   */
  unique?: boolean;
  /**
   * Indicates with which schema this relation is connected to.
   *
   * the tableName of that schema
   */
  target?: string;
  /**
   * Type of relation. Can be one of the value of the RelationTypes class.
   */
  RelationType?: "MANY" | "ONE";
  /**
   * Type of relation. Can be one of the value of the RelationTypes class.
   */
  index?: boolean;
}
/**
 * All together
 */
export type ColumnType =
  | BooleanConstructor
  | NumberConstructor
  | ExaType
  | typeof ExaSchema
  | StringConstructor;

export type columnValidationType = {
  type?: ColumnType;
  width?: number;
  length?: number;
  nullable?: boolean;
  default?: any;
  unique?: boolean;
};

// type qType =
//   | "select"
//   | "insert"
//   | "delete"
//   | "update"
//   | "search"
//   | "take"
//   | "logIndex"
//   | "unique"
//   | "skip"
//   | "reverse"
//   | "reference"
//   | "count"
//   | "table"
//   | "populate";

// export type QueryTypex = Partial<Record<qType, any>>;
export type QueryType<Model> = {
  reference?: {
    _new?: boolean;
    relationshipType: "MANY" | "ONE";
    _id: string;
    foreign_id: string;
    foreign_table: string;
    relationship: string;
  };
  select?: string | Partial<Model>;
  sortBy?: {
    [x in keyof Partial<Model>]: "ASC" | "DESC";
  };
  delete?: string;
  table?: string;
  insert?: Record<string, any>;
  update?: Record<string, any>;
  search?: Record<string, any>;
  unique?: Record<string, any>;
  populate?: Record<string, any>;
  skip?: number;
  take?: number;
  count?: Record<string, any> | boolean;
  /**
   * TODO: exabase doesn't walk the log files until search is complete, no multi-log db would do so either.
   * we only tranverse the first log file or last in reverse mode for findMany("*", {<options>})
   * it's a good idea to allow users to access middle log files
   * in this case they can use logCount to know the number of logs and provide logIndex option to iterate through via .findMany()
   */
  logIndex?: number;
  // reverse?: boolean;
};

export type Msg = { _id: string };
export type Msgs = Msg[];

export interface fTable {
  [x: string]: { [x: string]: string[] | string };
}

export interface iTable {
  [x: string]: { [x: string]: string };
}

export type LOG_file_type = Record<
  string,
  { last_id: string | null; size: number }
>;
/**
 * Document type
 */
export type ExaDoc<Model> = Model & {
  /**
   * Document id
   */
  _id: string;
};

export type connectOptions = {};

export type Xtree_flag = "i" | "u" | "d" | "n";
export type wTrainType = [(value: unknown) => void, Msg, Xtree_flag];
export type wTrainFlagLessType = [(value: unknown) => void, Buffer];
export type ExaQuery<Model = ExaDoc<{}>> = Query<Model>;
