import { Exabase } from "../src/index.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

// ? setup db
const db = new Exabase({
  endpoint: "",
  secretAccessKey: "",
});
await db.query({
  table: "ORDER",
  execute: {
    createTable: true,
  },
});

await db.query({
  table: "USER",
  execute: {
    createTable: true,
  },
});

const users = await db.query({ table: "USER", get: { "*": true } });
for (let i = 0; i < users.length; i++) {
  await db.query({ table: "USER", delete: users[i]._id });
}

const orders = await db.query({ table: "ORDER", get: { "*": true } });
for (let u = 0; u < orders.length; u++) {
  await db.query({ table: "ORDER", delete: orders[u]._id });
}

const usersCount = await db.query('{"table":"USER","count":true}');
const ordersCount = await db.query('{"table":"ORDER","count":true}');

assert.strictEqual(usersCount, 0);
assert.strictEqual(ordersCount, 0);
console.log("Done cleaning");

describe("tests to ensure embedded operations", (test) => {
  //? tests
  it("BASIC CRUD", async () => {
    const user = await db.query({
      table: "USER",
      insert: { name: "james bond" },
    });
    const user2 = await db.query({ table: "USER", get: { _id: user._id } });

    assert.strictEqual(user.name, "james bond");
    const user3 = await db.query({
      table: "USER",
      get: { name: user.name },
    });

    const user4 = await db.query({
      table: "USER",
      update: { ...user, name: "Greg paul", age: 47 },
    });
    await db.query({ table: "USER", delete: user._id });
    const user5 = await db.query({ table: "USER", get: { _id: user._id } });

    assert.strictEqual(user._id, user2._id);
    assert.strictEqual(user._id, user3[0]._id);
    assert.strictEqual(user._id, user4._id);
    assert.strictEqual(user4.name, "Greg paul");
    assert.strictEqual(user5, undefined);
  });

  // ? large inset
  it("LARGE inset", async () => {
    const usersCount = 50;
    for (let i = 0; i < usersCount; i++) {
      const user = { name: "saul" };
      await db.query({ table: "USER", insert: user });
    }
    const usersLength = await db.query({ table: "USER", count: true });
    assert.strictEqual(usersLength, usersCount);
  });

  // ? large update
  it("LARGE update", async () => {
    const users = await db.query({ table: "USER", get: { "*": true } });
    assert.strictEqual(users[0].name, "saul");
    for (let i = 0; i < users.length; i++) {
      users[i].name = "paul";
      await db.query({ table: "USER", update: users[i] });
    }
    const updatedUsers = await db.query({
      table: "USER",
      get: { "*": true },
    });
    assert.strictEqual(updatedUsers[0].name, "paul");
  });
  // ? large delete
  it("LARGE delete", async () => {
    const users = await db.query({
      table: "USER",
      get: { "*": true },
      take: 1100,
    });
    let deletedUsersCount = await db.query({ table: "USER", count: true });
    for (let i = 0; i < users.length; i++) {
      await db.query({ table: "USER", delete: users[i]._id });
    }
    deletedUsersCount = await db.query({ table: "USER", count: true });
    assert.strictEqual(deletedUsersCount, 0);
  });
  // ? search query
  it("search query", async () => {
    await db.query({
      table: "USER",
      insert: { name: "john", age: 14 },
    });
    await db.query({
      table: "USER",
      insert: { name: "john", age: 12 },
    });
    await db.query({
      table: "USER",
      insert: { name: "john", age: 28 },
    });

    // ? this verifies the two properties were intercepted and the correct results were returned
    const johns = await db.query({
      table: "USER",
      get: { name: "john", age: 28 },
    });
    assert.strictEqual(johns.length, 1);
    assert.strictEqual(johns[0].name, "john");
    assert.strictEqual(johns[0].age, 28);
  });
});
