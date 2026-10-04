import test from 'node:test';
import assert from 'node:assert/strict';
import {SignalCaptureBroker} from '../src/signalCaptureBroker.mjs';
const host=()=>({service:{},oscHost:'127.0.0.1',oscPort:57001,isConnected:()=>true});
function harness({deferred=false}={}){
 const sources=[];let resume,now=0,polls=0,clears=0;
 const broker=new SignalCaptureBroker({now:()=>now,setTimer:()=>{polls++;return 1},clearTimer:()=>clears++,open:async({configuration})=>{
  if(deferred)await new Promise(r=>resume=r);
  const source={configuration,closed:0,next:null,info:{generation:sources.length+1,sampleRate:44100},read(){return this.next},async stop(){this.closed++}};sources.push(source);return source;
 }});
 return {broker,sources,resume:()=>resume(),now:v=>now=v,counts:()=>({polls,clears})};
}
test('compatible subscribers share one open/read/clock; one close cannot detach its peer',async()=>{
 const h=harness(),sc=host(),seenA=[],seenB=[],config={bus:0,channels:2};
 const [a,b]=await Promise.all([h.broker.subscribe({host:sc,configuration:config,onFrame:f=>seenA.push(f)}),h.broker.subscribe({host:{...sc},configuration:config,onFrame:f=>seenB.push(f)})]);
 assert.equal(h.sources.length,1);assert.equal(a.generation,b.generation);assert.deepEqual(h.counts(),{polls:1,clears:0});
 const raw=new Float32Array([.1,.2]);h.sources[0].next={sourceEnd:512,samples:raw};h.broker.poll();h.broker.poll();
 assert.equal(seenA.length,1);assert.equal(seenB.length,1);assert.equal(seenA[0],seenB[0]);assert.equal(seenB[0].samples,raw);
 await a.stop();assert.equal(h.sources[0].closed,0);h.sources[0].next={sourceEnd:1024,samples:raw};h.broker.poll();assert.equal(seenB.length,2);assert.equal(seenA.length,1);
 await b.stop();await b.stop();assert.equal(h.sources[0].closed,1);assert.equal(h.broker.diagnostics().sources.length,0);assert.deepEqual(h.counts(),{polls:1,clears:1});await h.broker.close();
});
test('host identity, rate and channel range isolate incompatible captures',async()=>{
 const h=harness(),sc=host(),leases=[];
 for(const [server,config] of [[sc,{bus:0,channels:2}],[sc,{bus:0,channels:4}],[sc,{bus:0,channels:2,rate:'control'}],[host(),{bus:0,channels:2}]])leases.push(await h.broker.subscribe({host:server,configuration:config}));
 assert.equal(h.sources.length,4);assert.equal(h.counts().polls,1);await Promise.all(leases.map(l=>l.stop()));await h.broker.close();
});
test('cached data never refreshes freshness and a stalled source releases once',async()=>{
 const h=harness(),errors=[];const lease=await h.broker.subscribe({host:host(),configuration:{bus:0,channels:2},onError:e=>errors.push(e.message)});
 h.sources[0].next={sourceEnd:512};h.broker.poll();h.now(1999);h.broker.poll();assert.equal(h.broker.diagnostics().sources[0].ageMs,1999);
 h.now(2001);h.broker.poll();await new Promise(r=>setImmediate(r));assert.deepEqual(errors,['SC signal tap stopped publishing']);assert.equal(h.sources[0].closed,1);await lease.stop();await h.broker.close();assert.equal(h.sources[0].closed,1);
});
test('broker closure during allocation cleans the late source and rejects the subscription',async()=>{
 const h=harness({deferred:true});const opening=h.broker.subscribe({host:host(),configuration:{bus:0,channels:2}});await new Promise(r=>setImmediate(r));
 const closing=h.broker.close();h.resume();await assert.rejects(opening,/closed during startup/);await closing;assert.equal(h.sources[0].closed,1);assert.equal(h.broker.diagnostics().sources.length,0);assert.equal(h.counts().polls,0);
});
test('failed open leaves no source; a consumer error cannot break another subscriber',async()=>{
 let count=0;const sc=host(),errors=[],good=[];const source={info:{},read:()=>({sourceEnd:512}),stop:async()=>{}};
 const broker=new SignalCaptureBroker({setTimer:()=>1,clearTimer:()=>{},open:async()=>{if(++count===1)throw new Error('allocation failed');return source}});
 await assert.rejects(broker.subscribe({host:sc,configuration:{bus:0,channels:2}}),/allocation failed/);assert.equal(broker.diagnostics().sources.length,0);
 const a=await broker.subscribe({host:sc,configuration:{bus:0,channels:2},onFrame:()=>{throw new Error('bad consumer')},onError:e=>errors.push(e.message)});
 const b=await broker.subscribe({host:sc,configuration:{bus:0,channels:2},onFrame:f=>good.push(f)});broker.poll();assert.deepEqual(errors,['bad consumer']);assert.equal(good.length,1);await a.stop();await b.stop();await broker.close();
});

