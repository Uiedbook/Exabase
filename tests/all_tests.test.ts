import { Exabase } from "../dist/index.js";
import { it, describe, expect } from "bun:test";

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

expect(usersCount).toBe(0);
expect(ordersCount).toBe(0);
console.log("Done cleaning");

//? tests
describe("queries", () => {
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
    const user5 = await db.query(
      JSON.stringify({ table: "USER", one: user._id })
    );

    expect(user._id).toBe(user2._id);
    expect(user._id).toBe(user3._id);
    expect(user._id).toBe(user4._id);
    expect(user4.name).toBe("gregs pola");
    expect(user5).toBe(undefined);
  });

  it("large inset", async () => {
    const usersCount = 500;
    for (let i = 0; i < usersCount; i++) {
      const user = { name: "saul" };
      await db.query(JSON.stringify({ table: "USER", insert: user }));
    }
    const usersLength = await db.query(
      JSON.stringify({ table: "USER", count: true })
    );
    expect(usersLength).toBe(usersCount);
  });

  it("large update", async () => {
    const users = await db.query(JSON.stringify({ table: "USER", many: true }));
    expect(users[0].name).toBe("saul");
    for (let i = 0; i < users.length; i++) {
      users[i].name = "paul";
      await db.query(JSON.stringify({ table: "USER", update: users[i] }));
    }
    const updatedUsers = await db.query(
      JSON.stringify({ table: "USER", many: true })
    );
    expect(updatedUsers[0].name).toBe("paul");
  });
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

    // ? this verifies the two properties were intercepted and the currect results were reurned
    const johns = await db.query(
      JSON.stringify({ table: "USER", search: { name: "john", age: 28 } })
    );
    expect(johns.length).toBe(1);
    expect(johns[0].name).toBe("john");
    expect(johns[0].age).toBe(28);
  });
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
    await db.query(JSON.stringify({ table: "USER", update: user }));
    const userAgain = await db.query(
      JSON.stringify({ table: "USER", one: user._id, populate: true })
    );
    expect(userAgain.requestedOrders.length).toBe(1);
    expect(userAgain.requestedOrders[0]._id).toBe(order._id);
    expect(userAgain.friend._id).toBe(friend._id);
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
    expect(userAgain2.requestedOrders.length).toBe(0);
  });
  it("unique field queries ", async () => {
    const order = await db.query(
      JSON.stringify({ table: "ORDER", insert: { ticket: String(Date.now()) } })
    );
    const uniqueOrder = await db.query(
      JSON.stringify({
        table: "ORDER",
        unique: { ticket: order.ticket },
      })
    );
    expect(order._id).toBe(uniqueOrder._id);
  });
  it("clean up", async () => {
    const users = await db.query(JSON.stringify({ table: "USER", many: true }));
    let usersCount = await db.query(
      JSON.stringify({ table: "USER", count: true })
    );
    const orders = await db.query(
      JSON.stringify({ table: "ORDER", many: true })
    );
    for (let i = 0; i < users.length; i++) {
      await db.query(JSON.stringify({ table: "USER", delete: users[i]._id }));
    }
    for (let i = 0; i < orders.length; i++) {
      await db.query(JSON.stringify({ table: "ORDER", delete: orders[i]._id }));
    }

    usersCount = await db.query(JSON.stringify({ table: "USER", count: true }));
    let ordersCount = await db.query(
      JSON.stringify({ table: "ORDER", count: true })
    );

    expect(usersCount).toBe(0);
    expect(ordersCount).toBe(0);
  });
});
