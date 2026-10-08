import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,writeFile,rm,symlink} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {WebSocket} from 'ws';import {startRuntime,encodeOSC} from '../runtime/shell-runtime.mjs';import {defaultConfig} from '../src/model.mjs';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('runtime serves built tool, output is off until armed, persists settings, and restarts disarmed',async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),'rack-runtime-'));let runtime;try{const packets=[];runtime=await startRuntime({runtimeDirectory:path.join(dir,'view'),seedDocument:{config:defaultConfig(),values:{},snapshots:[]},sendPacket:async(bytes,packet)=>packets.push({bytes,packet})});assert.equal((await fetch(runtime.url)).status,200);const control='in0/fx/splut';await runtime.command({type:'batch',changes:[{id:control,value:34}]});await wait(40);assert.equal(packets.length,0);await runtime.command({type:'arm',armed:true});await runtime.command({type:'batch',changes:[{id:control,value:42}]});await wait(40);assert.equal(packets.length,1);assert.ok(packets[0].bytes.includes(Buffer.from('/sends/in0/fx/0')));await runtime.command({type:'capture',label:'test',sceneID:'opening'});await runtime.stop();runtime=await startRuntime({runtimeDirectory:path.join(dir,'another-view')});assert.equal(runtime.state().armed,false);assert.equal(runtime.store.get(control),42);assert.equal(runtime.store.snapshots[0].targets[control].value,42);assert.equal((await fetch(runtime.url+'api/command',{method:'POST',body:'{}'})).status,400);}finally{await runtime?.stop();await rm(dir,{recursive:true,force:true});}});
test('ordered WebSocket controls are applied before capture, and disconnect disables output',async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),'rack-ws-'));const runtime=await startRuntime({runtimeDirectory:path.join(dir,'view'),seedDocument:{config:defaultConfig(),values:{},snapshots:[]}});let ws;try{ws=new WebSocket(runtime.url.replace('http','ws')+'ws?token='+runtime.state().token);await new Promise(r=>ws.once('open',r));const ack=new Promise((resolve,reject)=>ws.on('message',data=>{const m=JSON.parse(data);if(m.requestID===1){if(m.type==='error')reject(Error(m.message));else resolve(m.result);}}));ws.send(JSON.stringify({type:'batch',changes:[{id:'in0/fx/splut',value:93}]}));ws.send(JSON.stringify({type:'capture',label:'ordered',requestID:1}));const result=await ack;assert.equal(result.snapshotID,runtime.store.snapshots[0].id);assert.equal(runtime.store.snapshots[0].targets['in0/fx/splut'].value,93);await runtime.command({type:'arm',armed:true});ws.close();await wait(30);assert.equal(runtime.state().armed,false);}finally{ws?.terminate();await runtime.stop();await rm(dir,{recursive:true,force:true});}});
test('OSC packet preserves address, type tags and padding',()=>{const b=encodeOSC({address:'/SET',args:['/sends/in0/fx/0',127]});assert.equal(b.length%4,0);assert.ok(b.includes(Buffer.from(',si')));assert.equal(b.readInt32BE(b.length-4),127);});

test('runtime persists selected capture and validated inline edits across restart',async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),'rack-mixes-'));let runtime;try{runtime=await startRuntime({runtimeDirectory:path.join(dir,'view'),seedDocument:{config:defaultConfig(),values:{},snapshots:[]}});const id='global/levels/c1';await runtime.command({type:'batch',changes:[{id,value:45}]});const result=await runtime.command({type:'capture',label:'selected',ids:[id],duration:4000,targetDuration:1000,alignment:'R'});const snapshot=structuredClone(runtime.store.snapshots[0]);assert.equal(result.snapshotID,snapshot.id);assert.equal(snapshot.targets['in0/fx/splut'],null);snapshot.targets[id].value=0;snapshot.targets[id].fraction=.5;await runtime.command({type:'snapshot',snapshot});await runtime.stop();runtime=await startRuntime({runtimeDirectory:path.join(dir,'again')});assert.equal(runtime.store.snapshots[0].targets[id].value,0);assert.equal(runtime.store.snapshots[0].targets['in0/fx/splut'],null);assert.deepEqual(runtime.store.snapshots[0].defaultTransition,{duration:1000,alignment:'R'});}finally{await runtime?.stop();await rm(dir,{recursive:true,force:true});}});

