import test from 'node:test';
import assert from 'node:assert/strict';
import {MeterLevels,CanvasBusMeters,amplitudeDB} from '../../../shared-loop/0.1.0/public/scope-metadata.js';
const audio=(peak,rms,frames=512)=>({rate:'audio',channels:1,sourceFrames:frames,frames,peaks:[peak],rms:[rms]});
test('audio aggregates observed peaks and sample-weighted RMS without scanning samples',()=>{
 const m=new MeterLevels(1,'audio');m.append(audio(.9,.2,100));m.append(audio(.3,.4,300));const v=m.take(0)[0];
 assert.equal(v.peak,.9);assert.ok(Math.abs(v.rms-Math.sqrt(.13))<1e-12);assert.equal(m.lanes[0].weight,0);assert.equal(m.packets,2);
 m.append(audio(.2,.1));assert.equal(m.take(125)[0].peak,.9);m.append(audio(.2,.1));assert.equal(m.take(601)[0].peak,.2);
 assert.equal(amplitudeDB(1),0);assert.ok(Math.abs(amplitudeDB(.5)+6.020599913)<1e-8);assert.equal(amplitudeDB(0),-60);
});
test('control keeps signed last values and observed ranges across update windows',()=>{
 const m=new MeterLevels(2,'control');m.append({rate:'control',channels:2,sourceFrames:3,frames:3,peaks:[.8,2],rms:[.5,1],samples:new Float32Array([-.8,.2,-.3,2,-1,.75])});const [a,b]=m.take(0);
 assert.ok(Math.abs(a.current+.3)<1e-6);assert.ok(Math.abs(a.low+.8)<1e-6);assert.equal(b.current,.75);assert.equal(b.low,-1);assert.equal(b.high,2);
 assert.deepEqual(m.take(100)[1],{rms:1,peak:2,current:.75,low:.75,high:.75});assert.throws(()=>m.append(audio(1,1)),/routing/);
});
test('small canvas bank handles DPR, idle de-duplication, 16 widgets and teardown',()=>{
 const make=()=>({width:0,height:0,dataset:{},setAttribute(){},getBoundingClientRect:()=>({width:88,height:38}),getContext:()=>new Proxy({},{get:(obj,k)=>obj[k]??(()=>{})})});
 const container={hidden:false,children:[],replaceChildren(){this.children=[]},append(c){this.children.push(c)},ownerDocument:{createElement:make}};
 const bank=new CanvasBusMeters(container,{now:()=>0,dpr:()=>2});bank.configure({bus:32,channels:16,rate:'control'});
 const packet={rate:'control',channels:16,frames:1,sourceFrames:1,peaks:Array(16).fill(.25),rms:Array(16).fill(.25),samples:new Float32Array(16).fill(-.25)};
 bank.append(packet);bank.render();assert.equal(bank.paints,16);assert.equal(container.children[0].width,176);assert.equal(container.children[0].height,76);assert.equal(container.children[15].dataset.bus,'47');
 bank.append(packet);bank.render();assert.equal(bank.paints,16);assert.equal(bank.updates,2);container.hidden=true;bank.render();assert.equal(bank.updates,2);bank.clear();assert.equal(container.children.length,0);
});
