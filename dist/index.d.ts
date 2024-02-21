import { type ExaDoc, type ExabaseOptions, type connectOptions } from "./primitives/types.js";
import { Query as TRX } from "./primitives/classes.js";
export declare class Exabase {
    private _announced;
    private _conn;
    private _exabaseDirectory;
    constructor(init: ExabaseOptions);
    connect(app?: connectOptions): Promise<unknown> | undefined;
    executeQuery(query: string): Promise<number | void | import("./primitives/types.js").Msg | import("./primitives/types.js").Msgs>;
}
export { Schema, ExabaseError } from "./primitives/classes.js";
export type { ExaDoc } from "./primitives/types.js";
export type query<Model = ExaDoc<{}>> = TRX<Model>;
