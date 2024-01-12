import { Exabase } from "../dist/index.js";
import { Schema } from "../dist/index.js";
const userSchema = new Schema<{ age: number; name: string; _id: string }>({
  tableName: "user",
  columns: {
    age: { type: Number },
    name: { type: String },
  },
});

const db = new Exabase({ schemas: [userSchema] });
// ? get Exabase ready
await db.connect();
const userTRX = userSchema.transaction;
