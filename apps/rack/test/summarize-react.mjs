import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('./artifacts/react-investigation/',import.meta.url);
const data=JSON.parse(await readFile(new URL('comparison.json',root),'utf8'));
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const component=(r,predicate)=>r.cpu.filter(predicate).reduce((n,p)=>n+p.cpuSeconds,0)*100/(r.elapsedMs/1000);
const cpu=r=>component(r,p=>p.isRenderer||p.type==='GPU');
if(data.runs.length!==42||data.runs.some(r=>r.mismatches.length||r.visibleMismatches?.length||r.actualValueChanges!==r.updates||r.updates!==r.count*188||r.appRenders||r.svg.rackRenders))throw Error('Incomplete or invalid comparison');
const groups=[];
for(const variant of ['baseline','readout'])for(const count of [1,5,10,25,50,100,354]){
 const runs=data.runs.filter(r=>r.variant===variant&&r.count===count);
 if(runs.length!==3)throw Error(`Missing repeats for ${variant}/${count}`);
 groups.push({variant,count,trials:3,cpuMedian:median(runs.map(cpu)),cpuRange:[Math.min(...runs.map(cpu)),Math.max(...runs.map(cpu))],rendererCpuMedian:median(runs.map(r=>component(r,p=>p.isRenderer))),gpuProcessCpuMedian:median(runs.map(r=>component(r,p=>p.type==='GPU'))),frameP95MsMedian:median(runs.map(r=>r.frameP95Ms)),frameOver25PercentMedian:median(runs.map(r=>100*r.framesOver25ms/r.frameCount)),scheduleP95MsMedian:median(runs.map(r=>r.scheduleP95Ms)),svgPaints:runs.map(r=>r.svg.valueUpdates??r.svg.controlRenders),controlRenders:runs.map(r=>r.svg.controlRenders),longTaskCount:runs.reduce((n,r)=>n+r.longTasks.length,0)});
}
const rows=[1,5,10,25,50,100,354].map(count=>{const before=groups.find(g=>g.variant==='baseline'&&g.count===count),after=groups.find(g=>g.variant==='readout'&&g.count===count);return {count,beforeCPU:before.cpuMedian,afterCPU:after.cpuMedian,reductionPercent:100*(before.cpuMedian-after.cpuMedian)/before.cpuMedian,beforeFrameP95Ms:before.frameP95MsMedian,afterFrameP95Ms:after.frameP95MsMedian};});
const files=['../src/SvgRack.jsx','../src/main.jsx','../src/style.css','../src/model.mjs','./benchmark-react.mjs','./benchmark-react-workload.mjs','./fixtures/react-baseline/SvgRack.jsx','./fixtures/react-baseline/main.jsx','./fixtures/react-baseline/style.css'];
const sources=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(new URL(f,import.meta.url))).digest('hex')])));
const summary={date:new Date().toISOString(),engine:data.engine,method:data.method??{window:[1400,1040],zoom:.8,controls:354,cadenceMs:32,durationMs:6000,warmupMs:700,trials:3,output:'off',cpu:'renderer plus own Chromium GPU-process cumulative CPU; 100 percent is one core',excludes:['browser/main','runtime/server','WindowServer','hardware GPU utilisation'],profiling:false},groups,rows,sources,validation:{measurements:42,changesPerMovingControl:188,finalModelAndDisplayedValueMismatches:0,containerRerenders:0}};
await writeFile(new URL('summary.json',root),JSON.stringify(summary,null,2)+'\n');
console.table(rows.map(r=>({controls:r.count,before:r.beforeCPU.toFixed(1)+'%',after:r.afterCPU.toFixed(1)+'%',reduction:r.reductionPercent.toFixed(1)+'%',beforeP95:r.beforeFrameP95Ms.toFixed(1)+'ms',afterP95:r.afterFrameP95Ms.toFixed(1)+'ms'})));
