import { Exabase } from "./dist/index.js";
import { ExaSchema } from "./dist/index.js";

const users = new ExaSchema<{ age: number; name: string; mom: string }>({
  tableName: "user",
  columns: {
    age: { type: Number, unique: true, nullable: false, index: true },
    name: { type: String, index: true },
    mom: { RelationType: "ONE", unique: true, type: String, target: "mom" },
  },
});
const moms = new ExaSchema<{ age: number; name: string }>({
  tableName: "mom",
  columns: {
    age: { type: Number, unique: true, nullable: false, index: true },
    name: { type: String, index: true },
  },
});

const db = new Exabase({ schemas: [users, moms] });
// ? get Exabase ready
await db.connect();
// ?
for (let i = 0; i < 5; i++) {
  await users.query.save({ age: i, name: "friday" });
}
console.time();
const ser = await users.query.findMany(undefined, {
  sortBy: { age: "ASC" },
  // take: 2,
  // skip: 2,
  populate: ["mom"],
  logIndex: 1,
});
console.timeEnd();
console.log(ser, ser.length);
