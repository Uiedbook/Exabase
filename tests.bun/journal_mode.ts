import { promises as fsp } from "fs";
import { GLOBAL_OBJECT } from "../src/primitives/classes";
import { loadLog } from "../src/primitives/functions";
import path from "path";

class LSMTreeDB {
  private memTable: Map<string, any> = new Map(); // In-memory write buffer
  private walPath: string; // Write-Ahead Log file path
  private sstPath: string; // Directory for SSTables
  private threshold: number; // MemTable flush threshold

  constructor(dbPath: string, flushThreshold = 1) {
    this.walPath = path.join(dbPath, "wal.log");
    this.sstPath = path.join(dbPath, "sstables");
    this.threshold = flushThreshold;
  }

  async init() {
    // Ensure the SSTable directory exists
    await fsp.mkdir(this.sstPath, { recursive: true });

    // Recover from WAL on startup
    await this.recoverFromWAL();
  }

  private async recoverFromWAL() {
    try {
      const walData = await fsp.readFile(this.walPath, "utf-8");
      const operations = walData.trim().split("\n").map(JSON.parse);
      for (const op of operations) {
        this.memTable.set(op.key, op.value);
      }
    } catch (err) {
      if (err.code !== "ENOENT") throw err; // Ignore if WAL doesn't exist
    }
  }

  private async writeToWAL(key: string, value: any) {
    const entry = JSON.stringify({ key, value }) + "\n";
    await fsp.appendFile(this.walPath, entry, "utf-8");
  }

  private async flushMemTable() {
    const sstFile = path.join(this.sstPath, `sstable-${Date.now()}.json`);
    const sortedEntries = Array.from(this.memTable.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    await fsp.writeFile(sstFile, JSON.stringify(sortedEntries), "utf-8");
    this.memTable.clear();
    await fsp.unlink(this.walPath); // Clear the WAL
  }

  async write(key: string, value: any) {
    await this.writeToWAL(key, value);
    this.memTable.set(key, value);

    // Flush MemTable to SSTable if it exceeds the threshold
    if (this.memTable.size > this.threshold) {
      await this.flushMemTable();
    }
  }

  async read(key: string): Promise<any | null> {
    // Check MemTable first
    if (this.memTable.has(key)) {
      return this.memTable.get(key);
    }

    // Search SSTables
    const files = await fsp.readdir(this.sstPath);
    for (const file of files) {
      const sstFile = path.join(this.sstPath, file);
      const data = JSON.parse(await fsp.readFile(sstFile, "utf-8"));
      for (const [entryKey, entryValue] of data) {
        if (entryKey === key) {
          return entryValue;
        }
      }
    }
    return null; // Not found
  }
}

(async () => {
  const db = new LSMTreeDB("./db");
  await db.init();

  // Write data
  await db.write("key1", { name: "Alice" });
  await db.write("key2", { name: "Bob" });

  // Read data
  const value = await db.read("key1");
  console.log(value); // Output: { name: "Alice" }
})();
