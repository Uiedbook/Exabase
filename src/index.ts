import { mkdirSync } from "node:fs";
import {
  type ExabaseOptions,
  type connectOptions,
} from "./primitives/types.js";
import {
  _ExabaseRingInterface,
  _login_leader_ring,
} from "./primitives/http-functions.js";
import { ExaError, Utils, Manager, backup } from "./primitives/classes.js";
import { getComputedUsage } from "./primitives/functions.js";

export class Exabase {
  backup: (file?: string) => Promise<void>;
  private _announced = false;
  private _restorebackup?: string;
  private _conn: ((value: unknown) => void) | undefined = undefined;
  private _exabaseDirectory: string;
  constructor(init: ExabaseOptions) {
    //? initializations
    //? [1] directories
    this._exabaseDirectory = (init.name || "EXABASE_DB").trim().toUpperCase();
    // ? saving restoring backup file name, can be undeined or a string
    this._restorebackup = init.restoreFromBackup;
    // ? attaching backup method
    this.backup = backup.saveBackup(this._exabaseDirectory);
    // ? setting up memory allocation for RCT enabled cache managers
    const usableManagerGB = getComputedUsage(
      init.EXABASE_MEMORY_PERCENT!,
      (init.schemas || []).length
    );

    // ? get the number of schemas using RCT
    const RCTiedSchema = (init.schemas || []).filter((a) => a.RCT);
    const BEST_RCT_LEVEL_PER_MANAGER = Math.round(
      usableManagerGB / 32768 / (RCTiedSchema || []).length
    );

    try {
      // ? create main dir
      mkdirSync(this._exabaseDirectory);
      // ? create manifest
      Object.assign(Utils.MANIFEST, {
        schemas: undefined as unknown as [],
        bearer: init.bearer,
        EXABASE_KEYS: {
          privateKey: init.EXABASE_KEYS?.privateKey,
          publicKey: init.EXABASE_KEYS?.publicKey,
        },
        mode: init.mode,
        EXABASE_MEMORY_PERCENT: init.EXABASE_MEMORY_PERCENT,
        logging: init.logging,
        name: init.name,
      } as ExabaseOptions);
      console.log("Exabase initialized!");
    } catch (e: any) {
      //? console.log(e);
      if ({ e }.e.code === "EEXIST") {
        // ? [3] update Exabase if it exists
        Object.assign(
          {
            bearer: init.bearer,
            EXABASE_KEYS: {
              privateKey: init.EXABASE_KEYS?.privateKey,
              publicKey: init.EXABASE_KEYS?.publicKey,
            },
            mode: init.mode,
            EXABASE_MEMORY_PERCENT: init.EXABASE_MEMORY_PERCENT,
            logging: init.logging,
            name: init.name,
          },
          Utils.MANIFEST
        );
      }
    }

    //? setup managers
    (init.schemas || []).forEach((schema) => {
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
          schemas: init.schemas || [],
        })
      )
    )
      .then((_all) => {
        //? console.log(_all);
        this._announced = true;
        console.log("Exabase: connected!");
        //? setup query makers
        (init.schemas || []).forEach((schema) => {
          schema._premature = false;
        });
        this._conn && this._conn(true);
      })
      .catch((e) => {
        console.log(e);
      });
  }
  connect(options?: connectOptions) {
    // ? Restoring previous backup if neccessary
    if (typeof this._restorebackup === "string") {
      backup.unzipBackup(this._restorebackup);
    }
    // ? if there's a ring to connect to
    if (options) {
      //? login this rings
      _login_leader_ring({
        //! /*indexes*/
      });
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

  query(tableName: string) {
    const table = Utils.EXABASE_MANAGERS[tableName];
    if (table) {
      return table._schema.query;
    }
    console.log(
      "ExaError: available tables are ",
      Object.keys(Utils.EXABASE_MANAGERS).join(", ")
    );
    throw new ExaError("No schema named ", tableName, "!");
  }
  async executeQuery(query: string) {
    if (!this._announced) {
      throw new ExaError("Exabase not ready!");
    }
    //? verify query validity
    try {
      if (typeof query !== "string") throw new ExaError("Invalid query!");
      const parsedQuery = JSON.parse(query);
      const table = Utils.EXABASE_MANAGERS[parsedQuery.table];
      if (!table)
        throw new ExaError(
          "table " + parsedQuery.table + " not on this database!"
        );
      return table._run(parsedQuery.query);
    } catch (error) {
      if (error instanceof ExaError) {
        throw error;
      } else {
        throw new ExaError("Invalid query: ", query);
      }
    }
  }
}

//? exports
export { ExaSchema, ExaError, ExaType } from "./primitives/classes.js";
export { ExaId } from "./primitives/functions.js";
export type { ExaDoc, ExaQuery } from "./primitives/types.js";
