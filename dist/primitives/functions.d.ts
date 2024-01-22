import { type Msg, type Msgs, type SchemaColumnOptions } from "./types";
export declare const readDataFromFile: (RCT_KEY: string, filePath: string) => Promise<Msgs>;
export declare const readDataFromFileSync: (filePath: string) => any;
export declare const writeDataToFile: (filePath: string, data: Record<string, any>) => Promise<void>;
export declare function updateMessage(dir: string, _unique_field: Record<string, true> | undefined, message: Msg): Promise<Msg>;
export declare function insertMessage(dir: string, _unique_field: Record<string, true> | undefined, message: Msg): Promise<Msg>;
export declare function deleteMessage(_id: string, dir: string, _unique_field: Record<string, true> | undefined, _foreign_field: boolean, RCT_KEY: string, fn: string): Promise<Msg>;
export declare function findMessages(RCT_KEY: string, fileName: string, fo: {
    select: string;
    skip?: number;
    populate?: Record<string, string>;
    take?: number;
}): Promise<Msg | Msgs | undefined>;
export declare function findMessage(RCT_KEY: string, fileName: string, fo: {
    select: string;
    populate?: Record<string, string>;
}): Promise<Msg | undefined>;
export declare const addForeignKeys: (RCT_KEY: string, fileName: string, reference: {
    _id: string;
    foreign_table: string;
    foreign_id: string;
    type: "MANY" | "ONE";
    relationship: string;
}) => Promise<void>;
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
export declare const binarysearch_mutate: (message: Msg, messages: Msgs) => Promise<Msgs>;
export declare const binarysorted_insert: (message: Msg, messages: Msgs) => Promise<Msgs>;
export declare const generate_id: () => string;
/**

// ? FILE LOCK TABLE

Writes and reads to the LOG(n) files and WAL directory
are designed to be concurent.

but we cannot gurantee the changes to some certain files

like the
- FINDEX key table
- XINDEX key table and the
- UINDEX key table files

the below data structure allows to synchronise these file accesses
*/
export declare const FileLockTable: {
    table: Record<string, boolean>;
    write(fileName: string, content: any): Promise<void>;
    _run(fileName: string, content: any): Promise<void>;
};
export declare function validateData(data?: Record<string, Record<string, any>>, schema?: Record<string, SchemaColumnOptions>): string | Record<string, any>;
export declare const getComputedUsage: (allowedUsagePercent: number, schemaLength: number) => number;
