import { Exabase } from "../dist/index.js";
import { ExaSchema } from "../dist/index.js";

const users = new ExaSchema<{
  age: number;
  name: string;
  mom: string;
  _id: string;
}>({
  tableName: "USER",
  columns: {
    age: { type: Number, required: true, index: true },
    name: { type: String, index: true },
    mom: { RelationType: "ONE", type: String, target: "mom" },
  },
});

const moms = new ExaSchema<{ age: number; name: string }>({
  tableName: "MOM",
  columns: {
    age: { type: Number, required: true, index: true },
    name: { type: String, index: true },
  },
});

const db = new Exabase({ schemas: [users, moms] });
// ? get Exabase ready
await db.connect();
// ?
for (let i = 0; i < 5; i++) {
  const mom = await moms.query.save({ age: i, name: "friday" });
  const user = await users.query.save({ age: i, name: "friday" });
  await users.query.addRelation({
    _id: user._id,
    foreign_id: mom._id,
    relationship: "mom",
  });
}
console.time();
const ser = await users.query.findMany(undefined, {
  sortBy: { age: "ASC" },
  take: 2,
  skip: 2,
  populate: ["mom"],
  logIndex: 1,
});
console.timeEnd();
console.log(ser, ser.length);
