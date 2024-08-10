function bucketSort(array: Record<string, string | number>[], key: string) {
  let buckets: Record<string, string | number>[][] = [],
    i: number,
    j: number,
    b: number,
    d = 0;
  for (; d < 32; d += 4) {
    for (i = 16; i--; ) buckets[i] = [];
    for (i = array.length; i--; )
      buckets[(array[i][key] >> d) & 15].push(array[i]);
    for (b = 0; b < 16; b++)
      for (j = buckets[b].length; j--; ) array[++i] = buckets[b][j];
  }
  return array;
}
const a = bucketSort([{ name: "c" }, { name: "a" }, { name: "b" }], "name");
console.log(a);
