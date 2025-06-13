/*

! ********* STEPS *********** !
? install bun - from bun.sh
? get the sqlite file using ./sql_file/download.sh
? build Exabase -  bun run compile
? run benchmark - bun run ./tests/benchmark.js

*/

import { bench, run } from "mitata";
import { Database } from "bun:sqlite";
import { Exabase } from "../src/index.js";

const db = new Exabase({ endpoint: "", secretAccessKey: "" });
await db.query({
  table: "EMPLOYEE",
  execute: {
    createTable: true,
  },
});

const db2 = Database.open("z/sql_file/Northwind_large.sqlite");

let employeeExabaseCount = await db.query({ table: "EMPLOYEE", count: true });

const sql = db2.prepare(`SELECT * FROM "Employee"`);
const employeeSQLITECount: any[] = sql.all();

console.log("Exabase item count", employeeExabaseCount);
console.log("sqlite item count", employeeSQLITECount.length);

console.log(employeeExabaseCount, employeeSQLITECount.length);

if (employeeExabaseCount !== employeeSQLITECount.length) {
  console.time("Exabase | Insert time");

  for (let i = 0; i < employeeSQLITECount.length; i++) {
    delete employeeSQLITECount[i].Id;
    await db.query({ table: "EMPLOYEE", insert: employeeSQLITECount[i] });
  }

  console.timeEnd("Exabase | Insert time");
  console.log("sqlite data inserted into Exabase");
}

employeeExabaseCount = await db.query({ table: "EMPLOYEE", count: true });
console.log(
  "read Exabase item count to ensure it's consistent ofc it is",
  employeeExabaseCount,
);

const sq = {
  table: "EMPLOYEE",
  get: { "*": true },
};
const a = await db.query(sq);

{
  bench('SELECT * FROM "Employee" Exabase', async () => {
    await db.query(sq);
  });
}

const sq2 = db2.prepare(`SELECT * FROM "Employee"`);
{
  bench('SELECT * FROM "Employee" sqlite', () => {
    sq2.all();
  });
}

run();
