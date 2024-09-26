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
  private dbDir: string;
  schemas: ExaSchema<{}>[] = [];
  constructor(init: ExabaseOptions = {}) {
    GLOBAL_OBJECT._db = this;
    //? [1] directories
    this.dbDir = (init.name || "DB").trim().toUpperCase();
    // ? setting up memory allocation for RCT enabled cache managers
    GLOBAL_OBJECT.MEMORY_PERCENT = init.EXABASE_MEMORY_PERCENT || 10;
    // ? create main dir
    try {
      mkdirSync(this.dbDir);
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
      GLOBAL_OBJECT.MEMORY_PERCENT,
      this.schemas.length || 10
    );
    //? setup managers
    GLOBAL_OBJECT.EXABASE_MANAGERS[schema?.table!] = new Manager(schema);
    // ? setup relationships
    await GLOBAL_OBJECT.EXABASE_MANAGERS[schema?.table!]._setup({
      _exabaseDirectory: this.dbDir,
      schemas: this.schemas,
    });
    await GLOBAL_OBJECT.EXABASE_MANAGERS[schema?.table!]._sync_logs();
    //? update query makers and RCT level per manager
    this.schemas.forEach((schema) => {
      GLOBAL_OBJECT.EXABASE_MANAGERS[schema?.table!].rct_level =
        BEST_RCT_LEVEL_PER_MANAGER;
    });
    GLOBAL_OBJECT.EXABASE_MANAGERS[schema?.table!].isActive = true;
  }
  async query<T = any>(query: string): Promise<T> {
    //? verify query validity
    if (typeof query !== "string") throw new ExaError("malformed query!");
    const parsedQuery = JSON.parse(query);
    if (parsedQuery.induce) {
      new ExaSchema({
        table: parsedQuery.table,
        columns: parsedQuery.induce,
      });
      return undefined as T;
    }
    const table = GLOBAL_OBJECT.EXABASE_MANAGERS[parsedQuery.table];
    if (!table || table.isActive === false) {
      if (table.isActive === false) {
        return new Promise((r) => {
          let i = 3;
          const id = setInterval(() => {
            i -= 1;
            if (table.isActive === true) {
              clearInterval(id);
              r(table._trx_runner(parsedQuery) as T);
            }
            if (i === 0) {
              clearInterval(id);
              r(
                new ExaError("Table is not active yet, please try again!") as T
              );
            }
          }, 1000);
        });
      }
      throw new ExaError("unkown table '" + parsedQuery.table + "'");
    }
    return table._trx_runner(parsedQuery) as T;
  }
}
