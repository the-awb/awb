import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {readAudit,summarise} from './audit.mjs';
const root=process.argv[2];
const r=JSON.parse(await readFile(root+'/results.json'));
const a=await readAudit(root+'/output.audit');
const invalid=[];
a.rows.forEach((v,i)=>{if(v.seq!==i||v.frames!==512||v.hardwareFrames!==512||v.sampleRate!==44100||Object.values(v).some(x=>!Number.isFinite(x)))invalid.push(i)});
const phases=r.phases.map(p=>{
 const rows=a.rows.slice(p.outputRange.first,p.outputRange.end);
 assert.ok(rows.length&&rows.every(v=>!invalid.includes(v.seq)),'Invalid measured row');
 const s=summarise(rows);for(const key of ['residualCallbacks','overBudgetCallbacks','lateCallbacks','frameGaps','rateChanges','bufferChanges'])assert.equal(s[key],p.audio[key],p.label+' '+key);
 return {label:p.label,first:p.outputRange.first,end:p.outputRange.end,callbacks:rows.length,residualCallbacks:s.residualCallbacks,overBudgetCallbacks:s.overBudgetCallbacks,maxDspMs:s.maxDspMs};
});
const result={rereadAfterShutdown:true,callbacks:a.count,invalidRows:invalid,allMeasuredRowsValid:true,allMeasuredCountsMatch:true,listenerStatus:a.listenerStatus,phases};
await writeFile(root+'/audit-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
