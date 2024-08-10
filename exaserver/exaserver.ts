import { Exabase } from "../dist/index.js";
import { ExaSchema } from "../dist/index.js";

const users = new ExaSchema<{ age: number; name: string }>({
  tableName: "USER",
  columns: {
    age: { type: Number },
    name: { type: String },
  },
});

const db = new Exabase({ schemas: [users] });
// ? get Exabase ready
await db.connect();
const server = Bun.serve({
  port: 3000,
  async fetch(req: Request) {
    try {
      const token = req.headers["x-exa-ray"];
      // ? verify
      const data = await db.query(await req.text());
      return new Response(JSON.stringify(data));
    } catch (error) {
      return new Response(JSON.stringify({ exa_error: String(error) }));
    }
  },
});

console.log(`Listening on ${server.url}`);