test('reacquisition waits for the previous detach/free before opening a new generation',async()=>{
 const sc=host();let resolveStop,opens=0;const broker=new SignalCaptureBroker({setTimer:()=>1,clearTimer:()=>{},open:async()=>{
  const generation=++opens;return {info:{generation},read:()=>null,stop:async()=>{if(generation===1)await new Promise(r=>resolveStop=r)}};
 }});
 const a=await broker.subscribe({host:sc,configuration:{bus:0,channels:2}});const stopping=a.stop();await new Promise(r=>setImmediate(r));
 const starting=broker.subscribe({host:sc,configuration:{bus:0,channels:2}});await new Promise(r=>setImmediate(r));assert.equal(opens,1);
 resolveStop();await stopping;const b=await starting;assert.equal(b.generation,2);await b.stop();await broker.close();
});
test('shutdown waits for every source even when another cleanup fails',async()=>{
 let resolveStop;const sc=host(),broker=new SignalCaptureBroker({setTimer:()=>1,clearTimer:()=>{},open:async({configuration})=>({info:{},read:()=>null,stop:async()=>{
  if(configuration.bus===0)throw new Error('close failed');await new Promise(r=>resolveStop=r);
 }})});
 await broker.subscribe({host:sc,configuration:{bus:0,channels:2}});await broker.subscribe({host:sc,configuration:{bus:2,channels:2}});
 let finished=false;const closing=broker.close().catch(error=>{finished=true;throw error});await new Promise(r=>setImmediate(r));assert.equal(finished,false);
 resolveStop();await assert.rejects(closing,/cleanup failed/);assert.equal(broker.diagnostics().sources.length,0);
});


