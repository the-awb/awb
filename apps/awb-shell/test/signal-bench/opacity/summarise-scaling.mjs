import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const report=JSON.parse(await readFile(process.argv[2]||'/private/tmp/awb-opacity-scaling.json','utf8'));
assert.ok(report.complete&&report.cleanup&&report.hostSurvives);
const expected=report.repeats*(3+2*report.opacity.widgetCounts.length*report.opacity.sizes.length*2);
assert.equal(report.phases.length,expected);assert.equal(report.protectedCount,16);assert.equal(report.unrelatedTools,0);
const stats=a=>({mean:a.reduce((s,v)=>s+v,0)/a.length,min:Math.min(...a),max:Math.max(...a)}),id=p=>[p.rate,p.widgets,p.view,p.size||0,p.hz||0].join('/');
const metrics=['electronCPU','rendererCPU','gpuCPU','mainCPU','rssMiB','packetHz','opacityHz','opacityWritesHz','opacityAppendMsPerSecond','opacityDrawMsPerSecond','metadataHz','scAudioCPU'];
const keys=[...new Set(report.phases.map(id))],cases=Object.fromEntries(keys.map(key=>{const phases=report.phases.filter(p=>id(p)===key);assert.equal(phases.length,report.repeats);return [key,{count:phases.length,...Object.fromEntries(metrics.map(k=>[k,stats(phases.map(p=>p[k]))]))}];}));
const paired={};
for(const key of keys){const current=report.phases.find(p=>id(p)===key);if(current.view!=='opacity')continue;paired[key]={};
 for(const baseline of ['capture','sixteen']){const rows=[];
  for(let repeat=1;repeat<=report.repeats;repeat++){const a=report.phases.find(p=>p.repeat===repeat&&p.rate===current.rate&&(baseline==='capture'?p.view==='capture':p.view==='opacity'&&p.widgets===16&&p.size===current.size&&p.hz===current.hz)),b=report.phases.find(p=>p.repeat===repeat&&id(p)===key);if(a&&b)rows.push({repeat,total:b.electronCPU-a.electronCPU,renderer:b.rendererCPU-a.rendererCPU,gpu:b.gpuCPU-a.gpuCPU});}
  if(rows.length)paired[key][baseline]={rows,total:stats(rows.map(r=>r.total)),renderer:stats(rows.map(r=>r.renderer)),gpu:stats(rows.map(r=>r.gpu))};
 }
}
const summary={phases:report.phases.length,repeats:report.repeats,machine:report.machine,session:report.session,window:report.window,opacity:report.opacity,cases,paired,sourceHashes:report.sourceHashes,protectedCount:report.protectedCount,cleanup:report.cleanup};
await writeFile(process.argv[3]||'/private/tmp/awb-opacity-scaling-summary.json',JSON.stringify(summary,null,2));
for(const [key,c] of Object.entries(cases))console.log(`${key}: ${c.electronCPU.mean.toFixed(2)}% (${c.electronCPU.min.toFixed(2)}-${c.electronCPU.max.toFixed(2)}); vs16=${paired[key]?.sixteen?.total.mean.toFixed(2)??'-'} pp; opacity=${c.opacityHz.mean.toFixed(2)} Hz; JS=${c.opacityDrawMsPerSecond.mean.toFixed(3)} ms/s`);
