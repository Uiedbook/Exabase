class GlobalIndex {
  private shards: Map<string, XTree>; // Top-level structure mapping shard IDs to XTree instances
  private metadata: Map<string, string>; // Metadata to map global IDs to shard IDs

  constructor() {
    this.shards = new Map<string, XTree>();
    this.metadata = new Map<string, string>();
  }

  // Add a new shard to the global index
  addShard(shardId: string, shard: XTree): void {
    this.shards.set(shardId, shard);
  }

  // Map a global ID to a specific shard
  assignToShard(globalId: string, shardId: string): void {
    this.metadata.set(globalId, shardId);
  }

  // Index data into the appropriate shard
  index(globalId: string, data: Record<string, any>): void {
    const shardId = this.metadata.get(globalId);
    if (!shardId) {
      throw new Error(`No shard assigned for global ID: ${globalId}`);
    }
    const shard = this.shards.get(shardId);
    if (!shard) {
      throw new Error(`Shard not found: ${shardId}`);
    }
    shard.index(globalId, data);
  }

  // Drop data by global ID
  drop(globalId: string): void {
    const shardId = this.metadata.get(globalId);
    if (!shardId) {
      throw new Error(`No shard assigned for global ID: ${globalId}`);
    }
    const shard = this.shards.get(shardId);
    if (!shard) {
      throw new Error(`Shard not found: ${shardId}`);
    }
    shard.drop(globalId);
  }

  // Search across all shards with a query
  search(query: Record<string, any>): Record<string, any>[] {
    const results: Record<string, any>[] = [];
    for (const shard of this.shards.values()) {
      results.push(...shard.search(query));
    }
    return results;
  }

  // Create checkpoints for all shards
  checkpoint(): void {
    for (const [shardId, shard] of this.shards.entries()) {
      console.log(`Creating checkpoint for shard: ${shardId}`);
      shard.checkpoint();
    }
  }
}

class XTree {
  private base: Map<string, any>; // Base storage mapping IDs to data
  private nodes: Map<string, Map<any, Set<string>>>; // Nodes for attribute-based indexing
  private readonly logFile: string; // Append-only log for persistence
  private checkpointFile: string; // File for periodic checkpoints

  constructor(logFile: string, checkpointFile: string) {
    this.base = new Map<string, any>();
    this.nodes = new Map<string, Map<any, Set<string>>>();
    this.logFile = logFile;
    this.checkpointFile = checkpointFile;

    // Load previous state from checkpoint
    this.loadFromCheckpoint();
  }

