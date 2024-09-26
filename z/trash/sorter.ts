export function bucketSort(arr: any[]) {
  return mergeBuckets(createBuckets(arr));
}

function createBuckets(arr: any[]) {
  const buckets = new Map();
  const bucketSize = Math.floor(arr.length / 2);
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