test('loading a named mix set preserves live values and armed state, persists collection, and rejects malformed sets',async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),'rack-mix-set-'));let runtime;try{runtime=await startRuntime({runtimeDirectory:path.join(dir,'view'),seedDocument:{config:defaultConfig(),values:{},snapshots:[]}});const id='in0/fx/verb';await runtime.command({type:'batch',changes:[{id,value:37}]});await runtime.command({type:'arm',armed:true});const snapshot={id:'mix-a',label:'Quiet',duration:1000,targets:{[id]:{value:90,fraction:.5,alignment:'R'}}};await runtime.command({type:'mix-set',name:'Gig',snapshots:[snapshot]});assert.equal(runtime.store.get(id),37);assert.equal(runtime.state().armed,true);assert.equal(runtime.store.mixSet.name,'Gig');await assert.rejects(runtime.command({type:'mix-set',name:'Bad',snapshots:[{...snapshot,duration:-1}]}));assert.equal(runtime.store.mixSet.name,'Gig');await runtime.stop();runtime=await startRuntime({runtimeDirectory:path.join(dir,'again')});assert.equal(runtime.store.mixSet.name,'Gig');assert.equal(runtime.store.get(id),37);assert.equal(runtime.store.snapshots[0].id,'mix-a')}finally{await runtime?.stop();await rm(dir,{recursive:true,force:true})}});

test('live surface keeps FX returns at unity during legacy snapshot recall while follower amounts remain editable',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'rack-unity-'));let r;
 try{
  const {documentFromState}=await import('../runtime/sc-bridge.mjs');
  const doc=documentFromState({libraryID:'unity',instanceID:'sendRack:unity',port:57120,name:'Rack',maxGain:4,channels:[{id:'vc',label:'VC',order:0,level:1,mute:0,solo:0}],slots:[{id:'verb',label:'Verb',order:0,kind:'fx',level:.2},{id:'mod-verb',label:'Verb ENV',order:1,kind:'follower',level:.3}],sends:{vc:[0,0]}});doc.config.output.mode='off';
  doc.snapshots=[{id:'old',label:'Old mix',duration:0,targets:{'global/levels/verb':{value:0,fraction:1,alignment:'J'},'global/control-levels/mod-verb':{value:.6,fraction:1,alignment:'J'}}}];
  r=await startRuntime({runtimeDirectory:path.join(dir,'view'),seedDocument:doc,fixedFXReturns:true});
  assert.equal(r.store.get('global/levels/verb'),1);await r.command({type:'recall',id:'old',direct:true});await wait(50);
  assert.equal(r.store.get('global/levels/verb'),1);assert.equal(r.store.get('global/control-levels/mod-verb'),.6);
 }finally{await r?.stop();await rm(dir,{recursive:true,force:true})}
});


test('scene countdown survives reconnect, freezes on stop, and finishes immediate recalls',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'rack-timing-'));let r,ws;
 try{
  r=await startRuntime({runtimeDirectory:path.join(dir,'view'),seedDocument:{config:defaultConfig(),values:{},snapshots:[{id:'timed',label:'Timed',duration:400,targets:{'in0/fx/verb':{value:80,fraction:1,alignment:'L'}}}]}});
  await r.command({type:'set-timer',action:'start'});await r.command({type:'recall',id:'timed'});
  const started=r.state().timing.scene.startedAt;await wait(60);
  ws=new WebSocket(r.url.replace('http','ws')+'ws?token='+r.state().token);
  const boot=await new Promise(resolve=>ws.once('message',d=>resolve(JSON.parse(d))));
  assert.equal(boot.recall,true);assert.equal(boot.timing.scene.startedAt,started);assert.ok(boot.timing.now-started>=50);assert.equal(boot.timing.set.running,true);
  await r.command({type:'stop'});const frozen=r.state().timing.scene;
  assert.equal(frozen.active,false);assert.ok(frozen.elapsed>=50&&frozen.elapsed<400);await wait(40);assert.equal(r.state().timing.scene.elapsed,frozen.elapsed);
  await r.command({type:'recall',id:'timed',direct:true});assert.equal(r.state().timing.scene.duration,0);assert.equal(r.state().recall,false);assert.equal(r.state().timing.scene.active,false);
  await r.command({type:'recall',id:'timed'});await wait(450);assert.equal(r.state().timing.scene.elapsed,400);assert.equal(r.state().recall,false);
  await r.command({type:'set-timer',action:'pause'});assert.ok(r.state().timing.set.elapsed>500);await r.command({type:'set-timer',action:'reset'});assert.deepEqual(r.state().timing.set,{running:false,startedAt:null,elapsed:0});
  await assert.rejects(r.command({type:'set-timer',action:'typo'}),/Invalid set timer/);
 }finally{ws?.terminate();await r?.stop();await rm(dir,{recursive:true,force:true})}
});


test('SC scene lock also blocks mixes without an attached scene ID',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'rack-scene-lock-'));let r,transitioning=true;
 try{
  r=await startRuntime({runtimeDirectory:path.join(dir,'view'),sceneTransitioning:()=>transitioning,seedDocument:{config:defaultConfig(),values:{},snapshots:[{id:'plain',label:'Plain',duration:0,targets:{'in0/fx/verb':{value:50,fraction:1,alignment:'L'}}}]}});
  await assert.rejects(r.command({type:'recall',id:'plain'}),/in progress/);assert.equal(r.store.get('in0/fx/verb'),0);
  transitioning=false;await r.command({type:'recall',id:'plain'});assert.equal(r.store.get('in0/fx/verb'),50);
 }finally{await r?.stop();await rm(dir,{recursive:true,force:true})}
});


