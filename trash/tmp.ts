import MurmurHash3 from "imurmurhash";
import { generate_id } from "../src/primitives/functions";

async function benchSuit(code, runs = 1_00, lab?: "") {
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
  if (lab) {
    console.log(lab);
  }
  return totalTime;
}

benchSuit(() => {
  MurmurHash3("hello world").result();
});
benchSuit(() => {
  generate_id();
});
