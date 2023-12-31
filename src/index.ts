import { mkdirSync } from "node:fs";
import { ExaDoc, ExabaseOptions } from "./primitives/types.js";
import {
  _ExabaseRingInterface,
  _AccessRingInterfaces,
} from "./primitives/http-functions.js";
import {
  ExabaseError,
  Utils,
  Manager,
  Schema,
  Transaction,
} from "./primitives/classes.js";
import { getComputedUsage } from "./primitives/functions.js";

export class Exabase<EaxbaseInit extends ExabaseOptions> {
  private _ready = false;
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
        schema as Schema,
        usableManagerGB
      );
    });
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
        this._ready = true;
        console.log("Exabase: connected!");
        this._conn && this._conn(true);
      })
      .catch((e) => {
        console.log(e);
      });
  }
  connect() {
    if (!this._ready) {
      console.log("Exabase: connecting...");
      return new Promise((r) => {
        this._conn = r;
      });
    }
    return undefined;
  }
  getTransaction(schema: Schema) {
    if (this._ready) {
      if (Utils.EXABASE_MANAGERS[schema?.tableName]) {
        return Utils.EXABASE_MANAGERS[schema.tableName]
          ._transaction as Transaction<
          Record<keyof (typeof schema)["columns"], unknown>
        >;
      } else {
        throw new ExabaseError(
          "The given schema - " +
            (schema?.tableName || "undefined") +
            " is not connected to the Eaxbase Instance"
        );
      }
    } else {
      throw new ExabaseError("Exabase not ready!");
    }
  }
  async expose() {
    // ? setting up ring interface
    if (this._ready === true) {
      await _AccessRingInterfaces();
      return _ExabaseRingInterface;
    } else {
      throw new ExabaseError("Exabase not ready!");
    }
  }
  async executeQuery<Model = unknown>(query: string) {
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
export type TransactionType<Model = ExaDoc<{}>> = Transaction<Model>;
