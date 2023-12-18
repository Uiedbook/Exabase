// async function findMessagesByProperties(
//   RCT_KEY: string,
//   fileName: any,
//   fo: {
//     skip?: number;
//     populate?: Record<string, string>;
//     take?: number;
//     search?: Record<string, any>;
//   },
//   files: LOG_file_type
// ) {
//   let foundList: Msgs = [],
//     len = 0,
//     continued = false;
//   const { take, skip, populate, search } = fo;
//   let skipped = false;
//   const keys = Object.keys(files);
//   for (let i = 0; i < keys.length; i++) {
//     if (continued) {
//       break;
//     }
//     const file = "/" + keys[i];
//     let tru = false;
//     const messages = await readDataFromFile(RCT_KEY, fileName + file);
//     if (skip && !skipped) {
//       //? remove skip
//       messages.splice(0, skip);
//       //? skip only once
//       skipped = true;
//     }
//     for (let i = 0; i < messages.length; i++) {
//       tru = true;
//       const message = messages[i];
//       for (const key in search) {
//         if (message[key as keyof typeof message] !== search[key]) {
//           tru = false;
//           break;
//         }
//       }
//       if (tru === true) {
//         foundList.push(message);
//         len += 1;
//       }
//       if (len === take) {
//         continued = true;
//         break;
//       }
//     }
//     if (populate) {
//       const _found = foundList.map(async (m) => {
//         const _foreign = await populateForeignKeys(fileName, m._id, populate);
//         for (const key in _foreign) {
//           (m[key as keyof typeof m] as any) = _foreign[key];
//         }
//         return m;
//       });
//       foundList = await Promise.all(_found);
//     }
//   }
//   return foundList;
// }
