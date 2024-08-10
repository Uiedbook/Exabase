import { Exabase } from "../dist/index.js";
import { ExaSchema } from "../dist/index.js";

const users = new ExaSchema<{ age: number; name: string }>({
  tableName: "USER",
  columns: {
    age: { type: Number },
    name: { type: String },
  },
});

const db = new Exabase({ schemas: [users], logging: true });
// ? get Exabase ready
await db.connect();
const a = await users.query.save({ age: 2, name: "friday" });
await users.query.delete(a._id);
console.log(await users.query.count());
