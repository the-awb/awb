import {readFile,writeFile} from 'node:fs/promises';
const paths=process.argv.slice(2),old=JSON.parse(await readFile(paths[0]||'/private/tmp/awb-meter-legacy8-comparison.json','utf8')),next=JSON.parse(await readFile(paths[1]||'/private/tmp/awb-meter-aligned15-comparison.json','utf8'));
for(const report of [old,next])if(!report.complete||!report.cleanup||report.unrelatedTools!==0)throw new Error('Incomplete or unrelated-tool comparison');
if(old.widget.hz!==8||next.widget.hz!==15)throw new Error('Expected 8 and 15 Hz inputs');
const stats=a=>({mean:a.reduce((sum,v)=>sum+v,0)/a.length,min:Math.min(...a),max:Math.max(...a)});
const rows=(report,rate,channels,view)=>report.phases.filter(p=>p.rate===rate&&p.channels===channels&&p.view===view);
const metrics=['electronCPU','rendererCPU','gpuCPU','waveHz','meterHz','metadataHz','meterDrawMsPerSecond','meterAppendMsPerSecond','scAudioCPU','packetHz'];
const details=(report,rate,channels,view)=>{const phases=rows(report,rate,channels,view);if(!phases.length)throw new Error('Missing case');return Object.fromEntries(metrics.map(k=>[k,stats(phases.map(p=>p[k]))]));};
const cases=[];
for(const rate of ['audio','control'])for(const channels of [1,16])for(const view of ['waves','meters','both']){
 const before=details(old,rate,channels,view),after=details(next,rate,channels,view),phases=rows(next,rate,channels,view);
 cases.push({rate,channels,view,before,after,delta:after.electronCPU.mean-before.electronCPU.mean,sharedFrameFraction:view==='both'?stats(phases.map(p=>p.sharedFrameFraction)):null});
}
const incremental=[];
for(const rate of ['audio','control'])for(const channels of [1,16]){
 const values=report=>stats(Array.from({length:report.repeats},(_,i)=>rows(report,rate,channels,'both').find(p=>p.repeat===i+1).electronCPU-rows(report,rate,channels,'waves').find(p=>p.repeat===i+1).electronCPU));
 incremental.push({rate,channels,before:values(old),after:values(next)});
}
const report={cases,incremental,phases:old.phases.length+next.phases.length,machine:next.machine,sessionBefore:old.session,sessionAfter:next.session,window:{width:1100,height:900},plot:next.plot,widgetBefore:old.widget,widgetAfter:next.widget,sourceHashesBefore:old.sourceHashes,sourceHashesAfter:next.sourceHashes,cleanup:true};
await writeFile(paths[2]||'/private/tmp/awb-meter-cadence-comparison.json',JSON.stringify(report,null,2));
for(const c of cases)console.log(`${c.rate} ${c.channels} ${c.view}: ${c.before.electronCPU.mean.toFixed(2)} -> ${c.after.electronCPU.mean.toFixed(2)}% (${c.delta.toFixed(2)} pp); meters ${c.after.meterHz.mean.toFixed(2)} Hz; shared=${c.sharedFrameFraction?.mean??'—'}`);
for(const c of incremental)console.log(`${c.rate} ${c.channels} added to waves: ${c.before.mean.toFixed(2)} -> ${c.after.mean.toFixed(2)} pp`);
