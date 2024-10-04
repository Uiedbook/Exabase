import { Exabase } from "../src/index.ts";
import assert from "node:assert/strict";
import { it, after } from "node:test";

// ? setup db
const db = new Exabase();
await db.query(
  JSON.stringify({
    table: "ORDER",
    induce: {
      ticket: { type: String, unique: true, index: true },
    },
  })
);

await db.query(
  JSON.stringify({
    table: "USER",
    induce: {
      name: { type: String, index: true },
      age: { type: Number, index: true, default: 67 },
      requestedOrders: {
        target: "ORDER",
        relationType: "MANY",
      },
      friend: {
        target: "USER",
        relationType: "ONE",
      },
    },
  })
);

let usersCount = await db.query(JSON.stringify({ table: "USER", count: true }));

let ordersCount = await db.query(
  JSON.stringify({ table: "ORDER", count: true })
);

if (usersCount !== 0) {
  const allusers = await db.query(
    JSON.stringify({ table: "USER", many: true })
  );
  for (let u = 0; u < allusers.length; u++) {
    const user = allusers[u];
    await db.query(JSON.stringify({ table: "USER", delete: user._id }));
  }
}
if (ordersCount !== 0) {
  const allorders = await db.query(
    JSON.stringify({ table: "ORDER", many: true })
  );
  for (let u = 0; u < allorders.length; u++) {
    const order = allorders[u];
    await db.query(JSON.stringify({ table: "ORDER", delete: order._id }));
  }
}

usersCount = await db.query(JSON.stringify({ table: "USER", count: true }));
ordersCount = await db.query(JSON.stringify({ table: "ORDER", count: true }));

assert.strictEqual(usersCount, 0);
assert.strictEqual(ordersCount, 0);
console.log("Done cleaning");

//? tests
it("basic CRUD", async () => {
  const user = await db.query(
    JSON.stringify({
      table: "USER",
      insert: { name: "james bond" },
    })
  );

  const user2 = await db.query(
    JSON.stringify({ table: "USER", one: user._id })
  );
  assert.strictEqual(user.name, "james bond");
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
  const user5 = await db.query(
    JSON.stringify({ table: "USER", one: user._id })
  );

  assert.strictEqual(user._id, user2._id);
  assert.strictEqual(user._id, user3._id);
  assert.strictEqual(user._id, user4._id);
  assert.strictEqual(user4.name, "gregs pola");
  assert.strictEqual(user5, undefined);
});

// ? large inset
// it("large inset", async () => {
//   const usersCount = 500;
//   for (let i = 0; i < usersCount; i++) {
//     const user = { name: "saul" };
//     await db.query(JSON.stringify({ table: "USER", insert: user }));
//   }
//   const usersLength = await db.query(
//     JSON.stringify({ table: "USER", count: true })
//   );
//   assert.strictEqual(usersLength, usersCount);
// });

// ? large update
// it("large update", async () => {
//   const users = await db.query(JSON.stringify({ table: "USER", many: true }));
//   assert.strictEqual(users[0].name, "saul");
//   for (let i = 0; i < users.length; i++) {
//     users[i].name = "paul";
//     await db.query(JSON.stringify({ table: "USER", update: users[i] }));
//   }
//   const updatedUsers = await db.query(
//     JSON.stringify({ table: "USER", many: true })
//   );
//   assert.strictEqual(updatedUsers[0].name, "paul");
// });
// ? search query
// it("search query", async () => {
//   await db.query(
//     JSON.stringify({
//       table: "USER",
//       insert: { name: "john", age: 14 },
//     })
//   );
//   await db.query(
//     JSON.stringify({
//       table: "USER",
//       insert: { name: "john", age: 12 },
//     })
//   );
//   await db.query(
//     JSON.stringify({
//       table: "USER",
//       insert: { name: "john", age: 28 },
//     })
//   );

//   // ? this verifies the two properties were intercepted and the currect results were reurned
//   const johns = await db.query(
//     JSON.stringify({ table: "USER", search: { name: "john", age: 28 } })
//   );
//   assert.strictEqual(johns.length, 1);
//   assert.strictEqual(johns[0].name, "john");
//   assert.strictEqual(johns[0].age, 28);
// });
// ? basic query (relationships)
// it("basic query (relationships) ", async () => {
//   const friend = await db.query(
//     JSON.stringify({ table: "USER", insert: { name: "zack's friend " } })
//   );
//   const user = await db.query(
//     JSON.stringify({ table: "USER", insert: { name: "zack", friend } })
//   );

//   const order = await db.query(
//     JSON.stringify({
//       table: "ORDER",
//       insert: { ticket: String(Date.now()) },
//     })
//   );
//   user.requestedOrders.push(order);
//   user.friend = friend;

//   const a = await db.query(
//     JSON.stringify({
//       table: "USER",
//       one: friend._id,
//     })
//   );
//   const b = await db.query(
//     JSON.stringify({
//       table: "USER",
//       one: user._id,
//     })
//   );
//   console.log({ a, b, friend, user });

//   await db.query(JSON.stringify({ table: "USER", update: user }));
//   const userAgain = await db.query(
//     JSON.stringify({ table: "USER", one: user._id, populate: true })
//   );
//   assert.strictEqual(userAgain.requestedOrders.length, 1);
//   assert.strictEqual(userAgain.requestedOrders[0]._id, order._id);
//   console.log({ ors: userAgain.requestedOrders, userAgain });
//   assert.strictEqual(userAgain.friend._id, friend._id);
//   userAgain.requestedOrders = [];
//   await db.query(JSON.stringify({ table: "USER", update: userAgain }));
//   const userAgain2 = await db.query(
//     JSON.stringify({
//       table: "USER",
//       one: user._id,
//       populate: ["requestedOrders"],
//     })
//   );
//   // ? check that the relationship is empty
//   assert.strictEqual(userAgain2.requestedOrders.length, 0);
// });
// ? unique field queries
// it("unique field queries ", async () => {
//   const order = await db.query(
//     JSON.stringify({ table: "ORDER", insert: { ticket: String(Date.now()) } })
//   );
//   const uniqueOrder = await db.query(
//     JSON.stringify({
//       table: "ORDER",
//       unique: { ticket: order.ticket },
//     })
//   );
//   assert.strictEqual(order._id, uniqueOrder._id);
// });
