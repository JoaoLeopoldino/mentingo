import { createRequire } from "node:module";
const require = createRequire(new URL("../../../apps/api/package.json", import.meta.url));
require("dotenv").config({ path: new URL("../../../apps/api/.env", import.meta.url).pathname });
const { S3Client, HeadBucketCommand, CreateBucketCommand } = require("@aws-sdk/client-s3");
const endpoint = process.env.S3_ENDPOINT;
const Bucket = process.env.S3_BUCKET_NAME;
if (endpoint !== "http://127.0.0.1:59100" || Bucket !== "omatapalo-sprint") {
  throw new Error("Refusing to prepare storage outside the isolated sprint endpoint");
}
const client = new S3Client({ endpoint, region: process.env.S3_REGION, forcePathStyle: true,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
});
try {
  await client.send(new HeadBucketCommand({ Bucket }));
} catch (error) {
  if (error.$metadata?.httpStatusCode !== 404) throw error;
  await client.send(new CreateBucketCommand({ Bucket }));
}
console.log("Local private sprint bucket is available");
client.destroy();
