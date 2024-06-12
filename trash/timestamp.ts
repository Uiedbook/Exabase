export const encode_timestamp = (timestamp: string): string => {
  const time = ~~(new Date(timestamp).getTime() / 1000);
  const buffer = Buffer.alloc(4);
  buffer[3] = time & 0xff;
  buffer[2] = (time >> 8) & 0xff;
  buffer[1] = (time >> 16) & 0xff;
  buffer[0] = (time >> 24) & 0xff;
  return buffer.toString("hex");
};
export const decode_timestamp = (timestamp: string): string => {
  return new Date(parseInt(timestamp, 16) * 1000).toString();
};

const time = new Date().toString();
const encodedTS = encode_timestamp(time);
const decodedTS = decode_timestamp(encodedTS);
console.log({ encodedTS, decodedTS, time }, time === decodedTS);
