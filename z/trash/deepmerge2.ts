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
            ? deepMerge2(targetValue, sourceValue)
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
            ? deepMerge3(targetValue, sourceValue)
            : sourceValue;
      } else {
        // Primitive types: overwrite directly
        target[key] = sourceValue;
      }
    }
  }

  return target;
}

// function createRandomObject(depth: number, breadth: number): any {
//   const obj: any = {};
//   for (let i = 0; i < breadth; i++) {
//     const key = `key${i}`;
//     if (depth > 0) {
//       obj[key] = createRandomObject(depth - 1, breadth); // Nested object
//     } else {
//       obj[key] = Math.floor(Math.random() * 1000); // Primitive value
//     }
//   }
//   return obj;
// }
function createRandomObject(depth: number, breadth: number): any {
  const obj: any = {};
  for (let i = 0; i < breadth; i++) {
    const key = `key${i}`;
    if (depth > 0) {
      obj[key] = createRandomArray(depth); // Nested object
    } else {
      obj[key] = Math.floor(Math.random() * 1000); // Primitive value
    }
  }
  return obj;
}

function createRandomArray(length: number): any[] {
  const arr = [];
  for (let i = 0; i < length; i++) {
    arr.push(Math.floor(Math.random() * 1000)); // Random integers
  }
  return arr;
}

// Generate large objects
const obj1 = {
  b: createRandomObject(100, 1000), // 3 levels deep, 4 keys at each level
  c: createRandomArray(1000_000), // Array with 1000 elements
};

const obj2 = {
  b: createRandomObject(6, 8),
  c: createRandomArray(1000),
};

time();
const result1 = deepMerge(obj1, obj2);
timeEnd();
time();
const result2 = deepMerge2(obj1, obj2);
timeEnd();
time();
const result3 = deepMerge3(obj1, obj2);
timeEnd();

{
  bench(" deepMerge 1", () => {
    deepMerge(obj1, obj2);
  });
}
{
  bench(" deepMerge 2", () => {
    deepMerge2(obj1, obj2);
  });
}
{
  bench(" deepMerge 3", () => {
    deepMerge3(obj1, obj2);
  });
}

run();

console.log({ result1, result2, result3 });
