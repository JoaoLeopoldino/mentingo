/** Local object-storage rehearsal: immutable disk backup and fresh private restore bucket; never overwrites source. */
import { createRequire } from "node:module";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
const require = createRequire(new URL("../../../apps/api/package.json", import.meta.url));
require("dotenv").config({path: new URL("../../../apps/api/.env", import.meta.url).pathname});
const {S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, CreateBucketCommand, HeadBucketCommand} = require("@aws-sdk/client-s3");
const endpoint=process.env.S3_ENDPOINT, source=process.env.S3_BUCKET_NAME;
if(endpoint!=="http://127.0.0.1:59100" || source!=="omatapalo-sprint" || process.env.NODE_ENV!=="development") throw new Error("Refusing storage outside the local sprint");
const client=new S3Client({endpoint,region:process.env.S3_REGION,forcePathStyle:true,
  credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY}});
const id=randomUUID(), target=`omatapalo-restore-${id}`, folder=new URL(`../../../.local/sprint/storage-restore-${id}/`, import.meta.url);
const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
const list=async Bucket=>{
  const objects=[];let ContinuationToken;
  do { const page=await client.send(new ListObjectsV2Command({Bucket,ContinuationToken}));objects.push(...(page.Contents??[]));ContinuationToken=page.NextContinuationToken; }while(ContinuationToken);
  return objects.sort((a,b)=>a.Key.localeCompare(b.Key));
};
const anonymous=async (Bucket,Key)=>{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
  try {const r=await fetch(`${endpoint}/${Bucket}/${Key.split("/").map(encodeURIComponent).join("/")}`,{signal:controller.signal}); await r.body?.cancel();return r.status;}finally{clearTimeout(timer);}
};
const startedAt=new Date().toISOString(), started=performance.now();
try{
  const before=await list(source);const totalBytes=before.reduce((n,x)=>n+(x.Size??0),0);
  if(!before.length)throw new Error("An empty bucket is not a recovery proof");
  if(totalBytes>256*1024*1024)throw new Error("Local rehearsal capped at 256 MiB; arrange a larger authorized volume");
  await mkdir(folder,{recursive:false,mode:0o700});
  const records=[];const backupStarted=performance.now();
  for(const [index,item] of before.entries()){
    const object=await client.send(new GetObjectCommand({Bucket:source,Key:item.Key}));
    const bytes=await object.Body.transformToByteArray();
    if(bytes.length!==item.Size)throw new Error("Object changed during capture");
    const file=`${index}.bin`;await writeFile(new URL(file,folder),bytes,{flag:"wx",mode:0o600});
    records.push({key:item.Key,file,bytes:bytes.length,sha256:sha(bytes),contentType:object.ContentType??"application/octet-stream"});
  }
  const backupMs=performance.now()-backupStarted;
  try{await client.send(new HeadBucketCommand({Bucket:target}));throw new Error("Restore target already exists");}catch(e){if(e.$metadata?.httpStatusCode!==404)throw e;}
  await client.send(new CreateBucketCommand({Bucket:target}));
  const restoreStarted=performance.now();
  for(const record of records){
    const bytes=await readFile(new URL(record.file,folder));
    if(sha(bytes)!==record.sha256)throw new Error("Backup fingerprint mismatch");
    await client.send(new PutObjectCommand({Bucket:target,Key:record.key,Body:bytes,ContentType:record.contentType,IfNoneMatch:"*"}));
    const restored=await client.send(new GetObjectCommand({Bucket:target,Key:record.key}));
    if(sha(await restored.Body.transformToByteArray())!==record.sha256 || restored.ContentType!==record.contentType)throw new Error("Restore fingerprint or metadata mismatch");
  }
  const restored=await list(target), after=await list(source);
  const stable=x=>JSON.stringify(x.map(({Key,Size,ETag})=>({Key,Size,ETag})));
  if(stable(before)!==stable(after))throw new Error("Source changed during rehearsal");
  if(restored.length!==before.length)throw new Error("Restored object count mismatch");
  const probes=[];
  for(const record of [records[0],records.find(x=>/certificate/i.test(x.key))].filter(Boolean)){
    const sourceStatus=await anonymous(source,record.key), restoredStatus=await anonymous(target,record.key);
    if(![401,403].includes(sourceStatus)||![401,403].includes(restoredStatus))throw new Error("Anonymous object access was not denied");
    probes.push({key:record.key,sourceStatus,restoredStatus});
  }
  const report={startedAt,endedAt:new Date().toISOString(),elapsedMs:performance.now()-started,source,target,folder:folder.pathname,
    objectCount:records.length,totalBytes,backupMs,restoreMs:performance.now()-restoreStarted,matched:true,anonymousProbes:probes,
    records, limits:"Same local RustFS host and credentials; fresh private bucket and disk backup. No external copy, lost-host recovery, object versions/ACL/lifecycle policy reconstruction or application cutover. No SLA implied."};
  await writeFile(new URL("manifest.json",folder),JSON.stringify(report,null,2),{flag:"wx",mode:0o600});
  await writeFile(new URL("../../../.local/sprint/storage-backup-restore.json",import.meta.url),JSON.stringify(report,null,2),{mode:0o600});
  console.log(JSON.stringify({startedAt:report.startedAt,endedAt:report.endedAt,elapsedMs:report.elapsedMs,objectCount:report.objectCount,totalBytes,backupMs,restoreMs:report.restoreMs,matched:true,target,anonymousStatuses:probes.map(x=>[x.sourceStatus,x.restoredStatus])}));
}finally{client.destroy();}
