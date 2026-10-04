import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('./artifacts/benchmark-scaling/',import.meta.url);
const data=JSON.parse(await readFile(new URL('results.json',root),'utf8'));
if(data.runs.length!==72||data.runs.some(r=>r.mismatches.length||r.errors.length||r.updates!==r.movingControls*r.batches))throw Error('Scaling measurements are incomplete or invalid');
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const groups=[];
for(const mode of ['svg','canvas','osc'])for(const workload of ['idle',...[1,5,10,25,50,100,354].map(n=>`moving-${n}`)]){
 const runs=data.runs.filter(r=>r.mode===mode&&r.workload===workload);
 if(!runs.length)continue;
 const cpuPercent=r=>r.cpu.filter(p=>p.isRenderer||p.type==='GPU').reduce((n,p)=>n+p.cpuSeconds,0)*100/(r.elapsedMs/1000);
 groups.push({mode,workload,movingControls:runs[0].movingControls,cadenceMs:runs[0].cadenceMs,trials:runs.length,batches:runs[0].batches,updates:runs[0].updates,cpuPercentMedian:median(runs.map(cpuPercent)),cpuPercentRange:[Math.min(...runs.map(cpuPercent)),Math.max(...runs.map(cpuPercent))],rendererCpuPercentMedian:median(runs.map(r=>r.cpu.find(p=>p.isRenderer).cpuSeconds*100/(r.elapsedMs/1000))),cpuComponents:runs.map(r=>({trial:r.trial,renderer:r.cpu.find(p=>p.isRenderer).cpuSeconds*100/(r.elapsedMs/1000),gpuProcess:r.cpu.find(p=>p.type==='GPU').cpuSeconds*100/(r.elapsedMs/1000)})),gpuProcessCpuPercentMedian:median(runs.map(r=>r.cpu.find(p=>p.type==='GPU').cpuSeconds*100/(r.elapsedMs/1000))),frameP95MsMedian:median(runs.map(r=>r.frameP95Ms)),frameOver25PercentMedian:median(runs.map(r=>100*r.framesOver25ms/r.frameCount)),scheduleP95MsMedian:median(runs.map(r=>r.scheduleP95Ms)),rendererWorkingSetMiBMedian:median(runs.map(r=>r.cpu.find(p=>p.isRenderer).workingSetKB/1024)),longTaskCount:runs.reduce((n,r)=>n+r.longTasks.length,0),mismatchCount:runs.reduce((n,r)=>n+r.mismatches.length,0),appRenders:runs.map(r=>r.appRenders),rackRenders:runs.map(r=>r.svg?.rackRenders),canvasFullFrames:runs.map(r=>r.canvas?.fullFrames)});
}
const files=['../src/model.mjs','../src/main.jsx','../src/SvgRack.jsx','../src/CanvasRack.jsx','../src/canvasRenderer.mjs','../fixtures/live-set.rack.json','./benchmark-scaling.mjs','./summarize-scaling.mjs'];
const sources=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(new URL(f,import.meta.url))).digest('hex')])));
const oscBundle='/Applications/open-stage-control.app/Contents/Resources/app/client/open-stage-control-client.js';
try{sources[oscBundle]=createHash('sha256').update(await readFile(oscBundle)).digest('hex');}catch{}
const summary={date:new Date().toISOString(),method:data.method,engine:{electron:data.engine.electron,chromium:data.engine.chrome},hardware:data.hardware,controlled:data.controlled,refreshHz:data.display.displayFrequency,groups,sources,audit:data.audit??[],validation:{measurements:72,finalValueMismatches:0,rendererErrors:0,containerRerenders:data.runs.reduce((n,r)=>n+(r.appRenders??0)+(r.svg?.rackRenders??0)+(r.canvas?.hostRenders??0),0),changesPerMovingControl:188}};
await writeFile(new URL('summary.json',root),JSON.stringify(summary,null,2)+'\n');
console.table(groups.map(g=>({view:g.mode,count:g.movingControls,trials:g.trials,cpu:g.cpuPercentMedian.toFixed(1)+'%',p95Frame:g.frameP95MsMedian.toFixed(1)+'ms',slowFrames:g.frameOver25PercentMedian.toFixed(1)+'%',mismatches:g.mismatchCount})));
