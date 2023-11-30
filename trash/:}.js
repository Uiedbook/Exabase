#!/usr/bin / env node
import child_process from "child_process";
import { createInterface } from "readline";
const arg = process.argv.slice(2).filter((c) => !c.includes("--"));
const opts = process.argv
  .slice(2)
  .filter((c) => c.includes("--"))
  .join();
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: ":}",
});
rl.prompt();

rl.on("line", (line) => {
  if (line === "r") {
    console.log(
      "runing commands -- ",
      arg,
      opts.length ? [" with options -- ", opts].join(" ") : ""
    );
    if (opts.includes("--t=")) {
      const time = Number(opts.split("--t=")[1].split("")[0]);
      console.log(time);
    }
    for (let a = 0; a < arg.length; a++) {
      console.log(" runing " + arg[a] + "  ...");
      child_process.execSync(`npm run ${arg[a]} &`);
    }
    console.log(":}...");
  }
}).on("close", () => {
  console.log(":} has ended! \n");
});
