import { run, bench } from "mitata";
import { time, timeEnd } from "console";

function deepMerge(target: any, source: any) {
  for (let key in source) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      // Recursively merge if the property is an object (but not an array)
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else if (Array.isArray(source[key])) {
      // Concatenate arrays
      target[key] = (target[key] || []).concat(source[key]);
    } else {
      // For non-object and non-array properties, overwrite
      target[key] = source[key];
    }
  }
  return target;
}

function deepMerge2(target: any, source: any): any {
  if (source === undefined || source === null) return target;

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const targetValue = target[key];
      const sourceValue = source[key];

      if (Array.isArray(sourceValue)) {
        // Efficiently merge arrays: avoid redundant concatenation
        target[key] = Array.isArray(targetValue)
          ? [...new Set([...targetValue, ...sourceValue])]
          : [...sourceValue];
      } else if (typeof sourceValue === "object" && sourceValue !== null) {
        // Merge objects recursively, but only if both are objects
        target[key] =
          typeof targetValue === "object" && targetValue !== null
            ? deepMerge(targetValue, sourceValue)
            : { ...sourceValue };
      } else {
        // Primitive types: overwrite target with source
        target[key] = sourceValue;
      }
    }
  }

  return target;
}

function deepMerge3(target: any, source: any): any {
  if (!source) return target; // Early return for null or undefined sources

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const targetValue = target[key];
      const sourceValue = source[key];

      if (Array.isArray(sourceValue)) {
        // In-place array merge: Avoid copying, directly append unique values
        if (!Array.isArray(targetValue)) {
          target[key] = sourceValue.slice(); // Clone the source array if target isn't an array
        } else {
          // Use a for-loop to push unique values (faster than `concat` and `Set`)
          for (let i = 0; i < sourceValue.length; i++) {
            if (!targetValue.includes(sourceValue[i])) {
              targetValue.push(sourceValue[i]);
            }
          }
        }
      } else if (typeof sourceValue === "object" && sourceValue !== null) {
        // Recursive merge for objects
        target[key] =
          typeof targetValue === "object" && targetValue !== null
            ? deepMerge(targetValue, sourceValue)
            : sourceValue;
      } else {
        // Primitive types: overwrite directly
        target[key] = sourceValue;
      }
    }
  }

  return target;
}

// Usage example:
const obj1 = {
  a: 1,
  b: { x: 10, y: 20 },
  c: 1,
  d: [1, 2, 3],
};
const obj2 = {
  b: { y: 30, z: 40 },
  c: 3,
  d: [4, 5, 6],
};
import Benchmark from "benchmark";
const suite = new Benchmark.Suite();

suite.add("DeepMerge1", function () {
  deepMerge(obj1, obj2);
});
suite.add("DeepMerge2", function () {
  deepMerge2(obj1, obj2);
});
suite
  .add("DeepMerge3", function () {
    deepMerge3(obj1, obj2);
  })
  .on("cycle", function (event: any) {
    console.log(String(event.target));
  })
  .on("complete", function () {
    console.log("Fastest is " + this.filter("fastest").map("name"));
  })
  .run({ async: true });
