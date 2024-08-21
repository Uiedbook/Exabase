import { mkdirSync } from "node:fs";
import {
  type ExabaseOptions,
  type ExaSchemaQuery,
} from "./primitives/types.js";
import {
  ExaError,
  Utils,
  Manager,
  backup,
  ExaSchema,
} from "./primitives/classes.js";
import { getComputedUsage } from "./primitives/functions.js";

export class Exabase {
  backup: () => Promise<void>;
  restoreBackup: () => Promise<void>;
  private _announced = false;
  private _restorebackup?: string;
  private _conn: ((value: unknown) => void) | undefined = undefined;
  private _exabaseDirectory: string;
  MEMORY_PERCENT: number;
  schemas: ExaSchema<{}>[] = [];
  constructor(init: ExabaseOptions) {
    //? initializations
    //? [1] directories
    this._exabaseDirectory = (init.name || "EXABASE_DB").trim().toUpperCase();
    // ? saving restoring backup file name, can be undeined or a string
    this._restorebackup = init.backupFileName;
    // ? attaching backup method
    this.backup = backup.saveBackup(this._exabaseDirectory);
    this.restoreBackup = backup.unzipBackup(
      init.backupFileName || this._exabaseDirectory
    );
    // ? setting up memory allocation for RCT enabled cache managers
    this.MEMORY_PERCENT = init.EXABASE_MEMORY_PERCENT || 10;
    this.schemas = init.schemas || [];
    const usableManagerGB = getComputedUsage(
      this.MEMORY_PERCENT,
      this.schemas.length
    );

    // ? get the number of schemas using RCT
    const RCTiedSchema = this.schemas.filter((a) => a.RCT);
    const BEST_RCT_LEVEL_PER_MANAGER = Math.round(
      usableManagerGB / 32768 / (RCTiedSchema || []).length
    );

    try {
      // ? create main dir
      mkdirSync(this._exabaseDirectory);
      // ? create manifest
      console.log("Exabase initialized!");
    } catch (e: any) {
      //? console.log(e);
      if ({ e }.e.code === "EEXIST") {
        // ? [3] update Exabase if it exists
      }
    }

    //? setup managers
    this.schemas.forEach((schema) => {
      Utils.EXABASE_MANAGERS[schema?.tableName!] = new Manager(
        schema,
        BEST_RCT_LEVEL_PER_MANAGER
      );
    });
    // ? setup relationships
    Promise.allSettled(
      Object.values(Utils.EXABASE_MANAGERS).map((manager) =>
        manager._setup({
          _exabaseDirectory: this._exabaseDirectory,
          logging: init.logging || false,
          schemas: this.schemas,
        })
      )
    )
      .then((_all) => {
        //? console.log(_all);
        this._announced = true;
        console.log("Exabase: connected!");
        //? setup query makers
        this.schemas.forEach((schema) => {
          schema._premature = false;
        });
        this._conn && this._conn(true);
      })
      .catch((e) => {
        console.log(e);
      });
  }
  connect() {
    // ? Restoring previous backup if neccessary
    if (typeof this._restorebackup === "string") {
      backup.unzipBackup(this._restorebackup);
    }
    //? else { some other stuff with config if available}
    if (!this._announced) {
      console.log("Exabase: connecting...");
      return new Promise((r) => {
        this._conn = r;
      });
    }
    return undefined;
  }
  private async induce<Model>(query: string) {
    if (!this._announced) {
      throw new ExaError("Exabase not ready!");
    }
    //? verify query validity
    if (typeof query !== "string") throw new ExaError("Invalid query!");
    const parsedSchema: ExaSchemaQuery<Model> = JSON.parse(query);
    const schema = parsedSchema?.schema;
    if (
      !!parsedSchema ||
      !schema ||
      !schema.tableName ||
      typeof schema.columns !== "object"
    ) {
      throw new ExaError("inducement cancelled!");
    }
    //? initializations

    // ? setting up memory allocation for RCT enabled cache managers
    const usableManagerGB = getComputedUsage(
      this.EXABASE_MEMORY_PERCENT!,
      (this.schemas || []).length
    );

    // ? get the number of schemas using RCT
    // const RCTiedSchema = (init.schemas || []).filter((a) => a.RCT);
    // const BEST_RCT_LEVEL_PER_MANAGER = Math.round(
    //   usableManagerGB / 32768 / (RCTiedSchema || []).length
    // );

    //? setup managers

    Utils.EXABASE_MANAGERS[schema?.tableName!] = new Manager(
      schema,
      BEST_RCT_LEVEL_PER_MANAGER
    );

    // ? setup relationships
    // Utils.EXABASE_MANAGERS[schema?.tableName!]
    //   ._setup({
    //     _exabaseDirectory: this._exabaseDirectory,
    //     logging: init.logging || false,
    //     schemas: init.schemas || [],
    //   })(
    //     //? setup query makers
    //     init.schemas || []
    //   )
    //   .forEach((schema) => {
    //     schema._premature = false;
    //   });
  }
  async query(query: string) {
    if (!this._announced) {
      throw new ExaError("Exabase not ready!");
    }
    //? verify query validity
    if (typeof query !== "string") throw new ExaError("Invalid query!");
    const parsedQuery = JSON.parse(query);
    const table = Utils.EXABASE_MANAGERS[parsedQuery.table];
    if (!table || !parsedQuery.query) {
      throw new ExaError("query canceled!");
    }
    return table._trx_runner(parsedQuery.query);
  }
}

//? exports
export { ExaSchema, ExaError, ExaType } from "./primitives/classes.js";
export { ExaId } from "./primitives/functions.js";
export type { ExaDoc, ExaQuery } from "./primitives/types.js";
