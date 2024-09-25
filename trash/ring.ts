// //
// import { ExaError, GLOBAL_OBJECT } from "./classes.js";

// // ! todo handle sending fresh requests to serverless fresh data backup
// export const _ExabaseRingInterface = async (ctx: {
//   throw(): never;
//   json: () => Promise<Record<string, any>>;
//   reply: (arg0: string) => never;
// }) => {
//   // freshNodeUrl
//   const data = await ctx.json();
//   switch (data["type"]) {
//     // ? other rings can login this ring
//     case "login":
//       login(data["query"]);
//       break;
//     // ? other rings can broadcast to this ring
//     case "broadcast":
//       login(data["query"]);
//       break;
//     //? a leader ring sends new writes to be saved locally
//     //? while this node is still syncing
//     //? after which this node can the upade those changes
//     case "new-data-while-sync":
//       save(data["query"]);
//       break;
//     // ? this node is out of sync and needs rehydration from a leader
//     // ? hydrate this node with data from a leader ring.
//     case "hydrate":
//       hydrate(data["query"]);
//       break;
//     // ? other following node can tell this leader node their current state
//     // ? active state means not ready for broadcast, (i.e still syncing)
//     // ? therefore should oonly be sent new-data-while-sync querys
//     case "state-infomation":
//       hydrate(data["query"]);
//       break;
//     default:
//       ctx.throw();
//       break;
//   }
// };

// export const _login_leader_ring = async (indexes: Record<string, number>) => {
//   // ? state = true? this is not new
//   const ringbearerResponse = await fetch(
//     GLOBAL_OBJECT.MANIFEST.bearer + "/login",
//     {
//       method: "POST",
//       body: JSON.stringify({ indexes }),
//     }
//   );
//   const data: any = await ringbearerResponse.json();
//   if (data.status !== "OK") {
//     throw new ExaError("Failed Exabase login atempt");
//   }
//   return true;
// };

// //! /login - (request out) logins an Exabase Ring interface.
// // const app = async (ctx: { reply: (arg0: { status: string }) => void }) => {
// // const req = (await ctx.body.json()) as {
// //   url: string;
// // };
// // MANIFEST.ringlord = req.url as string;
// // console.log(data);
// //   ctx.reply({ status: "OK" });
// // };
// const login = async (ctx: { reply: (arg0: { status: string }) => void }) => {
//   // const req = (await ctx.body.json()) as {
//   //   url: string;
//   // };
//   // MANIFEST.ringlord = req.url as string;
//   // console.log(data);
//   ctx.reply({ status: "OK" });
// };
// //! /authorise - (request in) request Exabase login credentails for authorisation before adding the node to the Ring interface.
// // const authorise = async (ctx: {
// //   body: { json: () => { url: string } | PromiseLike<{ url: string }> };
// //   reply: (arg0: { status: string }) => void;
// // }) => {
// //   const req = (await ctx.body.json()) as {
// //     url: string;
// //   };
// //   (GLOBAL_OBJECT.MANIFEST.rings as string[]).push(req.url);
// //   // console.log(data);
// //   ctx.reply({ status: "OK" });
// // };
// //! /hydrate -
// const hydrate = async (ctx: {
//   reply: (arg0: { status: string }) => void;
//   code: number;
// }) => {
//   // const data = await ctx.body.json();
//   try {
//     ctx.reply({ status: "OK" });
//   } catch (error) {
//     ctx.code = 401;
//     ctx.reply({ status: "FAILED" });
//   }
// };
// //! /save - (request in) for live consistency (goes to all replicas)
// const save = async (ctx: {
//   reply: (arg0: { status: string }) => void;
//   code: number;
// }) => {
//   // const data = await ctx.body.json();
//   try {
//     // EXABASE_MANAGERS[req.effection]._run(req.query, r, req.type);
//     // console.log(data);
//     ctx.reply({ status: "OK" });
//   } catch (error) {
//     ctx.code = 401;
//     ctx.reply({ status: "FAILED" });
//   }
// };
