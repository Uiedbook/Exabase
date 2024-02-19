import { mkdirSync } from "node:fs";
import {
  type ExaDoc,
  type ExabaseOptions,
  type connectOptions,
} from "./primitives/types.js";
import {
  _ExabaseRingInterface,
  _login_leader_ring,
} from "./primitives/http-functions.js";
import {
  ExabaseError,
  Utils,
  Manager,
  Query as TRX,
} from "./primitives/classes.js";
// import { getComputedUsage } from "./primitives/functions.js";

export class Exabase<EaxbaseInit extends ExabaseOptions> {
  private _announced = false;
  private _conn: ((value: unknown) => void) | undefined = undefined;
  private _exabaseDirectory: string;
  constructor(init: EaxbaseInit) {
    //? initialisations
    //? [1] directories
    this._exabaseDirectory = (init.name || "EXABASE_DB").trim().toUpperCase();
    // ? setting up memory allocation for RCT enabled cache managers
    // const usableManagerGB = getComputedUsage(
    //   init.EXABASE_MEMORY_PERCENT!,
    //   init.schemas.length
    // );
    try {
      // ? create dirs
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
      console.log("Exabase initialised!");
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
    init.schemas.forEach((schema) => {
      Utils.EXABASE_MANAGERS[schema?.tableName!] = new Manager(schema);
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
        //? setup query makers
        init.schemas.forEach((schema) => {
          schema._premature = false;
        });
        this._conn && this._conn(true);
      })
      .catch((e) => {
        console.log(e);
      });
  }
  connect(app?: connectOptions) {
    // ? if jetpath is added
    if (app?.decorate) {
      if (!Utils.MANIFEST.EXABASE_KEYS.privateKey) {
        throw new ExabaseError(
          "Exabase public and private keys not provided for connection"
        );
      }
      //? login this rings
      _login_leader_ring({
        //! /*indexes*/
      });
      // ? decorate jetpath ctx
      app.decorate({
        propagateExabaseRing(ctx) {
          _ExabaseRingInterface(ctx);
        },
      });
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
export type query<Model = ExaDoc<{}>> = TRX<Model>;