  // Add or update data in the tree with persistence
  index(id: string, data: Record<string, any>): void {
    // Log the operation
    this.appendToLog({ op: "index", id, data });

    // Add to in-memory structures
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

  // Drop all mappings for an ID with persistence
  drop(id: string): void {
    const data = this.base.get(id);
    if (!data) return;

    // Log the operation
    this.appendToLog({ op: "drop", id });

    for (const [attribute, value] of Object.entries(data)) {
      const node = this.nodes.get(attribute);
      if (!node || !node.has(value)) continue;

      const idSet = node.get(value)!;
      idSet.delete(id);
      if (idSet.size === 0) {
        node.delete(value);
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

  // Append operation to the log
  private appendToLog(operation: any): void {
    const logEntry = JSON.stringify(operation) + "\n";
    // Simulate file writing (replace with actual file I/O in production)
    console.log(`Log appended: ${logEntry}`);
  }

  // Load from checkpoint
  private loadFromCheckpoint(): void {
    // Simulate loading checkpoint data
    console.log("Checkpoint loaded (simulate real file I/O)");
  }

  // Create a checkpoint
  checkpoint(): void {
    // Serialize and save the current state to the checkpoint file
    const state = JSON.stringify({
      base: Array.from(this.base.entries()),
      nodes: Array.from(this.nodes.entries()).map(([k, v]) => [
        k,
        Array.from(v.entries()).map(([val, ids]) => [val, Array.from(ids)]),
      ]),
    });
    console.log(`Checkpoint created: ${state}`); // Replace with actual file write
  }
}

export { GlobalIndex, XTree };

class GlobalIndex {
  private shards: Map<string, XTree>; // Top-level structure mapping shard IDs to XTree instances
  private metadata: Map<string, string>; // Metadata to map global IDs to shard IDs

  constructor() {
    this.shards = new Map<string, XTree>();
    this.metadata = new Map<string, string>();
  }

  // Add a new shard to the global index
  addShard(shardId: string, shard: XTree): void {
    this.shards.set(shardId, shard);
  }

  // Map a global ID to a specific shard
  assignToShard(globalId: string, shardId: string): void {
    this.metadata.set(globalId, shardId);
  }

  // Index data into the appropriate shard
  index(globalId: string, data: Record<string, any>): void {
    let shardId = this.metadata.get(globalId);

    // Automatically assign a shard if none exists
    if (!shardId) {
      shardId = this.autoAssignShard(globalId);
    }

    const shard = this.shards.get(shardId);
    if (!shard) {
      throw new Error(`Shard not found: ${shardId}`);
    }
    shard.index(globalId, data);
  }

  // Automatically assign a shard based on global ID hashing
  private autoAssignShard(globalId: string): string {
    const shardIds = Array.from(this.shards.keys());
    if (shardIds.length === 0) {
      throw new Error("No shards available for assignment.");
    }

    // Hash-based shard assignment
    const shardIndex = this.hash(globalId) % shardIds.length;
    const shardId = shardIds[shardIndex];

    // Map the global ID to the assigned shard
    this.assignToShard(globalId, shardId);
    return shardId;
  }

  // Simple hash function for deterministic shard assignment
  private hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Drop data by global ID
  drop(globalId: string): void {
    const shardId = this.metadata.get(globalId);
    if (!shardId) {
      throw new Error(`No shard assigned for global ID: ${globalId}`);
    }
    const shard = this.shards.get(shardId);
    if (!shard) {
      throw new Error(`Shard not found: ${shardId}`);
    }
    shard.drop(globalId);
  }

  // Search across all shards with a query
  search(query: Record<string, any>): Record<string, any>[] {
    const results: Record<string, any>[] = [];
    for (const shard of this.shards.values()) {
      results.push(...shard.search(query));
    }
    return results;
  }

  // Create checkpoints for all shards
  checkpoint(): void {
    for (const [shardId, shard] of this.shards.entries()) {
      console.log(`Creating checkpoint for shard: ${shardId}`);
      shard.checkpoint();
    }
  }
}

class XTree {
  private base: Map<string, any>; // Base storage mapping IDs to data
  private nodes: Map<string, Map<any, Set<string>>>; // Nodes for attribute-based indexing
  private readonly logFile: string; // Append-only log for persistence
  private checkpointFile: string; // File for periodic checkpoints

  constructor(logFile: string, checkpointFile: string) {
    this.base = new Map<string, any>();
    this.nodes = new Map<string, Map<any, Set<string>>>();
    this.logFile = logFile;
    this.checkpointFile = checkpointFile;

    // Load previous state from checkpoint
    this.loadFromCheckpoint();
  }

  // Add or update data in the tree with persistence
  index(id: string, data: Record<string, any>): void {
    // Log the operation
    this.appendToLog({ op: "index", id, data });

    // Add to in-memory structures
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

  // Drop all mappings for an ID with persistence
  drop(id: string): void {
    const data = this.base.get(id);
    if (!data) return;

    // Log the operation
    this.appendToLog({ op: "drop", id });

    for (const [attribute, value] of Object.entries(data)) {
      const node = this.nodes.get(attribute);
      if (!node || !node.has(value)) continue;

      const idSet = node.get(value)!;
      idSet.delete(id);
      if (idSet.size === 0) {
        node.delete(value);
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

  // Append operation to the log
  private appendToLog(operation: any): void {
    const logEntry = JSON.stringify(operation) + "\n";
    // Simulate file writing (replace with actual file I/O in production)
    console.log(`Log appended: ${logEntry}`);
  }

  // Load from checkpoint
  private loadFromCheckpoint(): void {
    // Simulate loading checkpoint data
    console.log("Checkpoint loaded (simulate real file I/O)");
  }

  // Create a checkpoint
  checkpoint(): void {
    // Serialize and save the current state to the checkpoint file
    const state = JSON.stringify({
      base: Array.from(this.base.entries()),
      nodes: Array.from(this.nodes.entries()).map(([k, v]) => [
        k,
        Array.from(v.entries()).map(([val, ids]) => [val, Array.from(ids)]),
      ]),
    });
    console.log(`Checkpoint created: ${state}`); // Replace with actual file write
  }
}

export { GlobalIndex, XTree };
