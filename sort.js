function generateRandomObjectID() {
  const timestamp = Math.floor(new Date().getTime() / 1000).toString(16);
  const random = Math.floor(Math.random() * 16777215).toString(16);
  const increment = Math.floor(Math.random() * 255).toString(16);

  return `${timestamp}uiyufydrseewaweswesw4555675e4w3gfcfcf${random}=-97y76vf4de4sw${increment}`;
}

function bucketSort(arr) {
  const bucketSize = 5; // Adjust the bucket size based on your data distribution
  const buckets = createBuckets(arr, bucketSize);

  return mergeBuckets(buckets);
}

function createBuckets(arr, bucketSize) {
  const buckets = new Map();
  arr.forEach((id) => {
    const bucketIndex = Math.floor(id.toString().charCodeAt(0) / bucketSize);
    if (!buckets.has(bucketIndex)) {
      buckets.set(bucketIndex, []);
    }
    buckets.get(bucketIndex).push(id);
  });

  return Array.from(buckets.values());
}

function mergeSort(arr) {
  if (arr.length <= 1) {
    return arr;
  }
  const middle = Math.floor(arr.length / 2);
  const left = arr.slice(0, middle);
  const right = arr.slice(middle);

  return merge(mergeSort(left), mergeSort(right));
}

function merge(left, right) {
  let result = [];
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

function mergeBuckets(buckets) {
  let result = [];

  buckets.forEach((bucket) => {
    const sortedBucket = mergeSort(bucket);
    result = result.concat(sortedBucket);
  });

  return result;
}

function benchmarkSort(sortFunction, arr) {
  const startTime = performance.now();
  sortFunction([...arr]); // Make a copy of the array to avoid modifying the original
  const endTime = performance.now();
  return endTime - startTime;
}

// Example usage:
const unsortedObjectIDs = generateRandomObjectIDs(900_000); // Adjust the array size based on your needs

// Bucket Sort with Merge Sort for each bucket
const bucketSortTime = benchmarkSort(bucketSort, unsortedObjectIDs);
console.log(`Bucket Sort Time: ${bucketSortTime.toFixed(4)} milliseconds`);

// Function to generate a random array of ObjectIDs
function generateRandomObjectIDs(size) {
  const array = [];
  for (let i = 0; i < size; i++) {
    array.push(generateRandomObjectID());
  }
  return array;
}
