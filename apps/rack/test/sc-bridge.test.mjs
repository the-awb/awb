import test from 'node:test';import assert from 'node:assert/strict';
import dgram from 'node:dgram';import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';
import {encodeOSC,decodeOSC,createSCBridge} from '../runtime/sc-bridge.mjs';
import {startRuntime} from '../runtime/shell-runtime.mjs';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('OSC scalars roundtrip and malformed packets are rejected',()=>{const m={address:'/test',args:['rack',0,1,.125,-12,4294967296]};assert.deepEqual(decodeOSC(encodeOSC(m)),m);assert.throws(()=>decodeOSC(Buffer.from('bad')));assert.throws(()=>encodeOSC({address:'/test',args:[NaN]}));assert.throws(()=>encodeOSC({address:'/test',args:['embedded\0nul']}));});

test('actual ToolInstance bridge coalesces feedback, fences stale writes and preserves sparse recall',{timeout:60000,skip:!process.env.AWB_RACK_SC_TEST_ROOT},async()=>{
  const build=process.env.AWB_RACK_SC_TEST_ROOT??path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
  const dir=await mkdtemp(path.join(os.tmpdir(),'rack-sc-bridge-'));let child,runtime,bridge,socket,log='';
  try {
    await rm(path.join(build,'test/bridge-ready.json'),{force:true});
    child=spawn('/Applications/SuperCollider.app/Contents/MacOS/sclang',['-l',path.join(build,'sclang_conf.yaml'),path.join(build,'test/bridge.scd')]);
    child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
    let binding;for(let i=0;i<400;i++){try{binding=JSON.parse(await readFile(path.join(build,'test/bridge-ready.json'),'utf8'));break;}catch{}if(child.exitCode!==null)throw Error(log);await wait(50);}assert.ok(binding,log);
    runtime=await startRuntime({runtimeDirectory:path.join(dir,'view'),scBinding:{...binding,libraryRoot:dir}});
    assert.equal(runtime.state().sc.instanceID,binding.instanceID);assert.equal(runtime.store.controls.length,18);assert.equal(runtime.store.get('a/fx/mast'),0);assert.equal(runtime.store.get('global/channel-levels/a'),1);
    await assert.rejects(startRuntime({runtimeDirectory:path.join(dir,'competing'),scBinding:{...binding,libraryRoot:dir}}),/already open/);
    assert.match(runtime.libraryPath,/rack-library-sc-bridge-test.json$/);
    // Preview changes are local only; Sync restores the authoritative SC command state.
    await runtime.command({type:'batch',changes:[{id:'a/fx/mast',value:.8}]});await runtime.command({type:'sync-sc'});assert.equal(runtime.store.get('a/fx/mast'),0);assert.equal(runtime.state().sent,0);
    await runtime.command({type:'arm',armed:true});
    await runtime.command({type:'batch',changes:[{id:'a/fx/mast',value:.375},{id:'b/fx/mast',value:.25},{id:'global/channel-levels/a',value:.7},{id:'a/state/mute',value:1},{id:'b/state/solo',value:1},{id:'a/followers/env',value:.4},{id:'global/levels/mast',value:.9}]});
    await runtime.command({type:'sync-sc'});assert.equal(runtime.store.get('a/fx/mast'),.375);assert.ok(Math.abs(runtime.store.get('global/channel-levels/a')-.7)<1e-6);assert.equal(runtime.store.get('a/state/mute'),1);assert.equal(runtime.store.get('b/state/solo'),1);assert.ok(Math.abs(runtime.store.get('a/followers/env')-.4)<1e-6);assert.ok(Math.abs(runtime.store.get('global/levels/mast')-.9)<1e-6);assert.equal(runtime.state().sent,7);
    assert.equal(runtime.store.get('global/control-levels/env'),1);
    await runtime.command({type:'batch',changes:[{id:'global/control-levels/env',value:.35}]});
    await runtime.command({type:'sync-sc'});assert.ok(Math.abs(runtime.store.get('global/control-levels/env')-.35)<1e-6);
    await runtime.command({type:'enable-control-send',slotID:'env',enabled:false});assert.equal(runtime.state().sc.slots.find(s=>s.id==='env').controlEnabled,0);
    await runtime.command({type:'enable-control-send',slotID:'env',enabled:true});
    socket=dgram.createSocket('udp4');
    const observed=[];const unsubscribe=runtime.store.subscribe('a/fx/mast',()=>observed.push(runtime.store.get('a/fx/mast')));
    const sentBefore=runtime.state().sent;
    await new Promise((resolve,reject)=>socket.send(encodeOSC({address:'/awb/rack/test',args:[binding.instanceID,'external']}),binding.port,'127.0.0.1',e=>e?reject(e):resolve()));
    for(let i=0;i<100&&runtime.store.get('a/fx/mast')!==.625;i++)await wait(10);
    assert.equal(runtime.store.get('a/fx/mast'),.625,'language-side sends arrive without explicit Sync');
    assert.equal(runtime.store.get('global/channel-levels/a'),.512);
    assert.deepEqual(observed,[.625],'101 writes coalesce to one changed value');unsubscribe();await wait(40);
    assert.equal(runtime.state().sent,sentBefore,'SC-originated feedback never echoes into SC');
    assert.ok(Math.abs(runtime.state().sc.sends.a[0]-.625)<1e-6);
    bridge=await createSCBridge(binding);await bridge.watch();const observedRevision=(await bridge.sync()).revision;
    await new Promise((resolve,reject)=>socket.send(encodeOSC({address:'/awb/rack/test',args:[binding.instanceID,'gui-external',.7]}),binding.port,'127.0.0.1',e=>e?reject(e):resolve()));
    for(let i=0;i<60&&runtime.store.get('a/fx/mast')!==.7;i++)await wait(10);
    await bridge.control('send',['a','mast',.9,observedRevision]);const fenced=await bridge.sync();
    assert.ok(Math.abs(fenced.sends.a[0]-.7)<1e-6,'stale command cannot overwrite newer SC edit');
    await bridge.control('send',['a','mast',.75,fenced.revision]);assert.ok(Math.abs((await bridge.sync()).sends.a[0]-.75)<1e-6,'fresh observed revision can take control');bridge.close();bridge=null;await runtime.command({type:'sync-sc'});
    await runtime.command({type:'batch',changes:[{id:'a/fx/mast',value:.375}]});await runtime.command({type:'sync-sc'});
    await new Promise((resolve,reject)=>socket.send(encodeOSC({address:'/awb/rack/test',args:[binding.instanceID,'external-fx']}),binding.port,'127.0.0.1',e=>e?reject(e):resolve()));
    for(let i=0;i<100&&!runtime.state().sc.processors.includes('externaltest');i++)await wait(10);
    assert.ok(runtime.state().sc.processors.includes('externaltest'),'language processor registration refreshes metadata');
    assert.equal(runtime.state().sc.slots.find(s=>s.id==='fx1').processor,'externaltest');
    await runtime.command({type:'capture',label:'only A',ids:['a/fx/mast'],duration:250,targetDuration:100,alignment:'R'});const snapshot=runtime.store.snapshots[0];assert.equal(snapshot.targets['b/fx/mast'],null);
    await runtime.command({type:'batch',changes:[{id:'a/fx/mast',value:0},{id:'b/fx/mast',value:.6}]});await runtime.command({type:'recall',id:snapshot.id});await wait(340);await runtime.command({type:'sync-sc'});assert.equal(runtime.store.get('a/fx/mast'),.375);assert.ok(Math.abs(runtime.store.get('b/fx/mast')-.6)<1e-6);
    await runtime.command({type:'set-fx',slotID:'fx1',processor:'pass'});assert.equal(runtime.state().sc.slots.find(s=>s.id==='fx1').active,1);assert.equal(runtime.state().sc.slots.find(s=>s.id==='fx1').processor,'pass');
    await runtime.command({type:'clear-fx',slotID:'fx1'});assert.equal(runtime.state().sc.slots.find(s=>s.id==='fx1').active,0);
    await runtime.command({type:'set-follower',slotID:'follow1',settings:{curve:'sqrt',attack:.02,release:.2,scale:1,blend:.7,floorDb:-50}});assert.equal(runtime.state().sc.slots.find(s=>s.id==='follow1').processor,'sqrt');
    await runtime.command({type:'clear-follower',slotID:'follow1'});assert.equal(runtime.state().sc.slots.find(s=>s.id==='follow1').active,0);
    const stale=runtime.store.document();stale.config.output.instanceID='sendRack:old';stale.config.output.port=59999;await runtime.command({type:'document',document:stale});assert.equal(runtime.store.config.output.instanceID,binding.instanceID);assert.equal(runtime.store.config.output.port,binding.port);await runtime.command({type:'arm',armed:true});
    const changed=runtime.store.document();changed.config.instruments.push({id:'c',label:'C'});await assert.rejects(runtime.command({type:'document',document:changed}),/Stable SC topology/);
    await runtime.command({type:'capture',label:'full'});assert.equal(Object.values(runtime.store.snapshots[1].targets).filter(Boolean).length,18);
    await runtime.stop();runtime=null;
    runtime=await startRuntime({runtimeDirectory:path.join(dir,'again'),scBinding:{...binding,libraryRoot:dir}});assert.equal(runtime.store.snapshots.length,2);assert.equal(runtime.state().armed,false);assert.equal(runtime.store.get('a/fx/mast'),.375);
    await runtime.command({type:'arm',armed:true});
    await runtime.command({type:'batch',changes:[{id:'a/fx/mast',value:.9},{id:'b/fx/mast',value:.8}]});
    const transition=await runtime.command({type:'capture',label:'two channels',ids:['a/fx/mast','b/fx/mast'],duration:300,targetDuration:300});
    await runtime.command({type:'batch',changes:[{id:'a/fx/mast',value:0},{id:'b/fx/mast',value:0}]});await runtime.command({type:'sync-sc'});
    await runtime.command({type:'recall',id:transition.snapshotID});await wait(100);
    await new Promise((resolve,reject)=>socket.send(encodeOSC({address:'/awb/rack/test',args:[binding.instanceID,'gui-external',.625]}),binding.port,'127.0.0.1',e=>e?reject(e):resolve()));
    await wait(300);assert.equal(runtime.store.get('a/fx/mast'),.625,'SC edit takes over its control during recall');assert.equal(runtime.store.get('b/fx/mast'),.8,'other controls finish their transition');
    // A wrong ToolInstance identity receives no state, even on the right language port.
    bridge=await createSCBridge({...binding,instanceID:'sendRack:wrong'},{timeout:100});await assert.rejects(bridge.sync(),/timed out/);bridge.close();bridge=null;
    socket??=dgram.createSocket('udp4');const send=op=>new Promise((resolve,reject)=>socket.send(encodeOSC({address:'/awb/rack/test',args:[binding.instanceID,op]}),binding.port,'127.0.0.1',e=>e?reject(e):resolve()));
    await send('close');await wait(50);assert.equal(runtime.state().armed,false,'close notification disarms without polling');await assert.rejects(runtime.command({type:'sync-sc'}),/timed out/);assert.equal(runtime.state().armed,false);
    await send('finish');await new Promise((resolve,reject)=>{if(child.exitCode!==null){resolve();return;}child.once('exit',code=>code===0?resolve():reject(Error(log)));});assert.match(log,/AWB_RACK_BRIDGE_FINISHED=PASS/);
  }finally{await runtime?.stop();bridge?.close();try{socket?.close();}catch{}if(child&&child.exitCode===null)child.kill('SIGTERM');await rm(dir,{recursive:true,force:true});}
});


