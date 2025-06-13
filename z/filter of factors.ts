import { bench, run } from "mitata";

// Define the total number of Unicode code points that UTF-16 can represent
// (from U+0000 to U+10FFFF, inclusive)
const TOTAL_UNICODE_CODE_POINTS: number = 0x10ffff + 1; // This equals 1,114,112 in decimal

// Create a low-level (Typed) Array of Uint32 (32-bit unsigned integers)
const N32bitArray: Uint32Array = new Uint32Array(TOTAL_UNICODE_CODE_POINTS);

// Get the factors of a number
function getFactors(str: string): string[] {
  const combinedFactors: Set<number> = new Set();
  for (const char of str) {
    const num = char.codePointAt(0)!;
    for (let i = 1; i * i <= num; i++) {
      if (num % i === 0) {
        combinedFactors.add(i);
        const otherFactor = num / i;
        if (otherFactor !== i && otherFactor !== num) {
          combinedFactors.add(otherFactor);
        }
      }
    }
  }
  return Array.from(combinedFactors);
}

export const add = (data: string) => {
  if (data === "") return;
  const factors = getFactors(data);
  for (const factor of factors) {
    N32bitArray[factor] = 1;
  }
};

export const check = (data: string) => {
  if (data === "") return false;
  const factors = getFactors(data);
  for (const factor of factors) {
    if (N32bitArray[factor] !== 1) {
      return false;
    }
  }
  return factors;
  // return true;
};

export const clear = () => {
  N32bitArray.fill(0);
};

export const log = () => {
  console.log(
    Array.from(N32bitArray.entries())
      .filter((x) => x[1] === 1)
      .map((x) => x[0])
  );
};

// ? two sentences with all english alphabets.
const a = "The quick brown fox jumps over the lazy dog.";
const b = "Pack my box with five dozen liquor jugs.";

add(a);
const result = check(b);
console.log(getFactors(a).join(", "), "\n\n", getFactors(b).join(", "));
console.log(result);

{
  bench("inset", () => {
    add(a);
  });
}
{
  bench("check", () => {
    check(a);
  });
}

// run();
