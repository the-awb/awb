import test from 'node:test';
import assert from 'node:assert/strict';
import {OpacityValues,OpacityBusWidgets,valueOpacity} from '../public/scope-opacity.js';
import {ScopePainter,ScopeFrameClock} from '../../../shared-loop/0.1.0/public/scope-painter.js';
test('opacity mapping is explicit, clamped and preserves control sign',()=>{
 assert.equal(valueOpacity(0,'audio'),.12);assert.equal(valueOpacity(1,'audio'),1);assert.ok(Math.abs(valueOpacity(.001,'audio')-.12)<1e-10);
 assert.equal(valueOpacity(-1,'control'),.12);assert.equal(valueOpacity(0,'control'),.56);assert.equal(valueOpacity(1,'control'),1);assert.equal(valueOpacity(5,'control'),1);assert.equal(valueOpacity(-5,'control'),.12);assert.equal(valueOpacity(NaN,'control'),.12);
});
test('opacity observes latest control samples and weighted RMS without scanning audio PCM',()=>{
 const audio=new OpacityValues(1,'audio');audio.append({rate:'audio',channels:1,rms:[.2],sourceFrames:100});audio.append({rate:'audio',channels:1,rms:[.4],sourceFrames:300});assert.ok(Math.abs(audio.take()[0]-valueOpacity(Math.sqrt(.13),'audio'))<1e-10);assert.equal(audio.lanes[0].weight,0);
 const control=new OpacityValues(2,'control');control.append({rate:'control',channels:2,frames:3,samples:new Float32Array([1,.5,-1,-1,0,1])});assert.deepEqual(control.take(),[.12,1]);assert.throws(()=>control.append({rate:'audio',channels:2}),/routing/);control.reset();assert.deepEqual(control.take(),[.56,.56]);
});
function container(){const make=()=>({children:[],dataset:{},style:{setProperty(){}},classList:{toggle(){}},append(...nodes){this.children.push(...nodes);},replaceChildren(){this.children=[];},setAttribute(){},closest(){return this.hidden?this:null;}}),node=make();node.ownerDocument={createElement:make};return node;}
test('24/48/96 px widgets follow their own buses with only changed opacity writes',()=>{
 const node=container(),bank=new OpacityBusWidgets(node);bank.configure({bus:32,channels:2,rate:'control',size:'all'});assert.equal(bank.widgets.length,6);assert.equal(node.children.length,2);assert.deepEqual(bank.widgets.map(w=>w.face.dataset.size),['24','48','96','24','48','96']);
 bank.append({rate:'control',channels:2,frames:1,samples:new Float32Array([-1,1])});bank.render();assert.deepEqual(bank.widgets.map(w=>w.face.style.opacity),['0.120','0.120','0.120','1.000','1.000','1.000']);assert.equal(bank.writes,6);bank.render();assert.equal(bank.writes,6);node.hidden=true;bank.render();assert.equal(bank.updates,2);
 bank.configure({bus:33,channels:1,rate:'audio',size:'48'});assert.equal(bank.widgets.length,1);assert.equal(bank.widgets[0].face.dataset.bus,'33');bank.clear();assert.equal(bank.widgets.length,0);assert.equal(node.children.length,0);assert.throws(()=>bank.configure({bus:0,channels:1,rate:'audio',size:'99'}),/size/);
});
test('8 Hz is opt-in for opacity painters and default scope validation is unchanged',()=>{
 assert.throws(()=>new ScopePainter({paint(){},fps:8}),/rate/);
 let now=0,id=0;const jobs=new Map(),seen=[],clock={now:()=>now,requestFrame:fn=>{jobs.set(++id,{fn,at:(Math.floor((now+.001)/(1000/60))+1)*1000/60});return id;},cancelFrame:id=>jobs.delete(id),setTimer:(fn,ms)=>{jobs.set(++id,{fn,at:now+ms});return id;},clearTimer:id=>jobs.delete(id)};
 const shared=new ScopeFrameClock(clock),p=new ScopePainter({...clock,rates:[8,15],fps:8,requestFrame:fn=>shared.request(fn),cancelFrame:id=>shared.cancel(id),phase:()=>shared.epoch,paint:()=>seen.push(shared.timestamp)});
 const advance=at=>{while(true){const item=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!item||item[1].at>at+.001)break;jobs.delete(item[0]);now=item[1].at;item[1].fn(now);}now=at;};
 for(let at=0;at<2000;at+=10){advance(at);p.invalidate();}advance(2200);assert.ok(seen.length>=16&&seen.length<=18);const before=seen.length;p.setRate(15);for(let at=2200;at<4200;at+=10){advance(at);p.invalidate();}advance(4350);assert.ok(seen.length-before>=29&&seen.length-before<=32);assert.equal(jobs.size,0);p.close();shared.close();
});
