<br/>
<p align="center">
  <a href="https://github.com/uiedbook/Exabase">
     <img src="icon-transparent.webp" alt="Exabase" width="190" height="190">
  </a>

  <h1 align="center">Exabase</h1>

  <p align="center">
    A scaling focused distributed nosql database with surprising performance and strong data consistency.
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

Exabase is a distributed database infrastucture, with an ACID complaint standard, auto scaling, backup and recovery.
and strong data consistency.

Distributed & Performant Database for server-side Javascript Runtimes.

![Contributors](https://img.shields.io/github/contributors/uiedbook/Exabase?color=dark-green)
[![npm Version](https://img.shields.io/npm/v/exabase.svg)](https://www.npmjs.com/package/exabase)
![Forks](https://img.shields.io/github/forks/uiedbook/Exabase?style=social)
![Stargazers](https://img.shields.io/github/stars/uiedbook/Exabase?style=social)

--

# Rationale

Exabase as a scalable nosql database supports these features:

- ACID Compliant transactions.
- Batch transactions, used for performing large writes (INSERT, DELETE, UPDATE) as a single atomic operation.
- Inbuilt distribution interface (Exabase Rings).
- Strong data consistency across all Exabase Rings.
- Security setup out of the box with jsonwebtokens.
- Stand alone and in-app usage through exposed ring endpoints and inbuilt http app.
- Exposes an optional inbuilt highly perfomant http app interface through Rings.
- Easy backup system and recovery.
- A powerful client-side Exabase library (ExabaseStore under dev), with theorical load-balanced distribution across all connected rings.
- Client-side administration interface ( under dev ).
- A strong backup community moved with passion for making the web better.
- Strong type system.
- Granular performance at a tunable level,

Some other unique benefits of Exabase is it's surpricing performance, honestly, we never knew it could happen!

In Exabase, unlike cassadra or other query based DBMS, Exabase is designed as a light and but powerful DBMS, using the an intuitive schema and query API design, a Client-side ExaStore library and offline ExaCore Admin Panel software you can be able to query and manage your app's data as an easy peasy grease.

This benefits are very essential and delighting.

--

# How Exabase works

Exabase achives a high degree of efficiency and strong level scalability by employing the following techniques qualitatively.

- Seperation of concerns mechanism across schema tables. This allows for more efficiency by keeping each schema managers in it own space and process.

- Exabase uses the most efficient storage mechanism which includes message-pack's serialisation and linux based archiving via nodejs processes.

- Exabase integrates an extensive use of Binary search algorithms and custom Binary inset algorimths, allowing for sorted storage and efficient query of data.

- Strong data consistency across all Exabase Rings is achieved using The Dynamo db model, in which is consistency is achived when write operations is confirmed to have persisted to a some number of replicas before repsonding to the client.

- Security is handled using jsonwebtokens allowing each Exabase instance to communicate to the Exabase Rings interface securedly and also allows your apps to communicate with Exabse in same manner.

- Exabase employs log file managers and handles log file resizing to makeup for efficient memory usage, log files are totally resizeable and durable.

- Consistency and Durability in log files and other very important files is achieved through an ACID complaint data processing mechanism which is optimised for crash recovery and consistency checks out of the box.

- Exabase transactions are grounded in a strong atomic and isolated model, using a WAL (write ahead log) mechanism that achives faster write transactions and efficient data consistency across reads to Exabase schema log files, this allows for strong data consistency and durability within the Exabase DBMS infrastructure.

- Exabase employs Ring to Ring hydration to setup and sanitaze new instances of Exabase and allows the new instance to join the shared Exabase Rings interface.

- Exabase achives an efficient search query standard using search field indexing, you decide what fields of a schema gets indexed for search in your column options, doing so allows Exabase to focus on what's neccessary and reduce unneccessary costs in realtime.

- A Linux backup based backup functionality you can call in your app to get a single uploadable zip.
  You can call it periodically as per your needs.

# Requirements to use Exabase.

Some very few Exabase functionality are dependent on the linux os such a backup with uses GNU/Linux zip utils available via node child-processes, for development purples Exabase can fit any os as far the backup functionality is not requested.

Exabase support all server-side Javascriot runtimes:

- Nodejs.
- Denojs.
- Bunjs.
- Edge support for runtimes like cloudflare workers (in view).

### Exabase Memory and storage requirements

There's no hard rule here, if any Javascript runtime can work fine then Exabase can work fine.

Exabase does adjusts it memory based RCT (Exabase Regularity Cache Tank) cache usage to 10% by default which is very okay.

But you can increase to as perferably as 20%, you shouldn't go past 40% if your app is CPU and memory intensive, and the default is best in most cases, however the more RCT space the faster your app Read and write operations will be, i mean lightning speeds, in micro/pico seconds.

# How to get started with Exabase DBMS.

### Installation

Install Exabase Right away on your project using npm or Javascript other package managers.

```
npm i exabase --save
```

## Usage

Exabase is for the cave man, it has carefully designed APIs that allows you to make the most actions against your databse in a very intuitive way.

When improvements and changes rolls out, we will quickly update this page and the currently prepared [web documentation]("https://uiedbook.gitbook.io/exabase/").

We intend to move with less traction and have implemented many of the best decisions and designs we can think-of/research right from the beginning, so your trust is in safe hands.

## The Exabase class API

The `Exabase` class accepts an object argument with the following options:

### Options

| Property               | Required | Type         | Details                                                                                                                                                                                                                                                |
| ---------------------- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| name                   | false    | string       | The folder to persist data into defaults to `Exabase`.                                                                                                                                                                                                 |
| schemas                | false    | SchemaType[] | An array of defined schema instances                                                                                                                                                                                                                   |
| EXABASE_MEMORY_PERCENT | false    | number       | RCT Memory cache percentage                                                                                                                                                                                                                            |
| password               | false    | string       | storage percentage                                                                                                                                                                                                                                     |
| ringbearers            | false    | string[]     | list of urls that points to other nodes in this node's ring                                                                                                                                                                                            |
| mode                   | false    | string       | The mode of this node when joining the shared ring interface default is REPLICATION. REPLICATION: will be a replica instance. EXTENSION: will be an extension of a ring bearer data with a defined extension level. auto hydration from a ring bearer. |
| extension_level        | false    | number       | The level of extension this node is set to handle default:                                                                                                                                                                                             |

## Transaction Class Methods

<details><summary>.find</summary>

```ts
  find(
    field: { uniqueField?: Record<string, any> } | string,
    options?: {
      populate?: string[] | boolean;
      take?: number;
      skip?: number;
    }
  ): Promise<unknown>;
```

used to select one or many and able to populate them.

```js
await trx.find();
```

</details>

<details><summary>.save</summary>

```ts
    save(data: Record<string, any>): Promise<unknown>;
```

can be use to create a new record and update an existing record when it has an_id field.

```js
await trx.save({ name: "cave man" });
```

</details>

<details><summary>.delete</summary>

```ts
   delete(DeleteOptions: {
        _id: string;
    }): Promise<unknown>;
```

Used to remove a record

```js
await trx.delete(12);
```

</details>

<details><summary>.count</summary>

```ts
    count(): Promise<unknown>;
```

return the size of the table

```ts
await trx.count();
```

</details>

<details><summary>batching queries</summary>

### batching write queies

```js

 trx.batch([...queries], <type>)

```

type = insert | update | delete

example

```js
await trx.batch(
  [
    {
      FirstName: "George",
      LastName: "Dods I",
    },
    {
      FirstName: "woods",
      LastName: "Dods II",
    },
    {
      FirstName: "Annie",
      LastName: "Dods III",
    },
  ],
  "INSERT"
);
await trx.exec();
```

</details>

<details><summary>.Flush</summary>

```ts
Flush: Promise<void>;
```

clears the write-ahead-log files

```ts
await trx.Flush;
```

</details>

<details><summary>.addRelation</summary>

```ts
 addRelation(options: {
        _id: string;
        foreign_id: string;
        relationship: string;
    }): Promise<unknown>;
```

Checks to see if a single key exists.

```ts
await trx.addRelation();
```

</details>

<details><summary>.removeRelation</summary>

```ts
 removeRelation(options: {
        _id: string;
        foreign_id: string;
        relationship: string;
    }): Promise<unknown>;
```

Checks to see if a single key exists.

```ts
await trx.removeRelation();
```

</details>

## A Basic Database setup and queries.

```js
test("example setup, schema setup, inset and find, search, update, and delete operations", async () => {
  const Order = new Schema({
    tableName: "order",
    columns: {
      ticket: { type: String, unique: true },
    },
  });
  const db = new Exabase({ schemas: [Order] });
  // ? get Exabase ready
  await db.Ready;
  const OrderTRX = db.getTransaction(Order);

  // ? operations
  const create_order = await OrderTRX.save({ ticket: Date.now().toString() });

  const find_order = await OrderTRX.find(create_order._id);

  assert.strict(create_order._id, find_order._id);

  const update_order = await OrderTRX.save({
    ...create_order,
    ticket: Date.now().toString(),
  });

  const search_order = await OrderTRX.find(update_order);

  assert.strict(update_order._id, search_order._id);

  const delete_order = await OrderTRX.delete(create_order);

  const find_deleted_order = await OrderTRX.find(create_order._id);

  assert.strict(find_deleted_order, undefined);
});
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

# Exabase peripherals

### ExaCore

ExaCore ( under dev ) is an administractive Panel that connects to, monitors and executes operations on your Exabase Rings interface. [Get ExaCore]("/")

### ExabaseStore

A client-side ( under dev ) library for communication with your Exabase rings interface, does a high level theoritical load-balancing out of the box. [Learn more about ExaStore]("/")

### JetPath

A javascript-based http router ( completed ) extracted from Exabase rings, extracted for use in stand alone apps.

People love the innovation we achieved when we customised how routes should conform to function names, this router also uses the Cradova route matcher logic to get routes faster without using any regex. this is as fast as it could get. [Learn more about JetPath]("https://github.com/uiedbook/jetpath").

It's super interesting what has been achieved so far.

## MIT Lincenced

Opensourced And Free.

Uiedbook is an open source team of web focused engineers, their vision is to make the web better, improving and innovating infrastructures for a better web experi3ence.

You can Join the [Uiedbook group]("https://t.me/UiedbookHQ") on telegram.
Ask your questions and become a team-member/contributor by becoming an insider.

### Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code to be distributed under the MIT license. You are also implicitly verifying that all code is your original work.

## Supporting Exabase development

Your Support is a good force for change anytime you do it, you can ensure Exabase growth and improvement by making a re-occuring or fixed sponsorship to my [github sponsors](https://github.com/sponsors/FridayCandour): or crypto using etheruen: `0xD7DDD4312A4e514751A582AF725238C7E6dF206c`, Bitcoin: `bc1q5548kdanwyd3y07nyjjzt5zkdxqec4nqqrd760` or LTC: `ltc1qgqn6nqq6x555rpj3pw847402aw6kw7a25dc29w`.
