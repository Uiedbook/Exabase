// import child_process from "child_process";
// import { dirname } from "node:path";
// import { fileURLToPath } from "node:url";

// const _dirname = (0, dirname)((0, fileURLToPath)(import.meta.url));
// const controller = new AbortController();
// const { signal } = controller;

// export const make_backup = (dbdir: string, dev = true) => {
//   const rootDir = _dirname.split(dev ? "src" : "node_modules")[0];
//   const backupurl = [
//     dbdir.toUpperCase(),
//     " - ",
//     new Date().toString().split(" GMT")[0],
//     ".zip",
//   ].join("");
//   return new Promise((res, rej) => {
//     child_process.exec(`rm "${dbdir} -"**`);
//     child_process.exec(
//       `zip -r "${backupurl}" ${dbdir}/*`,
//       {
//         cwd: rootDir,
//         signal,
//       },
//       (err) => {
//         if (err) {
//           rej(err);
//         } else {
//           res(backupurl);
//         }
//       }
//     );
//   });
// };

// export const make_compression = (dbdir: string, dev = true) => {
//   const rootDir = _dirname.split(dev ? "src" : "node_modules")[0];
//   const backupurl = [dbdir.toUpperCase(), ".zip"].join("");
//   return new Promise((res, rej) => {
//     child_process.exec(`rm "${dbdir} -"**`);
//     child_process.exec(
//       `zip -r "${backupurl}" ${dbdir}/*`,
//       {
//         cwd: rootDir,
//         signal,
//       },
//       (err) => {
//         if (err) {
//           rej(err);
//         } else {
//           res(backupurl);
//         }
//       }
//     );
//   });
// };
