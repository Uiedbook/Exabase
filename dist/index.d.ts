import { type ExabaseOptions, type connectOptions } from "./primitives/types.js";
import { backup } from "./primitives/classes.js";
export declare class Exabase {
    backup: backup;
    private _announced;
    private _conn;
    private _exabaseDirectory;
    constructor(init: ExabaseOptions);
    connect(options?: connectOptions): Promise<unknown> | undefined;
    query(tableName: string): import("./primitives/classes.js").Query<any>;
    executeQuery(query: string): Promise<number | void | import("./primitives/types.js").Msg | import("./primitives/types.js").Msgs>;
}
export { ExaSchema, ExaError, ExaType } from "./primitives/classes.js";
export { ExaId } from "./primitives/functions.js";
export type { ExaDoc, ExaQuery } from "./primitives/types.js";
