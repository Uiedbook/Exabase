import { Exabase, ExaSchema } from "../dist/index.js";
import { test, expect } from "bun:test";

test("example setup, schema setup, inset and find, search, update, and delete operations", async () => {
  const Order = new ExaSchema<{ ticket: string }>({
    table: "ORDER",
    columns: {
      ticket: { type: String, unique: true },
    },
  });
  const db = new Exabase();
  // ? get Exabase ready
  // ? operations
  const create_order = await Order.Query.save({
    ticket: Date.now().toString(),
  });
  const find_order = await Order.Query.one(create_order._id);
  expect(create_order._id).toBe(find_order._id);
  const update_order = await Order.Query.save({
    ...create_order,
    ticket: Date.now().toString(),
  });
  const find_order_by_unique_field = await Order.Query.one({
    ticket: update_order.ticket,
  });
  const search_order = await Order.Query.search({
    ticket: update_order.ticket,
  });
  console.log({
    search_order,
    create_order,
    update_order,
    find_order_by_unique_field,
  });
  expect(create_order._id).toBe(find_order_by_unique_field._id);
  expect(create_order._id).toBe(search_order[0]?._id);
  const delete_order = await Order.Query.delete(create_order._id);
  const find_deleted_order = await Order.Query.one(create_order._id);
  expect(find_deleted_order).toBe(undefined as any);
  console.log({
    create_order,
    find_order,
    update_order,
    find_order_by_unique_field,
    search_order,
    delete_order,
    find_deleted_order,
  });
});