test('identical display profiles share one transform while raw PCM and other profiles stay independent',async()=>{
 const h=harness(),sc=host(),configuration={bus:0,channels:2},raw=[],a=[],b=[],wide=[];let factories=0,appends=0;
 const createTransform=()=>{factories++;return {append(frame){appends++;return {...frame,sourceFrames:frame.frames,format:'samples'}}}};
 const args={host:sc,configuration,profile:'display:1',createTransform};
 const [la,lb,lr,lw]=await Promise.all([
  h.broker.subscribeDerived({...args,onFrame:f=>a.push(f)}),h.broker.subscribeDerived({...args,onFrame:f=>b.push(f)}),
  h.broker.subscribe({host:sc,configuration,onFrame:f=>raw.push(f)}),
  h.broker.subscribeDerived({...args,profile:'display:16',onFrame:f=>wide.push(f)})
 ]);
 assert.equal(factories,2);assert.equal(h.sources.length,1);
 const pcm=new Float32Array([.1,.2]);h.sources[0].next={sourceEnd:2,frames:2,samples:pcm};h.broker.poll();h.broker.poll();
 assert.equal(appends,2);assert.equal(a[0],b[0]);assert.notEqual(a[0],wide[0]);assert.equal(raw[0].samples,pcm);
 assert.equal(h.broker.diagnostics().sources[0].subscribers,3);assert.equal(h.broker.diagnostics().derived[0].subscribers,2);
 await la.stop();await lb.stop();assert.equal(h.sources[0].closed,0);
 h.sources[0].next={sourceEnd:4,frames:2,samples:pcm};h.broker.poll();assert.equal(raw.length,2);assert.equal(wide.length,2);assert.equal(a.length,1);
 await lw.stop();assert.equal(h.sources[0].closed,0);await lr.stop();assert.equal(h.sources[0].closed,1);assert.equal(h.broker.diagnostics().derived.length,0);await h.broker.close();
});
test('late derived subscription receives original freshness without transforming cached PCM again',async()=>{
 const h=harness(),sc=host(),configuration={bus:0,channels:2},seen=[];let calls=0;
 const args={host:sc,configuration,profile:'p',createTransform:()=>({append:f=>{calls++;return f}})};
 const a=await h.broker.subscribeDerived(args);h.now(100);h.sources[0].next={sourceEnd:512};h.broker.poll();h.now(900);
 const b=await h.broker.subscribeDerived({...args,onFrame:(f,info)=>seen.push([f.sourceEnd,info.publishedAt])});
 assert.deepEqual(seen,[[512,100]]);assert.equal(calls,1);assert.equal(h.broker.diagnostics().derived[0].ageMs,800);
 await a.stop();await b.stop();await h.broker.close();
});
test('display transform failure releases only its profile and leaves a raw peer streaming',async()=>{
 const h=harness(),sc=host(),configuration={bus:0,channels:2},errors=[],raw=[];
 const display=await h.broker.subscribeDerived({host:sc,configuration,profile:'broken',createTransform:()=>({append(){throw new Error('display failure')}}),onError:e=>errors.push(e.message)});
 const peer=await h.broker.subscribe({host:sc,configuration,onFrame:f=>raw.push(f)});h.sources[0].next={sourceEnd:512};h.broker.poll();await new Promise(r=>setImmediate(r));
 assert.deepEqual(errors,['display failure']);assert.equal(h.broker.diagnostics().derived.length,0);assert.equal(h.sources[0].closed,0);
 h.sources[0].next={sourceEnd:1024};h.broker.poll();assert.equal(raw.length,2);await display.stop();await peer.stop();await h.broker.close();
});
test('derived closure during allocation rejects startup but waits for late raw cleanup',async()=>{
 const h=harness({deferred:true});const opening=h.broker.subscribeDerived({host:host(),configuration:{bus:0,channels:2},profile:'p',createTransform:()=>({append:f=>f})});
 await new Promise(r=>setImmediate(r));const closing=h.broker.close();h.resume();await assert.rejects(opening,/closed during startup/);await closing;
 assert.equal(h.sources[0].closed,1);assert.equal(h.broker.diagnostics().derived.length,0);assert.equal(h.broker.diagnostics().sources.length,0);
});
test('display profiles validate factories and isolate callback exceptions',async()=>{
 const h=harness(),sc=host(),configuration={bus:0,channels:2},errors=[],seen=[];
 for(const bad of [{profile:'',createTransform:()=>({append:f=>f})},{profile:'p',createTransform:()=>({})}])await assert.rejects(h.broker.subscribeDerived({host:sc,configuration,...bad}),/profile|append/);
 const args={host:sc,configuration,profile:'p',createTransform:()=>({append:f=>f})};
 const a=await h.broker.subscribeDerived({...args,onFrame(){throw new Error('callback failure')},onError:e=>errors.push(e.message)});
 const b=await h.broker.subscribeDerived({...args,onFrame:f=>seen.push(f)});h.sources[0].next={sourceEnd:512};h.broker.poll();
 assert.deepEqual(errors,['callback failure']);assert.equal(seen.length,1);await a.stop();await b.stop();await h.broker.close();
});
