class Xtree {
  private base: Map<string, any>; // Base storage mapping IDs to data
  private nodes: Map<string, Map<any, Set<string>>>; // Nodes for different attributes
  constructor() {
    this.base = new Map<string, any>(); // ID is now always a string
    this.nodes = new Map<string, any>();
  }

  // Add or update data in the tree
  index(id: string, data: Record<string, any>): void {
    this.base.set(id, data);
    for (const [attribute, value] of Object.entries(data)) {
      let node = this.nodes.get(attribute);
      if (!node) {
        node = new Map<any, Set<string>>();
        this.nodes.set(attribute, node);
      }
      if (!node.has(value)) {
        node.set(value, new Set<string>());
      }
      node.get(value)!.add(id);
    }
  }

  // Drop all mappings for an ID
  drop(id: string): void {
    const data = this.base.get(id);
    if (!data) return;
    for (const [attribute, value] of Object.entries(data)) {
      const node = this.nodes.get(attribute);
      if (!node || !node.has(value)) continue;

      const idSet = node.get(value)!;
      idSet.delete(id);
      if (idSet.size === 0) {
        node.delete(value); // Deferred cleanup
      }
      if (node.size === 0) {
        this.nodes.delete(attribute);
      }
    }
    this.base.delete(id);
  }

  // Multi-attribute search
  search(query: Record<string, any>): Record<string, any>[] {
    const entries = Object.entries(query);
    if (entries.length === 0) {
      return Array.from(this.base.values());
    }
    // Start with the smallest set for optimal intersection
    let smallestSet: Set<string> | null = null;
    let smallestSize = Infinity;
    const results: Set<string>[] = [];
    for (const [key, value] of entries) {
      const node = this.nodes.get(key);
      const values = node?.get(value);
      if (!node || !values) return [];
      results.push(values);
      if (values.size < smallestSize) {
        smallestSize = values.size;
        smallestSet = values;
      }
    }
    if (results.length === 0) return [];
    // Intersect using Sets
    main: for (const values of results) {
      for (const id of smallestSet!) {
        if (!values?.has(id)) {
          smallestSet!.delete(id);
          if (smallestSet!.size === 0) break main;
          break;
        }
      }
    }
    return Array.from(smallestSet!).map((id) => this.base.get(id));
  }
  // Multi-attribute relational operations
  operator<T extends Record<string, any>>(
    query: T,
    operator: Record<keyof T, "eq" | "lt" | "gt" | "lte" | "gte" | "like">
  ): Record<string, any>[] {
    const entries = Object.entries(query);
    if (entries.length === 0) {
      return Array.from(this.base.values());
    }
    const results: Set<string>[] = [];
    // Start with the smallest set for optimal intersection
    let smallestSet: Set<string> | null = null;
    let smallestSize = Infinity;
    for (const [key, value] of entries) {
      const node = this.nodes.get(key);
      if (!node) return []; // Key not found, return empty results
      const combinedSet = new Set<string>();
      const op = operator[key]; //  get the operator
      for (const [k, valSet] of node) {
        let match = false;
        switch (op) {
          case "like":
            match = k.includes(value);
            break;
          case "gt":
            match = k > value;
            break;
          case "lt":
            match = k < value;
            break;
          case "gte":
            match = k >= value;
            break;
          case "lte":
            match = k <= value;
            break;
          case "eq":
          default: //  defaults to eq
            match = k === value;
            break;
        }
        if (match) {
          for (const item of valSet || []) {
            combinedSet.add(item);
          }
        }
      }
      if (combinedSet.size > 0) {
        results.push(combinedSet);
        // Finding the smallest Set
        if (combinedSet.size < smallestSize) {
          smallestSize = combinedSet.size;
          smallestSet = combinedSet;
        }
      }
    }
    //  return if no results
    if (results.length === 0) return [];
    // Intersect using Sets
    main: for (const values of results) {
      for (const id of smallestSet!) {
        if (!values?.has(id)) {
          smallestSet!.delete(id);
          if (smallestSet!.size === 0) break main;
          break;
        }
      }
    }
    // map data to values
    return Array.from(smallestSet!).map((id) => this.base.get(id));
  }

  // Multi-attribute count
  count(query: Record<string, any> | true): number {
    if (query === true) {
      return this.base.size;
    }
    const entries = Object.entries(query);
    // Start with the smallest set for optimal intersection
    let smallestSet: Set<string> | null = null;
    let smallestSize = Infinity;

    for (const [key, value] of entries) {
      const node = this.nodes.get(key);
      const values = node?.get(value);
      if (!node || !values) return 0;
      if (values.size < smallestSize) {
        smallestSize = values.size;
        smallestSet = values;
      }
    }

    // Intersect using Sets
    const result = new Set(smallestSet);
    for (const [key, value] of entries) {
      const node = this.nodes.get(key);
      const values = node?.get(value);
      for (const id of result) {
        if (!values?.has(id)) {
          result.delete(id);
        }
      }
    }
    return result.size;
  }
}

// Example Usage
const indexer = new Xtree();

// Index data
indexer.index("2", { name: "john doe", age: 1 });
indexer.index("1", { name: "john paul", age: 2 });
indexer.index("3", { name: "john friday", age: 3 });
indexer.index("4", { name: "Jude francis", age: 4 });
indexer.index("5", { name: "john thomas", age: 5 });

const a = indexer.search({ name: "john doe" });
const b = indexer.operator({ age: 2 }, { age: "lt" });
console.log({ a, b });
console.assert(a.length === b.length, "Length check failed");
console.assert(a[0].age === b[0].age, "Length age failed");
console.assert(a[0].name === b[0].name, "Length name failed");
