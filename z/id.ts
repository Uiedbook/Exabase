import { bench, run } from "mitata";
import { Database } from "bun:sqlite";
import { Exabase } from "../src/index.ts";

const db1 = new Exabase({ endpoint: "", secretAccessKey: "" });
await db1.query({
  table: "PACKET",
  execute: {
    createTable: true,
  },
});

const db2 = Database.open("z/sql_file/Northwind_large.sqlite");

// const dataSizes = [9, 100, 1000, 10000, 100000]; // Test with varying data sizes
const dataSizes = [1, 10, 100]; // Test with varying data sizes

async function populateExabase(count: number): Promise<void> {
  //generate dummy data, ensure the size match your exabase table scheme
  const dummyData = Array.from({ length: count }).map((_, i) => ({
    key: "item-" + i,
    metadata: JSON.stringify({ time: Date.now() }),
  }));

  const packetCount = await db1.query({
    table: "PACKET",
    count: true,
  });

  if (packetCount !== dummyData.length) {
    for (const item of dummyData) {
      await db1.query({ table: "PACKET", insert: item });
    }
  }
}

async function benchmark(dataSize: number): Promise<void> {
  //Recreate and populate according to size, so re-index and refresh.

  await db1.query({
    table: "PACKET",
    execute: { dropTable: true },
  });
  await db1.query({
    table: "PACKET",
    execute: { createTable: true },
  });

  console.log(`Benchmarking with ${dataSize} items \n\n\n`);
  await populateExabase(dataSize); // insert items or adjust data

  //Exabase benchmarks for each scale:

  // 1. SELECT all
  const sqMany = {
    table: "PACKET",
    where: { "*": true },
    get: true,
  };
  bench(`Exabase SELECT * (${dataSize})`, async () => {
    await db1.query(sqMany);
  });

  // 2. SELECT with filter. Adjust field.  Test index usage, when implemented
  const sqFilter = {
    table: "PACKET",
    where: { "*": true },
    get: true,
  }; // Adjust filter value as needed
  bench(`Exabase SELECT with filter (${dataSize})`, async () => {
    await db1.query(sqFilter);
  });

  // 3. INSERT test.  insert scheme should match Exabase expected fields or otherwise modify tests or database or adjust fields appropriately given Exabase fields expected to provide relevant performance measures.
  const insertItem = {
    LastName: "lastNameInsert",
    FirstName: "firstNameInsert", // Generate suitable, scheme-compliant sample object
    // ... populate rest
  };

  const sqInsert = { table: "PACKET", insert: insertItem };

  bench(`Exabase INSERT (${dataSize})`, async () => await db1.query(sqInsert));

  // 4. Update. Select first to be updated and generate change with correct fields to ensure scheme compatible, which depends on fields you expect in exabase..
  if (dataSize > 0) {
    const itemFirst = (
      await db1.query({
        table: "PACKET",
        where: { "*": true },
        get: true,
        take: 1,
      })
    )[0];
    const updatedItem = Object.assign({}, itemFirst, {
      LastName: "UpdatedNameTest",
    });

    const sqUpdate = {
      table: "PACKET",
      update: updatedItem,
    };

    bench(`Exabase UPDATE (${dataSize})`, async () => {
      await db1.query(sqUpdate);
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

const sq = {
  table: "PACKET",
  where: { "*": true },
  get: true,
};
{
  bench('SELECT * FROM "Employee" Exabase', async () => {
    await db1.query(sq);
  });
}

const sq2 = db2.prepare(`SELECT * FROM "Employee"`);
{
  bench('SELECT * FROM "Employee" sqlite', () => {
    sq2.all();
  });
}

run();
