import { type ExaDoc, type ExabaseOptions, type connectOptions } from "./primitives/types.js";
import { Transaction as TRX } from "./primitives/classes.js";
import { JetPath } from "jetpath";
export declare class Exabase<EaxbaseInit extends ExabaseOptions> {
    private _announced;
    private _conn;
    private _exabaseDirectory;
    constructor(init: EaxbaseInit);
    connect(app?: JetPath | connectOptions): Promise<unknown> | undefined;
    executeQuery<Model = unknown>(query: string): Promise<Model[]>;
}
export { Schema, ExabaseError } from "./primitives/classes.js";
export type { ExaDoc } from "./primitives/types.js";
export type Transaction<Model = ExaDoc<{}>> = TRX<Model>;
