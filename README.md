<br/>
<p align="center">
  <a href="https://github.com/uiedbook/Exabase">
     <img src="https://raw.githubusercontent.com/Uiedbook/Exabase/refs/heads/main/icon-transparent.webp" alt="Exabase" width="190" height="190">
  </a>

<h1 align="center">Exabase</h1>

<p align="center">
    High Performant and Bottomless database
    <br/>
    <br/>
    <a href="https://github.com/uiedbook/Exabase#examples"><strong>Explore APIs »</strong></a>
    <br/>
    <br/>
    <a href="https://t.me/Exabase">Join Community</a>
  </p>
</p>

### Learn how ⬇️

#### ➡️ [Bottomless]() 𐄁 [Strong consistency and consensus]() 𐄁 [High performance]() 𐄁 [Ease of use]() ⬅️

![Contributors](https://img.shields.io/github/contributors/uiedbook/Exabase?color=dark-green)
[![npm Version](https://img.shields.io/npm/v/exabase.svg)](https://www.npmjs.com/package/exabase)
![Forks](https://img.shields.io/github/forks/uiedbook/Exabase?style=social)
![Stargazers](https://img.shields.io/github/stars/uiedbook/Exabase?style=social)

Exabase provides support for these features:

- High performance
- Bottomless storage.
- Consistency and Consensus.
- Scalability.
- Open source

Exabase is lightweight embedded and powerful distributed database.

--

# How Exabase works

Exabase achieves a high degree of efficiency by employing the following
techniques.

- Separation of concerns mechanism across tables. This allows for more
  efficiency by keeping each table manager in it own space.
- Exabase make an extensive use efficient algorithms for storage and query of data.
- Consistency and Durability in log files and other very important files is
  achieved through an ACID complaint data processing mechanism which is
  optimized for crash recovery and consistency checks out of the box.
- Exabase achieves a high search query efficiency using a custom search indexing
  mechanism called Xtree, written from the ground up and great at categorical search indexing needs.

# Current support runtimes.

Exabase support server-side Javascript runtime like:

- Nodejs.
- Bunjs.
- Denojs.

# How to get started with Exabase database.

### Installation

Install Exabase right on your project using npm.

```
npm i exabase --save
```

## Using Exabase

The `Exabase` class accepts an object argument with the following options:

### Options

```js
export type ExabaseOptions = {
  /**
   * Exabase database
   * ---
   * name  */
  name?: string,
  /**
   * Exabase database
   * ---
   * Memory log cache capacity in percentage  */
  EXABASE_MEMORY_PERCENT?: number,
};
```

## Exabase JSON Query format | <Depreciated>

Exabase is queried with json. in the format

```json
{
  "table": "<table name>",
  "<query key>": "<query info>"
}
```

## ExaSchema Query Properties | <Depreciated>

```ts
 {
  table: string;
  one?: string;
  sort?: {
    [x in keyof Partial<Model>]: "ASC" | "DESC";
  };
  many?: true;
  search?: Partial<Model>;
  insert?: Record<string, any>;
  update?: Partial<Model>;
  delete?: string;
  populate?: Record<string, any>;
  skip?: number;
  take?: number;
  count?: Record<string, any> | boolean;
};
```

## Example syntax | <Depreciated>

```ts
const user = await db.query(
  JSON.stringify({
    table: "USER",
    insert: { name: "james bond" },
  })
);

const user2 = await db.query(JSON.stringify({ table: "USER", one: user._id }));
expect(user.name).toBe("james bond");
const user3 = (
  await db.query(
    JSON.stringify({
      table: "USER",
      search: { name: user.name },
    })
  )
)[0];
const user4 = await db.query(
  JSON.stringify({
    table: "USER",
    update: { ...user, name: "gregs pola", age: 47 },
  })
);
await db.query(JSON.stringify({ table: "USER", delete: user._id }));
const user5 = await db.query(JSON.stringify({ table: "USER", one: user._id }));

expect(user._id).toBe(user2._id);
expect(user._id).toBe(user3._id);
expect(user._id).toBe(user4._id);
expect(user4.name).toBe("greg pola");
expect(user5).toBe(undefined);
```

## A Basic Database setup and queries. | <Depreciated>

```ts
import { Exabase } from "../dist/index.js";

const db = new Exabase();

await db.query(
  JSON.stringify({
    table: "USER",
    induce: {
      age: { type: "number", required: true, index: true },
      name: { type: "string", index: true },
      kids: {
        relationType: "MANY",
        type: "string",
        target: "CHILD",
      },
    },
  })
);

await db.query(
  JSON.stringify({
    table: "CHILD",
    induce: {
      age: { type: "number", required: true, index: true },
      name: { type: "string", index: true },
    },
  })
);

const user = await db.query(
  JSON.stringify({
    table: "USER",
    insert: {
      age: i + 20,
      name: "user name",
    },
  })
);
const kid = await db.query(
  JSON.stringify({
    table: "CHILD",
    insert: {
      age: 5,
      name: "kid name",
    },
  })
);
user.kids.push(kid);

await db.query(
  JSON.stringify({
    table: "USER",
    update: user,
  })
);
```

# Benchmarks | <Old>

This benchmark is Exabase against sqlite.

Sqlite has a tiny footprint and off course really great performance with pure
acidity and relational.

```md
cpu: Intel(R) Celeron(R) CPU 4205U @ 1.80GHz runtime: bun 1.0.0 (x64-linux)

benchmark time (avg) (min … max) p75 p99 p995

---

SELECT _ FROM "Employee" Exabase 1.39 µs/iter (1.23 µs … 3.77 µs) 1.35 µs 3.77
µs 3.77 µs SELECT _ FROM "Employee" sqlite 270.73 µs/iter (187.72 µs … 3.24 ms)
267.24 µs 1.19 ms 1.48 ms 150X faster
```

### Log caching

Log caching is a basic LOG file level cache. this means, it
stores the entire LOG(n) file of the table in memory, where n is the last active
LOG file.

## Apache 2.0 Licensed

Open source.

[telegram group]("https://t.me/UiedbookHQ").

### Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code to
be distributed under the Apache License. You are also implicitly verifying that
all code is your original work.
