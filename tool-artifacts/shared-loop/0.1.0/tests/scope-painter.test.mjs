import test from 'node:test';
import assert from 'node:assert/strict';
import {ScopePainter} from '../public/scope-painter.js';
import {ScopeHistory} from '../public/scope-history.js';
function clock(){let now=0,next=0;const jobs=new Map();
 const schedule=(fn,at)=>{const id=++next;jobs.set(id,{fn,at});return id};
 return {now:()=>now,requestFrame:fn=>schedule(fn,(Math.floor(now/16)+1)*16),cancelFrame:id=>jobs.delete(id),setTimer:(fn,ms)=>schedule(fn,now+ms),clearTimer:id=>jobs.delete(id),
 advance(target){while(true){const job=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!job||job[1].at>target)break;jobs.delete(job[0]);now=job[1].at;job[1].fn(now);}now=target;},pending:()=>jobs.size};
}
test('paint rate caps coalesce dirty frames and do no idle work',()=>{
 for(const fps of [0,30,15]){const c=clock(),seen=[];let latest=0;const p=new ScopePainter({...c,fps,paint:()=>seen.push(latest)});
  for(let at=0;at<1000;at+=10){c.advance(at);latest++;p.invalidate();}c.advance(1100);
  assert.equal(seen.at(-1),100);assert.equal(new Set(seen).size,seen.length);
  if(fps){assert.ok(seen.length<=fps+2);assert.ok(seen.length>fps*.7);}else assert.ok(seen.length>50);
  assert.equal(c.pending(),0);const count=p.count;c.advance(2000);assert.equal(p.count,count);p.close();
 }
});
test('throttled paint retains all incoming source-indexed history rather than dropping samples',()=>{
 const c=clock(),h=new ScopeHistory(16),views=[];const p=new ScopePainter({...c,fps:15,paint:()=>views.push(h.view(Math.min(h.latest.sourceEnd,256)))});
 for(let i=0;i<100;i++){c.advance(i*10);h.append({generation:1,channels:1,sampleRate:200,frames:2,sourceFrames:2,sourceEnd:(i+1)*2,format:'samples',samples:new Float32Array([i*2,i*2+1])});p.invalidate();}
 c.advance(1100);assert.ok(views.length<20);assert.equal(views.at(-1).missingSourceFrames,0);assert.deepEqual([...views.at(-1).samples],Array.from({length:200},(_,i)=>i));p.close();
});
test('urgent controls bypass the pending data deadline and rate changes replace it',()=>{
 const c=clock(),seen=[],p=new ScopePainter({...c,fps:15,paint:()=>seen.push(c.now())});p.invalidate();c.advance(16);assert.deepEqual(seen,[16]);
 c.advance(20);p.invalidate();assert.equal(c.pending(),1);p.invalidate(true);c.advance(32);assert.deepEqual(seen,[16,32]);
 c.advance(35);p.invalidate();p.setRate(30);c.advance(48);assert.deepEqual(seen,[16,32,48]);assert.equal(p.fps,30);c.advance(200);assert.equal(seen.length,3);p.close();
});
test('shutdown cancels both pending frame and deadline; frozen receiving can omit invalidation',()=>{
 const c=clock(),p=new ScopePainter({...c,fps:15,paint:()=>{}});p.invalidate();p.close();c.advance(100);assert.equal(p.count,0);assert.equal(c.pending(),0);
 const q=new ScopePainter({...c,fps:15,paint:()=>{}});q.invalidate();c.advance(112);q.invalidate();assert.equal(c.pending(),1);q.close();q.invalidate(true);c.advance(1000);assert.equal(q.count,1);assert.equal(c.pending(),0);
});
test('rate validation and timing diagnostics remain bounded',()=>{
 const c=clock(),p=new ScopePainter({...c,paint:()=>{}});for(const bad of [NaN,-1,5,60,'15'])assert.throws(()=>p.setRate(bad),/rate/);
 for(let i=0;i<600;i++){p.invalidate();c.advance((i+1)*16);}const d=p.diagnostics();assert.equal(d.paints,600);assert.equal(d.paintTimes.length,512);assert.equal(d.paintTimes[0],89*16);assert.equal(d.paintTimes.at(-1),600*16);p.close();
});
