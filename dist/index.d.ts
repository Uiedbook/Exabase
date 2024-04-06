import { type ExabaseOptions, type connectOptions } from "./primitives/types.js";
export declare class Exabase {
    private _announced;
    private _conn;
    private _exabaseDirectory;
    constructor(init: ExabaseOptions);
    connect(app?: connectOptions): Promise<unknown> | undefined;
    executeQuery(query: string): Promise<number | void | import("./primitives/types.js").Msg | import("./primitives/types.js").Msgs>;
}
export { ExaSchema, ExaError, ExaType } from "./primitives/classes.js";
export { ExaId } from "./primitives/functions.js";
export type { ExaDoc, ExaQuery } from "./primitives/types.js";
