import { Exabase } from "./dist/index.js";
import { ExaSchema } from "./dist/index.js";

const users = new ExaSchema<{ age: number; name: string }>({
  tableName: "user",
  columns: {
    age: { type: Number, unique: true, nullable: false, index: true },
    name: { type: String, index: true },
  },
});

const db = new Exabase({ schemas: [users] });
// ? get Exabase ready
await db.connect();
// ?
for (let i = 0; i < 5; i++) {
  await users.query.save({ age: i, name: "friday" });
}
const ser = await users.query.search(
  { name: "friday" },
  { reverse: true, take: 2 }
);
console.log(ser, ser.length);
