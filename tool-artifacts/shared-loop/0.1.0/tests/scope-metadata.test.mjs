import test from 'node:test';
import assert from 'node:assert/strict';
import {ScopeMetadata} from '../public/scope-metadata.js';
import {ScopePainter} from '../public/scope-painter.js';
function clock(){let now=0,id=0;const jobs=new Map();return {now:()=>now,setTimer:(fn,ms)=>{jobs.set(++id,{fn,at:now+ms});return id;},clearTimer:id=>jobs.delete(id),advance(target){while(true){const job=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!job||job[1].at>target)break;jobs.delete(job[0]);now=job[1].at;job[1].fn();}now=target;},pending:()=>jobs.size};}
test('8 Hz labels coalesce a fast feed without throttling waveform painting',()=>{
 const c=clock(),labels=[],waves=[];let latest=0;
 const m=new ScopeMetadata({...c,update:()=>labels.push({at:c.now(),latest})});
 const p=new ScopePainter({...c,requestFrame:fn=>c.setTimer(()=>fn(c.now()),16),cancelFrame:c.clearTimer,paint:()=>waves.push(latest)});
 for(let at=0;at<1000;at+=10){c.advance(at);latest++;m.invalidate();p.invalidate();}c.advance(1100);
 assert.equal(labels.length,9);assert.ok(waves.length>40);assert.equal(labels.at(-1).latest,100);assert.equal(waves.at(-1),100);
 for(let i=1;i<labels.length;i++)assert.ok(labels[i].at-labels[i-1].at>=125);
 assert.equal(c.pending(),0);m.close();p.close();
});
test('freeze/control flush consumes pending text now; later ticks cannot change the frozen view',()=>{
 const c=clock(),seen=[];let latest=1;const m=new ScopeMetadata({...c,update:()=>seen.push(latest)});
 m.invalidate();c.advance(0);c.advance(10);latest=2;m.invalidate();m.flush();const frozen=[...seen];c.advance(1000);assert.deepEqual(seen,frozen);assert.deepEqual(seen,[1,2]);
 latest=3;m.invalidate();c.advance(1000);assert.equal(seen.at(-1),3);m.close();
});
test('closing cancels pending metadata and idle views schedule no recurring work',()=>{
 const c=clock();let updates=0;const m=new ScopeMetadata({...c,update:()=>updates++});m.invalidate();m.close();c.advance(1000);assert.equal(updates,0);assert.equal(c.pending(),0);m.invalidate();m.flush();assert.equal(updates,0);
 assert.throws(()=>new ScopeMetadata({update:()=>{},hz:0}),/Invalid/);
});
