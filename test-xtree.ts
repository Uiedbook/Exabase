import { it, describe, expect } from "bun:test";
import { Utils } from "./dist/primitives/classes";
import { SynFileWritWithWaitList, loadLogSync } from "./dist/primitives/functions";

type Msg = { _id: string, name: string }


class XNode {
    keys: Record<string, string[]> = {};
    constructor(keys?: Record<string, string[]>) {
        this.keys = keys || {};
    }
    insert(value: string, id: string) {
        if (this.keys[value]) {
            this.keys[value].push(id);

        } else {
            this.keys[value] = [(id)];
        }
    }
    disert(oldvalue: string, id: string) {
        if (this.keys[oldvalue]) {
            this.keys[oldvalue] = this.keys[oldvalue].filter(
                (a) => a !== id
            );
        }

    }
    upsert(oldvalue: string, newvalue: string, id: string) {
        this.disert(oldvalue, id);
        this.insert(newvalue, id);
    }

}

export class XTree {
    persistKey: string;
    tree: Record<string, XNode> = {};
    // used for keep searchable keys of data that should be indexed in the db.
    indexTable: Record<string, boolean>;
    constructor(init: {
        persistKey: string;
        indexTable: Record<string, boolean>;
    }) {
        this.persistKey = init.persistKey;
        this.indexTable = init.indexTable;
        // ?
        const tree = XTree.restore(init.persistKey);
        // ?
        if (tree) {
            this.tree = tree;
        }
        // ?
    }
    restart() {
        this.tree = {} as Record<string, XNode>;
    }
    search(search: Msg, take: number = Infinity, skip: number = 0) {
        let idx: string[] = [];
        for (const key in search) {
            if (!this.indexTable[key]) continue;
            if (this.tree[key]) {
                const index = this.tree[key].keys[search[key as "_id"]];
                if (!index) continue;
                idx.push(...index);
                if (skip && idx.length >= skip) {
                    idx.splice(0, skip);
                    skip = 0; //? ok captain
                }
                if (idx.length >= take) break;
            }
        }

        if (idx.length >= take) {
            idx = idx.slice(0, take);
        }
        return idx;
    }

    count(search: Msg) {
        let resultsCount: number = 0;
        for (const key in search) {
            if (!this.indexTable[key]) continue;
            if (this.tree[key]) {
                resultsCount += this.tree[key].keys[search[key as "_id"]].length;
            }
        }
        return resultsCount;
    }

    confirmLength(size: number) {
        let unique = new Set<string>();
        for (const key in this.tree) {
            const keys = this.tree[key].keys;
            for (const key in keys) {
                for (let i = 0; i < keys[key].length; i++) {
                    const element = keys[key][i];
                    unique.add(element);
                }
            }
        }

        return unique.size === size;
    }
    insert(data: Msg) {
        // ? save keys in their corresponding nodes
        if (typeof data === "object" && !Array.isArray(data)) {
            for (const key in data) {
                if (!this.indexTable[key]) continue;
                if (!this.tree[key]) {
                    this.tree[key] = new XNode();
                }
                this.tree[key].insert(data[key as keyof Msg], data._id);
            }
        }
    }
    disert(data: Msg) {
        if (typeof data === "object" && !Array.isArray(data)) {
            for (const key in data) {
                if (!this.indexTable[key]) continue;
                if (!this.tree[key]) continue;
                this.tree[key].disert(data[key as keyof Msg], data["_id"]);
            }
        }
    }
    upsert(olddata: Msg, newdata: Msg) {
        if ((typeof newdata === "object" && typeof olddata === "object")) {
            for (const key in olddata) {
                if (!this.indexTable[key]) continue;
                if (!this.tree[key]) continue;
                this.tree[key].upsert(olddata[key as keyof Msg], newdata[key as keyof Msg], olddata["_id"]);
            }
        }
    }

    persist() {
        const obj: Record<string, any> = {};
        const keys = Object.keys(this.tree);
        for (let index = 0; index < keys.length; index++) {
            obj[keys[index]] = this.tree[keys[index]].keys;
        }
        return SynFileWritWithWaitList.write(
            this.persistKey,
            Utils.packr.encode(obj)
        );
    }
    static restore(persistKey: string) {
        const data = loadLogSync(persistKey);
        const tree: Record<string, any> = {};
        if (data) {
            for (const key in data) {
                tree[key] = new XNode(data[key]);
            }
        }
        return tree;
    }
}


const seg = new XTree({ indexTable: { name: true }, persistKey: "test-xtree" });

const length = seg.confirmLength(0);
expect(length).toBe(true)
// insert
for (let i = 0; i < 5; i++) {
    seg.insert({ _id: "xelncfvb" + i, name: "name1" });
}
// count
const ins1 = seg.count({
    name: "name1",
    _id: ""
});
expect(ins1).toBe(5);
for (let i = 0; i < 5; i++) {
    seg.upsert({ _id: "xelncfvb" + i, name: "name1" }, { _id: "xelncfvb" + i, name: "name2" });
}
for (let i = 0; i < 5; i++) {
    seg.disert({ _id: "xelncfvb" + i, name: "name2" });
}
// console.log(seg.tree);
const f2 = seg.search({ _id: "xelncfvb", name: "name1" })
expect(f2.length).toBe(0);
const f3 = seg.search({ _id: "xelncfvb", name: "name2" })
expect(f3.length).toBe(0);

// count
const ins3 = seg.count();
expect(ins3).toBe(0);