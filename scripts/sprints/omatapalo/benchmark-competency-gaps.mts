/** CPU-only domain microbenchmark. No HTTP, database, concurrency or production-capacity claim. */
import {performance} from "node:perf_hooks";
import gaps from "../../../apps/api/src/competencies/competency-gaps";
const {buildCompetencyGaps}=gaps;
import type {CompetencyGapInput} from "../../../apps/api/src/competencies/competencies.types";
const input:CompetencyGapInput={employees:[],catalog:[],requirements:[],orderedEvidence:[]};
for(let j=0;j<20;j++){
 const competencyId=`competency-${j}`;
 input.catalog.push({id:competencyId,active:true});
 input.requirements.push({id:`requirement-${j}`,jobRoleId:"operator",competencyId,minimumLevel:2,effectiveFrom:"2026-01-01T00:00:00Z",effectiveUntil:null,courseId:null,learningPathId:null});
}
for(let i=0;i<500;i++){
 const userId=`fictional-employee-${i}`;input.employees.push({id:userId,jobRoleId:"operator"});
 for(const competency of input.catalog)for(const status of ["pending","approved","approved"] as const)input.orderedEvidence.push({userId,competencyId:competency.id,status,level:2,expiresAt:null});
}
const runs=[];
for(let i=0;i<13;i++){const start=performance.now();const rows=buildCompetencyGaps(input);const ms=performance.now()-start;if(rows.length!==10000)throw new Error("Unexpected matrix cardinality");if(i>=3)runs.push(ms);}
runs.sort((a,b)=>a-b);
console.log(JSON.stringify({scope:"Synthetic in-memory CPU microbenchmark only",employees:500,competencies:20,evidenceRecords:input.orderedEvidence.length,matrixRows:10000,warmupRuns:3,measuredRuns:10,minMs:runs[0],medianMs:runs[5],maxMs:runs[9]},null,2));