test('feedback frames tolerate reordering, reject other tokens and recover incomplete batches',async()=>{
  const socket=dgram.createSocket('udp4');await new Promise(r=>socket.bind(0,'127.0.0.1',r));
  const events=[],errors=[];let endpoint;
  socket.on('message',(bytes,remote)=>{const m=decodeOSC(bytes);if(m.args[1]==='watch'){endpoint=remote;socket.send(encodeOSC({address:'/awb/rack/watch',args:['sendRack:test',m.args[2],0]}),remote.port,remote.address);}});
  const bridge=await createSCBridge({instanceID:'sendRack:test',port:socket.address().port},{onUpdate:e=>events.push(e),onError:e=>errors.push(e),heartbeat:50});
  try{
    await bridge.watch();
    const send=(token,id,kind,...args)=>new Promise((resolve,reject)=>socket.send(encodeOSC({address:'/awb/rack/update',args:['sendRack:test',token,id,kind,...args]}),endpoint.port,endpoint.address,e=>e?reject(e):resolve()));
    await send('wrong','ignored','begin',0,1,1,0);
    await send(bridge.watchToken,'one','value','a/fx/mast',.5,'');
    await send(bridge.watchToken,'one','end',1);
    await send(bridge.watchToken,'one','begin',0,1,1,0);await wait(30);
    assert.deepEqual(events.filter(e=>e.kind==='values').map(e=>e.changes),[[{id:'a/fx/mast',value:.5,source:''}]]);
    await send(bridge.watchToken,'ack','end',2);
    await send(bridge.watchToken,'ack','begin',1,2,0,0);await wait(30);
    assert.deepEqual(events.filter(e=>e.kind==='values').at(-1),{kind:'values',baseRevision:1,revision:2,count:0,metadata:false,changes:[]},'revision-only acknowledgement needs no control values');
    await send(bridge.watchToken,'lost','begin',2,3,2,0);await send(bridge.watchToken,'lost','value','a/fx/mast',.6,'');await send(bridge.watchToken,'lost','end',3);await wait(380);
    assert.equal(events.filter(e=>e.kind==='recover').length,1);assert.equal(events.filter(e=>e.kind==='values').length,2);
    assert.deepEqual(errors,[]);
    socket.removeAllListeners('message');await wait(230);assert.ok(errors.some(e=>e.includes('heartbeat timed out')));
  }finally{bridge.close();await wait(10);socket.close();}
});


