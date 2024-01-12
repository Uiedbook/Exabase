import { mkdirSync } from "node:fs";
import {
  type ExaDoc,
  type ExabaseOptions,
  type connectOptions,
} from "./primitives/types.js";
import {
  _ExabaseRingInterface,
  _AccessRingInterfaces,
} from "./primitives/http-functions.js";
import {
  ExabaseError,
  Utils,
  Manager,
  Transaction as TRX,
} from "./primitives/classes.js";
import { getComputedUsage } from "./primitives/functions.js";
import { JetPath } from "jetpath";

export class Exabase<EaxbaseInit extends ExabaseOptions> {
  private _announced = false;
  private _conn: ((value: unknown) => void) | undefined = undefined;
  private _exabaseDirectory: string;
  constructor(init: EaxbaseInit) {
    //? initialisations
    //? [1] directories
    this._exabaseDirectory = (init.name || "EXABASE_DB").trim().toUpperCase();
    // ? setting up memory allocation for RCT enabled cache managers
    const usableManagerGB = getComputedUsage(
      init.EXABASE_MEMORY_PERCENT!,
      init.schemas.length
    );
    try {
      // ? create dirs
      mkdirSync(this._exabaseDirectory);
      // ? create manifest
      Object.assign(Utils.MANIFEST, {
        name: init.name?.toUpperCase(),
        schemas: undefined as unknown as [],
        EXABASE_SECRET: init.EXABASE_SECRET || "example",
      });
      console.log("Exabase initialised!");
    } catch (e: any) {
      //? console.log(e);
      if ({ e }.e.code === "EEXIST") {
        // ? [3] update Exabase if it exists
        Object.assign(
          {
            name: init.name?.toUpperCase(),
            schemas: undefined as unknown as [],
            EXABASE_SECRET: init.EXABASE_SECRET,
          },
          Utils.MANIFEST
        );
      }
    }

    //? setup managers
    init.schemas.forEach((schema) => {
      Utils.EXABASE_MANAGERS[schema?.tableName!] = new Manager(
        schema,
        usableManagerGB
      );
    });
    // ? setup relationships
    Promise.allSettled(
      Object.values(Utils.EXABASE_MANAGERS).map((manager) =>
        manager._setup({
          _exabaseDirectory: this._exabaseDirectory,
          logging: init.logging || false,
          schemas: init.schemas,
        })
      )
    )
      .then((_all) => {
        //? console.log(_all);
        this._announced = true;
        console.log("Exabase: connected!");
        this._conn && this._conn(true);
      })
      .catch((e) => {
        console.log(e);
      });
  }
  connect(app?: JetPath | connectOptions) {
    if (app instanceof JetPath) {
      _AccessRingInterfaces();
      //? hooks
      _ExabaseRingInterface;
    } //? else { some other stuff with config if available}
    if (!this._announced) {
      console.log("Exabase: connecting...");
      return new Promise((r) => {
        this._conn = r;
      });
    }
    return undefined;
  }
  async executeQuery<Model = unknown>(query: string) {
    if (!this._announced) {
      throw new ExabaseError("Exabase not ready!");
    }
    //? verify query validity
    try {
      if (typeof query !== "string") throw new Error();
      const parsedQuery = JSON.parse(query);
      const table = Utils.EXABASE_MANAGERS[parsedQuery.table];
      if (!table) throw new Error();
      return new Promise((r) => {
        table._run(parsedQuery.query, r, parsedQuery.type || "nm");
      }) as Promise<Model[]>;
    } catch (error) {
      throw new ExabaseError("Invalid query: ", query);
    }
  }
}

//? exports
export { Schema, ExabaseError } from "./primitives/classes.js";
export type { ExaDoc } from "./primitives/types.js";
export type Transaction<Model = ExaDoc<{}>> = TRX<Model>;
