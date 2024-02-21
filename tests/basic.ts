import { Exabase } from "../dist/index.js";
import { Schema } from "../dist/index.js";

const users = new Schema<{ age: number; name: string }>({
  tableName: "user",
  columns: {
    age: { type: Number },
    name: { type: String },
  },
});

const db = new Exabase({ schemas: [users] });
// ? get Exabase ready
await db.connect();
const a = await users.query.save({ age: 2, name: "friday" });
await users.query.delete(a._id);
console.log(await users.query.count());
