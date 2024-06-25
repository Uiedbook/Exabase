import { type Msg, type Msgs } from "../dist/primitives/types.js";

// ? bucket sort for sorting
export function bucketSort(
  arr: Msgs,
  prop: keyof Msg,
  order: "ASC" | "DESC"
): Msgs {
  if (arr.length === 0) return arr;

  // ? Find min and max values to determine the range of the buckets
  const minValue = Math.min(...arr.map((item) => item[prop] as any));
  const maxValue = Math.max(...arr.map((item) => item[prop] as any));

  // ? Adjust the bucket size based on data distribution
  const bucketCount = Math.floor(arr.length / 2) || 1;
  const bucketSize = Math.ceil((maxValue - minValue + 1) / bucketCount);

  // ? create buckets
  const buckets: Msgs[] = Array.from({ length: bucketCount }, () => []);

  for (let i = 0; i < arr.length; i++) {
    const data = arr[i];
    const bucketIndex = Math.floor((data[prop] - minValue) / bucketSize);
    buckets[bucketIndex].push(data);
  }

  // ? merge buckets
  let result: Msgs = [];
  for (let i = 0; i < buckets.length; i++) {
    // ? sort using merge sort
    const sortedBucket = mergeSort(buckets[i], prop);
    result.push(...sortedBucket);
  }

  if (order === "DESC") {
    return result.reverse();
  }
  return result;
}

function mergeSort(arr: Msgs, prop: keyof Msg): Msgs {
  if (arr.length <= 1) return arr;
  const middle = Math.floor(arr.length / 2);
  const left = arr.slice(0, middle);
  const right = arr.slice(middle);
  return merge(mergeSort(left, prop), mergeSort(right, prop), prop);
}

function merge(left: Msgs, right: Msgs, prop: keyof Msg): Msgs {
  const result: Msgs = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex][prop] < right[rightIndex][prop]) {
      result.push(left[leftIndex]);
      leftIndex++;
    } else {
      result.push(right[rightIndex]);
      rightIndex++;
    }
  }
  return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
}

let users: Msgs = [];

for (let i = 0; i < 50; i++) {
  users.push({ age: Math.floor(i + Math.random() * 6), name: "friday" });
}

console.time();
users = bucketSort(users, "age", "ASC");
console.timeEnd();
console.log(users);
