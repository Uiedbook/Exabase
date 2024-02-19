/*

! ********* STEPS *********** !
? install bun - from bun.sh
? get the sqlite file using ./sql_file/download.sh
? build Exabase -  bun run compile
? run benchmark - bun run ./tests/benchmark.js

*/

import { run, bench } from "mitata";
import { Database } from "bun:sqlite";
import { Schema, Exabase } from "../dist/index.js";

const db = Database.open("tests/sql_file/Northwind_large.sqlite");

const Employee = new Schema({
  tableName: "Employee",
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
    Photo: { type: String, nullable: true },
    Notes: { type: String },
    ReportsTo: { type: Number, nullable: true },
    PhotoPath: { type: String },
  },
});

const ExabaseR = new Exabase({
  schemas: [Employee],
});

await ExabaseR.connect();
const trx = Employee.query;
let d = await trx.count();
const sql = db.prepare(`SELECT * FROM "Employee"`);
const c = sql.all();
console.log({ c });

console.log("Exabase item count", d);
console.log("sqlite item count", c.length);

if (d !== c.length) {
  console.time("|");
  await trx.insertBatch(c as any[]);
  console.timeEnd("|");
  console.log("sqlite data inserted into Exabase");
}
d = await trx.count();
if (d !== c.length) {
  console.log(d, await trx.findMany());
  throw new Error("Exabase is not consistent");
}
console.log(
  "read Exabase item count to ensure it's consistent ofc it is",
  await trx.count()
);

{
  bench('SELECT * FROM "Employee" Exabase', async () => {
    await trx.findMany();
  });
}

const sq = db.prepare(`SELECT * FROM "Employee"`);
{
  bench('SELECT * FROM "Employee" sqlite', () => {
    sq.all();
  });
}

await run();
