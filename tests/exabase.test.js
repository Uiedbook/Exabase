// @ts-nocheck
import { Exabase, Schema } from "../dist/index.js";
import { it, describe } from "node:test";

const assert = {
  strict(a, b, c = "") {
    if (a !== b) {
      throw new Error(` ${c + ":  "}${a} is not strictly equal to ${b}`);
    }
  },
};

describe("queries", () => {
  let userTRX, OrderTRX;
  it("Basic setup", async () => {
    const Order = new Schema({
      tableName: "order",
      RCT: true,
      columns: {
        ticket: { type: String, unique: true },
      },
    });
    const User = new Schema({
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
    const db = new Exabase({ schemas: [User, Order], logging: false });
    // ? get Exabase ready
    await db.connect();
    // TRX(s)
    userTRX = db.getTransaction(User);
    OrderTRX = db.getTransaction(Order);
  });
  it("basic query", async () => {
    const userin = await userTRX.save({ name: "james bond" });
    const userout = await userTRX.find(userin._id);
    assert.strict(userin._id, userout._id);
  });
  it("large inset", async () => {
    const users = Array(5_000).fill({ name: "saul" });
    await userTRX.batch(users, "INSERT");
    await userTRX.exec();
    let usersCount = await userTRX.find();
    assert.strict(usersCount.length, 5001, "current item count");
  });
  it("large update", async () => {
    const users = await userTRX.find();
    assert.strict(users[0].name, "james bond");
    assert.strict(users[1].name, "saul");
    for (let i = 0; i < users.length; i++) {
      users[i].name = "paul";
    }
    await userTRX.batch(users, "UPDATE");
    await userTRX.exec();
    const updatedUsers = await userTRX.find();
    assert.strict(updatedUsers[0].name, "paul");
  });
  it("basic search query", async () => {
    const userin = await userTRX.save({ name: "sara" });
    const userout = await userTRX.search({ name: "sara" });
    assert.strict(userin._id, userout.at(-1)._id);
  });
  it("basic query (relationships) ", async () => {
    const userin = await userTRX.save({ name: "james bond" });
    const orderin = await OrderTRX.save({ ticket: String(Date.now()) });
    await userTRX.addRelation({
      _id: userin._id,
      foreign_id: orderin._id,
      relationship: "requestedOrders",
    });

    const populateRelationship = await userTRX.find(userin._id, {
      populate: true,
    });
    assert.strict(populateRelationship.requestedOrders[0]._id, orderin._id);
    await userTRX.removeRelation({
      _id: userin._id,
      foreign_id: orderin._id,
      relationship: "requestedOrders",
    });
    // ? check that the relationship is empty
    assert.strict(
      (await userTRX.find(userin._id, { populate: true })).requestedOrders
        .length,
      0
    );
  });
  it("unique field queries ", async () => {
    const orderin = await OrderTRX.save({ ticket: String(Date.now()) });
    const orderout = await OrderTRX.find({
      ticket: orderin.ticket,
    });
    assert.strict(orderin._id, orderout._id);
  });
  it("clean up", async () => {
    const users = await userTRX.find();
    const orders = await OrderTRX.find();
    await userTRX.batch(users, "DELETE");
    await OrderTRX.batch(orders, "DELETE");

    await userTRX.exec();
    await OrderTRX.exec();

    // await userTRX.flush();
    // await OrderTRX.flush();

    // const usersCount = await userTRX.count();
    // const ordersCount = await OrderTRX.count();

    // assert.strict(usersCount, 0);
    // assert.strict(ordersCount, 0);
  });
});
