import { Exabase } from "../src/index.ts";

const db = new Exabase({ endpoint: "", secretAccessKey: "" });

await db.query({
  table: "USER",
  execute: { createTable: true },
});

await db.query({
  table: "MOM",
  execute: {
    createTable: true,
  },
});

await db.query({
  table: "CHILD",
  execute: {
    createTable: true,
  },
});

for (let i = 0; i < 10; i++) {
  const mom = await db.query({
    table: "MOM",
    insert: { age: i + 40, name: "mom name" },
  });
  const user = await db.query({
    table: "USER",
    insert: {
      age: i + 20,
      name: "user name",
      mom: mom,
    },
  });
  const kid = await db.query({
    table: "CHILD",
    insert: {
      age: 5,
      name: "kid name",
    },
  });

  await db.query({
    table: "USER",
    update: {
      ...user,
      kids: [kid],
    },
  });
}

const ser = await db.query({
  table: "USER",
  get: { name: "user name", age: 20 },
  sort: { age: "ASC" },
});

// console.log({ all: ser }, ser.length);
// console.log({ first: ser[0], last: ser.at(-1) }, ser.length);
