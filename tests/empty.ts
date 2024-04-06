import { Exabase } from "../dist/index.js";
import { ExaSchema } from "../dist/index.js";

const users = new ExaSchema<{ age: number; name: string }>({
  tableName: "user",
  columns: {
    age: { type: Number },
    name: { type: String },
  },
});

const db = new Exabase({ schemas: [users] });
// ? get Exabase ready
await db.connect();
const user = await users.query.findOne("65acffe7aa19c31a1d5fe2c0", {
  populate: true,
});
console.log({ user, users: await users.query.findMany() });
