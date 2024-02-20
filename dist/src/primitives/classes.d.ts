/// <reference types="node" />
import { Packr } from "msgpackr";
import { type Msg, type Msgs, type QueryType, type SchemaRelationOptions, type SchemaOptions, type SchemaColumnOptions, type SearchIndexOptions, type ExaDoc, type Xtree_flag } from "./types";
import { Sign, Verify } from "node:crypto";
export declare class Utils {
    static MANIFEST: {
        schemas: Schema<any>[];
        bearer: string;
        rings: string[];
        EXABASE_KEYS: {
            privateKey: String;
            publicKey: String;
        };
        sign?: Sign;
        verify?: Verify;
    };
    static EXABASE_RING_STATE: Record<string, Manager>;
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
    _trx: Query<Model>;
    columns: {
        [x: string]: SchemaColumnOptions;
    };
    searchIndexOptions?: SearchIndexOptions;
    relationship?: Record<string, SchemaRelationOptions>;
    _unique_field?: Record<string, true>;
    _foreign_field?: Record<string, string>;
    migrationFN: ((data: Record<string, string>) => true | Record<string, string>) | undefined;
    _premature: boolean;
    constructor(options: SchemaOptions<Model>);
    /**
     * Exabase
     * ---
     * querys object
     * @returns {Query<Model>}
     */
    get query(): Query<Model>;
    /**
     * Exabase query
     * Get the timestamp this data was inserted into the database
     * @param data
     * @returns Date
     */
    static getTimestamp(_id: string): Date;
}
export declare class Query<Model> {
    private _Manager;
    premature: boolean;
    constructor(Manager: Manager);
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
    }): Promise<ExaDoc<Model>[]>;
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
    }): Promise<ExaDoc<Model>>;
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
    }): Promise<ExaDoc<Model>[]>;
    /**
     * Exabase query
     * insert or update items on the database
     * @param data
     * @returns
     */
    save(data: Partial<ExaDoc<Model>>): Promise<ExaDoc<Model>>;
    /**
     * Exabase query
     * delete items on the database,
     * @param _id
     * @returns
     */
    delete(_id: string): Promise<ExaDoc<Model>>;
    /**
     * Exabase query
     * count items on the database
     * @returns
     */
    count(pops?: Partial<Model>): Promise<number>;
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
    }): Promise<void>;
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
    }): Promise<void>;
    /**
     * Exabase query
     * insert or update many items on the database
     * @param data
     * @param type
     */
    saveBatch(data: Partial<Model>[]): Promise<ExaDoc<Model[]>>;
    deleteBatch(data: Partial<Model>[]): Promise<ExaDoc<Model[]>>;
    private _prepare_for;
}
export declare class Manager {
    _schema: Schema<any>;
    _name: string;
    _query: Query<any>;
    tableDir: string;
    RCTied: boolean;
    RCT: Record<string, Msgs>;
    private _LogFiles;
    private _topLogFile?;
    private _search;
    logging: boolean;
    constructor(schema: Schema<any>);
    _setup(init: {
        _exabaseDirectory: string;
        logging: boolean;
        schemas: Schema<any>[];
    }): Promise<void> | undefined;
    waiters: Record<string, ((value: unknown) => void)[]>;
    acquireWritter(file: string): Promise<unknown>;
    write(file: string, message: Msg, flag: Xtree_flag): Promise<Msg>;
    _sync_logs(): Promise<void>;
    _sync_searchindex(size: number): Promise<void>;
    _getReadingLog(logId: string): string;
    _getInsertLog(): string;
    _setLog(fn: string, last_id: string | null, size: number): void;
    _constructRelationships(allSchemas: Schema<any>[]): void;
    _validate(data: any, update?: boolean): Record<string, any>;
    _select(query: QueryType): Promise<Msg | Msgs>;
    _trx_runner(query: QueryType): Promise<Msg | Msgs | number | void>;
    _runMany(query: QueryType[]): Promise<Msgs>;
    _run(query: QueryType): Promise<number | void | Msg | Msgs>;
}
declare class XNode {
    constructor(keys?: {
        value: any;
        indexes: number[];
    }[]);
    keys: {
        value: any;
        indexes: number[];
    }[];
    insert(value: any, index: number): void;
    disert(value: unknown, index: number): void;
    upsert(value: unknown, index: number): void;
    search(value: unknown): number[];
}
export declare class XTree {
    base: string[];
    mutatingBase: boolean;
    persitKey: string;
    tree: Record<string, XNode>;
    constructor(init: {
        persitKey: string;
    });
    restart(): void;
    search(search: Msg, take?: number, skip?: number): string[];
    searchBase(_id: string): number | undefined;
    count(search: Msg): number;
    confirmLength(size: number): boolean;
    manage(trx: Msg, flag: Xtree_flag): Promise<void> | undefined;
    insert(data: Msg, bulk?: boolean): Promise<void>;
    disert(data: Msg, bulk?: boolean): Promise<void>;
    upsert(data: Msg, bulk?: boolean): Promise<void>;
    private persit;
    static restore(persitKey: string): any[];
}
export {};
