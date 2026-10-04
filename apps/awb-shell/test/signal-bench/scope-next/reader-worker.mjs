// Fixture only. One native reader, one in-flight message and one queued latest frame.
import {parentPort,workerData} from 'node:worker_threads';
import {performance} from 'node:perf_hooks';
import {openScSignalSource} from '../../../src/scSignalSource.mjs';
let closing=false,timer,source,lastEnd=null,awaiting=false,queued=null,lastPoll=null;
let intervals=[],work=[],reads=0,sourceGaps=0,queueSkippedFrames=0;
const reset=()=>{intervals=[];work=[];reads=0;sourceGaps=0;queueSkippedFrames=0;lastPoll=null;};
const percentile=(a,p)=>{const values=[...a].sort((x,y)=>x-y);return values.length?values[Math.floor((values.length-1)*p)]:null;};
const stats=()=>({reads,sourceGaps,queueSkippedFrames,count:intervals.length,p50:percentile(intervals,.5),p95:percentile(intervals,.95),p99:percentile(intervals,.99),max:intervals.length?Math.max(...intervals):null,workP99:percentile(work,.99),overPublication:intervals.filter(t=>t>1000*512/source.info.sampleRate).length});
function deliver(frame){awaiting=true;parentPort.postMessage({type:'frame',frame},[frame.samples.buffer]);}
parentPort.on('message',async message=>{try{
 if(message.type==='ack'){awaiting=false;if(queued){const frame=queued;queued=null;deliver(frame);}}
 else if(message.type==='reset'){reset();parentPort.postMessage({type:'reply',id:message.id});}
 else if(message.type==='stats')parentPort.postMessage({type:'reply',id:message.id,stats:stats()});
 else if(message.type==='stop'){closing=true;clearInterval(timer);queued=null;await source?.stop();parentPort.postMessage({type:'reply',id:message.id});parentPort.close();}
}catch(error){parentPort.postMessage({type:'error',error:error.message});}});
try{
 source=await openScSignalSource({host:{...workerData.host,isConnected:()=>!closing},configuration:workerData.configuration});
 parentPort.postMessage({type:'ready',info:source.info});
 timer=setInterval(()=>{try{
  const at=performance.now();if(lastPoll!==null)intervals.push(at-lastPoll);lastPoll=at;
  const frame=source.read();work.push(performance.now()-at);
  if(frame&&frame.sourceEnd!==lastEnd){
   if(lastEnd!==null&&frame.sourceEnd-frame.frames>lastEnd)sourceGaps+=frame.sourceEnd-frame.frames-lastEnd;
   lastEnd=frame.sourceEnd;reads++;
   if(awaiting){if(queued)queueSkippedFrames+=queued.frames;queued=frame;}else deliver(frame);
  }
 }catch(error){clearInterval(timer);parentPort.postMessage({type:'error',error:error.message});}},4);
}catch(error){parentPort.postMessage({type:'error',error:error.message});parentPort.close();}
