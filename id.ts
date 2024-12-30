import { bench, run } from "mitata";
import { Database } from "bun:sqlite";
import { Exabase } from "./src/index.ts";

/*

! ********* STEPS *********** !
? install bun - from bun.sh
? get the sqlite file using ./sql_file/download.sh
? build Exabase -  bun run compile
? run benchmark - bun run ./tests/benchmark.js

*/

const db = new Exabase({});
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
  }),
);

const db2 = Database.open("z/sql_file/Northwind_large.sqlite");

let employeeExabaseCount = await db.query(
  JSON.stringify({ table: "EMPLOYEE", count: true }),
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
      JSON.stringify({ table: "EMPLOYEE", insert: employeeSQLITECount[i] }),
    );
  }

  console.timeEnd("Exabase | Insert time");
  console.log("sqlite data inserted into Exabase");
}

employeeExabaseCount = await db.query(
  JSON.stringify({ table: "EMPLOYEE", count: true }),
);
console.log(
  "read Exabase item count to ensure it's consistent ofc it is",
  employeeExabaseCount,
);

// ... (Your existing setup code for creating the EMPLOYEE table and importing data)

const dataSizes = [9, 100, 1000, 10000, 100000]; // Test with varying data sizes

async function populateExabase(count: number): Promise<void> {
  //generate dummy data, ensure the size match your exabase table scheme
  const dummyData = Array.from({ length: count }).map((_, i) => ({
    LastName: "lastName" + i, // Or any other relevant dummy data
    FirstName: "firstName" + i,
    // ... other fields with sample or test or relevant data
  }));

  if (employeeExabaseCount !== dummyData.length) {
    for (const item of dummyData) {
      await db.query(JSON.stringify({ table: "EMPLOYEE", insert: item }));
    }
  }
}

async function benchmark(dataSize: number): Promise<void> {
  //   await db.query(
  //     JSON.stringify({
  //       drop: true,
  //       table: "EMPLOYEE",
  //     })
  //   );
  //Recreate and populate according to size, so re-index and refresh.

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
    }),
  );

  // ... your exabase instance creation code

  console.log(`Benchmarking with ${dataSize} items`);
  await populateExabase(dataSize); // insert items or adjust data

  //Exabase benchmarks for each scale:

  // 1. SELECT all
  const sqMany = JSON.stringify({ table: "EMPLOYEE", many: true });
  bench(`Exabase SELECT * (${dataSize})`, async () => {
    await db.query(sqMany);
  });

  // 2. SELECT with filter. Adjust field.  Test index usage, when implemented
  const sqFilter = JSON.stringify({
    table: "EMPLOYEE",
    filter: { LastName: "lastName50" },
    many: true,
  }); // Adjust filter value as needed
  bench(`Exabase SELECT with filter (${dataSize})`, async () => {
    await db.query(sqFilter);
  });

  // 3. INSERT test. Important, insert scheme should match Exabase expected fields or otherwise modify tests or database or adjust fields appropriately given Exabase fields expected to provide relevant performance measures.
  const insertItem = {
    LastName: "lastNameInsert",
    FirstName: "firstNameInsert", // Generate suitable, scheme-compliant sample object
    // ... populate rest
  };

  const sqInsert = JSON.stringify({ table: "EMPLOYEE", insert: insertItem });

  bench(`Exabase INSERT (${dataSize})`, async () => await db.query(sqInsert));

  // 4. Update. Select first to be updated and generate change with correct fields to ensure scheme compatible, which depends on fields you expect in exabase..
  if (dataSize > 0) {
    const itemFirst = (
      await db.query(
        JSON.stringify({ table: "EMPLOYEE", many: true, limit: 1 }),
      )
    )[0];
    const updatedItem = Object.assign({}, itemFirst, {
      LastName: "UpdatedNameTest",
    });

    const sqUpdate = JSON.stringify({
      table: "EMPLOYEE",
      update: { where: { FirstName: itemFirst.FirstName }, with: updatedItem },
    });

    bench(`Exabase UPDATE (${dataSize})`, async () => {
      await db.query(sqUpdate);
    });
  }

  // Sqlite setup (use larger, real db if desired or otherwise create mock equivalents for comparable schema and test).

  const db2 = Database.open("z/sql_file/Northwind_large.sqlite");
  bench(`SQLite SELECT * FROM "Employee" (${dataSize})`, () => {
    db2.prepare(`SELECT * FROM "Employee"`).all();
  });

  //Test others..
  // Example against sqlite. Generate equivalent benchmarks relative to relevant queries done on exabase, especially those exercising similar indexing strategies when and where supported since useful to identify any discrepancies and areas of practical focus where your benchmarks want shown specifically..
}

for (const size of dataSizes) {
  await benchmark(size);
}

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