test('saved-set catalogue lists only compatible collections and loads targets without changing audio or launching scenes',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'rack-set-catalogue-'));let runtime,launches=0;
 try{
  const snapshot={id:'saved',label:'Saved scene',sceneID:'do-not-launch',duration:3000,targets:{'in0/fx/verb':{value:77,fraction:1,alignment:'L'}}};
  const saved={schema:'awb.mix-set/1',name:'Gig',snapshots:[snapshot]};
  await writeFile(path.join(dir,'config (gig).json'),JSON.stringify(saved));
  await writeFile(path.join(dir,'soundbath.mixes.json'),JSON.stringify({...saved,name:'Soundbath'}));
  await writeFile(path.join(dir,'credentials.json'),JSON.stringify({...saved,name:'Never list'}));
  await writeFile(path.join(dir,'config_empty.json'),JSON.stringify({...saved,snapshots:[]}));
  await writeFile(path.join(dir,'config_broken.json'),'{');
  await symlink(path.join(dir,'credentials.json'),path.join(dir,'config_link.json'));
  runtime=await startRuntime({runtimeDirectory:path.join(dir,'view'),mixSetDirectories:[dir,path.join(dir,'absent')],sceneLauncher:()=>{launches++},seedDocument:{config:defaultConfig(),values:{'in0/fx/verb':31},snapshots:[]}});
  const before=runtime.store.document(),list=await runtime.command({type:'list-mix-sets'});
  assert.deepEqual(list.sets.map(s=>s.name),['Gig','Soundbath']);assert.equal(list.errors.length,1);assert.equal(list.sets[0].count,1);
  assert.deepEqual(runtime.store.document(),before);assert.equal(launches,0);
  await runtime.command({type:'arm',armed:true});
  const result=await runtime.command({type:'load-saved-mix-set',id:list.sets[0].id});
  assert.deepEqual(result,{name:'Gig',count:1,skipped:0});assert.deepEqual(runtime.store.document().values,before.values);assert.equal(launches,0);assert.equal(runtime.state().armed,true);
  assert.equal(runtime.store.snapshots[0].targets['in0/fx/verb'].value,77);assert.equal(runtime.store.snapshots[0].sceneID,'do-not-launch');
  assert.equal(JSON.parse(await readFile(runtime.libraryPath)).mixSet.name,'Gig');
  await assert.rejects(runtime.command({type:'load-saved-mix-set',id:'../credentials.json'}),/Unknown saved/);
  await rm(path.join(dir,'config (gig).json'));await assert.rejects(runtime.command({type:'load-saved-mix-set',id:list.sets[0].id}),/no longer available/);
 }finally{await runtime?.stop();await rm(dir,{recursive:true,force:true});}
});

test('saved o-s-c configuration is transposed into the bound native rack without loading topology',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'rack-osc-catalogue-'));let runtime;
 try{
  const {documentFromState}=await import('../runtime/sc-bridge.mjs');
  const doc=documentFromState({libraryID:'catalogue',instanceID:'rack:catalogue',name:'Rack',port:57120,maxGain:1,channels:[{id:'vc',label:'VC',order:0,level:1,mute:0,solo:0}],slots:[{id:'verb',label:'VERB',order:0,kind:'fx',level:1},{id:'mod-verb',label:'Verb envelope',order:1,kind:'follower',level:1}],sends:{vc:[.3,0]}});doc.config.output.mode='off';
  // Keep a follower region so the preview has the native address translation policy.
  assert.ok(doc.config.regions.some(r=>r.kind==='followers'));
  await writeFile(path.join(dir,'INEFFIBLEED_config.json'),await readFile(new URL('../fixtures/live-set.rack.json',import.meta.url)));
  runtime=await startRuntime({runtimeDirectory:path.join(dir,'view'),mixSetDirectories:[dir],seedDocument:doc});
  const before=runtime.store.document(),{sets}=await runtime.command({type:'list-mix-sets'});assert.equal(sets.length,1);assert.equal(sets[0].count,11);
  await runtime.command({type:'load-saved-mix-set',id:sets[0].id});assert.deepEqual(runtime.store.config,before.config);assert.deepEqual(runtime.store.document().values,before.values);
  assert.ok(runtime.store.snapshots.some(s=>s.targets['vc/fx/verb']!==null));assert.ok(sets[0].skipped>0);
 }finally{await runtime?.stop();await rm(dir,{recursive:true,force:true});}
});
