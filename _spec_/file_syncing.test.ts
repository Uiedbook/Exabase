import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { promises as fs } from "fs";
import path from "path";
import { SynFileWriter as SynFileWritWithWaitList } from "../src/primitives/functions"; // Replace with your file path

// Temporary test directory
const TEST_DIR = path.resolve("./test_files");

// Helper to clean up test files
async function cleanup() {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
}

beforeAll(async () => {
  await cleanup(); // Clean up before starting tests
  await fs.mkdir(TEST_DIR, { recursive: true });
});

afterAll(async () => {
  await cleanup(); // Clean up after tests are done
});

describe("File Writer Tests", () => {
  it("should write a small file", async () => {
    const file = path.join(TEST_DIR, "smallFile.txt");
    const data = Buffer.from("Hello, World!");

    await SynFileWritWithWaitList.write(file, data);

    const result = await fs.readFile(file, "utf8");
    expect(result).toBe("Hello, World!");
  });

  it("should write a large file", async () => {
    const file = path.join(TEST_DIR, "largeFile.txt");
    const data = Buffer.alloc(10 * 1024 * 1024, "a"); // 10 MB of 'a'

    await SynFileWritWithWaitList.write(file, data);

    const result = await fs.readFile(file, "utf8");
    expect(result.length).toBe(10 * 1024 * 1024);
  });

  it("should create missing directories", async () => {
    const file = path.join(TEST_DIR, "nested/dir/structure/file.txt");
    const data = Buffer.from("Nested directory test");

    await SynFileWritWithWaitList.write(file, data);

    const result = await fs.readFile(file, "utf8");
    expect(result).toBe("Nested directory test");
  });

  it("should handle concurrent writes to the same file", async () => {
    const file = path.join(TEST_DIR, "concurrent.txt");
    const data1 = Buffer.from("First write");
    const data2 = Buffer.from("Second write");

    // Simulate concurrent writes
    await Promise.all([
      SynFileWritWithWaitList.write(file, data1),
      SynFileWritWithWaitList.write(file, data2),
    ]);

    const result = await fs.readFile(file, "utf8");
    // Only one write should succeed due to the locking mechanism
    expect([data2.toString()]).toContain(result);
  });

  it("should handle concurrent writes to different files", async () => {
    const file1 = path.join(TEST_DIR, "file1.txt");
    const file2 = path.join(TEST_DIR, "file2.txt");
    const data1 = Buffer.from("File 1 data");
    const data2 = Buffer.from("File 2 data");

    // Simulate concurrent writes to different files
    await Promise.all([
      SynFileWritWithWaitList.write(file1, data1),
      SynFileWritWithWaitList.write(file2, data2),
    ]);

    const result1 = await fs.readFile(file1, "utf8");
    const result2 = await fs.readFile(file2, "utf8");

    expect(result1).toBe("File 1 data");
    expect(result2).toBe("File 2 data");
  });

  it("should handle permission errors gracefully", async () => {
    const protectedDir = path.join(TEST_DIR, "protected");
    const file = path.join(protectedDir, "file.txt");
    const data = Buffer.from("Permission test");

    // Create a directory without write permissions
    await fs.mkdir(protectedDir, { mode: 0o444 });

    let errorOccurred = false;
    try {
      await SynFileWritWithWaitList.write(file, data);
    } catch (err) {
      errorOccurred = true;
      expect(err.message).toContain("permission denied");
    }

    expect(errorOccurred).toBe(true);

    // Restore permissions for cleanup
    await fs.chmod(protectedDir, 0o755);
  });
});
