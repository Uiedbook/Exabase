import { Exabase, Schema } from "../dist/index.js";
import { expect } from "bun:test";

// ? setup db
const User = new Schema<{ name: string; requestedOrders: any[] }>({
  tableName: "user",
  RCT: true,
  columns: {
    name: { type: String },
  },
});

// ?
const db = new Exabase({ schemas: [User] });
// ? get Exabase ready
await db.connect();
const userTRX = User.transaction;

const users = await userTRX.search({ name: "paul" });
console.log(users);
for (let i = 0; i < users.length; i++) {
  const user = users[i];
  userTRX.delete(user._id);
}
await userTRX.batch(users, "DELETE");
await userTRX.exec();
await userTRX.flush();
const usersCount = await userTRX.count();
expect(usersCount).toBe(0);
