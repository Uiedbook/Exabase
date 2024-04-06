import { ExaType, ExaSchema, Query } from "./classes.js";
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
    EXABASE_KEYS?: {
        privateKey: string;
        publicKey: string;
    };
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
}
/**
 * All together
 */
export type ColumnType = BooleanConstructor | NumberConstructor | ExaType | typeof ExaSchema | StringConstructor;
export type columnValidationType = {
    type?: ColumnType;
    width?: number;
    length?: number;
    nullable?: boolean;
    default?: any;
    unique?: boolean;
};
export type qType = "select" | "insert" | "delete" | "update" | "search" | "take" | "unique" | "skip" | "order" | "reference" | "count" | "populate";
export type QueryType = Partial<Record<qType, any>>;
export type Msg = {
    _id: string;
};
export type Msgs = Msg[];
export interface fTable {
    [x: string]: {
        [x: string]: string[] | string;
    };
}
export interface iTable {
    [x: string]: {
        [x: string]: string;
    };
}
export type LOG_file_type = Record<string, {
    last_id: string | null;
    size: number;
}>;
/**
 * Document type
 */
export type ExaDoc<Model> = Model & {
    /**
     * Document id
     */
    _id: string;
};
export type connectOptions = {
    decorate(decorations: Record<string, (ctx: any) => void>): void;
};
export type Xtree_flag = "i" | "u" | "d" | "n";
export type wTrainType = [(value: unknown) => void, Msg, Xtree_flag];
export type ExaQuery<Model = ExaDoc<{}>> = Query<Model>;