test('old SC classes fail attach with an explicit recompile instruction',async()=>{
  const socket=dgram.createSocket('udp4');await new Promise(r=>socket.bind(0,'127.0.0.1',r));
  socket.on('message',(bytes,remote)=>{const m=decodeOSC(bytes);if(m.args[1]==='sync')socket.send(encodeOSC({address:'/awb/rack/state',args:['sendRack:old',m.args[2],'begin',0,'Old rack','old',4,1,1,1]}),remote.port,remote.address);});
  const bridge=await createSCBridge({instanceID:'sendRack:old',port:socket.address().port});
  try{await assert.rejects(bridge.sync(),/load this workspace SC rack classes and recompile/);}finally{bridge.close();await wait(10);socket.close();}
});


test('native runtime sends an eight-channel, 32-send flush as bounded OSC bundles',{timeout:10000},async t=>{
 const {decodeOscPacket}=await import('../../awb-shell/services/oscCodec.mjs');
 const dir=await mkdtemp(path.join(os.tmpdir(),'rack-sc-batching-')),socket=dgram.createSocket('udp4');
 const packets=[],commands=[];let runtime;
 await new Promise(resolve=>socket.bind(0,'127.0.0.1',resolve));
 const instanceID='sendRack:batching',channels=Array.from({length:8},(_,i)=>`c${i}`),slots=Array.from({length:32},(_,i)=>`fx${i}`);
 socket.on('message',(bytes,remote)=>{
  const messages=decodeOscPacket(bytes);
  if(messages.some(m=>['send','level','return'].includes(m.args[1])))packets.push(bytes);
  for(const m of messages){
   const reply=(address,args)=>socket.send(encodeOSC({address,args}),remote.port,remote.address);
   if(m.args[1]==='sync'){
    const state=(kind,...a)=>reply('/awb/rack/state',[instanceID,m.args[2],kind,...a]);
    state('begin',0,'Batch rack','batching',4,8,32,0,1);
    channels.forEach((id,i)=>state('channel',id,id,1,0,0,i));
    slots.forEach((id,i)=>state('slot',id,id,'fx',1,0,1,'',i,.01,.1,1,1,-60));
    channels.forEach(id=>state('sends',id,...slots.map(()=>0)));state('end',0);
   }else if(m.args[1]==='watch')reply('/awb/rack/watch',[instanceID,m.args[2],0]);
   else if(['send','level','return'].includes(m.args[1]))commands.push(m);
  }
 });
 try{
  runtime=await startRuntime({runtimeDirectory:path.join(dir,'view'),scBinding:{instanceID,port:socket.address().port,libraryID:'batching',libraryRoot:dir}});
  await runtime.command({type:'arm',armed:true});
  const changes=[...channels.flatMap(c=>slots.map((s,i)=>({id:`${c}/fx/${s}`,value:(i+1)/1000}))),...slots.map(id=>({id:`global/levels/${id}`,value:.5})),...channels.map(id=>({id:`global/channel-levels/${id}`,value:.75}))];
  await runtime.command({type:'batch',changes});
  // Capture is a barrier: all earlier values must leave Node before it completes.
  await runtime.command({type:'capture',label:'batch barrier'});
  for(let i=0;i<100&&commands.length!==296;i++)await wait(10);
  assert.equal(commands.length,296);assert.equal(runtime.state().sent,296);assert.equal(runtime.state().failures,0);
  assert.ok(packets.length<32);assert.ok(packets.every(p=>p.length<=1200));
  assert.ok(runtime.state().oscOutput.bundles>0);
  assert.deepEqual(commands.map(m=>[m.args[1]==='send'?`${m.args[2]}/fx/${m.args[3]}`:m.args[1]==='return'?`global/levels/${m.args[3]}`:`global/channel-levels/${m.args[2]}`,m.args[4]]),changes.map(c=>[c.id,Math.fround(c.value)]));
  t.diagnostic(`296 retained commands delivered in ${packets.length} UDP packets, with all values and order verified`);
  const prior=commands.length;runtime.store.set('c0/fx/fx0',.75,'sc-feedback');await wait(40);
  assert.equal(commands.length,prior,'SC feedback must not echo');
 }finally{await runtime?.stop();await wait(10);socket.close();await rm(dir,{recursive:true,force:true});}
});


