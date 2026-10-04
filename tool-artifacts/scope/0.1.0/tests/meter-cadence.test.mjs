import test from 'node:test';
import assert from 'node:assert/strict';
import {ScopePainter,ScopeFrameClock} from '../../../shared-loop/0.1.0/public/scope-painter.js';
import {ScopeMetadata} from '../../../shared-loop/0.1.0/public/scope-metadata.js';
function clock(hz){let now=0,id=0;const jobs=new Map(),period=1000/hz;
 const schedule=(fn,at)=>{jobs.set(++id,{fn,at});return id;};
 return {now:()=>now,requestFrame:fn=>schedule(fn,(Math.floor((now+.001)/period)+1)*period),cancelFrame:id=>jobs.delete(id),setTimer:(fn,ms)=>schedule(fn,now+ms),clearTimer:id=>jobs.delete(id),
 advance(target){while(true){const job=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!job||job[1].at>target+.0001)break;jobs.delete(job[0]);now=job[1].at;job[1].fn(now);}now=target;},pending:()=>jobs.size};
}
test('15 Hz meters share every second 30 Hz wave frame and every fourth 60 Hz frame',()=>{
 for(const [displayHz,waveFPS,stride] of [[30,30,2],[60,30,2],[60,0,4]]){
  const c=clock(displayHz),shared=new ScopeFrameClock(c),waves=[],meters=[],labels=[];
  const options={...c,requestFrame:fn=>shared.request(fn),cancelFrame:id=>shared.cancel(id),phase:()=>shared.epoch};
  const wave=new ScopePainter({...options,fps:waveFPS,paint:()=>waves.push(shared.timestamp)}),meter=new ScopePainter({...options,fps:15,paint:()=>meters.push(shared.timestamp)}),metadata=new ScopeMetadata({...c,update:()=>labels.push(c.now())});
  for(let at=0;at<2000;at+=5){c.advance(at);wave.invalidate();meter.invalidate();metadata.invalidate();}c.advance(2150);
  assert.ok(meters.length>=29&&meters.length<=31);assert.ok(labels.length>=16&&labels.length<=17);
  for(let i=0;i<meters.length;i++){if(meters[i]>=2000)continue;assert.ok(waves.includes(meters[i]),'Meter and wave share frame '+JSON.stringify({displayHz,waveFPS,at:meters[i],waves}));if(i&&i<meters.length-1){assert.equal(waves.indexOf(meters[i])-waves.indexOf(meters[i-1]),stride);assert.ok(Math.abs(meters[i]-meters[i-1]-1000/15)<.001);}}
  assert.equal(c.pending(),0);wave.close();meter.close();metadata.close();shared.close();
 }
});
test('meters retain cadence with a 23 Hz control feed while waves are frozen; close cancels work',()=>{
 const c=clock(60),shared=new ScopeFrameClock(c),times=[],options={...c,requestFrame:fn=>shared.request(fn),cancelFrame:id=>shared.cancel(id),phase:()=>shared.epoch};
 const meter=new ScopePainter({...options,fps:15,paint:()=>times.push(shared.timestamp)});
 for(let at=0;at<2000;at+=1000/23){c.advance(at);meter.invalidate();}c.advance(2100);
 assert.ok(times.length>=29&&times.length<=31);for(let i=1;i<times.length;i++)assert.ok(Math.abs(times[i]-times[i-1]-1000/15)<.001);
 assert.equal(c.pending(),0);const count=times.length;c.advance(3000);assert.equal(times.length,count);
 meter.invalidate();meter.close();shared.close();c.advance(4000);assert.equal(c.pending(),0);assert.equal(times.length,count);
});
test('shared frame cancellation keeps other consumers and reentrant requests on later frames',()=>{
 const c=clock(60),shared=new ScopeFrameClock(c),seen=[];
 const first=shared.request(()=>seen.push('cancelled'));shared.request(()=>{seen.push('wave');shared.request(()=>seen.push('next'));});shared.request(()=>seen.push('meter'));shared.cancel(first);
 assert.equal(c.pending(),1);c.advance(17);assert.deepEqual(seen,['wave','meter']);assert.equal(c.pending(),1);c.advance(34);assert.deepEqual(seen,['wave','meter','next']);
 shared.request(()=>seen.push('closed'));shared.close();c.advance(100);assert.equal(c.pending(),0);assert.equal(shared.request(()=>{}),null);
});
