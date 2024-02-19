import { Exabase, Schema } from "../dist/index.js";
import { it, describe, expect } from "bun:test";

// ? setup db
const Order = new Schema<{ ticket: string }>({
  tableName: "order",
  RCT: true,
  columns: {
    ticket: { type: String, unique: true },
  },
});
const User = new Schema<{ name: string; requestedOrders: any[] }>({
  tableName: "user",
  RCT: true,
  columns: {
    name: { type: String },
  },
  relationship: {
    requestedOrders: {
      target: "Order",
      type: "MANY",
    },
  },
});

// ?
const db = new Exabase({ schemas: [User, Order] });
// ? get Exabase ready
await db.connect();
const userTRX = User.query;
const OrderTRX = Order.query;

//? tests
describe("queries", () => {
  it("basic query", async () => {
    const userin = await userTRX.save({ name: "james bond" });
    const userout = await userTRX.findOne(userin._id);
    const users = await userTRX.search({ name: userin.name });
    // expect(users[0]._id).toBe(userout._id);
    // expect(userin._id).toBe(userout._id);
    // expect(userin.name).toBe("james bond");
    await userTRX.delete(userin._id);
    const userd = await userTRX.findOne(userin._id);
    // expect(userd).toBe(undefined as any);
  });
  it("large inset", async () => {
    const users = Array(5).fill({ name: "saul" });
    userTRX.saveBatch(users);
    const usersCount = await userTRX.count();
    // expect(usersCount).toBe(5);
  });
  it("large update", async () => {
    const users = await userTRX.findMany();
    // expect(users[1].name).toBe("saul");
    for (let i = 0; i < users.length; i++) {
      users[i].name = "paul";
    }
    userTRX.saveBatch(users);
    const updatedUsers = await userTRX.findMany();
    // expect(updatedUsers[0].name).toBe("paul");
  });
  it("basic search query", async () => {
    const userin = await userTRX.save({ name: "sara" });
    const userout = await userTRX.search({ name: "sara" });
    // expect(userin._id).toBe(userout[0]?._id);
  });
  it("basic query (relationships) ", async () => {
    const userin = await userTRX.save({ name: "james bond" });
    const orderin = await OrderTRX.save({ ticket: String(Date.now()) });
    // await userTRX.addRelation({
    //   _id: userin._id,
    //   foreign_id: orderin._id,
    //   relationship: "requestedOrders",
    // });

    // const populateRelationship = await userTRX.findOne(userin._id, {
    //   populate: true,
    // });
    // expect(populateRelationship.requestedOrders[0]._id).toBe(orderin._id);
    // await userTRX.removeRelation({
    //   _id: userin._id,
    //   foreign_id: orderin._id,
    //   relationship: "requestedOrders",
    // });
    // ? check that the relationship is empty
    // expect(
    //   (await userTRX.findOne(userin._id, { populate: true })).requestedOrders
    //     .length
    // ).toBe(0);
  });
  it("unique field queries ", async () => {
    const orderin = await OrderTRX.save({ ticket: String(Date.now()) });
    const orderout = await OrderTRX.findOne({
      ticket: orderin.ticket,
    });
    // expect(orderin._id).toBe(orderout._id);
  });
  it("clean up", async () => {
    const users = await userTRX.findMany();
    const orders = await OrderTRX.findMany();
    console.log({ users, orders });
    await userTRX.deleteBatch(users);
    await OrderTRX.deleteBatch(orders);
    const usersCount = await userTRX.count();
    const ordersCount = await OrderTRX.count();
    // expect(usersCount).toBe(0);
    // expect(ordersCount).toBe(0);
  });
});
