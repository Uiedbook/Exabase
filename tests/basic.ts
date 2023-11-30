import Exabase from "../lib";
import { Schema } from "../src/parts/classes";
import { ExaDoc } from "../src/types";
const userSchema = new Schema({
  tableName: "user",
  columns: {
    age: { type: Number },
    name: { type: String },
  },
});
type user_DTO = ExaDoc<{
  age: number;
  name: string;
}>;
const db = new Exabase({ schemas: [userSchema] });
// ? get Exabase ready
await db.Ready;
const userTRX = db.getTransaction<user_DTO>(userSchema);
const user = await userTRX.save({ age: 89, name: "friday" });
console.log(user.name);