test('actual eight-channel 32-send feedback acknowledges its origin without values',{timeout:60000,skip:!process.env.AWB_RACK_SC_TEST_ROOT},async t=>{
  const build=process.env.AWB_RACK_SC_TEST_ROOT,dir=await mkdtemp(path.join(os.tmpdir(),'rack-origin-'));
  let child,runtime,observer,log='';const events=[],errors=[];
  const until=async check=>{for(let i=0;i<400;i++){if(check())return;if(child?.exitCode!==null&&!check())throw Error(log);await wait(10);}throw Error('Origin feedback timeout: '+log);};
  try{
    await rm(path.join(build,'test/origin-ready.json'),{force:true});
    child=spawn('/Applications/SuperCollider.app/Contents/MacOS/sclang',['-l',path.join(build,'sclang_conf.yaml'),path.join(build,'test/bridge-origin.scd')]);
    child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
    let binding;for(let i=0;i<400;i++){try{binding=JSON.parse(await readFile(path.join(build,'test/origin-ready.json'),'utf8'));break;}catch{}if(child.exitCode!==null)throw Error(log);await wait(50);}assert.ok(binding,log);
    runtime=await startRuntime({runtimeDirectory:path.join(dir,'view'),scBinding:{...binding,libraryRoot:dir}});
    observer=await createSCBridge(binding,{onUpdate:e=>events.push(e),onError:e=>errors.push(e)});await observer.watch();
    const initial=await observer.sync();await wait(80);events.length=0;
    const ids=[...initial.channels.flatMap(c=>initial.slots.map(s=>`${c.id}/fx/${s.id}`)),...initial.slots.map(s=>`global/levels/${s.id}`),...initial.channels.map(c=>`global/channel-levels/${c.id}`)];
    const message=(id,value,revision)=>{const [a,b,c]=id.split('/');return {address:'/awb/rack/control',args:[binding.instanceID,b==='fx'?'send':b==='levels'?'return':'level',b==='channel-levels'?c:a,c??a,value,revision]};};
    const before=runtime.state().sent;
    await observer.sendBatch(ids.map(id=>message(id,.25,initial.revision)));
    await until(()=>runtime.store.get('global/channel-levels/c7')===.25&&events.some(e=>e.kind==='values'));
    const own=events.filter(e=>e.kind==='values');
    assert.equal(own.reduce((n,e)=>n+e.count,0),0,'all 296 originating controls omitted on the wire');
    assert.equal(own.at(-1).revision-initial.revision,296,'empty frames still acknowledge all accepted revisions');
    assert.ok(ids.every(id=>runtime.store.get(id)===.25),'another GUI receives all 296 controls');
    assert.equal(runtime.state().sent,before,'foreign GUI feedback is not retransmitted');
    events.length=0;let duplicateValues=0;
    const unsubscribe=runtime.store.subscribeAll(e=>{if(e.kind==='value'&&e.origin==='sc-feedback')duplicateValues++;});
    await runtime.command({type:'arm',armed:true});
    await runtime.command({type:'batch',changes:ids.map(id=>({id,value:.5}))});
    await runtime.command({type:'capture',label:'origin barrier'});
    await until(()=>events.filter(e=>e.kind==='values').reduce((n,e)=>n+e.count,0)===296);
    await wait(80);unsubscribe();
    assert.equal(duplicateValues,0,'own acknowledgement never changes the local store');
    assert.equal(runtime.state().sc.sends.c0[0],.5,'GUI commanded-state cache does not depend on echoes');
    assert.equal(runtime.state().sc.channels[0].level,.5);assert.equal(runtime.state().sc.slots[0].level,.5);
    const received=events.filter(e=>e.kind==='values').flatMap(e=>e.changes);
    assert.equal(received.length,296);assert.ok(received.every(c=>c.source!==observer.watchToken&&c.value===.5));
    // A coalesced frame contains an own gesture and a real language-side change.
    const revision=(await observer.sync()).revision;events.length=0;
    await observer.sendBatch([message('c0/fx/fx0',.75,revision),{address:'/awb/rack/origin-test',args:[binding.instanceID,'external-level',.625]}]);
    await until(()=>events.some(e=>e.kind==='values'&&e.changes.some(c=>c.id==='global/channel-levels/c1')));
    assert.deepEqual(events.filter(e=>e.kind==='values').flatMap(e=>e.changes),[{id:'global/channel-levels/c1',value:.625,source:''}],'mixed frame preserves SC value and omits own value');
    await until(()=>runtime.store.get('c0/fx/fx0')===.75&&runtime.store.get('global/channel-levels/c1')===.625);
    const final=await observer.sync();assert.equal(final.sends.c0[0],.75);assert.equal(final.channels[1].level,.625);
    assert.deepEqual(errors,[]);assert.equal(runtime.state().failures,0);
    await runtime.stop();runtime=null;
    await observer.send({address:'/awb/rack/origin-test',args:[binding.instanceID,'finish']});
    await until(()=>child.exitCode!==null);assert.equal(child.exitCode,0,log);assert.match(log,/AWB_RACK_ORIGIN_FINISHED=PASS/);
    t.diagnostic('296 own values omitted; 296 foreign values delivered; mixed SC/GUI frame and full Sync verified, without audio');
  }finally{await runtime?.stop();await observer?.close();if(child&&child.exitCode===null)child.kill('SIGTERM');await rm(dir,{recursive:true,force:true});}
});


