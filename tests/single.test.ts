import { Exabase, Schema } from "../dist/index.js";
import { test, expect } from "bun:test";

test("example setup, schema setup, inset and find, search, update, and delete operations", async () => {
  const Order = new Schema<{ ticket: string }>({
    tableName: "order",
    columns: {
      ticket: { type: String, unique: true },
    },
  });
  const db = new Exabase({ schemas: [Order] });
  // ? get Exabase ready
  await db.connect();
  const OrderTRX = Order.query;
  // ? operations
  const create_order = await OrderTRX.save({ ticket: Date.now().toString() });
  const find_order = await OrderTRX.findOne(create_order._id);
  // expect(create_order._id).toBe(find_order._id);
  const update_order = await OrderTRX.save({
    ...create_order,
    ticket: Date.now().toString(),
  });
  const find_order_by_unique_field = await OrderTRX.findOne({
    ticket: update_order.ticket,
  });
  const search_order = await OrderTRX.search({
    ticket: update_order.ticket,
  });
  console.log({ search_order, create_order, update_order });
  // expect(create_order._id).toBe(find_order_by_unique_field._id);
  // expect(create_order._id).toBe(search_order[0]?._id);
  await OrderTRX.delete(create_order._id);
  const find_deleted_order = await OrderTRX.findOne(create_order._id);
  // expect(find_deleted_order).toBe(undefined as any);
  // console.log({
  //   create_order,
  //   find_order,
  //   update_order,
  //   find_order_by_unique_field,
  //   search_order,
  //   delete_order,
  //   find_deleted_order,
  // });
});
