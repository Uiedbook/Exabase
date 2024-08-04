<br/>
<p align="center">
  <a href="https://github.com/uiedbook/Exabase">
     <img src="icon-transparent.webp" alt="Exabase" width="190" height="190">
  </a>

  <h1 align="center">Exabase</h1>

  <p align="center">
    A high performance nosql database
    <br/>
    <br/>
    <a href="https://github.com/uiedbook/Exabase#examples"><strong>Explore APIs »</strong></a>
    <br/>
    <br/>
    <a href="https://t.me/Exabase">Join Community</a>
    .
    <a href="https://github.com/uiedbook/Exabase/issues">Report Bug</a>
    .
    <a href="https://github.com/uiedbook/Exabase/issues">Request Feature</a>
  </p>
</p>

Exabase is A high performance nosql database, with an ACID complaint standard, easy to scale, backup and recovery.
and strong data consistency.

![Contributors](https://img.shields.io/github/contributors/uiedbook/Exabase?color=dark-green)
[![npm Version](https://img.shields.io/npm/v/exabase.svg)](https://www.npmjs.com/package/exabase)
![Forks](https://img.shields.io/github/forks/uiedbook/Exabase?style=social)
![Stargazers](https://img.shields.io/github/stars/uiedbook/Exabase?style=social)

--

# Rationale

Exabase provides support for these features:

- ACID Compliant transactions.
- Batch transactions, used for performing large writes (INSERT, DELETE, UPDATE) as a single atomic operation.
- JSON based query language.
- Efficient data formart and backup system
- Easy backup system and recovery.
- Strong type system.
- Granular performance at a tunable scale.
- Growing ecosystem with Extra projects like: Exaviewer, Exaserver, Exaclient and more

Exabase is designed as a simple, light and but powerful database, using the an intuitive schema and query API design and also a simple json query format.

--

# How Exabase works

Exabase achieves a high degree of efficiency by employing the following techniques.

- Seperation of concerns mechanism across schema tables. This allows for more efficiency by keeping each schema managers in it own space.

- Exabase uses the most efficient storage mechanism which includes message-pack's serialisation and linux based archiving.

- Exabase bounces on an extensive use of Binary search algorithms and custom Binary inset algorimths, allowing for sorted storage and efficient query of data.

- Exabase employs log file managers and handles log file resizing to makeup for efficient memory usage, log files are totally resizeable and durable.

- Consistency and Durability in log files and other very important files is achieved through an ACID complaint data processing mechanism which is optimised for crash recovery and consistency checks out of the box.

- Exabase transactions are grounded in a strong atomic and isolated model, using a transaction mechanism that achieves faster write queries and efficient data consistency across reads to Exabase log files, this allows for strong data consistency and durability.

- Exabase achieves a high search query efficiency using a search indexing mechanism called Xtree, invented from the ground up.

- Exabase excels at sorting data very fast using a combination of bucket & mergesort algorimths.

- A Linux backup based backup functionality you can call in your app to get a single uploadable zip.
  You can call it periodically as per your needs, and you can recover using them later.

- easy and simple JSON query format.

# Requirements to use Exabase.

Exabase support all server-side Javascript runtimes:

- Nodejs.
- Bunjs.
- Denojs.
- Edge support for runtimes like cloudflare workers (in view).

### Exabase Memory and storage requirements

There's no hard rule here, if any Javascript runtime can work fine then Exabase can work fine.

Exabase does adjusts it memory based RCT (Exabase Regularity Cache Tank) cache usage to 10% by default which is very okay.

But you can increase to as perferably as 20%, you shouldn't go past 40% if your app is CPU and memory intensive, and the default is best in most cases, however the more RCT space the faster your app Read and write operations will be, we mean lightning speeds, in micro/pico seconds.

# How to get started with Exabase database.

### Installation

Install Exabase Right away on your project using npm or Javascript other package managers.

```
npm i exabase --save
```

## Usage

Exabase is for the cave man, it has carefully designed APIs that allows you to make the most actions against your databse in a very easy way.

When improvements and changes rolls out, we will quickly update this page and the currently prepared [web documentation]("https://uiedbook.gitbook.io/exabase/").

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
   * RCT Memory cache percentage  */
  EXABASE_MEMORY_PERCENT?: number,
  /**
   * Exabase database
   * ---
   * Data schemas
   */
  schemas: ExaSchema<any>[],
  /**
   * Exabase database
   * ---
   * log each query?
   */
  logging?: boolean,
};
```

## Exabase Query formart

Exabase is queried with json. in the formart

````json
{
  "table": "<table name>",
  "query": {....},
}```

Examples:

```ts
import { Exabase, ExaSchema } from "exabase";

const users = new ExaSchema<{ age: number; name: string }>({
  tableName: "USER",
  columns: {
    age: { type: Number },
    name: { type: String },
  },
});

const db = new Exabase({ schemas: [users] });
// ? get Exabase ready
await db.connect();
const query = JSON.stringify({
  table: "USER",
  query: { insert: { age: 1, name: "friday" } },
});
const data = await db.query(query);
console.log({ data, query });
```


## ExaSchema Query Methods

```ts
    /**
     * Exabase query
     * find items on the database,
     * field can be _id string or unique props object
     * @param field
     * @param options
     * @returns void
     */
    findMany(field?: Partial<Model> | string, options?: {
        populate?: string[] | boolean;
        take?: number;
        skip?: number;
    }): Promise<(Model & {
        _id: string;
    })[]>;
    /**
     * Exabase query
     * find items on the database,
     * field can be _id string or unique props object
     * @param field
     * @param options
     * @returns void
     */
    findOne(field: Partial<Model> | string, options?: {
        populate?: string[] | boolean;
    }): Promise<Model & {
        _id: string;
    }>;
    /**
     * Exabase query
     * search items on the database,
     * @param searchQuery
     * @param options
     * @returns void
     */
    search(searchQuery: Partial<Model>, options?: {
        populate?: string[] | boolean;
        take?: number;
        skip?: number;
    }): Promise<(Model & {
        _id: string;
    })[]>;
    /**
     * Exabase query
     * insert or update items on the database,
     * @param data
     * @returns void
     */
    save(data: Partial<Model>): Promise<Model & {
        _id: string;
    }>;
    /**
     * Exabase query
     * delete items on the database,
     * @param _id
     * @returns void
     */
    delete(_id: string): Promise<Model>;
    /**
     * Exabase query
     * count items on the database
     * @returns void
     */
    count(pops?: Partial<Model>): Promise<number>;
    /**
     * Exabase query
     * connect relationship in the table on the database
     * @param options
     * @returns void
     */
    addRelation(options: {
        _id: string;
        foreign_id: string;
        relationship: string;
    }): Promise<unknown>;
    /**
     * Exabase query
     * disconnect relationship in the table on the database
     * @param options
     * @returns void
     */
    removeRelation(options: {
        _id: string;
        foreign_id: string;
        relationship: string;
    }): Promise<unknown>;
````

## A Basic Database setup and queries.

```ts
const Order = new ExaSchema<{ ticket: string }>({
  tableName: "ORDER",
  columns: {
    ticket: { type: String, unique: true },
  },
});
const db = new Exabase({ schemas: [Order] });
// ? get Exabase ready
await db.connect();
const OrderTRX = Order.query;
// ? operations
const create_order = await OrderTRX.save({ ticket: Date.now().toString() });
const find_order = await OrderTRX.findOne(create_order._id);
expect(create_order._id).toBe(find_order._id);
const update_order = await OrderTRX.save({
  ...create_order,
  ticket: Date.now().toString(),
});
const find_order_by_unique_field = await OrderTRX.findOne({
  ticket: update_order.ticket,
});
const search_order = await OrderTRX.search({
  ticket: update_order.ticket,
});
console.log({
  search_order,
  create_order,
  update_order,
  find_order_by_unique_field,
});
expect(create_order._id).toBe(find_order_by_unique_field._id);
expect(create_order._id).toBe(search_order[0]?._id);
const delete_order = await OrderTRX.delete(create_order._id);
const find_deleted_order = await OrderTRX.findOne(create_order._id);
expect(find_deleted_order).toBe(undefined);
```

# Benchmarks

This benchmark is Exabase againt sqlite.

Sqlite has a tiny footprint and off course really great performance with pure acidity and relational.

We are trilled Exabase performs really well and exceedily beats sqlite.

And with this confidence we have and encourage everyone to try Exabase for themselves.

```md
# without the Exabase RCT cache

cpu: Intel(R) Celeron(R) CPU 4205U @ 1.80GHz
runtime: bun 1.0.0 (x64-linux)

benchmark time (avg) (min … max) p75 p99 p995

---

SELECT _ FROM "Employee" Exabase 155.28 µs/iter (110.63 µs … 5.41 ms) 148.79 µs 645.66 µs 1.25 ms
SELECT _ FROM "Employee" sqlite 259.3 µs/iter (190.6 µs … 3 ms) 265.46 µs 1.09 ms 1.18 ms

1.7x faster

# with the Exabase RCT cache

cpu: Intel(R) Celeron(R) CPU 4205U @ 1.80GHz
runtime: bun 1.0.0 (x64-linux)

benchmark time (avg) (min … max) p75 p99 p995

---

SELECT _ FROM "Employee" Exabase 1.39 µs/iter (1.23 µs … 3.77 µs) 1.35 µs 3.77 µs 3.77 µs
SELECT _ FROM "Employee" sqlite 270.73 µs/iter (187.72 µs … 3.24 ms) 267.24 µs 1.19 ms 1.48 ms
150X faster

# Zero cach mode (RCT: false)

SELECT \* FROM "Employee" Exabase 169.03 µs/iter (108.97 µs … 4.38 ms) 156.34 µs 1.16 ms 1.34 ms
```

### Regularity Cache Tank

The Regularity Cache Tank or RCT is a basic LOG file level cache.
this means, it stores the entire LOG(n) file of the table in memory, where n is the last active LOG file.

This might not be okay for resource heavy workloads. hence it can be turned off per schema.

## Apache 2.0 Lincenced

Opensourced And Free.

Join Us on [telegram]("https://t.me/UiedbookHQ").

### Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code to be distributed under the MIT license. You are also implicitly verifying that all code is your original work.
