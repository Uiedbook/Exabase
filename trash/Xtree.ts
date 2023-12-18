import { readFileSync } from "fs";
import { Utils } from "../src/parts/classes";
import { FileLockTable } from "../src/parts/fs-utils";
import { Msgs } from "../src/types";

const readDataFromFileSync = (filePath: string) => {
  try {
    const data = readFileSync(filePath);
    const d = Utils.packr.decode(data) || [];
    return d;
  } catch (error) {
    return [] as Msgs;
  }
};

export class XNode {
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
    if (base) {
      this.base = base;
      this.tree = tree;
    }
  }

  search(search: X, NumberOfItems: number = Infinity) {
    const results: X[] = [];
    for (const key in search) {
      if (this.tree[key]) {
        const indexes = this.tree[key].search(search[key]);
        results.push(...(indexes || []).map((idx) => this.base[idx]));
        if (results.length >= NumberOfItems) break;
      }
    }
    if (results.length >= NumberOfItems) return results.slice(0, NumberOfItems);
    return results;
  }
  count(search: X) {
    let resultsCount: number = 0;
    for (const key in search) {
      if (this.tree[key]) {
        resultsCount += this.tree[key].search(search[key])?.length || 0;
      }
    }
    return resultsCount;
  }

  async insert(data: X, bulk = false) {
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
        if (key === "_id") continue;
        if (!this.tree[key]) {
          this.tree[key] = new XNode();
        }
        this.tree[key].insert(data[key], this.base.length);
      }
      this.base.push(data._id);
    }
    if (!bulk) await this.persit();
    this.inserting = false;
  }

  async bulkInsert(dataset: X[]) {
    if (Array.isArray(dataset)) {
      for (let i = 0; i < dataset.length; i++) {
        this.insert(dataset[i], true);
      }
      await this.persit();
    }
  }

  private persit() {
    const obj: Record<string, any> = {};
    const keys = Object.keys(this.tree);
    for (let index = 0; index < keys.length; index++) {
      obj[keys[index]] = this.tree[keys[index]].keys;
    }
    return FileLockTable.write(this.persitKey, {
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

const data = { name: "john", _id: "id" };
const tree = new XTree<Partial<typeof data>>({ persitKey: "boohoo" });
let count = 0;
console.time("index new item");
tree.insert(data);
console.timeEnd("index new item");
console.time("count all items");
count = tree.count({
  name: "j",
});
console.timeEnd("count all items");
console.log("items in the Index => " + count);
