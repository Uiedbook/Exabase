import * as jetpath from 'jetpath';

declare class ExabaseError extends Error {
    constructor(...err: any[]);
    private static geterr;
}
declare class Schema {
    tableName: string;
    RCT?: boolean;
    columns: {
        [x: string]: SchemaColumnOptions;
    };
    searchIndexOptions?: SearchIndexOptions;
    relationship?: Record<relationship_name, SchemaRelationOptions>;
    _unique_field: Record<string, true> | undefined;
    _foreign_field: Record<string, string> | undefined;
    migrationFN: ((data: Record<string, string>) => true | Record<string, string>) | undefined;
    constructor(options: SchemaOptions);
}
declare class Transaction<Model> {
    private _Manager;
    private _query;
    constructor(Manager: Manager);
    /**
     * Exabase query
     * Get the timestamp this data was inserted into the database
     * @param data
     * @returns Date
     */
    static getTimestamp(data: {
        _id: string;
    }): "" | Date;
    /**
     * Exabase query
     * find items on the database,
     * field can be _id string or unique props object
     * @param field
     * @param options
     * @returns
     */
    find(field?: {
        [x: string]: any;
    } | string, options?: {
        populate?: string[] | boolean;
        take?: number;
        skip?: number;
    }): Promise<Model[]>;
    /**
     * Exabase query
     * search items on the database,
     * @param searchQuery
     * @param options
     * @returns
     */
    search(searchQuery: Model, options?: {
        populate?: string[] | boolean;
        take?: number;
        skip?: number;
    }): Promise<Model>;
    /**
     * Exabase query
     * insert or update items on the database,
     * @param data
     * @returns
     */
    save(data: Model): Promise<Model>;
    /**
     * Exabase query
     * delete items on the database,
     * @param _id
     * @returns
     */
    delete(_id: string): Promise<Model | undefined>;
    /**
     * Exabase query
     * count items on the database
     * @returns
     */
    count(pops?: Record<string, any>): Promise<number>;
    /**
     * Exabase query
     * clear the wal of the table on the database
     */
    flush(): Promise<void>;
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
    }): Promise<unknown>;
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
    }): Promise<unknown>;
    /**
     * Exabase query
     * batch write operations on the database
     * @param data
     * @param type
     */
    batch(data: Model[], type: "INSERT" | "UPDATE" | "DELETE"): Promise<void>;
    private _prepare_for;
    /**
     * Exabase query
     * execute a batch operation on the database
     */
    exec(): Promise<Model[]>;
}
declare class Manager {
    _schema: Schema;
    _transaction: Transaction<any>;
    private wQueue;
    private wDir?;
    private tableDir;
    private RCT_KEY;
    private _full_lv_bytesize;
    private _LogFiles;
    private _LsLogFile?;
    private SearchManager?;
    logging: boolean;
    constructor(schema: Schema, usablemManagerMem: number);
    _setup(init: {
        _exabaseDirectory: string;
        logging: boolean;
        schemas: Schema[];
    }): Promise<boolean>;
    _sync_logs(): Promise<void>;
    _startup_run_wal_sync(): Promise<void>;
    _sync_searchindex(size: number): Promise<void>;
    _run_wal_sync(transactions: wQueue): Promise<void>;
    _commit(fn: string, messages: Msgs): Promise<void>;
    _partition_wal_compiler(): Promise<void>;
    getLog(logId: string): string;
    setLog(fn: string, last_id: string, size: number): void;
    _constructRelationships(allSchemas: Schema[]): void;
    _validate(data: any, type?: string): Record<string, any>;
    _select_(query: QueryType): Promise<Msg>;
    _trx_runner(query: QueryType, tableDir: string): Promise<Msg | void | Msgs | number | undefined> | number | void;
    _run(query: QueryType | QueryType[], r: (value: any) => void, type: "m" | "nm"): Promise<void>;
}

/**
 * Interface for Exabase init  */
type ExabaseOptions = {
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
interface SchemaOptions {
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
type relationship_name = string;
/**
 * Interface for schema relations mappings  */
interface SchemaRelationOptions {
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
interface SchemaColumnOptions {
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
interface SearchIndexOptions {
    [column: string]: boolean;
}
/**
 * All together
 */
type ColumnType = BooleanConstructor | DateConstructor | NumberConstructor | Date | JSON | StringConstructor;
type qType = "select" | "insert" | "delete" | "update" | "search" | "take" | "unique" | "skip" | "order" | "reference" | "count" | "populate";
type QueryType = Partial<Record<qType, any>>;
type Msgs = {
    _id: string;
    _wal_flag: string;
}[];
type Msg = {
    _id: string;
    _wal_flag: string;
};
type wQueue = [string, Msgs | Msg][];
type ExaDoc<Model extends {
    [column: string]: any;
}> = Model & {
    _id?: string;
};

declare class Exabase<EaxbaseInit extends ExabaseOptions> {
    private _ready;
    private _conn;
    private _exabaseDirectory;
    constructor(init: EaxbaseInit);
    connect(): Promise<unknown> | undefined;
    getTransaction(schema: Schema): Transaction<Record<string | number, unknown>>;
    expose(): Promise<(ctx: jetpath.AppCTXType) => Promise<void>>;
    executeQuery<Model = unknown>(query: string): Promise<Model[]>;
}

type TransactionType<Model = ExaDoc<{}>> = Transaction<Model>;

export { ExaDoc, Exabase, ExabaseError, Schema, TransactionType };
