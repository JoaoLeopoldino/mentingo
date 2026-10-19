/** Short local infrastructure probes; always unpause in finally. No data deletion or production endpoints. */
import {execFileSync} from "node:child_process";
import {writeFile} from "node:fs/promises";
import {createConnection} from "node:net";
const containers=["utu-omatapalo-sprint-storage-1","utu-omatapalo-sprint-redis-1"];
const paused=new Set();
const restore=()=>{for(const name of paused){execFileSync("docker",["unpause",name],{stdio:"ignore"});paused.delete(name);}};
for(const signal of ["SIGINT","SIGTERM"])process.once(signal,()=>{restore();process.exit(130);});
const probe=async name=>{
 if(name.includes("storage")){const r=await fetch("http://127.0.0.1:59100/health",{signal:AbortSignal.timeout(2500)});await r.body?.cancel();return{status:r.status};}
 return new Promise((resolve,reject)=>{const socket=createConnection({host:"127.0.0.1",port:56379});socket.setTimeout(2500);
 socket.once("connect",()=>socket.write("PING\r\n"));socket.once("data",bytes=>{socket.destroy();resolve({reply:bytes.toString().trim()});});
 socket.once("error",reject);socket.once("timeout",()=>{socket.destroy();reject(new Error("probe_timeout"));});});
};
const startedAt=new Date().toISOString(),results=[];
try{
 for(const name of containers){const state=JSON.parse(execFileSync("docker",["inspect","--format","{{json .State}}",name],{encoding:"utf8"}));
  if(!state.Running||state.Paused)throw new Error("Refusing an unavailable or already paused local service");
  const before=await probe(name);execFileSync("docker",["pause",name],{stdio:"ignore"});paused.add(name);
  let rejected=false,errorName;const start=performance.now();
  try{await probe(name);}catch(error){rejected=true;errorName=error.name;}
  finally{execFileSync("docker",["unpause",name],{stdio:"ignore"});paused.delete(name);}
  const failureObservedMs=performance.now()-start;const after=await probe(name);
  if(!rejected)throw new Error("Probe unexpectedly succeeded while the service was paused");
  results.push({name,before,interruptionRejected:rejected,errorName,failureObservedMs,after});
 }
 const report={startedAt,finishedAt:new Date().toISOString(),results,limits:"Brief pause of local synthetic RustFS/Redis; infrastructure probes only. Not an in-flight upload/transaction rollback, lost-host, sustained outage or application auth fail-closed proof. PostgreSQL was not paused."};
 await writeFile(new URL("../../../.local/sprint/service-interruption.json",import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{restore();}
