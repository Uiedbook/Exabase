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
    <a href="https://github.com/uiedbook/Exabase#examples"><strong>Explore Everst APIs »</strong></a>
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

Exabase is designed as a simple, light and but powerful database, using the an intuitive schema and query API design you can build with ease.

--

# How Exabase works

Exabase achieves a high degree of efficiency and strong level scalability by employing the following techniques qualitatively.

- Seperation of concerns mechanism across schema tables. This allows for more efficiency by keeping each schema managers in it own space and process.

- Exabase uses the most efficient storage mechanism which includes message-pack's serialisation and linux based archiving via nodejs processes.

- Exabase integrates an extensive use of Binary search algorithms and custom Binary inset algorimths, allowing for sorted storage and efficient query of data.

- Exabase employs log file managers and handles log file resizing to makeup for efficient memory usage, log files are totally resizeable and durable.

- Consistency and Durability in log files and other very important files is achieved through an ACID complaint data processing mechanism which is optimised for crash recovery and consistency checks out of the box.

- Exabase transactions are grounded in a strong atomic and isolated model, using a transaction mechanism that achieves faster write querys and efficient data consistency across reads to Exabase log files, this allows for strong data consistency and durability.

- Exabase achieves an efficient search query standard using search field indexing.

- A Linux backup based backup functionality you can call in your app to get a single uploadable zip.
  You can call it periodically as per your needs, and you can recover using them later.

# Requirements to use Exabase.

Exabase support all server-side Javascript runtimes:

- Nodejs.
- Denojs.
- Bunjs.
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
   * RCT Memory cache percentage  */
  EXABASE_MEMORY_PERCENT?: number,
  /**
   * Exabase database
   * ---
   * name  */
  name?: string,
  /**
   * a url that points to another node this node can hydrate from if out of date  */
  bearer?: string,
  /**
   * type of ring
   */
  mode?: "REPLICATION" | "EXTENSION",
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
  /**
   * Exabase database
   * ---
   * Exabase signing keys
   */
  EXABASE_KEYS?: { privateKey: string, publicKey: string },
};
```

## ExaSchema.Query Methods

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
    /**
     * Exabase query
     * batch write operations untill executed.
     * @param data
     * @param type
     */
    batch(data: Partial<Model>[], type: "INSERT" | "UPDATE" | "DELETE"): Promise<void>;
    private _prepare_for;
    /**
     * Exabase query
     * execute a batch operation on the database
     */
    exec(): Promise<Model[]> | Promise<Model & {
        _id: string;
    }[]>;
  /**
     * Exabase query
     * add a callback for this table, to get data as they are commit
     */
    onCommit(cb: (commit: Promise<ExaDoc<Model>> | Promise<ExaDoc<Model[]>>) => void): void;
```

## A Basic Database setup and queries.

```ts
test("example setup", async () => {

  const Order = new ExaSchema<{ ticket: string }>({
    tableName: "order",
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

  expect(create_order._id).toBe(find_order_by_unique_field._id);

  expect(create_order._id).toBe(search_order[0]._id);

  await OrderTRX.delete(create_order._id);

  const find_deleted_order = await OrderTRX.findOne(create_order._id);

  expect(find_deleted_order).toBe(undefined);

```

# Benchmarks

This benchmark is Exabase againt sqlite.

Sqlite is as we know it, has a tiny footprint and off course really great performance with pure acidity and a relational design.

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

SELECT _ FROM "Employee" Exabase 2.42 µs/iter (1.91 µs … 7.08 ms) 2.18 µs 5.07 µs 6.4 µs
SELECT _ FROM "Employee" sqlite 270.73 µs/iter (187.72 µs … 3.24 ms) 267.24 µs 1.19 ms 1.48 ms

112X faster

# Does the RCT cache however destroy performance? no.

Data in Exabase - 10072
Data in sqlite - 9

cpu: Intel(R) Celeron(R) CPU 4205U @ 1.80GHz
runtime: bun 1.0.0 (x64-linux)

benchmark time (avg) (min … max) p75 p99 p995

---

SELECT _ FROM "Employee" Exabase 6.57 µs/iter (4.65 µs … 13.42 ms) 5.48 µs 16.96 µs 25.02 µs
SELECT _ FROM "Employee" sqlite 324.54 µs/iter (189.04 µs … 52.11 ms) 271.36 µs 1.59 ms 2.03 ms
```

### Regularity Cache Tank

The Regularity Cache Tank or RCT is a basic LOG file level cache.
this means it stores the entire LOG(n) file of the table in memory, where n is the last active LOG file.

This might not be okay for resource heavy workloads. hence it can be turned off per schema.

## MIT Lincenced

Opensourced And Free.

Join Us on [telegram]("https://t.me/UiedbookHQ").

### Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code to be distributed under the MIT license. You are also implicitly verifying that all code is your original work.
