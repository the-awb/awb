import test from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {createLiveSetHostBridge} from '../src/liveSetHostBridge.mjs';
import {encodeOSC,decodeOSC} from '../../rack/runtime/sc-bridge.mjs';

const bind=socket=>new Promise((ok,fail)=>{socket.once('error',fail);socket.bind(0,'127.0.0.1',ok)});
test('headless live binding authenticates replies, validates bindings, closes only its session',async()=>{
 const socket=dgram.createSocket('udp4');await bind(socket);let bridge;const requests=[];
 socket.on('message',(bytes,peer)=>{
  const m=decodeOSC(bytes);requests.push(m);const [token,request,op,id]=m.args;
  socket.send(encodeOSC({address:'/awb/live-set/host/result',args:['wrong-token',request,'closed',id]}),peer.port,peer.address);
  socket.send(encodeOSC({address:'/awb/live-set/host/result',args:[token,request,...(op==='open'?['ready',id,123,socket.address().port,'awbBase:test','param:test','sendRack:test','host-test']:['closed',id])]}),peer.port,peer.address);
 });
 try{
  bridge=await createLiveSetHostBridge({port:socket.address().port,token:'test-token',libraryRoot:'/private/tmp/mixes',timeoutMs:1000});
  const result=await bridge.open();assert.equal(result.context.binding.instanceID,'param:test');assert.equal(result.context.rackBinding.libraryRoot,'/private/tmp/mixes');assert.equal(result.context.delayBinding,true);
  await bridge.close();await bridge.close();assert.deepEqual(requests.map(m=>m.args[2]),['open','close']);assert.ok(requests.every(m=>m.address==='/awb/live-set/host'&&m.args[3]===bridge.sessionID));
 }finally{bridge?.dispose();socket.close()}
});
test('headless live launch reports SC errors and bounds unresponsive hosts',async()=>{
 const socket=dgram.createSocket('udp4');await bind(socket);let bridge;
 socket.on('message',(bytes,peer)=>{const m=decodeOSC(bytes);if(m.args[2]==='open')socket.send(encodeOSC({address:'/awb/live-set/host/error',args:[m.args[0],m.args[1],'Missing FX plugin']}),peer.port,peer.address)});
 try{bridge=await createLiveSetHostBridge({port:socket.address().port,token:'token',libraryRoot:'/private/tmp',timeoutMs:30});await assert.rejects(bridge.open(),/Missing FX plugin/);bridge.dispose();await assert.rejects(bridge.open(),/closed/)}finally{bridge?.dispose();socket.close()}
 const silent=dgram.createSocket('udp4');await bind(silent);
 try{bridge=await createLiveSetHostBridge({port:silent.address().port,token:'token',libraryRoot:'/private/tmp',timeoutMs:30});await assert.rejects(bridge.open(),/timed out/)}finally{bridge?.dispose();silent.close()}
});
test('actual sclang host opens, isolates and closes its installed entry point without an engine',{skip:!process.env.AWB_LIVE_CLASS_CONFIG,timeout:25000},async()=>{
 const probe=dgram.createSocket('udp4');await bind(probe);const fixturePort=probe.address().port;await new Promise(r=>probe.close(r));
 const dir=await mkdtemp('/private/tmp/awb-live-host-'),token='fixture-token';let child,bridge,other,log='';
 try{
  const scdir=path.join(dir,'apps/live-set/sc');await mkdir(scdir,{recursive:true});
  await writeFile(path.join(scdir,'host.scd'),await readFile(new URL('../../live-set/sc/host.scd',import.meta.url)));
  await writeFile(path.join(dir,'apps/live-set/open.scd'),`(\nvar server=AWBCoreTestServer(\\hostFixture,NetAddr("127.0.0.1",59996));\n~liveBaseInstance=AWBaseTool.open((params:[(id:\\gain,base:0.2)]),(server:server,sendFunction:{|m|nil},track:false));~liveBase=~liveBaseInstance.tool;~liveBase.track(\\vc).add(\\gain,~liveBase.param(\\gain),"Gain");\n~rackFixture=AWBSendRackTool.open((channels:[\\vc],fixedFX:[\\mast],dynamicFX:0,fixedFollowers:[],spareFollowers:0,libraryID:"host-fixture"),(server:server,sendFunction:{|m|nil},track:false));\n~awb52=(rack:~rackFixture.tool);~liveView=~liveBase.gui((launch:false));\n~awbLiveClose={~liveView.close;~liveBaseInstance.close;~rackFixture.close;"HOST_FIXTURE_CLOSED".postln};\n~awbLiveOnReady.value(~liveBase,~liveView);\n)\n`);
  const script=path.join(dir,'start.scd');await writeFile(script,`"${scdir}/host.scd".load;("HOST_FIXTURE_READY="++NetAddr.langPort).postln;SystemClock.sched(20,{1.exit});\n`);
  child=spawn('/Applications/SuperCollider.app/Contents/MacOS/sclang',['-D','-u',String(fixturePort),'-l',process.env.AWB_LIVE_CLASS_CONFIG,script],{env:{...process.env,AWB_HEADLESS_TOKEN:token}});
  const port=await new Promise((ok,fail)=>{const timeout=setTimeout(()=>fail(Error(log)),10000);child.stdout.on('data',b=>{log+=b;const m=log.match(/HOST_FIXTURE_READY=(\d+)/);if(m){clearTimeout(timeout);ok(Number(m[1]))}});child.stderr.on('data',b=>log+=b);child.once('exit',c=>{clearTimeout(timeout);fail(Error(`sclang ${c}: ${log}`))})});
  bridge=await createLiveSetHostBridge({port,token,libraryRoot:dir,timeoutMs:3000});const first=await bridge.open();assert.match(first.instanceID,/^awbBase:/);assert.match(first.context.rackBinding.instanceID,/^sendRack:/);assert.equal((await bridge.open()).instanceID,first.instanceID,'same session reuses its DSP owner');
  other=await createLiveSetHostBridge({port,token,libraryRoot:dir,timeoutMs:3000});await assert.rejects(other.open(),/another session/);await assert.rejects(other.close(),/Stale/);assert.equal((await bridge.open()).instanceID,first.instanceID,'stale close preserves active owner');
  await bridge.close();assert.match(log,/HOST_FIXTURE_CLOSED/);
 }finally{bridge?.dispose();other?.dispose();child?.kill('SIGTERM');await writeFile('/private/tmp/awb-live-host-contract.log',log);await rm(dir,{recursive:true,force:true})}
});
