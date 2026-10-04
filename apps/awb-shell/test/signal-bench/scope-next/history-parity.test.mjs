import test from 'node:test';
import assert from 'node:assert/strict';
import {ScopeHistory as Before} from './stages/baseline/scope-history.js';
import {ScopeHistory as After} from './stages/ring/scope-history.js';
test('bulk raw history preserves wrapped samples, missing intervals and channel expansion',()=>{
 let checks=0;
 for(const step of [1,4,16]){
  const a=new Before(128),b=new After(128);let end=0,seed=123;
  for(let n=0;n<600;n++){
   const channels=n%100<50?3:2,ids=channels===3?[0,1,5]:[1,5],frames=32,values=step>1?2:1;
   end+=frames*step*(n%41===0?2:1);
   const samples=Float32Array.from({length:channels*frames*values},(_,i)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (n+i)%79===0?NaN:(seed%2000-1000)/1000});
   const packet={generation:1,channels,channelIds:ids,sourceChannels:6,frames,sourceFrames:frames*step,sourceEnd:end,sampleRate:44100/64,format:values===2?'minmax':'samples',samples};
   a.append(packet);b.append(packet);
   for(const count of [1,17,128,2048/step]){
    const old=a.view(count*step),next=b.view(count*step);assert.deepEqual(next.samples,old.samples);assert.equal(next.missingSourceFrames,old.missingSourceFrames);checks++;
   }
  }
 }
 assert.equal(checks,7200);
});
