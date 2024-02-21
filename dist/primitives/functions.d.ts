/// <reference types="node" />
import { Buffer } from "node:buffer";
import { type Msg, type Msgs, type SchemaColumnOptions, type Xtree_flag } from "./types.js";
export declare const loadLog: (filePath: string) => Promise<Msgs>;
export declare const loadLogSync: (filePath: string) => any;
export declare function updateMessage(dir: string, _unique_field: Record<string, true> | undefined, message: Msg): Promise<Msg>;
export declare function prepareMessage(dir: string, _unique_field: Record<string, true> | undefined, message: Msg): Promise<Msg>;
export declare function deleteMessage(_id: string, dir: string, _unique_field: Record<string, true> | undefined, _foreign_field: boolean, fn: string, RCTiedlog: any): Promise<Msg>;
export declare function findMessage(fileName: string, fo: {
    select: string;
    populate?: Record<string, string>;
}, messages: Msgs): Promise<Msg | undefined>;
export declare const addForeignKeys: (fileName: string, reference: {
    _id: string;
    foreign_table: string;
    foreign_id: string;
    type: "MANY" | "ONE";
    relationship: string;
}, RCTiedlog: any) => Promise<void>;
export declare const populateForeignKeys: (fileName: string, _id: string, relationships: Record<string, string>) => Promise<Record<string, Record<string, any> | Record<string, any>[]>>;
export declare const removeForeignKeys: (fileName: string, reference: {
    _id: string;
    foreign_id: string;
    foreign_table: string;
    relationship: string;
}) => Promise<void>;
export declare const findMessageByUnique: (fileName: string, _unique_field: Record<string, true>, data: Record<string, any>) => Promise<string | undefined>;
export declare const binarysearch_find: (_id: string, messages: {
    _id: string;
}[]) => number | undefined;
export declare const binarysearch_mutate: (message: Msg, messages: Msgs, flag: Xtree_flag) => Promise<Msgs>;
export declare const binarysorted_insert: (message: Msg, messages: Msgs) => Promise<Msgs>;
export declare const generate_id: () => string;
export declare const encode_timestamp: (timestamp: string) => string;
export declare function validateData(data?: Record<string, Record<string, any>>, schema?: Record<string, SchemaColumnOptions>): string | Record<string, any>;
export declare const getComputedUsage: (allowedUsagePercent: number, schemaLength: number) => number;
export declare function resizeRCT(level: number, data: Record<string, any>): void;
export declare function SynFileWrit(file: string, data: Buffer): Promise<void>;
export declare const SynFileWritWithWaitList: {
    waiters: Record<string, ((value: unknown) => void)[]>;
    acquireWrite(file: string): Promise<unknown>;
    write(file: string, data: Buffer): Promise<void>;
};
