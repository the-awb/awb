import test from 'node:test';
import assert from 'node:assert/strict';
import {ScopeHistory} from '../public/scope-history.js';
const chunk=(end,values,{step=1,generation=1}={})=>({generation,channels:1,sampleRate:48,frames:values.length/(step>1?2:1),sourceFrames:values.length/(step>1?2:1)*step,sourceEnd:end,format:step>1?'minmax':'samples',samples:new Float32Array(values)});
test('rolling history replaces the oldest chunks with bounded storage and correct temporal order',()=>{
 const history=new ScopeHistory(2);
 for(let end=2;end<=80;end+=2)history.append(chunk(end,[end-2,end-1]));
 assert.equal(history.capacity,32);assert.deepEqual([...history.view(8).samples],[72,73,74,75,76,77,78,79]);
 assert.equal(history.view(32).missingSourceFrames,0);assert.equal(history.low.length,32);
});
test('missing publications are visible gaps, and duplicate packets do not invent history',()=>{
 const history=new ScopeHistory(2);history.append(chunk(2,[0,1]));history.append(chunk(6,[4,5]));
 const view=history.view(6);assert.deepEqual([...view.samples],[0,1,NaN,NaN,4,5]);assert.equal(view.missingSourceFrames,2);
 assert.equal(history.append(chunk(6,[7,8])),false);assert.deepEqual([...history.view(6).samples],[0,1,NaN,NaN,4,5]);
});
test('minmax chunks retain source span and immutable frozen views while the ring advances',()=>{
 const history=new ScopeHistory(4);history.append(chunk(8,[-1,.5,-.5,1],{step:4}));
 const frozen=history.view(8);assert.equal(frozen.frames,2);assert.deepEqual([...frozen.samples],[-1,.5,-.5,1]);
 history.append(chunk(16,[-.2,.3,-.1,.2],{step:4}));assert.deepEqual([...frozen.samples],[-1,.5,-.5,1]);
 assert.equal(history.view(16).sourceFrames,16);
 history.append(chunk(20,[.1,.2],{step:1}));assert.equal(history.step,1);assert.equal(history.view(4).missingSourceFrames,2);
});
test('instrument identity/rate changes clear old history and channels remain planar',()=>{
 const history=new ScopeHistory(2);history.append(chunk(2,[1,2]));
 history.append({...chunk(4,[3,4,30,40]),frames:2,sourceFrames:2,channels:2,generation:2});
 const view=history.view(4);assert.deepEqual([...view.samples],[NaN,NaN,3,4,NaN,NaN,30,40]);assert.equal(view.missingSourceFrames,2);
});

test('display storage can be reused while default frozen snapshots remain independent',()=>{
 const history=new ScopeHistory(2);history.append(chunk(2,[1,2]));const frozen=history.view(2),scratch=history.view(2);
 history.append(chunk(4,[3,4]));const next=history.view(2,{reuse:scratch.samples});assert.equal(next.samples,scratch.samples);assert.deepEqual([...frozen.samples],[1,2]);assert.deepEqual([...next.samples],[3,4]);
 const wider=history.view(4,{reuse:next.samples});assert.notEqual(wider.samples,next.samples);assert.equal(wider.samples.length,4);
});


test('selection remaps common channel history and marks newly requested past lanes missing',()=>{
 const h=new ScopeHistory(2);
 const selected=(end,ids,values)=>({...chunk(end,values),frames:2,sourceFrames:2,channels:ids.length,sourceChannels:6,channelIds:ids});
 h.append(selected(2,[0,1],[1,2,10,20]));h.append(selected(4,[0,1],[3,4,30,40]));const held=h.view(4);
 h.append(selected(4,[1],[30,40]));assert.deepEqual([...h.view(4).samples],[10,20,30,40]);assert.equal(h.view(4).missingSourceFrames,0);
 h.append(selected(4,[1,2],[30,40,300,400]));const expanded=h.view(4);
 assert.deepEqual([...expanded.samples],[10,20,30,40,NaN,NaN,300,400]);assert.equal(expanded.missingSourceFrames,2);
 assert.deepEqual([...held.samples],[1,2,3,4,10,20,30,40]);
 assert.equal(h.append(selected(2,[0],[1,2])),false);assert.deepEqual(h.channelIds,[1,2]);assert.equal(h.latest.sourceEnd,4);
});

test('wide control history retains exact ordered transitions as a single raw trace',()=>{
 const h=new ScopeHistory(128),source=Float32Array.from({length:2048},(_,i)=>i%97<43?-.75:.8);
 for(let start=0;start<source.length;start+=32)h.append({generation:1,channels:1,sourceChannels:6,channelIds:[5],sampleRate:750,frames:32,sourceFrames:32,sourceEnd:start+32,format:'samples',samples:source.slice(start,start+32)});
 const wide=h.view(2048);assert.equal(wide.format,'samples');assert.equal(wide.frames,2048);assert.equal(wide.missingSourceFrames,0);assert.deepEqual(wide.samples,source);
});
