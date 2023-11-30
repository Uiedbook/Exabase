// const _LogFiles = {};
// const _full_lv_bytesize = 15728640;
// function getLog1(
//   logId: string,
//   insert?: boolean /*? dear not change insert to insert? dear not*/
// ): string {
//   let last_file = "LOG-0",
//     l: string;
//   switch (logId) {
//     case "*":
//       return "LOG-1";
//     default:
//       for (const filename in _LogFiles) {
//         const logFile = _LogFiles[filename];
//         if (insert) {
//           if (logFile.size < _full_lv_bytesize /*size check is for inserts*/) {
//             return filename;
//           }
//         } else {
//           if (logFile.last_id > logId /*range check for log updates*/) {
//             return filename;
//           }
//         }
//         if (filename.length === last_file.length && filename > last_file) {
//           last_file = filename;
//         } else {
//           if (filename.length > last_file.length) {
//             last_file = filename;
//           }
//         }
//         l = filename;
//       }
//       if (insert) {
//         //? Create a new log file with an incremented number of LOGn filename
//         const cln = Number(last_file.split("LOG-")[1]);
//         const nln = cln + 1;
//         const lfid = "LOG-" + nln;
//         _LogFiles[lfid] = { last_id: lfid, size: 0 };
//         return lfid;
//       }
//       return "LOG-1";
//   }
// }
// function getLog2(
//   logId: string,
//   insert?: boolean /*? dear not change insert to insert? dear not*/
// ): string {
//   let last_file = "LOG-0";
//   if (logId === "*") {
//     return "LOG-1";
//   }
//   for (const filename in _LogFiles) {
//     const logFile = _LogFiles[filename];
//     if (insert) {
//       if (logFile.size < _full_lv_bytesize /*size check is for inserts*/) {
//         return filename;
//       }
//     } else {
//       if (logFile.last_id > logId /*range check for log updates*/) {
//         return filename;
//       }
//     }
//     last_file = filename;
//   }
//   if (insert) {
//     //? Create a new log file with an incremented number of LOGn filename
//     const cln = Number((last_file || "LOG-0").split("LOG-")[1]);
//     const nln = cln + 1;
//     const lfid = "LOG-" + nln;
//     _LogFiles[lfid] = { last_id: lfid, size: 0 };
//     return lfid;
//   }
//   return "LOG-1";
// }

async function benchSuit(code: Function, runs = 10_000, label?: string) {
  const startTime = performance.now();
  for (let i = 0; i < runs; i++) {
    code();
  }
  const endTime = performance.now();
  let totalTime = endTime - startTime;
  console.log(
    `Code took ${totalTime} ms on ${runs} runs with an average of ${
      totalTime / runs
    } ms per operation`
  );
  if (label) {
    console.log(label);
  }
  return totalTime;
}

let a;
benchSuit(
  () => {
    // a = generate_idgpt4();
  },
  undefined,
  "by gpt4"
);
console.log(a, a.length);

benchSuit(
  () => {
    // a = generate_id();
  },
  undefined,
  "by me"
);

console.log(a, a.length);
