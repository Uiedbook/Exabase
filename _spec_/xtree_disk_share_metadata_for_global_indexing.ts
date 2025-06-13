class GlobalIndex {
  private shards: Map<string, XTree>;
  private metadata: Map<string, ShardMetadata>;

  constructor() {
    this.shards = new Map<string, XTree>();
    this.metadata = new Map<string, ShardMetadata>();
  }

  // Determine if a shard is relevant to the query
  private isShardRelevant(
    query: Record<string, any>,
    shardId: string,
  ): boolean {
    const shardMetadata = this.metadata.get(shardId);
    if (!shardMetadata) return false;
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === "object" && ("gte" in value || "lte" in value)) {
        // Range query
        const range = shardMetadata.ranges.get(key);
        if (range && value.gte <= range.max && value.lte >= range.min) {
          return true;
        }
      } else {
        // Exact match or pattern match
        const freq = shardMetadata.frequencies.get(key);
        if (freq && freq.has(value)) {
          return true;
        }
      }
    }
    return false;
  }

  // Update shard metadata dynamically
  private updateShardMetadata(
    shardId: string,
    query: Record<string, any>,
    found: boolean,
  ): void {
    const shardMetadata = this.metadata.get(shardId);
    if (!shardMetadata) return;

    for (const [key, value] of Object.entries(query)) {
      if (found) {
        // Increase frequency for successful queries
        const freq = shardMetadata.frequencies.get(key) ??
          new Map<any, number>();
        freq.set(value, (freq.get(value) ?? 0) + 1);
        shardMetadata.frequencies.set(key, freq);
      } else {
        // Penalize if query failed
        const freq = shardMetadata.frequencies.get(key);
        if (freq && freq.has(value)) {
          freq.set(value, Math.max(0, freq.get(value)! - 1));
        }
      }
    }
  }
}

class ShardMetadata {
  public frequencies: Map<string, Map<any, number>>; // Attribute-value frequencies
  public ranges: Map<string, { min: number; max: number }>; // Attribute ranges
  constructor() {
    this.frequencies = new Map<string, Map<any, number>>();
    this.ranges = new Map<string, { min: number; max: number }>();
  }
}

class XTree {
  // Existing implementation...

  // Update shard metadata during indexing
  updateMetadata(globalId: string, data: Record<string, any>): void {
    for (const [key, value] of Object.entries(data)) {
      const shardMetadata = this.getMetadata();
      if (typeof value === "number") {
        const range = shardMetadata.ranges.get(key) || {
          min: Infinity,
          max: -Infinity,
        };
        shardMetadata.ranges.set(key, {
          min: Math.min(range.min, value),
          max: Math.max(range.max, value),
        });
      }
      const freq = shardMetadata.frequencies.get(key) ?? new Map<any, number>();
      freq.set(value, (freq.get(value) ?? 0) + 1);
      shardMetadata.frequencies.set(key, freq);
    }
  }

  getMetadata(): ShardMetadata {
    // Return or initialize shard metadata
    return new ShardMetadata();
  }
}
