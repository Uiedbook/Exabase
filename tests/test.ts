import { Exabase } from "../dist/index.js";

const db = new Exabase();

await db.query(
  JSON.stringify({
    table: "USER",
    induce: {
      age: { type: "number", required: true, index: true },
      name: { type: "string", index: true },
      mom: {
        relationType: "ONE",
        type: "string",
        target: "MOM",
        required: true,
      },
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
    table: "MOM",
    induce: {
      age: { type: "number", required: true, index: true },
      name: { type: "string", index: true, required: true },
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

for (let i = 0; i < 10; i++) {
  const mom = await db.query(
    JSON.stringify({
      table: "MOM",
      insert: { age: i + 40, name: "mom name" },
    })
  );
  const user = await db.query(
    JSON.stringify({
      table: "USER",
      insert: {
        age: i + 20,
        name: "user name",
        mom: mom,
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
      update: {
        ...user,
        // kids: [kid],
      },
    })
  );
}
console.time();

const ser = await db.query(
  JSON.stringify({
    table: "USER",
    many: true,
    populate: true,
    sort: { age: "ASC" },
  })
);

// console.log({ all: ser }, ser.length);
console.log({ first: ser[0], last: ser.at(-1) }, ser.length);
console.timeEnd();
