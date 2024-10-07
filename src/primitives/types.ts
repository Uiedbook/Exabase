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
   * this is integrated because Exabase is not does not cache in any form by default and Exabase only implement RCT cache only
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
export type ColumnType = "string" | "number" | "boolean";

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
  | Record<
      "$eq" | "$ne" | "$gt" | "$gte" | "$lt" | "$lte" | "$pick",
      Partial<Model>
    >;

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
  populate?: Record<string, any>;
  skip?: number;
  take?: number;
  count?: Record<string, any> | boolean;
};

export type Msg = {
  _id: string;
  [x: string]: string | string[] | number | boolean | Msg | Msg[];
};
export type Msgs = Msg[];

export interface iTable {
  [x: string]: { [x: string]: string };
}

export type LOG_file_type = Record<string, { last_id: string; size: number }>;
export type Xtree_flag = "i" | "u" | "d" | "n";
export type wTrainType = [(value: unknown) => void, Msg, Xtree_flag];

export type xPersistType = {
  maps: Record<string, Record<string, number[]>>;
  keys: string[];
  logKeys: string[];
};
