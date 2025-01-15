import { bench, run } from "mitata";
import { Database } from "bun:sqlite";
import { Exabase, ExaId } from "../src/index.ts";

const db1 = new Exabase({ endpoint: "", secretAccessKey: "" });
const db2 = new Database("z/sql_file/benchmark.sqlite");

const dataSizes = [1, 10, 100]; // Test with varying data sizes

async function setupExabase() {
  await db1.query({
    table: "PACKET",
    execute: { dropTable: true },
  });
  await db1.query({
    table: "PACKET",
    execute: {
      createTable: true,
    },
  });
}

function setupSQLite() {
  db2.exec(`DROP TABLE IF EXISTS PACKET`);
  db2.exec(`
    CREATE TABLE PACKET (
      _id TEXT PRIMARY KEY,
      key TEXT,
      metadata TEXT
    )
  `);
}

async function populateExabase(dataSize: number) {
  for (let i = 0; i < dataSize; i++) {
    await db1.query({
      table: "PACKET",
      insert: {
        key: `item-${i}`,
        metadata: JSON.stringify({ time: Date.now() }),
      },
    });
  }
}

function populateSQLite(dataSize: number) {
  const stmt = db2.prepare(
    `INSERT INTO PACKET (_id, key, metadata) VALUES (?, ?, ?)`
  );
  db2.transaction(() => {
    for (let i = 0; i < dataSize; i++) {
      stmt.run(
        ExaId(`log-${i}`),
        `item-${i}`,
        JSON.stringify({ time: Date.now() })
      );
    }
  })();
}

async function benchmark(dataSize: number) {
  // Setup and populate databases
  await setupExabase();
  setupSQLite();
  await populateExabase(dataSize);
  populateSQLite(dataSize);

  // SELECT * benchmark
  bench(`Exabase SELECT * (${dataSize})`, async () => {
    await db1.query({ table: "PACKET", where: {}, get: true });
  });

  bench(`SQLite SELECT * (${dataSize})`, () => {
    db2.prepare(`SELECT * FROM PACKET`).all();
  });

  // INSERT benchmark
  const insertItem = {
    key: `item-${dataSize}`,
    metadata: JSON.stringify({ time: Date.now() }),
  };

  bench(`Exabase INSERT (${dataSize})`, async () => {
    await db1.query({ table: "PACKET", insert: insertItem });
  });

  bench(`SQLite INSERT (${dataSize})`, () => {
    db2
      .prepare(`INSERT INTO PACKET (_id, key, metadata) VALUES (?, ?, ?)`)
      .run(
        ExaId("LOG-1"),
        `item-${dataSize}`,
        JSON.stringify({ time: Date.now() })
      );
  });

  // UPDATE benchmark
  const updatedMetadata = JSON.stringify({ time: Date.now(), updated: true });

  // Exabase: Select all items and update each individually
  bench(`Exabase UPDATE ALL (${dataSize})`, async () => {
    const items = await db1.query({
      table: "PACKET",
      where: {},
      get: true,
    });

    for (const item of items) {
      await db1.query({
        table: "PACKET",
        update: { ...item, metadata: updatedMetadata },
      });
    }
  });

  // SQLite: Select all items and update each individually
  bench(`SQLite UPDATE ALL (${dataSize})`, () => {
    const items = db2.prepare(`SELECT key FROM PACKET`).all();

    const updateStmt = db2.prepare(
      `UPDATE PACKET SET metadata = ? WHERE key = ?`
    );
    db2.transaction(() => {
      for (const item of items) {
        updateStmt.run(updatedMetadata, item.key);
      }
    })();
  });
}

for (const size of dataSizes) {
  await benchmark(size);
}

run();
