// deno-lint-ignore-file no-explicit-any
import { ExaType, ExaSchema } from "./classes.js";

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
  // bearer?: string;
  /**
   * type of ring
   */
  // mode?: "REPLICATION" | "EXTENSION";
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
  // EXABASE_KEYS?: { privateKey: string; publicKey: string };
  /**
   * Exabase DBMS
   * ---
   * Filename of the exabase backup file in the root directory.
   *
   * When extracting, tar will keep the existing file on disk if it's newer than the file in the database archive.
   *  */
  backupFileName?: string;
};

/**
 * Interface for schema metadata mappings  */
export interface SchemaOptions<Model> {
  /**
   * Table name.
   */
  table: Uppercase<string>;
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

  /**
   * Indicates properties and  relationship definitions for the schema
   */
  columns: {
    [x in keyof Omit<Model, "_id">]: SchemaColumnOptions;
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
   * the table of that schema
   */
  target: string;
  /**
   * Type of relation. Can be one of the value of the RelationTypes class.
   */
  relationType: "MANY" | "ONE";
};

/**
 * Interface for schema column type mappings  */
export interface SchemaColumnOptions {
  /**
   * Exabase DBMS
   * ----------
   * Column type. Must be one of the value from the ColumnTypes class.
   */
  type: ColumnType;
  /**
   * Exabase DBMS
   * ----------
   * Column type's value max. For example ( type: String, max: 100 )
   */
  max?: number;
  /**
   * Exabase DBMS
   * ----------
   * Column type's value min. For example ( type: String, min: 100 )
   */
  min?: number;
  /**
   * Exabase DBMS
   * ----------
   * default error when the value is wrong
   */
  err?: string;
  /**
   * Exabase DBMS
   * ----------
   * RegExp
   */
  RegExp?: RegExp;
  /**
   * Indicates if column's value can be set to NULL.
   */
  required?: boolean;
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
   * the table of that schema
   */
  target?: string;
  /**
   * Type of relation. Can be one of the value of the RelationTypes class.
   */
  relationType?: "MANY" | "ONE";
  /**
   * The name of the relationship. YOU DON'T NEED TO PROVIDE THIS.
   */
  relationship?: string;
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
  max: number;
  min: number;
  required?: boolean;
  err?: string;
  RegExp?: RegExp;
  default?: any;
  unique?: boolean;
};

export type searchQuery<Model> =
  | Partial<Model>
  | Record<"$eq" | "$ne" | "$gt" | "$gte" | "$lt" | "$lte", Partial<Model>>;

export type QueryType<Model> = {
  table?: string;
  one?: string;
  sort?: {
    // for search and many
    [x in keyof Partial<Model>]: "ASC" | "DESC";
  };
  many?: true;
  search?: searchQuery<Model>;
  insert?: Record<string, any>;
  update?: Partial<Model>;
  delete?: string;
  unique?: Record<string, any>;
  populate?: Record<string, any>;
  skip?: number;
  take?: number;
  count?: Record<string, any> | boolean;
  logIndex?: number;
  logCount?: boolean;
};

export type Msg = {
  _id: string;
  // [x: string]: string | string[] | number | boolean | Msg | Msg[];
};
export type Msgs = Msg[];

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
export type ExaDoc<Model = any> = Model & {
  /**
   * Document id
   */
  _id: string;
};
export type Xtree_flag = "i" | "u" | "d" | "n";
export type wTrainType = [(value: unknown) => void, Msg, Xtree_flag];
// export type ExaQuery<Model = ExaDoc<Record<string | number | symbol, never>>> =
//   Query<Model>;
