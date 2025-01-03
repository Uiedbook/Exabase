class Xtree {
  private base: Map<string, any>; // Base storage mapping IDs to data
  private nodes: Map<
    string,
    {
      attribute: string; // The attribute this node indexes
      valueMap: Map<any, Set<string>>; // Maps attribute values to sets of IDs
    }
  >; // Nodes for different attributes

  indexTable: Record<string, boolean>;
  constructor(init: { indexTable: Record<string, boolean> }) {
    this.indexTable = init.indexTable;
    this.base = new Map<string, any>(); // ID is now always a string
    this.nodes = new Map<string, any>();
  }

  // Add or update data in the tree
  index(id: string, data: Record<string, any>): void {
    // TODO: this is for Exabase. kindly ignore
    // Drop existing mappings first if they exist
    // const existingData = this.base.get(id);
    // if (existingData) {
    //   this.drop(id);
    // }
    this.base.set(id, data);
    for (const [attribute, value] of Object.entries(data)) {
      if (!this.indexTable[attribute]) {
        continue;
      }
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
    if (entries.length === 0) {
      return Array.from(this.base.values());
    }
    // Start with the smallest set for optimal intersection
    let smallestSet: Set<string> | null = null;
    let smallestSize = Infinity;

    for (const [key, value] of entries) {
      const node = this.nodes.get(key);
      const values = node?.valueMap.get(value);
      if (!node || !values) return [];

      if (values.size < smallestSize) {
        smallestSize = values.size;
        smallestSet = values;
      }
    }

    // Intersect using Sets
    const result = new Set(smallestSet);
    for (const [key, value] of entries) {
      const node = this.nodes.get(key);
      const values = node?.valueMap.get(value);

      for (const id of result) {
        if (!values?.has(id)) {
          result.delete(id);
        }
      }
    }

    return Array.from(result).map((id) => this.base.get(id));
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
      const values = node?.valueMap.get(value);
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
      const values = node?.valueMap.get(value);

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
const indexer = new Xtree({
  indexTable: { name: true, age: true },
});

// Index data
indexer.index("1", { name: "John Doe", age: 2 });
indexer.index("2", { name: "John Doe", age: 2 });
indexer.index("3", { name: "John Doe", age: 5 });
indexer.index("4", { name: "Jude francis", age: 2 });
indexer.index("5", { name: "John Doe", age: 2 });
indexer.search({ name: "John Doe", age: 2 });
