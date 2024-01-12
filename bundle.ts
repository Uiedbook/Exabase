const res = await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "./dist",
  // minify: true,
  target: "node",
  format: "esm",
});
if (!res.success) {
  console.log(...res.logs);
} else {
  Bun.spawn(["./pack"]);
}
export {};
