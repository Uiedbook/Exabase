import { Schema } from "./classes";

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
   * Exabase DBMS
   * ---
   * Database username  */
  username?: string;
  /**
   * Exabase DBMS
   * ---
   * name  */
  password?: string;
  /**
   * Exabase DBMS
   * ---
   * authorisation secret  */
  EXABASE_SECRET?: string;
  /**
   * list of urls that points to other nodes in this node's ring  */
  ringbearers?: string[];

  mode?: "REPLICATION" | "EXTENSION";
  /**
   * Exabase DBMS
   * ---
   * the level of extension this node is set to handle
   * default: 1
   */
  extension_level?: number;
  /**
   * Exabase DBMS
   * ---
   * Data schemas
   */
  schemas: Schema[];
  /**
   * Exabase DBMS
   * ---
   * log each query?
   */
  logging?: boolean;
};

/**
 * Interface for schema metadata mappings  */
export interface SchemaOptions {
  /**
   * Search index options  */
  searchIndexOptions?: SearchIndexOptions;
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

  columns: {
    [x: string]: SchemaColumnOptions;
  };
  /**
   * Indicates relationship definitions for the schema
   */
  relationship?: Record<relationship_name, SchemaRelationOptions>;
  /**
   * Exabase migrations
   * ---
   * Indicates a migration function for transforming available items to the changes made in the columns
   * this allows for start-up migration of existing items on Exabase db instance.
   *
   * And again the function is only called during start-up so the db instance need to be restarted.
   *
   * ***
   * synopsis
   * ***
   * This function should return true if the item it receives is already valid as this is not handled automatically to avoid an extra abstraction layer over migrations
   *
   * the function should be removed when no longer needed to avoid Exabase start-up time.
   */
  migrationFN?(data: Record<string, string>): Record<string, string> | true;
}

/**
 * Indicates the relationship name
 */
export type relationship_name = string;

/**
 * Interface for schema relations mappings  */
export interface SchemaRelationOptions {
  /**
   * Indicates with which schema this relation is connected to.
   *
   * the tableName of that schema
   */
  target: string;
  /**
   * Type of relation. Can be one of the value of the RelationTypes class.
   */
  type: "MANY" | "ONE";
}

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
  length?: string | number;
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
}
/**
 * Interface for search index type mappings  */
export interface SearchIndexOptions {
  [column: string]: boolean;
}

/**
 * All together
 */
export type ColumnType =
  | BooleanConstructor
  | DateConstructor
  | NumberConstructor
  | Date
  | JSON
  | StringConstructor;

export type columnValidationType = {
  type?: ColumnType;
  width?: number;
  length?: number;
  nullable?: boolean;
  default?: any;
  unique?: boolean;
};

export type qType =
  | "select"
  | "insert"
  | "delete"
  | "update"
  | "search"
  | "take"
  | "unique"
  | "skip"
  | "order"
  | "reference"
  | "count"
  | "populate";

export type QueryType = Partial<Record<qType, any>>;

export type Msgs = { _id: string; _wal_flag: string }[];
export type Msg = { _id: string; _wal_flag: string };

export interface fTable {
  [x: string]: { [x: string]: string[] | string };
}

export interface iTable {
  [x: string]: { [x: string]: string };
}

export type wQueue = [string, Msgs | Msg][];

export type methods = "GET" | "HEAD" | "PUT" | "POST" | "DELETE" | "PATCH";

export type allowedMethods = methods[];

export type LOG_file_type = Record<string, { last_id: string; size: number }>;

export type ExaDoc<Model extends { [column: string]: any }> = Model & {
  _id?: string;
};
