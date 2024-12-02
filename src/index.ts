import { mkdirSync } from "node:fs";
import { type ExabaseOptions } from "./primitives/types.ts";
import {
  ExaError,
  ExaSchema,
  GLOBAL_OBJECT,
  Manager,
} from "./primitives/classes.ts";
import { S3 } from "./primitives/blob-lib.ts";

export class Exabase {
  private dbDir: string;
  schemas: ExaSchema<{}>[] = [];
  constructor(init: ExabaseOptions) {
    // GLOBAL_OBJECT.s3 = new S3({
    //   accessKeyId: init.accessKeyId,
    //   secretAccessKey: init.secretAccessKey,
    //   bucketName: init.bucketName,
    //   endpoint: init.endpoint,
    // });
    GLOBAL_OBJECT.db = this;
    //? [1] directories
    this.dbDir = "DB";
    // ? setting up memory allocation for RCT enabled cache managers
    GLOBAL_OBJECT.MEMORY_PERCENT = 20;
    GLOBAL_OBJECT.writeWindow = init.writeWindow || 1000;
    // ? create main dir
    try {
      mkdirSync(this.dbDir);
    } catch (e: any) {
      if ({ e }.e.code !== "EEXIST") console.log(e);
    }
    console.log("Exabase: running!");
  }
  //? this is a function that creates/updates schemas also adjusting RCT memory
  public async induce(schema: ExaSchema<any>) {
    if (!(schema instanceof ExaSchema)) {
      throw new Error("invalid object passed as exabase schema");
    }
    const table = schema.table;
    //? CHECK IF THE SCHEMA ALREADY EXISTED UPDATE IT
    const existedIdx = this.schemas.findIndex((s) => s.table === table);
    if (existedIdx !== -1) {
      this.schemas.splice(existedIdx, 1, schema);
    } else {
      this.schemas.push(schema);
    }
    // ? setup rct level && setup managers
    GLOBAL_OBJECT.EXABASE_MANAGERS[table] = new Manager(schema);
    // ? setup relationships
    await GLOBAL_OBJECT.EXABASE_MANAGERS[table!].setup({
      exabaseDirectory: this.dbDir,
      schemas: this.schemas,
    });
    await GLOBAL_OBJECT.EXABASE_MANAGERS[table].synchronize();
    //? update query makers and RCT level per manager
    const rct_level = Math.round(150 / this.schemas.length);
    GLOBAL_OBJECT.rct_level = rct_level > 5 ? rct_level : 5;
    GLOBAL_OBJECT.EXABASE_MANAGERS[table].isActive = true;
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
      if (table?.isActive === false) {
        return new Promise((r) => {
          let i = 3;
          const id = setInterval(() => {
            i -= 1;
            if (table.isActive === true) {
              clearInterval(id);
              r(table.runner(parsedQuery) as T);
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
      throw new ExaError("unknown table '" + parsedQuery.table + "'");
    }
    return table.runner(parsedQuery) as T;
  }
}

// mtoto kautaa
// huyo mtotoooo
