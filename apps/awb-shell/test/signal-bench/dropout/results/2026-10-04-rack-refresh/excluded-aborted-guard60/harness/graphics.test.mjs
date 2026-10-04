import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {graphicsProfiles,graphicsProfile} from './graphics-profiles.mjs';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../../..');

test('Conditions distinguish stopped capture, historical focus controls, and sustained profiles',()=>{
 assert.equal(graphicsProfile('stopped'),null);assert.equal(graphicsProfile('stopped-focus'),null);
 assert.equal(graphicsProfile('focus'),graphicsProfiles.widgets);
 assert.equal(graphicsProfile('mixed-128-60').widgets,512);
 assert.throws(()=>graphicsProfile('typo'),/Unknown dropout condition/);
});

for(const [name,profile] of Object.entries(graphicsProfiles))test(name+' uses real trace painting with one shared snapshot and stops its scheduler',async()=>{
 const temp=await mkdtemp('/private/tmp/awb-graphics-unit-');
 try{
  await writeFile(resolve(temp,'package.json'),'{"type":"module"}');
  await cp(resolve(here,'graphics-renderer.mjs'),resolve(temp,'graphics-renderer.mjs'));
  for(const file of ['scope-painter.js','scope-trace.js'])await cp(resolve(root,'tool-artifacts/shared-loop/0.1.0/public',file),resolve(temp,file));
  const {installGraphicsLoad}=await import(pathToFileURL(resolve(temp,'graphics-renderer.mjs')));
  let now=0,id=0,reads=0,sourceEnd=1024;const pending=new Map(),canvases=[];
  const frameOptions={now:()=>now,requestFrame:fn=>{pending.set(++id,fn);return id;},cancelFrame:key=>pending.delete(key),phase:()=>0,setTimer:()=>{throw new Error('Unexpected timer in test');}};
  const container={style:{},replaceChildren(){canvases.length=0;},append(c){canvases.push(c);},ownerDocument:{createElement(){
   const ctx={strokes:0,segments:0,clearRect(){},beginPath(){},moveTo(){},lineTo(){this.segments++;},stroke(){this.strokes++;}};
   return {style:{},dataset:{},setAttribute(){},getContext(){return ctx;},getBoundingClientRect(){return {x:0,y:0,width:this.width,height:this.height};},ctx};
  }}};
  const samples=Float32Array.from({length:16*1024},(_,i)=>Math.sin(i*.02)*.2);
  const load=installGraphicsLoad({container,frameOptions,getSnapshot:()=>{reads++;return {sourceEnd,channels:16,frames:1024,format:'samples',samples};}});
  const frame=()=>{const callbacks=[...pending.values()];pending.clear();callbacks.forEach(fn=>fn(now));};
  load.configure(profile);frame();
  assert.equal(canvases.length,profile.canvases);
  if(profile.canvases){
   assert.equal(reads,1,'One history view per batch, regardless of canvas count');
   assert.ok(canvases.every((c,i)=>c.ctx.strokes===1&&c.ctx.segments>100&&Number(c.dataset.channel)===i%16));
   sourceEnd+=512;now=100;load.invalidate();frame();
   assert.equal(load.diagnostics().freshBatches,2);assert.equal(load.diagnostics().sourceEnd,sourceEnd);
   now=200;load.invalidate();frame();assert.equal(load.diagnostics().batches,3);assert.equal(load.diagnostics().freshBatches,2,'Stale repaints are distinguishable');
   now=300;load.invalidate();assert.equal(pending.size,1);load.configure(null);assert.equal(pending.size,0,'Stopping removes pending work');
   assert.equal(container.style.display,'none');
  }else assert.equal(reads,0);
  load.close();
 }finally{await rm(temp,{recursive:true,force:true});}
});
