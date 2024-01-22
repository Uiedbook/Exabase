import { type ExaDoc, type ExabaseOptions, type connectOptions } from "./primitives/types.js";
import { Query as TRX } from "./primitives/classes.js";
export declare class Exabase<EaxbaseInit extends ExabaseOptions> {
    private _announced;
    private _conn;
    private _exabaseDirectory;
    constructor(init: EaxbaseInit);
    connect(app?: connectOptions): Promise<unknown> | undefined;
    executeQuery<Model = unknown>(query: string): Promise<Model[]>;
}
export { Schema, ExabaseError } from "./primitives/classes.js";
export type { ExaDoc } from "./primitives/types.js";
export type query<Model = ExaDoc<{}>> = TRX<Model>;