test('automatic SC recovery preserves new gestures and keeps recalls running',{timeout:10000},async()=>{
  const {decodeOscPacket}=await import('../../awb-shell/services/oscCodec.mjs');
  const dir=await mkdtemp(path.join(os.tmpdir(),'rack-recover-')),socket=dgram.createSocket('udp4');
  await new Promise(r=>socket.bind(0,'127.0.0.1',r));
  const instanceID='sendRack:recovery';let ws;const notifications=[];let runtime,endpoint,token,hold=false,release=null;const sends=[];
  socket.on('message',(bytes,remote)=>{for(const m of decodeOscPacket(bytes)){
    const reply=(address,args)=>socket.send(encodeOSC({address,args}),remote.port,remote.address);
    if(m.args[1]==='sync'){
      const state=()=>{const send=(kind,...a)=>reply('/awb/rack/state',[instanceID,m.args[2],kind,...a]);
        send('begin',1,'Recovery rack','recovery',4,1,1,0,1);send('channel','a','A',1,0,0,0);
        send('slot','mast','Mast','fx',1,0,1,'',0,.01,.1,1,1,-60);send('sends','a',.125);send('end',1);};
      if(hold){hold=false;release=state;}else state();
    }else if(m.args[1]==='watch'){endpoint=remote;token=m.args[2];reply('/awb/rack/watch',[instanceID,token,1]);}
    else if(m.args[1]==='send')sends.push(m.args[4]);
  }});
  const recover=async()=>{
    hold=true;release=null;
    // Metadata requests a full snapshot; use one frame ID for both packets.
    const id='recover-'+Date.now();
    for(const [kind,a]of [['begin',[1,2,0,1]],['end',[2]]])await new Promise((resolve,reject)=>socket.send(encodeOSC({address:'/awb/rack/update',args:[instanceID,token,id,kind,...a]}),endpoint.port,endpoint.address,e=>e?reject(e):resolve()));
    for(let i=0;i<100&&!release;i++)await wait(5);assert.ok(release,'snapshot must be in flight');
  };
  try{
    runtime=await startRuntime({runtimeDirectory:path.join(dir,'view'),scBinding:{instanceID,port:socket.address().port,libraryID:'recovery',libraryRoot:dir}});await runtime.command({type:'arm',armed:true});
    await recover();await runtime.command({type:'batch',changes:[{id:'a/fx/mast',value:.75}]});release();await wait(100);
    assert.equal(runtime.store.get('a/fx/mast'),.75,'old recovery snapshot cannot rewind a newer gesture');
    assert.equal(runtime.state().sc.sends.a[0],.75);assert.equal(sends.at(-1),Math.fround(.75),'new gesture remains queued for SC');
    await runtime.command({type:'sync-sc'});assert.equal(runtime.store.get('a/fx/mast'),.125,'explicit Sync still applies SC state');
    const {WebSocket}=await import('ws');ws=new WebSocket(runtime.url.replace('http','ws')+'ws?token='+runtime.state().token);ws.on('message',b=>notifications.push(JSON.parse(b)));await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
    await runtime.command({type:'batch',changes:[{id:'a/fx/mast',value:1}]});
    const {snapshotID}=await runtime.command({type:'capture',label:'recover recall',ids:['a/fx/mast'],duration:300,targetDuration:300});
    await runtime.command({type:'batch',changes:[{id:'a/fx/mast',value:0}]});await runtime.command({type:'recall',id:snapshotID});
    await wait(60);await recover();await wait(60);release();await wait(30);
    assert.equal(notifications.filter(m=>m.type==='recall').at(-1)?.active,true,'recovery must not tell the browser that an active recall stopped');await wait(270);
    assert.equal(runtime.store.get('a/fx/mast'),1,'automatic recovery must not stop a recall');assert.equal(runtime.state().failures,0);
  }finally{await runtime?.stop();await wait(10);socket.close();await rm(dir,{recursive:true,force:true});}
});
