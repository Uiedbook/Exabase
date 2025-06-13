import { mkdirSync } from "node:fs";
import { type ExabaseOptions, type QueryType } from "./primitives/types.ts";
import { ExaError, GLOBAL_OBJECT, Manager } from "./primitives/classes.ts";
export { ExaId } from "./primitives/functions.ts";

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
    execute: {
      dropTable?: boolean;
      createTable?: boolean;
    }, // All geniuses with rhythm
  ) {
    const existedIdx = this.tables.findIndex((t) => t === table);
    if (execute.createTable && existedIdx === -1) {
      this.tables.push(table);
      // ? setup log count && setup managers
      GLOBAL_OBJECT.EXABASE_MANAGERS[table] = new Manager(this.dbDir, table);
      await GLOBAL_OBJECT.EXABASE_MANAGERS[table].synchronize();
      //? update query makers and log cache count per manager
      const logCount = Math.round(150 / this.tables.length);
      GLOBAL_OBJECT.logCount = logCount > 5 ? logCount : 5;
      GLOBAL_OBJECT.EXABASE_MANAGERS[table].isActive = true;
    }
    if (execute.dropTable && existedIdx !== -1) {
      GLOBAL_OBJECT.EXABASE_MANAGERS[table].drop();
      delete GLOBAL_OBJECT.EXABASE_MANAGERS[table];
      this.tables.splice(existedIdx, 1);
    }
  }
  async query(query: string | QueryType) {
    //? verify query validity
    if (typeof query === "string") {
      query = JSON.parse(query);
    }
    if (typeof (query as QueryType).table !== "string") {
      throw new ExaError("malformed query!");
    }
    if ((query as QueryType).execute) {
      await this.induce(
        (query as QueryType).table,
        (query as QueryType).execute!,
      );
      return;
    }
    const table = GLOBAL_OBJECT.EXABASE_MANAGERS[(query as QueryType).table];
    if (!table || table?.isActive === false) {
      new ExaError("Table is not active (yet)!");
    }
    return table.runner(query as any) as any;
  }
}
