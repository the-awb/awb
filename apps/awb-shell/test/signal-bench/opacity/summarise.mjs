import {readFile,writeFile} from 'node:fs/promises';
const report=JSON.parse(await readFile(process.argv[2]||'/private/tmp/awb-opacity-cost.json','utf8'));if(!report.complete||!report.cleanup)throw new Error('Incomplete opacity measurements');
const stats=a=>({mean:a.reduce((s,v)=>s+v,0)/a.length,min:Math.min(...a),max:Math.max(...a)}),id=p=>[p.rate,p.channels,p.view,p.size||0,p.hz||0].join('/');
const metrics=['electronCPU','rendererCPU','gpuCPU','mainCPU','rssMiB','packetHz','waveHz','meterHz','opacityHz','opacityWritesHz','opacityAppendMsPerSecond','opacityDrawMsPerSecond','meterDrawMsPerSecond','metadataHz','scAudioCPU'];
const keys=[...new Set(report.phases.map(id))],cases=Object.fromEntries(keys.map(key=>{const phases=report.phases.filter(p=>id(p)===key);return [key,{count:phases.length,...Object.fromEntries(metrics.map(k=>[k,stats(phases.map(p=>p[k]))]))}];}));
const paired={};for(const key of keys){const current=report.phases.find(p=>id(p)===key);if(!['opacity','wave-opacity','meters','waves'].includes(current.view))continue;const baseline=current.view==='wave-opacity'?'waves':'capture',rows=[];
 for(let repeat=1;repeat<=report.repeats;repeat++){const a=report.phases.find(p=>p.repeat===repeat&&p.rate===current.rate&&p.channels===current.channels&&p.view===baseline),b=report.phases.find(p=>p.repeat===repeat&&id(p)===key);if(a&&b)rows.push({repeat,total:b.electronCPU-a.electronCPU,renderer:b.rendererCPU-a.rendererCPU,gpu:b.gpuCPU-a.gpuCPU});}
 if(rows.length)paired[key]={baseline,rows,total:stats(rows.map(r=>r.total)),renderer:stats(rows.map(r=>r.renderer)),gpu:stats(rows.map(r=>r.gpu))};
}
const summary={phases:report.phases.length,repeats:report.repeats,machine:report.machine,session:report.session,window:report.window,opacity:report.opacity,cases,paired,sourceHashes:report.sourceHashes,protectedCount:report.protectedCount,cleanup:report.cleanup};
await writeFile(process.argv[3]||'/private/tmp/awb-opacity-cost-summary.json',JSON.stringify(summary,null,2));
for(const [key,c] of Object.entries(cases))console.log(`${key}: ${c.electronCPU.mean.toFixed(2)}% (${c.electronCPU.min.toFixed(2)}–${c.electronCPU.max.toFixed(2)}); extra=${paired[key]?.total.mean.toFixed(2)??'—'} pp; opacity=${c.opacityHz.mean.toFixed(2)} Hz; JS=${c.opacityDrawMsPerSecond.mean.toFixed(3)} ms/s`);
