import { memoryUsage } from "node:process";

const data = [
  {
    age: 0,
    name: "friday",
    _id: "6669e2611ed39a4d13b5f7f2",
  },
  {
    age: 3,
    name: "friday",
    _id: "6669e26241265476a372caec",
  },
  {
    age: 1,
    name: "friday",
    _id: "6669e2624aa9ff05e36b094f",
  },
  {
    age: 2,
    name: "friday",
    _id: "6669e2626259a7c02412d1be",
  },
  {
    age: 4,
    name: "friday",
    _id: "6669e262dddf2c15df03aea4",
  },
];

export function bucketSort2(arr: any[], prop: string) {
  const bucketSize = Math.floor(arr.length / 2); // Adjust the bucket size based on your data distribution
  const buckets = createBuckets(arr, bucketSize, prop);
  return mergeBuckets(buckets, prop);
}

function createBuckets(arr: any[], bucketSize: number, prop: string) {
  const buckets = new Map();
  arr.forEach((data) => {
    const bucketIndex = Math.floor(
      data[prop].toString().charCodeAt(0) / bucketSize
    );
    if (!buckets.has(bucketIndex)) {
      buckets.set(bucketIndex, []);
    }
    buckets.get(bucketIndex).push(data);
  });
  return Array.from(buckets.values());
}

function mergeSort(arr: any[], prop: string) {
  if (arr.length <= 1) {
    return arr;
  }
  const middle = Math.floor(arr.length / 2);
  const left = arr.slice(0, middle);
  const right = arr.slice(middle);
  return merge(mergeSort(left, prop), mergeSort(right, prop), prop);
}

function merge(left: any[], right: any[], prop: string) {
  const result: any[] = [];
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
  const sort = result
    .concat(left.slice(leftIndex))
    .concat(right.slice(rightIndex));

  return sort;
}

function mergeBuckets(buckets: any[], prop: string) {
  console.log(buckets, "---------->");

  let result = [];
  buckets.forEach((bucket: any) => {
    const sortedBucket = mergeSort(bucket, prop);
    result = result.concat(sortedBucket);
  });
  return result;
}

function benchmarkSort(
  sortFunction: (arr: any[], prop: string) => any[],
  arr: Record<string, any>[],
  prop: string
) {
  const a = [...arr];
  const startTime = performance.now();
  const data = sortFunction(a, prop); // Make a copy of the array to avoid modifying the original
  // console.log({ data });

  const endTime = performance.now();
  return endTime - startTime;
}

// Example usage:
// const unsortedObjectIDs = generateRandomObjectIDs(100); // Adjust the array size based on your needs

// Bucket Sort with Merge Sort for each bucket
const bucketSortTime = benchmarkSort(bucketSort2, data, "age");
console.log(`Bucket Sort Time: ${bucketSortTime.toFixed(4)} milliseconds`);

const used = memoryUsage();

console.log(`Memory usage: ${formatBytes(used.rss)}`);

function formatBytes(bytes: number) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Byte";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((100 * bytes) / Math.pow(1024, i)) / 100 + " " + sizes[i];
}
