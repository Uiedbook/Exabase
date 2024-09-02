import { time, timeEnd } from "console";
import { Exabase } from "../dist/index.js";
import { ExaSchema } from "../dist/index.js";

const users = new ExaSchema<{ age: number; name: string }>({
  table: "USER",
  columns: {
    age: { type: Number },
    name: { type: String },
  },
});

const db = new Exabase({ schemas: [users] });
// ? get Exabase ready
await db.connect();
const query = JSON.stringify({
  table: "USER",
  query: { insert: { age: 1, name: "friday" } },
});
time();
const data = await db.query(query);
timeEnd();
console.log({ data, query });
