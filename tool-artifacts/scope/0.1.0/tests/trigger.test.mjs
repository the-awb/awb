import test from 'node:test';
import assert from 'node:assert/strict';
import {ScopeHistory,findTriggerWindow} from '../../../shared-loop/0.1.0/public/scope-history.js';
const publish=(h,start,n,fn,{channels=1,step=1}={})=>h.append({generation:1,sampleRate:44100,channels,frames:n,sourceFrames:n*step,sourceEnd:start+n*step,format:step===1?'samples':'minmax',samples:Float32Array.from({length:n*channels*(step===1?1:2)},(_,i)=>fn(start+(i%n)*step,Math.floor(i/n)))});
test('arbitrary periodic raw inputs align to measured crossings at 44.1/48 kHz and both edges',()=>{
 for(const rate of [44100,48000])for(const edge of ['rising','falling']){
  const h=new ScopeHistory(1024),freq=137.29,level=.13;let last,seen=0;
  for(let start=0;start<16000;start+=512){
   publish(h,start,512,i=>.7*Math.sin(i*2*Math.PI*freq/rate+.71));
   const w=findTriggerWindow(h,{count:1024,level,edge});if(!w)continue;
   const v=h.view(1025,{end:w.end}),pre=Math.floor(1023*.25),at=pre+w.fraction,j=Math.floor(at),t=at-j;
   assert.ok(Math.abs(v.samples[j]*(1-t)+v.samples[j+1]*t-level)<1e-6);
   assert.equal(v.missingSourceFrames,0);assert.equal(v.sourceEnd,w.end);
   if(last)assert.ok(w.crossing>=last);last=w.crossing;seen++;
  }
  assert.ok(seen>20);
 }
});
test('trigger selection uses one lane and a shared time range for every channel',()=>{
 const h=new ScopeHistory(16);publish(h,0,128,(i,ch)=>ch===0?42:Math.sin(i*.3),{channels:2});
 assert.equal(findTriggerWindow(h,{count:32,channel:0}),null);
 const w=findTriggerWindow(h,{count:32,channel:1});assert.ok(w);const v=h.view(33,{end:w.end});assert.ok([...v.samples.subarray(0,33)].every(v=>v===42));
 assert.throws(()=>findTriggerWindow(h,{count:32,channel:2}),/Invalid trigger/);
});
test('missing chunks never provide a crossing or complete trigger window',()=>{
 const h=new ScopeHistory(16);publish(h,0,32,()=>-1);publish(h,48,32,()=>1);
 assert.equal(findTriggerWindow(h,{count:16}),null);
 publish(h,80,32,i=>i<88?-1:1);const w=findTriggerWindow(h,{count:16});assert.ok(w);assert.equal(h.view(17,{end:w.end}).missingSourceFrames,0);
 const gap=new ScopeHistory(16);publish(gap,0,32,i=>i<30?-1:1);publish(gap,48,32,()=>1);assert.equal(findTriggerWindow(gap,{count:16}),null);
});
test('DC and out-of-range thresholds wait; envelopes are never treated as ordered crossings',()=>{
 const h=new ScopeHistory(16);publish(h,0,128,()=>.5);assert.equal(findTriggerWindow(h,{count:16}),null);
 publish(h,128,128,i=>Math.sin(i*.3));assert.equal(findTriggerWindow(h,{count:16,level:2}),null);
 const envelope=new ScopeHistory(16);publish(envelope,0,16,()=>.5,{step:4});assert.equal(findTriggerWindow(envelope,{count:16}),null);
});
test('Connected locates fractional crossing; Stepped aligns the actual sample transition',()=>{
 const h=new ScopeHistory(4);publish(h,0,64,i=>i<37?-.25:.75);
 const connected=findTriggerWindow(h,{count:16}),stepped=findTriggerWindow(h,{count:16,mode:'stepped'});
 assert.equal(connected.crossing,36.25);assert.equal(connected.fraction,.25);assert.equal(stepped.crossing,37);assert.equal(stepped.fraction,0);
});
test('history endpoint views and point reads remain bounded across wrap without modifying live/frozen views',()=>{
 const h=new ScopeHistory(4);for(let start=0;start<256;start+=16)publish(h,start,16,i=>i);
 const latest=h.view(16),held=h.view(17,{end:240});assert.equal(held.sourceEnd,240);assert.deepEqual([...held.samples],Array.from({length:17},(_,i)=>223+i));
 assert.equal(h.sampleAt(191),NaN);assert.equal(h.sampleAt(192),192);assert.equal(h.sampleAt(256),NaN);
 assert.throws(()=>h.view(16,{end:257}),/Invalid history end/);assert.throws(()=>h.view(16,{end:254.5}),/Invalid history end/);
 publish(h,256,16,i=>i);assert.equal(latest.sourceEnd,256);assert.equal(latest.samples[0],240);assert.equal(held.samples[0],223);
});
