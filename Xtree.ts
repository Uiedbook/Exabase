import { readFileSync } from "fs";
import { Utils } from "./src/parts/classes";
import { writeDataToFile } from "./src/parts/fs-utils";
import { Msgs } from "./src/types";

const readDataFromFileSync = (filePath: string) => {
  try {
    const data = readFileSync(filePath);
    const d = Utils.packr.decode(data) || [];
    return d;
  } catch (error) {
    return [] as Msgs;
  }
};

class XNode {
  constructor(keys?: { value: unknown; indexes: number[] }[]) {
    this.keys = keys || [];
  }
  keys: { value: unknown; indexes: number[] }[] = [];
  insert(value: unknown, index: number) {
    let low = 0;
    let high = this.keys.length - 1;
    for (; low <= high; ) {
      const mid = Math.floor((low + high) / 2);
      const current = this.keys[mid].value;
      if (current! === value!) {
        this.keys[mid] = {
          value,
          indexes: Array.from(new Set([...this.keys[mid].indexes, index])),
        };
        return;
      }
      if (current! < value!) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    this.keys.splice(low, 0, { value, indexes: [index] });
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
        return this.keys[mid].indexes;
      } else if (current! < value!) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return;
  }
}

class XTree<X extends Record<string, any>> {
  base: X[] = [];
  persitKey: string;
  tree: Record<keyof X, XNode> = {} as Record<keyof X, XNode>;
  inserting: boolean = false;

  constructor(init: { persitKey: string }) {
    this.persitKey = init.persitKey;
    const [base, tree] = XTree.restore(init.persitKey);
    if (base && tree) {
      this.base = base;
      this.tree = tree;
    }
  }

  search(key: keyof X, value: unknown) {
    if (this.tree[key]) {
      const indexes = this.tree[key].search(value);
      return indexes?.map((idx) => this.base[idx]);
    }
    return;
  }

  multiSearch(search: X) {
    const results: X[] = [];
    for (const key in search) {
      if (this.tree[key]) {
        const indexes = this.tree[key].search(search[key]);
        results.push(...(indexes || []).map((idx) => this.base[idx]));
      }
    }
    return results;
  }

  insert(data: X) {
    if (!data._id) throw new Error("bad insert");
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
      this.base.push(data._id);
    }
    this.persit();
    this.inserting = false;
  }

  bulkInsert(dataset: X[]) {
    if (Array.isArray(dataset)) {
      for (let i = 0; i < dataset.length; i++) {
        this.insert(dataset[i]);
      }
    }
    this.persit();
  }

  private persit() {
    const obj: Record<string, any> = {};
    const keys = Object.keys(this.tree);
    for (let index = 0; index < keys.length; index++) {
      obj[keys[index]] = this.tree[keys[index]].keys;
    }
    return writeDataToFile(this.persitKey, {
      base: this.base,
      tree: obj,
    });
  }

  static restore(persitKey: string) {
    const data = readDataFromFileSync(persitKey);
    const tree: Record<string, any> = {};
    if (data.tree) {
      for (const key in data.tree) {
        tree[key] = new XNode(data.tree[key]);
      }
    }
    return [data.base, tree];
  }
}

const data = { name: "john", _id: "ksssssssss" };
const tree = new XTree<Partial<typeof data>>({ persitKey: "boohoo" });
// tree.insert(data);
// tree.insert(data);
console.log(tree.search("name", "john"));
console.log(
  tree.multiSearch({
    _id: "ksssssssss",
  })
);
