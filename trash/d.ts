import { run, bench } from "mitata";

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

const numb = (txt: string) => {
  return Number(
    txt
      .toLowerCase()
      .split("")
      .map((c) => {
        return "abcdefghijklmnopqrstuvwxyz1234567890".indexOf(c);
      })
      .join("")
  );
};

function letterValue(str) {
  var anum = {
    a: 1,
    b: 2,
    c: 3,
    d: 4,
    e: 5,
    f: 6,
    g: 7,
    h: 8,
    i: 9,
    j: 10,
    k: 11,
    l: 12,
    m: 13,
    n: 14,
    o: 15,
    p: 16,
    q: 17,
    r: 18,
    s: 19,
    t: 20,
    u: 21,
    v: 22,
    w: 23,
    x: 24,
    y: 25,
    z: 26,
  };
  if (str.length == 1) return anum[str] || "";
  return Number(str.split("").map(letterValue).join(""));
}

function convertLetterToNumber(a: string) {
  let encode = "";
  for (let i = 0; i < a.length; i++) {
    encode += a[i].charCodeAt(0);
  }
  return Number(encode);
}

function convertLetterToNumber2(str: string) {
  let out = 0,
    len = str.length;
  for (let pos = 0; pos < len; pos++) {
    out += str.charCodeAt(pos);
  }
  return out;
}

{
  bench("a", async () => {
    numb("668d199095683c20b0e5f911");
  });
}
{
  bench("b", async () => {
    letterValue("668d199095683c20b0e5f911");
  });
}
{
  bench("c", async () => {
    convertLetterToNumber("668d199095683c20b0e5f911");
  });
}
{
  bench("d", async () => {
    convertLetterToNumber2("668d199095683c20b0e5f911");
  });
}

run();

const a = numb("668d199095683c20b0e5f911");
const b = letterValue("668d199095683c20b0e5f911");
const c = convertLetterToNumber("668d199095683c20b0e5f911");
const d = convertLetterToNumber2("668d199095683c20b0e5f911");

console.log({ a, b, c, d });
