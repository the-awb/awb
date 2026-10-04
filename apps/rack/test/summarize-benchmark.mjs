import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('./artifacts/benchmark/',import.meta.url);
const data=JSON.parse(await readFile(new URL('results.json',root),'utf8'));
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const groups=[];
for(const mode of ['svg','canvas','osc'])for(const workload of ['idle','single-control','INIT-open-attune-arise','all-354-controls']){
 const runs=data.runs.filter(r=>r.mode===mode&&r.workload===workload);
 if(!runs.length)continue;
 const cpuPercent=r=>r.cpu.filter(p=>p.isRenderer||p.type==='GPU').reduce((n,p)=>n+p.cpuSeconds,0)*100/(r.elapsedMs/1000);
 groups.push({mode,workload,trials:runs.length,updates:runs[0].updates,cpuPercentMedian:median(runs.map(cpuPercent)),cpuPercentRange:[Math.min(...runs.map(cpuPercent)),Math.max(...runs.map(cpuPercent))],rendererCpuPercentMedian:median(runs.map(r=>r.cpu.find(p=>p.isRenderer).cpuSeconds*100/(r.elapsedMs/1000))),gpuProcessCpuPercentMedian:median(runs.map(r=>r.cpu.find(p=>p.type==='GPU').cpuSeconds*100/(r.elapsedMs/1000))),frameP95MsMedian:median(runs.map(r=>r.frameP95Ms)),frameOver25PercentMedian:median(runs.map(r=>100*r.framesOver25ms/r.frameCount)),scheduleP95MsMedian:median(runs.map(r=>r.scheduleP95Ms)),rendererWorkingSetMiBMedian:median(runs.map(r=>r.cpu.find(p=>p.isRenderer).workingSetKB/1024)),longTaskCount:runs.reduce((n,r)=>n+r.longTasks.length,0),mismatchCount:runs.reduce((n,r)=>n+r.mismatches.length,0),appRenders:runs.map(r=>r.appRenders),rackRenders:runs.map(r=>r.svg?.rackRenders),canvasFullFrames:runs.map(r=>r.canvas?.fullFrames)});
}
const files=['../src/model.mjs','../src/main.jsx','../src/SvgRack.jsx','../src/CanvasRack.jsx','../src/canvasRenderer.mjs','../fixtures/live-set.rack.json','./benchmark.mjs'];
const sources=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(new URL(f,import.meta.url))).digest('hex')])));
const oscBundle='/Applications/open-stage-control.app/Contents/Resources/app/client/open-stage-control-client.js';
try{sources[oscBundle]=createHash('sha256').update(await readFile(oscBundle)).digest('hex');}catch{}
const summary={date:new Date().toISOString(),method:data.method,engine:{electron:data.engine.electron,chromium:data.engine.chrome},hardware:data.hardware,refreshHz:data.display.displayFrequency,groups,sources};
await writeFile(new URL('summary.json',root),JSON.stringify(summary,null,2)+'\n');
console.table(groups.map(g=>({view:g.mode,workload:g.workload,trials:g.trials,cpu:g.cpuPercentMedian.toFixed(1)+'%',p95Frame:g.frameP95MsMedian.toFixed(1)+'ms',slowFrames:g.frameOver25PercentMedian.toFixed(1)+'%',mismatches:g.mismatchCount})));
