import { S3 } from "./blob.ts";

const s3 = new S3({
  endpoint:
    "https://8558ce0fcd37094558a4f0903e6bfa0e.r2.cloudflarestorage.com/exabase-test",
  accessKeyId: "ef59cbc2422688332361dc51ce030c56",
  secretAccessKey:
    "bb383fe0f4a8217cf1c40e62ad3a853424e623eb3e8a5a8372778bf8996a653e",
  bucketName: "exabase-test",
  region: "auto",
  maxRequestSizeInBytes: 5242880,
  requestAbortTimeout: undefined,
});

// List objects
const objects = await s3.list();
console.log(objects);

const { data, etag } = await s3.getObjectWithETag("/s3/test.txt");
if (!data) {
  const res = await s3.put("/s3/test.txt", "Hello, world!");
  console.log(res);
}
console.log(data, etag);
