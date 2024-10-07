import { Exabase } from "../src/index.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

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

const users = await db.query(JSON.stringify({ table: "USER", many: true }));
for (let i = 0; i < users.length; i++) {
  await db.query(JSON.stringify({ table: "USER", delete: users[i]._id }));
}

let ordersCount = await db.query(
  JSON.stringify({ table: "ORDER", count: true })
);

if (ordersCount !== 0) {
  const allorders = await db.query(
    JSON.stringify({ table: "ORDER", many: true })
  );
  for (let u = 0; u < allorders.length; u++) {
    const order = allorders[u];
    await db.query(JSON.stringify({ table: "ORDER", delete: order._id }));
  }
}

const usersCount = await db.query(
  JSON.stringify({ table: "USER", count: true })
);
ordersCount = await db.query(JSON.stringify({ table: "ORDER", count: true }));

assert.strictEqual(usersCount, 0);
assert.strictEqual(ordersCount, 0);
console.log("Done cleaning");

describe("tests to ensure embedded operations", (test) => {
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
  it("large inset", async () => {
    const usersCount = 500;
    for (let i = 0; i < usersCount; i++) {
      const user = { name: "saul" };
      await db.query(JSON.stringify({ table: "USER", insert: user }));
    }
    const usersLength = await db.query(
      JSON.stringify({ table: "USER", count: true })
    );
    assert.strictEqual(usersLength, usersCount);
  });

  // ? large update
  it("large update", async () => {
    const users = await db.query(JSON.stringify({ table: "USER", many: true }));
    assert.strictEqual(users[0].name, "saul");
    for (let i = 0; i < users.length; i++) {
      users[i].name = "paul";
      await db.query(JSON.stringify({ table: "USER", update: users[i] }));
    }
    const updatedUsers = await db.query(
      JSON.stringify({ table: "USER", many: true })
    );
    assert.strictEqual(updatedUsers[0].name, "paul");
  });
  // ? large delete
  it("large delete", async () => {
    const users = await db.query(JSON.stringify({ table: "USER", many: true }));
    let deletedUsersCount = await db.query(
      JSON.stringify({ table: "USER", count: true })
    );
    for (let i = 0; i < users.length; i++) {
      await db.query(JSON.stringify({ table: "USER", delete: users[i]._id }));
    }
    deletedUsersCount = await db.query(
      JSON.stringify({ table: "USER", count: true })
    );
    assert.strictEqual(deletedUsersCount, 0);
  });
  // ? search query
  it("search query", async () => {
    await db.query(
      JSON.stringify({
        table: "USER",
        insert: { name: "john", age: 14 },
      })
    );
    await db.query(
      JSON.stringify({
        table: "USER",
        insert: { name: "john", age: 12 },
      })
    );
    await db.query(
      JSON.stringify({
        table: "USER",
        insert: { name: "john", age: 28 },
      })
    );

    // ? this verifies the two properties were intercepted and the correct results were returned
    const johns = await db.query(
      JSON.stringify({ table: "USER", search: { name: "john", age: 28 } })
    );
    assert.strictEqual(johns.length, 1);
    assert.strictEqual(johns[0].name, "john");
    assert.strictEqual(johns[0].age, 28);
  });
  // ? unique field queries
  it("unique field queries ", async () => {
    const order = await db.query(
      JSON.stringify({ table: "ORDER", insert: { ticket: String(Date.now()) } })
    );
    const uniqueOrder = await db.query(
      JSON.stringify({
        table: "ORDER",
        search: { ticket: order.ticket },
      })
    );
    assert.strictEqual(order._id, uniqueOrder[0]._id);
  });

  // ? basic query (relationships)
  it("basic query (relationships) ", async () => {
    const friend = await db.query(
      JSON.stringify({ table: "USER", insert: { name: "zack's friend " } })
    );
    const user = await db.query(
      JSON.stringify({ table: "USER", insert: { name: "zack", friend } })
    );

    const order = await db.query(
      JSON.stringify({
        table: "ORDER",
        insert: { ticket: String(Date.now()) },
      })
    );
    user.requestedOrders.push(order);
    user.friend = friend;

    await db.query(JSON.stringify({ table: "USER", update: user }));
    const userAgain = await db.query(
      JSON.stringify({ table: "USER", one: user._id, populate: true })
    );
    assert.strictEqual(userAgain.requestedOrders.length, 1);
    assert.strictEqual(userAgain.requestedOrders[0]._id, order._id);
    assert.strictEqual(userAgain.friend._id, friend._id);
    userAgain.requestedOrders = [];
    await db.query(JSON.stringify({ table: "USER", update: userAgain }));
    const userAgain2 = await db.query(
      JSON.stringify({
        table: "USER",
        one: user._id,
        populate: ["requestedOrders"],
      })
    );
    // ? check that the relationship is empty
    assert.strictEqual(userAgain2.requestedOrders.length, 0);
  });
});
