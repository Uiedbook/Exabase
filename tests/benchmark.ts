/*

! ********* STEPS *********** !
? install bun - from bun.sh
? get the sqlite file using ./sql_file/download.sh
? build Exabase -  bun run compile
? run benchmark - bun run ./tests/benchmark.js

*/

import { run, bench } from "mitata";
import { Database } from "bun:sqlite";
import { Exabase } from "../dist/index.js";

const db = new Exabase();
await db.query(
  JSON.stringify({
    table: "EMPLOYEE",
    induce: {
      LastName: { type: "string" },
      FirstName: { type: "string" },
      Title: { type: "string" },
      TitleOfCourtesy: { type: "string" },
      BirthDate: { type: "string" },
      HireDate: { type: "string" },
      Address: { type: "string" },
      City: { type: "string" },
      Region: { type: "string" },
      PostalCode: { type: "string" },
      Country: { type: "string" },
      HomePhone: { type: "string" },
      Extension: { type: "string" },
      Photo: { type: "string" },
      Notes: { type: "string" },
      ReportsTo: { type: "number" },
      PhotoPath: { type: "string" },
    },
  })
);

const db2 = Database.open("tests/sql_file/Northwind_large.sqlite");

let employeeExabaseCount = await db.query(
  JSON.stringify({ table: "EMPLOYEE", count: true })
);

const sql = db2.prepare(`SELECT * FROM "Employee"`);
const employeeSQLITECount = sql.all();

console.log("Exabase item count", employeeExabaseCount);
console.log("sqlite item count", employeeSQLITECount.length);

console.log(employeeExabaseCount, employeeSQLITECount.length);

if (employeeExabaseCount !== employeeSQLITECount.length) {
  console.time("Exabase | Insert time");

  for (let i = 0; i < employeeSQLITECount.length; i++) {
    await db.query(
      JSON.stringify({ table: "EMPLOYEE", insert: employeeSQLITECount[i] })
    );
  }

  console.timeEnd("Exabase | Insert time");
  console.log("sqlite data inserted into Exabase");
}

employeeExabaseCount = await db.query(
  JSON.stringify({ table: "EMPLOYEE", count: true })
);
console.log(
  "read Exabase item count to ensure it's consistent ofc it is",
  employeeExabaseCount
);

const sq = JSON.stringify({ table: "EMPLOYEE", many: true });
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
