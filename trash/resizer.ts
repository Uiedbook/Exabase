import { readFile, writeFile } from "fs/promises";
import { Packr } from "msgpackr";
const packr = new Packr();

const readDataFromFile = async (filePath: string) => {
  return packr.decode(await readFile(filePath)) || [];
};

const writeDataToFile = (filePath: string, data: any) => {
  return writeFile(filePath, packr.encode(data));
};

async function ResizeLogFiles(sources: string[], length = 1_000) {
  let leftovers: any[] = [];
  let current_index = 1;
  for (const src of sources) {
    const data = await readDataFromFile(src);
    leftovers.push(...data);
    // @ts-ignore
    [leftovers, current_index] = await ResizeLeftOvers(
      leftovers,
      current_index,
      length,
      false
    );
  }
  // ? save leftovers last
  // ? write point
  if (leftovers.length) {
    ResizeLeftOvers(leftovers, current_index, length, true);
  }
}
async function ResizeLeftOvers(
  leftovers: any[],
  current_index: number,
  length = 1_000,
  last = false
) {
  while (leftovers.length >= length) {
    // ? > length
    // ? keep leftovers
    const data = [...leftovers.splice(0, length)];
    // ? write point
    await writeDataToFile("SCALE-" + current_index, data);
    current_index += 1;
  }
  // ? save leftovers last
  // ? write point
  if (leftovers.length && last) {
    await writeDataToFile("SCALE-" + current_index, leftovers);
  }
  return [leftovers, current_index];
}

await ResizeLogFiles(["LOG-1", "LOG-2", "LOG-3"]);
