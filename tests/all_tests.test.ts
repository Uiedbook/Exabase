import { Exabase, ExaSchema } from "../dist/index.js";
import { it, describe, expect } from "bun:test";

// ? setup db
new Exabase();

const Order = new ExaSchema<{ ticket: string }>({
  table: "ORDER",
  columns: {
    ticket: { type: String, unique: true, index: true },
  },
});
const User = new ExaSchema<{
  name: string;
  requestedOrders: any[];
  age: number;
}>({
  table: "USER",
  columns: {
    name: { type: String, index: true },
    age: { type: Number, index: true, default: 67 },
    requestedOrders: {
      target: "Order",
      relationType: "MANY",
      type: ExaSchema,
    },
  },
});

let usersCount = await User.Query.count();
let ordersCount = await Order.Query.count();
if (usersCount !== 0) {
  const allusers = await User.Query.many();
  for (let u = 0; u < allusers.length; u++) {
    const user = allusers[u];
    await User.Query.delete(user._id);
  }
}
if (ordersCount !== 0) {
  const allorders = await Order.Query.many();
  for (let u = 0; u < allorders.length; u++) {
    const order = allorders[u];
    await Order.Query.delete(order._id);
  }
}

usersCount = await User.Query.count();
ordersCount = await Order.Query.count();

expect(usersCount).toBe(0);
expect(ordersCount).toBe(0);
console.log("Done cleaning");

//? tests
describe("queries", () => {
  it("basic query", async () => {
    const userin = await User.Query.save({ name: "james bond" });
    const userout = await User.Query.one(userin._id);
    console.log({ userin, userout }, 1);

    const users = await User.Query.search({ name: userin.name });
    expect(users[0]._id).toBe(userout._id);
    expect(userin._id).toBe(userout._id);
    expect(userin.name).toBe("james bond");
    await User.Query.delete(userin._id);
    const userd = await User.Query.one(userin._id);
    expect(userd).toBe(undefined as any);
  });

  it("large inset", async () => {
    const usersCount = 200;
    for (let i = 0; i < usersCount; i++) {
      const user = { name: "saul" };
      await User.Query.save(user);
    }
    const usersLength = await User.Query.count();
    expect(usersLength).toBe(usersCount);
  });

  it("large update", async () => {
    const users = await User.Query.many();
    expect(users[0].name).toBe("saul");
    for (let i = 0; i < users.length; i++) {
      users[i].name = "paul";
      await User.Query.save(users[i]);
    }
    const updatedUsers = await User.Query.many();
    expect(updatedUsers[0].name).toBe("paul");
  });
  it("basic search query", async () => {
    const userin = await User.Query.save({ name: "sara" });
    const userout = await User.Query.search({ name: "sara" });
    expect(userin._id).toBe(userout[0]?._id);
  });
  it("basic query (relationships) ", async () => {
    const userin = await User.Query.save({ name: "james bond" });
    const orderin = await Order.Query.save({ ticket: String(Date.now()) });
    // await User.Query.addRelation({
    //   _id: userin._id,
    //   foreign_id: orderin._id,
    //   relationship: "requestedOrders",
    // });

    const populateRelationship = await User.Query.one(userin._id, {
      populate: true,
    });

    expect(populateRelationship.requestedOrders[0]._id).not.toBe(undefined);
    expect(populateRelationship.requestedOrders[0]._id).toBe(orderin._id);
    // await User.Query.removeRelation({
    //   _id: userin._id,
    //   foreign_id: orderin._id,
    //   relationship: "requestedOrders",
    // });
    // ? check that the relationship is empty
    expect(
      (await User.Query.one(userin._id, { populate: true })).requestedOrders
        .length
    ).toBe(0);
  });
  it("unique field queries ", async () => {
    const orderin = await Order.Query.save({ ticket: String(Date.now()) });
    const orderout = await Order.Query.one({
      ticket: orderin.ticket,
    });
    expect(orderin._id).toBe(orderout._id);
  });
  it("clean up", async () => {
    const users = await User.Query.many();
    const orders = await Order.Query.many();
    for (let i = 0; i < users.length; i++) {
      await User.Query.delete(users[i]._id);
    }
    for (let i = 0; i < orders.length; i++) {
      await Order.Query.delete(orders[i]._id);
    }
    const usersCount = await User.Query.count();
    const ordersCount = await Order.Query.count();
    expect(usersCount).toBe(0);
    expect(ordersCount).toBe(0);
  });
  it("basic search index cleaned", async () => {
    const userout = await User.Query.search({ name: "saul" });
    expect(userout[0]).toBe(undefined as any);
  });
});
