import { randomBytes } from "node:crypto";
import { memoryUsage } from "node:process";

function generateRandomObjectID() {
  return randomBytes(16).toString("hex");
}

console.log(generateRandomObjectID(), generateRandomObjectID().length);

function bucketSort(arr: any) {
  const bucketSize = Math.floor(arr / 2); // Adjust the bucket size based on your data distribution
  const buckets = createBuckets(arr, bucketSize);
  return mergeBuckets(buckets);
}

function createBuckets(arr: any[], bucketSize: number) {
  const buckets = new Map();
  arr.forEach((id: { toString: () => string }) => {
    const bucketIndex = Math.floor(id.toString().charCodeAt(0) / bucketSize);
    if (!buckets.has(bucketIndex)) {
      buckets.set(bucketIndex, []);
    }
    buckets.get(bucketIndex).push(id);
  });

  return Array.from(buckets.values());
}

function mergeSort(arr: string | any[]) {
  if (arr.length <= 1) {
    return arr;
  }
  const middle = Math.floor(arr.length / 2);
  const left = arr.slice(0, middle);
  const right = arr.slice(middle);
  return merge(mergeSort(left), mergeSort(right));
}

function merge(left: string | any[], right: string | any[]) {
  const result: any[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] < right[rightIndex]) {
      result.push(left[leftIndex]);
      leftIndex++;
    } else {
      result.push(right[rightIndex]);
      rightIndex++;
    }
  }
  return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
}

function mergeBuckets(buckets: any[]) {
  let result = [];
  buckets.forEach((bucket: any) => {
    const sortedBucket = mergeSort(bucket);
    result = result.concat(sortedBucket);
  });
  return result;
}

function benchmarkSort(
  sortFunction: { (arr: any): never[]; (arg0: any[]): void },
  arr: string[]
) {
  const a = [...arr];
  const startTime = performance.now();
  sortFunction(a); // Make a copy of the array to avoid modifying the original
  const endTime = performance.now();
  return endTime - startTime;
}

// Example usage:
const unsortedObjectIDs = generateRandomObjectIDs(100); // Adjust the array size based on your needs

// Bucket Sort with Merge Sort for each bucket
const bucketSortTime = benchmarkSort(bucketSort, unsortedObjectIDs);
console.log(`Bucket Sort Time: ${bucketSortTime.toFixed(4)} milliseconds`);

// Function to generate a random array of ObjectIDs
function generateRandomObjectIDs(size: number) {
  const array: string[] = [];
  for (let i = 0; i < size; i++) {
    array.push(generateRandomObjectID());
  }
  return array;
}

const used = memoryUsage();

console.log(`Memory usage: ${formatBytes(used.rss)}`);

function formatBytes(bytes: number) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Byte";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((100 * bytes) / Math.pow(1024, i)) / 100 + " " + sizes[i];
}
