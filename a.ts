class XNode {
  map: Record<string, number[]> = {};
  constructor(map?: Record<string, number[]>) {
    this.map = map || {};
  }
  create(val: string, idk: number) {
    if (!this.map[val]) {
      this.map[val] = [];
    }
    this.map[val].push(idk);
  }
  drop(val: string, idk: number) {
    if (this.map[val]) {
      const idp = this.map[val].indexOf(idk);
      this.map[val].splice(idp, 1);
      if (this.map[val].length === 0) {
        delete this.map[val];
      }
    }
  }
}

export class XTree {
  tree: Record<string, XNode> = {};
  keys: string[] = [];
  indexTable: Record<string, boolean>;
  constructor(init: { indexTable: Record<string, boolean> }) {
    this.indexTable = init.indexTable;
  }
  search(search: Record<string, any>, _take: number = Infinity) {
    const Indexes: number[][] = [];
    //  ? get the search keys
    for (const key in search) {
      if (!this.indexTable[key]) continue;
      if (this.tree[key]) {
        const index = this.tree[key].map[search[key]];
        Indexes.push(index || []);
      }
    }
    //  ? get return the keys if the length is 1
    if (Indexes.length === 1) {
      if (Indexes[0].length === 0) return [];
      return Indexes[0].map((idx) => this.keys[idx]);
    }
    //  ? get return the keys if the length is more than one
    return intersect(Indexes).map((idx) => this.keys[idx]);
  }

  count(search: Record<string, any>) {
    let resultsCount: number = 0;
    for (const key in search) {
      if (!this.indexTable[key]) continue;
      if (this.tree[key]) {
        resultsCount += this.tree[key].map[search[key]].length;
      }
    }
    return resultsCount;
  }
  createIndex(data: Record<string, any>) {
    // ? retrieve msg key index
    let idk = this.keys.indexOf(data._id);
    if (idk === -1) {
      idk = this.keys.push(data._id) - 1;
    }
    // ? save keys in their corresponding nodes
    for (const key in data) {
      if (!this.indexTable[key]) continue;
      if (!this.tree[key]) {
        this.tree[key] = new XNode();
      }
      this.tree[key].create(data[key], idk);
    }
  }
  removeIndex(data: Record<string, any>, drop: boolean) {
    //  ? remove other attributes indexes
    let idk = this.keys.indexOf(data._id);
    if (idk === -1) return;
    for (const key in data) {
      if (!this.tree[key]) continue;
      this.tree[key].drop(data[key], idk);
    }
    if (drop) {
      this.keys.splice(idk, 1);
    }
  }
}
