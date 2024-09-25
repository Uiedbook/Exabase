import { mkdirSync } from "node:fs";
import { type ExabaseOptions } from "./primitives/types.js";
import {
  ExaError,
  GLOBAL_OBJECT,
  Manager,
  ExaSchema,
} from "./primitives/classes.js";
import { getComputedUsage } from "./primitives/functions.js";

export class Exabase {
  private _logging: boolean;
  private _exabaseDirectory: string;
  MEMORY_PERCENT: number;
  schemas: ExaSchema<{}>[] = [];
  constructor(init: ExabaseOptions = {}) {
    GLOBAL_OBJECT._db = this;
    //? initializations
    this._logging = init.logging || false;
    //? [1] directories
    this._exabaseDirectory = (init.name || "DB").trim().toUpperCase();

    // ? setting up memory allocation for RCT enabled cache managers
    this.MEMORY_PERCENT = init.EXABASE_MEMORY_PERCENT || 10;

    // ? create main dir
    try {
      mkdirSync(this._exabaseDirectory);
      console.log("Exabase initialized!");
    } catch (e: any) {
      if ({ e }.e.code !== "EEXIST") console.log(e);
    }
    console.log("Exabase: running!");
  }

  //? this is a function that creates/updates schemas also ajusting RCT memory
  public async _induce(schema: ExaSchema<any>) {
    if (!(schema instanceof ExaSchema)) {
      throw new Error("invalid object passed as exabase schema");
    }
    this.schemas.push(schema);
    // ? setup rct level
    const BEST_RCT_LEVEL_PER_MANAGER = getComputedUsage(
      this.MEMORY_PERCENT,
      this.schemas.length || 10
    );

    //? setup managers
    GLOBAL_OBJECT.EXABASE_MANAGERS[schema?.table!] = new Manager(schema);
    // ? setup relationships
    await GLOBAL_OBJECT.EXABASE_MANAGERS[schema?.table!]._setup({
      _exabaseDirectory: this._exabaseDirectory,
      logging: this._logging,
      schemas: this.schemas,
    });
    await GLOBAL_OBJECT.EXABASE_MANAGERS[schema?.table!]._sync_logs();
    //? update query makers and RCT level per manager
    this.schemas.forEach((schema) => {
      GLOBAL_OBJECT.EXABASE_MANAGERS[schema?.table!].rct_level =
        BEST_RCT_LEVEL_PER_MANAGER;
    });
  }
  async query(query: string): Promise<any> {
    //? verify query validity
    if (typeof query !== "string") throw new ExaError("Invalid query!");
    const parsedQuery = JSON.parse(query);
    const table = GLOBAL_OBJECT.EXABASE_MANAGERS[parsedQuery.table];
    if (!table) {
      if (parsedQuery.induce) {
        new ExaSchema({
          table: parsedQuery.table,
          columns: parsedQuery.induce,
        });
        return;
      } else {
        throw new ExaError("malformed query! ", query);
      }
    }
    if (parsedQuery.induce) {
      //  @ts-ignore
      GLOBAL_OBJECT.EXABASE_MANAGERS[parsedQuery.table] = undefined;
      new ExaSchema({
        table: parsedQuery.table,
        columns: parsedQuery.induce,
      });
      return;
    }
    return table._trx_runner(parsedQuery);
  }
}
