import { Exabase } from "../dist/index.js";
import { ExaSchema } from "../dist/index.js";

const users = new ExaSchema<{ age: number; name: string }>({
  table: "USER",
  columns: {
    age: { type: Number },
    name: { type: String },
  },
});

const db = new Exabase();
// ? get Exabase ready
const a = await users.Query.save({ age: 2, name: "friday" });
await users.Query.delete(a._id);
console.log(await users.Query.count());
