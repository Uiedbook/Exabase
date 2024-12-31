import { mkdirSync } from "node:fs";
import { type ExabaseOptions, type QueryType } from "./primitives/types.ts";
import { ExaError, GLOBAL_OBJECT, Manager } from "./primitives/classes.ts";

export class Exabase {
  private dbDir: string;
  tables: string[] = [];
  constructor(_init: ExabaseOptions) {
    // import { S3 } from "./primitives/blob-lib.ts";
    // GLOBAL_OBJECT.s3 = new S3({
    //   accessKeyId: init.accessKeyId,
    //   secretAccessKey: init.secretAccessKey,
    //   bucketName: init.bucketName,
    //   endpoint: init.endpoint,
    // });
    GLOBAL_OBJECT.db = this;
    //? [1] directories
    this.dbDir = "DB";
    // ? setting up memory allocation for log cache enabled cache managers
    GLOBAL_OBJECT.MEMORY_PERCENT = 20;
    // ? create main dir
    try {
      mkdirSync(this.dbDir);
    } catch (e: any) {
      if ({ e }.e.code !== "EEXIST") console.log(e);
    }
    console.log("Exabase: running!");
  }
  //? this is a function that creates/updates schemas also adjusting log count in memory
  public async induce(
    table: string,
    _operation: {
      dropTable?: boolean;
      createTable?: boolean;
      addIndex?: boolean;
      removeIndex?: boolean;
    }
  ) {
    //? CHECK IF THE SCHEMA ALREADY EXISTED UPDATE IT
    const existedIdx = this.tables.findIndex((t) => t === table);
    if (existedIdx !== -1) {
      this.tables.splice(existedIdx, 1, table);
    } else {
      this.tables.push(table);
    }
    // ? setup log count && setup managers
    GLOBAL_OBJECT.EXABASE_MANAGERS[table] = new Manager(table);
    // ? setup relationships
    await GLOBAL_OBJECT.EXABASE_MANAGERS[table!].setup({
      exabaseDirectory: this.dbDir,
    });
    await GLOBAL_OBJECT.EXABASE_MANAGERS[table].synchronize();
    //? update query makers and log cache count per manager
    const logCount = Math.round(150 / this.tables.length);
    GLOBAL_OBJECT.logCount = logCount > 5 ? logCount : 5;
    GLOBAL_OBJECT.EXABASE_MANAGERS[table].isActive = true;
  }
  async query<T = any>(query: string | QueryType<T>): Promise<T> {
    //? verify query validity
    if (typeof query !== "string") throw new ExaError("malformed query!");
    const parsedQuery = JSON.parse(query);
    if (parsedQuery.operation) {
      this.induce(parsedQuery.table, parsedQuery.operation);
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
      throw new ExaError("unknown table!");
    }
    return table.runner(parsedQuery) as T;
  }
}
