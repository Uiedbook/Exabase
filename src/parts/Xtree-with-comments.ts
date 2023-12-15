/**
 * XNode represents a node in the X-Tree algorithm.
 * It handles the insertion and search operations within the node.
 */
class XNode {
  // Array to store keys, each containing a value and its index in the base array.
  keys: { value: unknown; index: number }[] = [];
  /**
   * Inserts a new value into the node, maintaining sorted order.
   * @param value - The value to be inserted.
   * @param index - The index of the value in the base array.
   */
  insert(value: unknown, index: number) {
    // Binary search to find the correct position for insertion.
    let low = 0;
    let high = this.keys.length - 1;
    for (; low <= high; ) {
      const mid = Math.floor((low + high) / 2);
      const current = this.keys[mid];

      if (current!.value! < value!) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Insert the value at the calculated position.
    this.keys.splice(low, 0, { value, index });
  }

  /**
   * Searches for a value within the node.
   * @param value - The value to search for.
   * @returns The index of the value in the base array if found, otherwise undefined.
   */
  search(value: unknown) {
    let left = 0;
    let right = this.keys.length - 1;

    for (; left <= right; ) {
      const mid = Math.floor((left + right) / 2);
      const current = this.keys[mid].value;

      if (
        current === value ||
        (typeof current === "string" && current.includes(value as string))
      ) {
        return this.keys[mid].index;
      } else if (current! < value!) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }
}

/**
 * XTree is the main class representing the X-Tree indexing algorithm.
 * It manages a base array and a tree structure for efficient search and insertion operations.
 */
class XTree<X extends Record<string, unknown>> {
  // Base array to store data.
  base: X[] = [];
  // Tree structure to index keys.
  tree: Record<keyof X, XNode> = {} as Record<keyof X, XNode>;
  // Flag to prevent multiple insertions concurrently.
  inserting: boolean = false;
  /**
   * Searches for a specific value in the XTree.
   * @param key - The key to search for.
   * @param value - The value to search for.
   * @returns The data element if found, otherwise undefined.
   */
  search(key: keyof X, value: unknown) {
    if (this.tree[key]) {
      const index = this.tree[key].search(value);
      return index && this.base[index];
    }
  }

  /**
   * Performs a multi-key search in the XTree.
   * @param search - An object containing key-value pairs for the search criteria.
   * @returns An array of data elements that match the search criteria.
   */
  multiSearch(search: X) {
    const results: X[] = [];
    for (const key in search) {
      if (this.tree[key]) {
        const index = this.tree[key].search(search[key]);
        index && results.push(this.base[index]);
      }
    }
    return results;
  }

  /**
   * Inserts a new data element into the XTree.
   * @param data - The data element to be inserted.
   */
  insert(data: X) {
    if (!this.inserting) {
      this.inserting = true;
    } else {
      // If already inserting, defer the operation using setImmediate.
      setImmediate(() => {
        this.insert(data);
      });
      return;
    }
    // Save keys in their corresponding nodes.
    if (typeof data === "object" && !Array.isArray(data)) {
      for (const key in data) {
        if (!this.tree[key]) {
          this.tree[key] = new XNode();
        }
        this.tree[key].insert(data[key], this.base.length);
      }
      // Add the data element to the base array.
      this.base.push(data);
    }
    this.inserting = false;
  }
}

// Example Usage:
// Create an XTree instance with a specific structure.
const tree = new XTree<{ name: string }>();

// Insert data into the XTree.
const data = { name: "john" };
tree.insert(data);

//perform searches.
console.log(tree.search("name", "john"));
console.log(tree.multiSearch({ name: "john" }));
