/*

! ********* STEPS *********** !
? install bun - from bun.sh
? get the sqlite file using ./sql_file/download.sh
? build Exabase -  bun run compile
? run benchmark - bun run ./tests/benchmark.js

*/

import { run, bench } from "mitata";
import { Database } from "bun:sqlite";
import { ExaSchema, Exabase } from "../dist/index.js";

const Employee = new ExaSchema({
  tableName: "EMPLOYEE",
  RCT: true,
  columns: {
    LastName: { type: String },
    FirstName: { type: String },
    Title: { type: String },
    TitleOfCourtesy: { type: String },
    BirthDate: { type: String },
    HireDate: { type: String },
    Address: { type: String },
    City: { type: String },
    Region: { type: String },
    PostalCode: { type: String },
    Country: { type: String },
    HomePhone: { type: String },
    Extension: { type: String },
    Photo: { type: String },
    Notes: { type: String },
    ReportsTo: { type: Number },
    PhotoPath: { type: String },
  },
});

const db = new Exabase({
  schemas: [Employee],
});

await db.connect();

const db2 = Database.open("tests/sql_file/Northwind_large.sqlite");
const trx = Employee.query;
let d = await trx.count();

const sql = db2.prepare(`SELECT * FROM "Employee"`);
const c = sql.all();

console.log("Exabase item count", d);
console.log("sqlite item count", c.length);

if (d !== c.length) {
  console.time("Exabase | Insert time");

  for (let i = 0; i < c.length; i++) {
    await trx.save(c[i] as any);
  }

  console.timeEnd("Exabase | Insert time");
  console.log("sqlite data inserted into Exabase");
}
d = await trx.count();
console.log("read Exabase item count to ensure it's consistent ofc it is", d);

const sq = JSON.stringify({ table: "EMPLOYEE", query: { select: "*" } });
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
