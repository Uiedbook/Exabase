import { Packr } from "msgpackr";
import { type Msg, type Msgs, type QueryType, type SchemaRelationOptions, type SchemaOptions, type relationship_name, type wQueue, type SchemaColumnOptions, type SearchIndexOptions } from "./types";
export declare class Utils {
    static MANIFEST: {
        name: string;
        port: number;
        schemas: never[];
        mode: string;
        extension_level: number;
        ringbearers: never[];
    };
    static EXABASE_MANAGERS: Record<string, Manager>;
    static packr: Packr;
    static RCT: Record<string, Record<string, Msgs | undefined> | boolean>;
}
export declare class ExabaseError extends Error {
    constructor(...err: any[]);
    private static geterr;
}
export declare class Schema<Model> {
    tableName: string;
    RCT?: boolean;
    _trx: Transaction<Model>;
    columns: {
        [x: string]: SchemaColumnOptions;
    };
    searchIndexOptions?: SearchIndexOptions;
    relationship?: Record<relationship_name, SchemaRelationOptions>;
    _unique_field: Record<string, true> | undefined;
    _foreign_field: Record<string, string> | undefined;
    migrationFN: ((data: Record<string, string>) => true | Record<string, string>) | undefined;
    constructor(options: SchemaOptions);
    get transaction(): Transaction<Model>;
}
export declare class Transaction<Model> {
    private _Manager;
    private _query;
    premature: boolean;
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
    findMany(field?: Partial<Model> | string, options?: {
        populate?: string[] | boolean;
        take?: number;
        skip?: number;
    }): Promise<(Model & {
        _id: string;
    })[]>;
    /**
     * Exabase query
     * find items on the database,
     * field can be _id string or unique props object
     * @param field
     * @param options
     * @returns
     */
    findOne(field: Partial<Model> | string, options?: {
        populate?: string[] | boolean;
    }): Promise<Model & {
        _id: string;
    }>;
    /**
     * Exabase query
     * search items on the database,
     * @param searchQuery
     * @param options
     * @returns
     */
    search(searchQuery: Partial<Model>, options?: {
        populate?: string[] | boolean;
        take?: number;
        skip?: number;
    }): Promise<(Model & {
        _id: string;
    })[]>;
    /**
     * Exabase query
     * insert or update items on the database,
     * @param data
     * @returns
     */
    save(data: Partial<Model>): Promise<Model & {
        _id: string;
    }>;
    /**
     * Exabase query
     * delete items on the database,
     * @param _id
     * @returns
     */
    delete(_id: string): Promise<Model>;
    /**
     * Exabase query
     * count items on the database
     * @returns
     */
    count(pops?: Partial<Model>): Promise<number>;
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
    batch(data: Partial<Model>[], type: "INSERT" | "UPDATE" | "DELETE"): Promise<void>;
    private _prepare_for;
    /**
     * Exabase query
     * execute a batch operation on the database
     */
    exec(): Promise<Model[]> | Promise<Model & {
        _id: string;
    }[]>;
}
export declare class Manager {
    _schema: Schema<any>;
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
    constructor(schema: Schema<any>, usablemManagerMem: number);
    _setup(init: {
        _exabaseDirectory: string;
        logging: boolean;
        schemas: Schema<any>[];
    }): Promise<void> | undefined;
    _sync_logs(): Promise<void>;
    _startup_run_wal_sync(): Promise<void>;
    _sync_searchindex(size: number): Promise<void>;
    _run_wal_sync(transactions: wQueue): Promise<void>;
    _commit(fn: string, messages: Msgs): Promise<void>;
    _partition_wal_compiler(): Promise<void>;
    _getLog(logId: string): string;
    _setLog(fn: string, last_id: string, size: number): void;
    _constructRelationships(allSchemas: Schema<any>[]): void;
    _validate(data: any, type?: string): Record<string, any>;
    _select_(query: QueryType): Promise<Msg>;
    _trx_runner(query: QueryType, tableDir: string): Promise<Msg | void | Msgs | number | undefined> | number | void;
    _run(query: QueryType | QueryType[], r: (value: any) => void, type: "m" | "nm"): Promise<void>;
}
declare class XNode {
    constructor(keys?: {
        value: unknown;
        indexes: number[];
    }[]);
    keys: {
        value: unknown;
        indexes: number[];
    }[];
    insert(value: unknown, index: number): void;
    disert(value: unknown, index: number): void;
    upsert(value: unknown, index: number): void;
    search(value: unknown): number[];
}
export declare class XTree<X extends Record<string, any>> {
    base: string[];
    mutatingBase: boolean;
    persitKey: string;
    tree: Record<keyof X, XNode>;
    constructor(init: {
        persitKey: string;
    });
    restart(): void;
    search(search: X, take?: number, skip?: number): string[];
    searchBase(_id: string): number | undefined;
    count(search: X): Promise<number>;
    confirmLength(size: number): boolean;
    manage(trx: Msg | Msgs): Promise<void> | undefined;
    insert(data: X, bulk?: boolean): Promise<void>;
    disert(data: X, bulk?: boolean): Promise<void>;
    upsert(data: X, bulk?: boolean): Promise<void>;
    bulkInsert(dataset: X[]): Promise<void>;
    bulkDisert(dataset: X[]): Promise<void>;
    bulkUpsert(dataset: X[]): Promise<void>;
    private persit;
    static restore(persitKey: string): any[];
}
export {};
