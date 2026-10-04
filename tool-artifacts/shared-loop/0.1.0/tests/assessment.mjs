import {readScopeFrame} from './read-scope-frame.mjs';
import {encodeScopeFrame} from '../public/scope-protocol.js';
// Optional, test-owned measurements; never runs during ordinary instrument launch.
import {setTimeout as delay} from 'node:timers/promises';
import {performance} from 'node:perf_hooks';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
export async function assess({serverProbe,session,url,scopeWindows}) {
 const processes=[process.pid,...scopeWindows.map(w=>w.webContents.getOSProcessId())];
 async function usage(){const {stdout}=await exec('/bin/ps',['-p',processes.join(','),'-o','pid=','-o','time=','-o','rss=']);return stdout.trim().split('\n').map(line=>{const [pid,time,rss]=line.trim().split(/\s+/);const parts=time.split(':').map(Number);return {pid:Number(pid),cpuSeconds:parts.reduce((sum,part)=>sum*60+part,0),rssMiB:Number(rss)/1024};});}
 async function phase(name){await delay(2500);const before=await usage(),started=performance.now(),cpu=process.cpuUsage(),statuses=[];
  for(let i=0;i<20;i++){statuses.push(await serverProbe.request('/status',[],'/status.reply'));await delay(250);}
  const elapsed=(performance.now()-started)/1000,used=process.cpuUsage(cpu),after=await usage();
  return {name,seconds:elapsed,scAverageCPU:mean(statuses.map(s=>s[5])),scPeakCPU:Math.max(...statuses.map(s=>s[6])),nodeMainCorePercent:(used.user+used.system)/1e4/elapsed,processes:after.map(p=>({...p,corePercent:100*(p.cpuSeconds-before.find(b=>b.pid===p.pid).cpuSeconds)/elapsed}))};
 }
 const phases=[];
 try {
  scopeWindows.forEach(w=>w.hide());serverProbe.send('/n_run',session.scopeNodeId,0);await serverProbe.sync();phases.push(await phase('scopes-paused-viewers-hidden-loop-stopped'));
  serverProbe.send('/n_run',session.scopeNodeId,1);await serverProbe.sync();scopeWindows.forEach(w=>w.show());phases.push(await phase('scopes-running-two-viewers-loop-stopped'));
  serverProbe.send('/n_set',session.nodeId,'play',1,'overdub',1);await serverProbe.sync();phases.push(await phase('scopes-running-two-viewers-overdub'));
  const state={scopes:{mic:await readScopeFrame(url,'mic'),output:await readScopeFrame(url,'output')}};
  const serialized=Object.fromEntries(['mic','output'].map(kind=>[kind,`data: ${JSON.stringify({kind,snapshot:{...state.scopes[kind],samples:Array.from(state.scopes[kind].samples)},connected:true,error:null})}\n\n`]));
  const raw=Object.fromEntries(['mic','output'].map(kind=>[kind,new Float32Array(state.scopes[kind].samples)]));
  const count=3000,start=performance.now();let bytes=0;
  for(let i=0;i<count;i++)for(const kind of ['mic','output'])bytes+=JSON.stringify({...state.scopes[kind],samples:Array.from(raw[kind])}).length;
  const convertSerializePairUs=(performance.now()-start)*1000/count;
  const wire=Object.fromEntries(Object.entries(serialized).map(([k,v])=>[k,Buffer.byteLength(v)]));
  return {sampleRate:session.sampleRate,phases,legacyJsonBytesPerPair:wire.mic+wire.output,binaryBytesPerPair:encodeScopeFrame('mic',state.scopes.mic,session.sharedId).byteLength+encodeScopeFrame('output',state.scopes.output,session.sharedId).byteLength,legacyJsonMiBPerSecondAt30Hz:(wire.mic+wire.output)*30/1048576,convertSerializePairUs,benchmarkPairs:count,benchmarkBytes:bytes};
 } finally {serverProbe.send('/n_run',session.scopeNodeId,1);serverProbe.send('/n_set',session.nodeId,'play',0,'overdub',0);await serverProbe.sync();scopeWindows.forEach(w=>w.show());}
}
