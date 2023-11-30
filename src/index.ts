import { mkdirSync } from "node:fs";
import { Exabase_Init } from "./types.js";
import { _ExabaseRingInterface, _AccessRingInterfaces } from "./parts/Ring.js";
import {
  ExabaseError,
  Utils,
  Manager,
  Schema,
  Transaction,
  getComputedUsage,
} from "./parts/classes.js";

export default class Exabase {
  private _ready = false;
  private _exabaseDirectory: string;
  constructor(init: Exabase_Init) {
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
      // console.log(e);
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
    // setup managers
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
        })
      )
    )
      .then((_all) => {
        this._ready = true;
        // console.log(_all);
      })
      .catch((e) => {
        console.log(e);
      });
  }
  get Ready() {
    return new Promise<Exabase>((r) => {
      const R = setInterval(() => {
        if (this._ready === true) {
          console.log("Exabase mounted!");
          clearInterval(R);
          r(this);
        }
      }, 200);
    });
  }
  getTransaction<DTO extends Record<string, unknown>>(schema: Schema) {
    if (this._ready) {
      if (Utils.EXABASE_MANAGERS[schema?.tableName]) {
        return Utils.EXABASE_MANAGERS[schema.tableName]
          ._transaction as Transaction<DTO>;
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
    if (this._ready === true) {
      // ? setting up ring interface
      await _AccessRingInterfaces();
      return _ExabaseRingInterface;
    } else {
      throw new ExabaseError("Exabase not ready!");
    }
  }
}

//? exports
export { Schema, ExabaseError } from "./parts/classes.js";
// export type { ExaDoc } from "./types";
