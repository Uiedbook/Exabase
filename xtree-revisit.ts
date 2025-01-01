import { bench, run } from "mitata";
import { intersect } from "./src/primitives/functions.ts";

class Xtree {
  private base: Map<string, any>; // Base storage mapping IDs to data
  private nodes: Map<
    string,
    {
      attribute: string; // The attribute this node indexes
      valueMap: Map<any, Set<string>>; // Maps attribute values to sets of IDs
    }
  >; // Nodes for different attributes
  tableDir?: string;
  indexTable: Record<string, boolean>;
  constructor(init: { indexTable: Record<string, boolean>; tableDir: string }) {
    this.indexTable = init.indexTable;
    this.tableDir = init.tableDir;
    this.base = new Map<string, any>(); // ID is now always a string
    this.nodes = new Map<string, any>();
  }

  // Add or update data in the tree
  index(id: string, data: Record<string, any>): void {
    this.base.set(id, data);
    for (const [attribute, value] of Object.entries(data)) {
      let node = this.nodes.get(attribute);

      if (!node) {
        node = { attribute, valueMap: new Map<any, Set<string>>() };
        this.nodes.set(attribute, node);
      }

      if (!node.valueMap.has(value)) {
        node.valueMap.set(value, new Set<string>());
      }
      node.valueMap.get(value)!.add(id);
    }
  }

  // Drop all mappings for an ID
  drop(id: string): void {
    const data = this.base.get(id);
    if (!data) return;
    for (const [attribute, value] of Object.entries(data)) {
      const node = this.nodes.get(attribute);
      if (!node || !node.valueMap.has(value)) continue;

      const idSet = node.valueMap.get(value)!;
      idSet.delete(id);
      if (idSet.size === 0) {
        node.valueMap.delete(value); // Deferred cleanup
      }
      if (node.valueMap.size === 0) {
        this.nodes.delete(attribute);
      }
    }
    this.base.delete(id);
  }

  // Multi-attribute search
  search(query: Record<string, any>): string[] {
    const entries = Object.entries(query);
    const results: string[][] = [];
    for (const [key, value] of entries) {
      const node = this.nodes.get(key);
      const values = node?.valueMap.get(value);
      if (!node || !values) {
        return [];
      }
      results.push(Array.from(values));
    }
    return intersect(results).map((idx) => this.base.get(idx));
  }
  // Multi-attribute count
  count(query: Record<string, any> | true): number {
    if (query === true) {
      return this.base.size;
    }
    const entries = Object.entries(query);
    const results: string[][] = [];
    for (const [key, value] of entries) {
      const node = this.nodes.get(key);
      const values = node?.valueMap.get(value);
      if (!node || !values) {
        return 0;
      }
      results.push(Array.from(values));
    }
    return intersect(results).length;
  }
}

// Example Usage
const indexer = new Xtree({
  indexTable: { name: true, age: true },
  tableDir: "./data",
});

// Index data
indexer.index("1", { name: "ChatGPT", age: 2 });
indexer.index("2", { name: "ChatGPT", age: 2 });
indexer.index("3", { name: "ChatGPT", age: 5 });
indexer.index("4", { name: "ChatGPX", age: 2 });
indexer.index("5", { name: "ChatGPT", age: 2 });

// Multi-attribute search
bench("", async () => {
  indexer.search({ name: "ChatGPT", age: 2 });
});

run();
