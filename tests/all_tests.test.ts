import { Exabase, ExaSchema } from "../dist/index.js";
import { it, describe, expect } from "bun:test";

// ? setup db
const Order = new ExaSchema<{ ticket: string }>({
  table: "ORDER",
  RCT: true,
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
  RCT: true,
  columns: {
    name: { type: String, index: true },
    age: { type: Number, index: true, default: 67 },
    requestedOrders: {
      target: "Order",
      RelationType: "MANY",
      type: ExaSchema,
    },
  },
});
// ?
const db = new Exabase({ schemas: [User, Order] });
// ? get Exabase ready
await db.connect();
const userTRX = User.query;
const OrderTRX = Order.query;

let usersCount = await userTRX.count();
let ordersCount = await OrderTRX.count();
if (usersCount !== 0) {
  const allusers = await userTRX.findMany();
  for (let u = 0; u < allusers.length; u++) {
    const user = allusers[u];
    await userTRX.delete(user._id);
  }
}
if (ordersCount !== 0) {
  const allorders = await OrderTRX.findMany();
  for (let u = 0; u < allorders.length; u++) {
    const order = allorders[u];
    await OrderTRX.delete(order._id);
  }
}

usersCount = await userTRX.count();
ordersCount = await OrderTRX.count();

expect(usersCount).toBe(0);
expect(ordersCount).toBe(0);
console.log("Done cleaning");

//? tests
describe("queries", () => {
  it("basic query", async () => {
    const userin = await userTRX.save({ name: "james bond" });
    const userout = await userTRX.findOne(userin._id);
    const users = await userTRX.search({ name: userin.name });
    expect(users[0]._id).toBe(userout._id);
    expect(userin._id).toBe(userout._id);
    expect(userin.name).toBe("james bond");
    await userTRX.delete(userin._id);
    const userd = await userTRX.findOne(userin._id);
    expect(userd).toBe(undefined as any);
  });

  it("large inset", async () => {
    const usersCount = 200;
    for (let i = 0; i < usersCount; i++) {
      const user = { name: "saul" };
      await userTRX.save(user);
    }
    const usersLength = await userTRX.count();
    expect(usersLength).toBe(usersCount);
  });

  it("large update", async () => {
    const users = await userTRX.findMany();
    expect(users[0].name).toBe("saul");
    for (let i = 0; i < users.length; i++) {
      users[i].name = "paul";
      await userTRX.save(users[i]);
    }
    const updatedUsers = await userTRX.findMany();
    expect(updatedUsers[0].name).toBe("paul");
  });
  it("basic search query", async () => {
    const userin = await userTRX.save({ name: "sara" });
    const userout = await userTRX.search({ name: "sara" });
    expect(userin._id).toBe(userout[0]?._id);
  });
  it("basic query (relationships) ", async () => {
    const userin = await userTRX.save({ name: "james bond" });
    const orderin = await OrderTRX.save({ ticket: String(Date.now()) });
    await userTRX.addRelation({
      _id: userin._id,
      foreign_id: orderin._id,
      relationship: "requestedOrders",
    });

    const populateRelationship = await userTRX.findOne(userin._id, {
      populate: true,
    });

    expect(populateRelationship.requestedOrders[0]._id).not.toBe(undefined);
    expect(populateRelationship.requestedOrders[0]._id).toBe(orderin._id);
    await userTRX.removeRelation({
      _id: userin._id,
      foreign_id: orderin._id,
      relationship: "requestedOrders",
    });
    // ? check that the relationship is empty
    expect(
      (await userTRX.findOne(userin._id, { populate: true })).requestedOrders
        .length
    ).toBe(0);
  });
  it("unique field queries ", async () => {
    const orderin = await OrderTRX.save({ ticket: String(Date.now()) });
    const orderout = await OrderTRX.findOne({
      ticket: orderin.ticket,
    });
    expect(orderin._id).toBe(orderout._id);
  });
  it("clean up", async () => {
    const users = await userTRX.findMany();
    const orders = await OrderTRX.findMany();
    for (let i = 0; i < users.length; i++) {
      await userTRX.delete(users[i]._id);
    }
    for (let i = 0; i < orders.length; i++) {
      await OrderTRX.delete(orders[i]._id);
    }
    const usersCount = await userTRX.count();
    const ordersCount = await OrderTRX.count();
    expect(usersCount).toBe(0);
    expect(ordersCount).toBe(0);
  });
  it("basic search index cleaned", async () => {
    const userout = await userTRX.search({ name: "saul" });
    expect(userout[0]).toBe(undefined as any);
  });
});
