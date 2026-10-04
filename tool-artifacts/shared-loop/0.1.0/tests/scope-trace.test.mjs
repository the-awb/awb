import test from 'node:test';
import assert from 'node:assert/strict';
import {paintScopeTrace} from '../public/scope-trace.js';
function context(){let points=[];return {globalAlpha:1,strokes:[],fills:[],beginPath(){points=[];},moveTo(x,y){points.push(['move',x,y]);},lineTo(x,y){points.push(['line',x,y]);},closePath(){points.push(['close']);},stroke(){this.strokes.push(points.map(p=>[...p]));},fill(){this.fills.push({alpha:this.globalAlpha,points:points.map(p=>[...p])});}};}
const options={width:40,middle:0,scale:1,gain:1};
test('adjacent min/max bounds form one connected band retaining every peak',()=>{
 const ctx=context();paintScopeTrace(ctx,{...options,samples:new Float32Array([-.2,.3,-.9,.95,-.1,.4]),format:'minmax',frames:3,count:3});
 assert.equal(ctx.fills.length,1);assert.equal(ctx.strokes.length,1);
 const ys=ctx.strokes[0].filter(p=>p.length===3).map(p=>p[2]);assert.ok(Math.abs(Math.min(...ys)+.95)<1e-6);assert.ok(Math.abs(Math.max(...ys)-.9)<1e-6);
 assert.equal(ctx.fills[0].alpha,.16);assert.equal(ctx.globalAlpha,1);assert.equal(ctx.lineJoin,'round');
});
test('missing min/max bins leave true time gaps rather than joining across them',()=>{
 const ctx=context();paintScopeTrace(ctx,{...options,samples:new Float32Array([-.1,.1,-.2,.2,NaN,NaN,-.3,.3]),format:'minmax',frames:4,count:4});
 assert.equal(ctx.fills.length,2);const ranges=ctx.fills.map(p=>{const xs=p.points.filter(p=>p.length===3).map(p=>p[1]);return [Math.min(...xs),Math.max(...xs)]});assert.deepEqual(ranges,[[0,20],[30,40]]);
});
test('raw traces retain planar channel selection and restart after a missing sample',()=>{
 const ctx=context();paintScopeTrace(ctx,{...options,samples:new Float32Array([0,0,0,0,.1,.2,NaN,.4]),format:'samples',frames:4,channel:1,count:4});
 const path=ctx.strokes[0];assert.deepEqual(path.map(p=>p[0]),['move','line','move']);assert.ok(Math.abs(path[0][2]+.1)<1e-6);assert.ok(Math.abs(path[2][2]+.4)<1e-6);
});
test('stepped mode is explicit and preserves sample-and-hold geometry',()=>{
 const ctx=context();paintScopeTrace(ctx,{...options,samples:new Float32Array([0,1,-1]),format:'samples',frames:3,count:3,control:true,mode:'stepped'});assert.deepEqual(ctx.strokes[0],[['move',0,0],['line',20,0],['line',20,-1],['line',40,-1],['line',40,1]]);
 assert.equal(ctx.fills.length,0);assert.ok(!ctx.strokes[0].some(p=>p[0]==='close'));
 assert.throws(()=>paintScopeTrace(context(),{...options,samples:new Float32Array([0,1]),format:'minmax',frames:1,count:1,control:true}),/ordered samples/);
});

// Modes apply to unknown signals equally; the control flag only rejects reduced envelopes.
test('audio and control samples share connected default and explicit stepped geometry',()=>{
 for(const control of [false,true]){
  const samples=new Float32Array([0,1,-1]);
  const ctx=context();paintScopeTrace(ctx,{...options,samples,format:'samples',frames:3,count:3,control});
  assert.deepEqual(ctx.strokes[0],[['move',0,0],['line',20,-1],['line',40,1]]);
  const stepped=context();paintScopeTrace(stepped,{...options,samples,format:'samples',frames:3,count:3,control,mode:'stepped'});
  assert.deepEqual(stepped.strokes[0],[['move',0,0],['line',20,0],['line',20,-1],['line',40,-1],['line',40,1]]);
  assert.deepEqual([...samples],[0,1,-1]);
 }
});
test('both connection modes preserve missing-data gaps, cropping and channel selection',()=>{
 for(const mode of ['connected','stepped']){
  const ctx=context();paintScopeTrace(ctx,{...options,samples:new Float32Array([0,0,0,0,0,9,0,1,NaN,-1]),format:'samples',frames:5,channel:1,start:1,count:4,mode});
  assert.deepEqual(ctx.strokes[0],mode==='connected'?[['move',0,0],['line',40/3,-1],['move',40,1]]:[['move',0,0],['line',40/3,0],['line',40/3,-1],['move',40,1]]);
 }
});
test('connection mode leaves every reduced min/max bound unchanged',()=>{
 const samples=new Float32Array([-.2,.3,-.9,.95,NaN,NaN,-.1,.4]);
 const a=context(),b=context();
 for(const [ctx,mode] of [[a,'connected'],[b,'stepped']])paintScopeTrace(ctx,{...options,samples,format:'minmax',frames:4,count:4,mode});
 assert.deepEqual(a.strokes,b.strokes);assert.deepEqual(a.fills,b.fills);
});

test('dense held runs preserve the final sample before every connected transition',()=>{
 for(const control of [false,true]){
  const ctx=context(),samples=new Float32Array([-.5,-.5,-.5,-.5,.75,.75,.75,.75,-1]);
  paintScopeTrace(ctx,{...options,width:4,samples,format:'samples',frames:9,count:9,control});
  assert.deepEqual(ctx.strokes[0],[['move',0,.5],['line',1.5,.5],['line',2,-.75],['line',3.5,-.75],['line',4,1]]);
  assert.deepEqual([...samples],[-.5,-.5,-.5,-.5,.75,.75,.75,.75,-1]);
 }
});
test('dense stepped compression keeps exact jump positions and flushes held runs before gaps',()=>{
 const ctx=context();paintScopeTrace(ctx,{...options,width:4,samples:new Float32Array([-.5,-.5,-.5,-.5,NaN,.75,.75,.75,-1]),format:'samples',frames:9,count:9,mode:'stepped'});
 assert.deepEqual(ctx.strokes[0],[['move',0,.5],['line',1.5,.5],['move',2.5,-.75],['line',4,-.75],['line',4,1]]);
});
test('sparse and entirely flat traces retain their original Canvas raster path',()=>{
 for(const mode of ['connected','stepped']){
  const sparse=context();paintScopeTrace(sparse,{...options,width:80,samples:new Float32Array([0,0,0,1]),format:'samples',frames:4,count:4,mode});
  assert.equal(sparse.strokes[0].length,mode==='connected'?4:7);
  const flat=context();paintScopeTrace(flat,{...options,samples:new Float32Array(128).fill(.37),format:'samples',frames:128,count:128,mode});
  assert.equal(flat.strokes[0].length,mode==='connected'?128:255);
  const retina=context();paintScopeTrace(retina,{...options,width:8,pixelRatio:2,samples:new Float32Array([0,0,0,0,1,1,1,1,-1]),format:'samples',frames:9,count:9,mode});
  assert.equal(retina.strokes[0].length,mode==='connected'?9:17);
 }
});
