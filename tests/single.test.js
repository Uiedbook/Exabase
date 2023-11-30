// @ts-nocheck
import Exabase, { Schema } from "../lib/index.js";
import { test } from "node:test";
const assert = {
  strict(a, b, c = "") {
    if (a !== b) {
      throw new Error(` ${c + ":  "}${a} is not strictly equal to ${b}`);
    }
  },
};
test("example setup, schema setup, inset and find, search, update, and delete operations", async () => {
  const Order = new Schema({
    tableName: "order",
    columns: {
      ticket: { type: String, unique: true },
    },
  });
  const db = new Exabase({ schemas: [Order] });
  // ? get Exabase ready
  await db.Ready;
  const OrderTRX = db.getTransaction(Order);
  // ? operations
  const create_order = await OrderTRX.save({ ticket: Date.now().toString() });
  const find_order = await OrderTRX.find(create_order._id);
  assert.strict(create_order._id, find_order._id);
  const update_order = await OrderTRX.save({
    ...create_order,
    ticket: Date.now().toString(),
  });
  const search_order = await OrderTRX.find(update_order);
  assert.strict(update_order._id, search_order._id);
  const delete_order = await OrderTRX.delete(create_order);
  const find_deleted_order = await OrderTRX.find(create_order._id);
  assert.strict(find_deleted_order, undefined);
});
