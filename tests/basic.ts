import Exabase from "../src/index";
import { Schema } from "../src/parts/classes";
const userSchema = new Schema({
  tableName: "user",
  columns: {
    age: { type: Number },
    name: { type: String },
  },
});

const db = new Exabase({ schemas: [userSchema] });
// ? get Exabase ready
await db.Ready;
const userTRX = db.getTransaction(userSchema);
const user = await userTRX.save({ age: 89, name: "friday" });
console.log(user.name);
