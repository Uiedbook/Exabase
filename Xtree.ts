class XNode {
  keys: { value: unknown; index: number }[] = [];
  insert(value: unknown, index: number) {
    let low = 0;
    let high = this.keys.length - 1;
    for (; low <= high; ) {
      const mid = Math.floor((low + high) / 2);
      const current = this.keys[mid];
      if (current! < value!) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    this.keys.splice(low, 0, { value, index });
  }
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

class XTree<X extends Record<string, unknown>> {
  base: X[] = [];
  tree: Record<keyof X, XNode> = {} as Record<keyof X, XNode>;
  inserting: boolean = false;

  search(key: keyof X, value: unknown) {
    if (this.tree[key]) {
      const index = this.tree[key].search(value);
      return index && this.base[index];
    }
  }
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
  insert(data: X) {
    if (!this.inserting) {
      this.inserting = true;
    } else {
      setImmediate(() => {
        this.insert(data);
      });
      return;
    }
    // ? save keys in their corresponding nodes
    if (typeof data === "object" && !Array.isArray(data)) {
      for (const key in data) {
        if (!this.tree[key]) {
          this.tree[key] = new XNode();
        }
        this.tree[key].insert(data[key], this.base.length);
      }
      this.base.push(data);
    }
    this.inserting = false;
  }
}

const tree = new XTree<{ name: string }>();

const data = { name: "john" };

tree.insert(data);
console.log(tree);
console.log(tree.search("name", "john"));
console.log(tree.multiSearch({ name: "john" }));
