import {readFile,writeFile} from 'node:fs/promises';
const stats=a=>({mean:a.reduce((s,v)=>s+v,0)/a.length,min:Math.min(...a),max:Math.max(...a)});
const files=process.argv.slice(2);if(!files.length)files.push(...['modes','optimisations','jitter','jitter-awake'].map(s=>'/private/tmp/awb-scope-next-'+s+'.json'));
const metrics=['electronCPU','mainCPU','scopeRendererCPU','gpuCPU','backgroundRendererCPU','rssMiB','scAudioCPU','scPeakCPU','rawRate','rawGapFrames','packetRate','paintRate','labelRate','KiBs','maxPaintGapMs','sourceLagMs','drawMsPerSecond','historyMsPerSecond'];
const reports={};
for(const file of files){
 const report=JSON.parse(await readFile(file,'utf8'));if(!report.complete||!report.cleanup)throw new Error('Incomplete run '+file);
 const cases=Object.fromEntries([...new Set(report.phases.map(p=>p.name))].map(name=>{
  const rows=report.phases.filter(p=>p.name===name),values=Object.fromEntries(metrics.filter(k=>rows.every(r=>Number.isFinite(r[k]))).map(k=>[k,stats(rows.map(r=>r[k]))]));
  values.poll=Object.fromEntries(['p50','p95','p99','max','overPublication','workP99'].filter(k=>rows.every(r=>Number.isFinite(r.poll[k]))).map(k=>[k,stats(rows.map(r=>r.poll[k]))]));
  const workers=rows.filter(r=>r.workerStats);if(workers.length)values.worker=Object.fromEntries(['sourceGaps','queueSkippedFrames','p99','max','overPublication','workP99'].map(k=>[k,stats(workers.map(r=>r.workerStats[k]))]));
  const gaps=rows.flatMap(r=>r.poll.gaps),publicationMs=rows[0].poll.publicationMs;
  return [name,{count:rows.length,...values,gapEvents:gaps.length,gapEventsAfterLatePoll:gaps.filter(g=>g.pollIntervalMs>publicationMs).length}];
 }));
 const pairs={};
 for(const group of [...new Set(report.phases.map(p=>p.group).filter(Boolean))]){
  const versions=report.series==='modes'?['connected','stepped']:report.series==='optimisations'?['baseline','geometry','cached','ring']:[];
  for(let v=1;v<versions.length;v++){
   const from=versions[v-1],to=versions[v],rows=[];
   for(const repeat of [...new Set(report.phases.map(p=>p.repeat))]){
    const find=value=>report.phases.find(p=>p.group===group&&p.repeat===repeat&&(report.series==='modes'?p.traceMode:p.asset)===value),a=find(from),b=find(to);
    rows.push({repeat,fromCPU:a.electronCPU,toCPU:b.electronCPU,delta:b.electronCPU-a.electronCPU,relativePercent:100*(b.electronCPU/a.electronCPU-1)});
   }
   pairs[group+':'+from+'→'+to]={rows,delta:stats(rows.map(r=>r.delta)),relativePercent:stats(rows.map(r=>r.relativePercent))};
  }
 }
 reports[file.split('/').at(-1)]={file,series:report.series,awake:!!report.awake,cases,pairs,phases:report.phases.length,session:report.session,machine:report.machine,versions:report.versions,protectedCount:report.protectedCount,unrelatedTools:report.unrelatedTools};
}
await writeFile('/private/tmp/awb-scope-next-summary.json',JSON.stringify(reports,null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(reports).map(([name,r])=>[name,{phases:r.phases,cases:Object.fromEntries(Object.entries(r.cases).map(([name,c])=>[name,{cpu:c.electronCPU.mean,gaps:c.rawGapFrames.mean,worker:c.worker}]))}])),null,2));
