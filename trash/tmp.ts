import { ExaId } from "../src/primitives/functions";

async function benchSuit(code, runs = 1_000, lab: string = "") {
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

import { randomBytes } from "crypto";

const PROCESS_UNIQUE = randomBytes(5);
const buffer = Buffer.alloc(12);
export const ExaId2 = (): string => {
  let index = ~~(Math.random() * 0xffffff);
  const time = ~~(Date.now() / 1000);
  const inc = (index = (index + 1) % 0xffffff);

  // 4-byte timestamp
  buffer.writeUInt32BE(time, 0);

  // 5-byte process unique
  PROCESS_UNIQUE.copy(buffer, 4);

  // 3-byte counter
  buffer.writeUIntBE(inc, 9, 3);

  return buffer.toString("hex");
};

benchSuit(
  () => {
    ExaId2();
  },
  undefined,
  "chatgpt"
);
benchSuit(
  () => {
    ExaId();
  },
  undefined,
  "me"
);
