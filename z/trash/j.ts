import { freemem } from "node:os";

const gb_div = 1048576; // ? 1024 * 1024 = mb level
const freeRam = freemem();

// ? inputs
const schemaLength = 14;
const allowedUsagePercent = 100;
const getComputedUsage = (
  allowedUsagePercent: number,
  schemaLength: number
) => {
  const nuPerc = (p: number) => p / 1500; /*
      ? (100 = convert to percentage, 15 = exabase gravity constant) = 1400 units  */
  //? percent allowed to be used
  // ? what can be used by exabse
  const usableGB = freeRam * nuPerc(allowedUsagePercent || 1); /*
      ? normalise any 0% of falsy values to 1% */
  // ? usage size per schema derivation
  const usableManagerGB = usableGB / schemaLength;
  return { usableGB, usableManagerGB };
};

const { usableGB, usableManagerGB } = getComputedUsage(
  allowedUsagePercent,
  schemaLength
);
console.log({
  usableManagerGB: usableManagerGB,
  usableGB: usableGB,
  freeRam: freeRam,
});
