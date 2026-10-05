// Transport correctness only: real WS/UDP/sclang/ToolInstance, no audio server.
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import path from 'node:path';
import crypto from 'node:crypto';
import dgram from 'node:dgram';
import {WebSocket} from '/Users/willy/awb/node_modules/ws/wrapper.mjs';
import {decodeOscPacket} from '/Users/willy/awb/apps/awb-shell/services/oscCodec.mjs';
import {encodeOSC} from '/Users/willy/awb/apps/rack/runtime/sc-bridge.mjs';
const exec=promisify(execFile),root='/Users/willy/awb',base=process.argv[2];
if(!base||!path.isAbsolute(base))throw Error('Use a fresh absolute evidence directory.');
await mkdir(base,{recursive:false});
const baseline='fba7843',commit=(await exec('git',['rev-parse','HEAD'],{cwd:root})).stdout.trim();
const duration=45,cadenceMs=32,frames=Math.ceil(duration*1000/cadenceMs),pause=ms=>new Promise(r=>setTimeout(r,ms));
const manifest={commit,baseline,scope:'transport-only; no graphics or audio; Bitwig remains open',channels:8,sends:32,mast:'included',controls:296,cadenceMs,frames,requestedChanges:frames*296,runs:[],complete:false,sourceGuards:{}};
const save=()=>writeFile(path.join(base,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const guard=async file=>{manifest.sourceGuards[file]=crypto.createHash('sha256').update(await readFile(file)).digest('hex');};
for(const name of ['apps/rack/runtime/shell-runtime.mjs','apps/rack/runtime/sc-bridge.mjs','apps/rack/src/model.mjs','apps/awb-shell/services/oscOutput.mjs','apps/rack/sc/classes/AWBSendRackTool.sc','apps/rack/sc/classes/AWBSendRackVoice.sc'])await guard(path.join(root,name));
const oldRoot=path.join(base,'baseline','apps','rack');
for(const name of ['runtime/shell-runtime.mjs','runtime/sc-bridge.mjs','src/model.mjs']){
 const file=path.join(oldRoot,name);await mkdir(path.dirname(file),{recursive:true});
 const {stdout}=await exec('git',['show',`${baseline}:apps/rack/${name}`],{cwd:root});await writeFile(file,stdout);
}
// Old runtime needs the existing ws dependency; no old application state is copied.
const {symlink}=await import('node:fs/promises');await symlink(path.join(root,'node_modules'),path.join(base,'baseline','node_modules'),'dir');
const frameworkRoot='/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider',framework=path.join(base,'framework'),classes=path.join(base,'classes');
await mkdir(framework);await mkdir(classes);
const mapping=JSON.parse(await readFile(path.join(root,'apps/rack/sc/test/framework-files.json'),'utf8'));
for(const [name,relative]of Object.entries(mapping)){const source=path.join(frameworkRoot,relative);await guard(source);await cp(source,path.join(framework,name));}
for(const name of ['AWBSendRackTool.sc','AWBSendRackVoice.sc'])await cp(path.join(root,'apps/rack/sc/classes',name),path.join(classes,name));
const config=path.join(base,'sclang_conf.yaml');await writeFile(config,'includePaths:\n'+['/Applications/SuperCollider.app/Contents/Resources/SCClassLibrary',framework,classes].map(p=>'  - '+JSON.stringify(p)+'\n').join('')+'excludeDefaultPaths: true\nexcludePaths: []\npostInlineWarnings: false\n');
const script=String.raw`(
var instance,rack,server,responder,shadowGains=Dictionary.new,shadowLevels=Dictionary.new,writes=0,gainWrites=0,levelWrites=0,channels;
channels=Array.fill(8,{|i|("ch"++i).asSymbol});
try {
 server=Server(\transportOnly,NetAddr("127.0.0.1",59997),ServerOptions.new.numInputBusChannels_(0).numOutputBusChannels_(10));
 NodeManager.enable;
 instance=AWBSendRackTool.open((name:"Transport-only 32-send rack",libraryID:"transport32",width:2,channels:channels,
  fixedFX:[\splut,\spark,\deci,\fuzz,\verb,\mast],dynamicFX:26,fixedFollowers:[],spareFollowers:0,cleanSlot:false,out:8),
  (server:server,track:true,sendFunction:{|msg|
   writes=writes+1;
   if(msg[0]==\n_setn and:{msg[2]==\sendGains}){gainWrites=gainWrites+1;shadowGains[msg[1]]=msg.copyRange(4,msg.size-1)};
   if(msg[0]==\n_set and:{msg[2]==\level}){levelWrites=levelWrites+1;shadowLevels[msg[1]]=msg[3]};
  }));
 rack=instance.tool;
 rack.fxIDs.do{|id|rack.setFX(id,\pass,(fade:0.02,tail:0,limiter:false));rack.setReturn(id,0)};
 channels.do{|id|rack.slotIDs.do{|slot|rack.setSend(id,slot,0)};rack.setLevel(id,0)};
 responder=OSCFunc({|msg,time,address|
  if(address.ip=="127.0.0.1" and:{msg[1].asString==instance.instanceID}){
   if(msg[2].asString=="stats"){
    address.sendMsg('/awb/rack/transport-stats',instance.instanceID,msg[3],"begin",rack.revision,writes,gainWrites,levelWrites,NodeManager.isEnabled.asInteger,NodeManager.instance.registry.includesKey(instance).asInteger,instance.ownedObjects.size,server.serverRunning.asInteger);
    channels.do{|id|address.sendMsg('/awb/rack/transport-stats',instance.instanceID,msg[3],"gains",id.asString,*shadowGains[rack.channels[id][\node].nodeID])};
    channels.do{|id|address.sendMsg('/awb/rack/transport-stats',instance.instanceID,msg[3],"level",("global/channel-levels/"++id),shadowLevels[rack.channels[id][\node].nodeID])};
    rack.fxIDs.do{|id|address.sendMsg('/awb/rack/transport-stats',instance.instanceID,msg[3],"level",("global/levels/"++id),shadowLevels[rack.slots[id][\active][\return].nodeID])};
    address.sendMsg('/awb/rack/transport-stats',instance.instanceID,msg[3],"end");
   }{responder.free;instance.close;"AWB_TRANSPORT_ONLY_FINISHED".postln;0.exit};
  };
 },'/awb/rack/transport-test');
 File.use("AWB_TRANSPORT_READY".getenv,"w",{|f|f.write("{\"instanceID\":\"%\",\"port\":%,\"libraryID\":\"transport32\"}".format(instance.instanceID,NetAddr.langPort))});
 "AWB_TRANSPORT_ONLY_READY".postln;
 SystemClock.sched(120,{instance.close;1.exit;nil});
}{|error|error.reportError;1.exit};
)
`;
await writeFile(path.join(base,'transport.scd'),script);await save();
const socketFactory=dgram.createSocket;
let active=null;
dgram.createSocket=function(...args){const socket=socketFactory.apply(dgram,args),send=socket.send;
 socket.send=function(...a){if(active&&Buffer.isBuffer(a[0])){
  try{const messages=decodeOscPacket(a[0]);const controls=messages.filter(m=>m.address==='/awb/rack/control'&&m.args[0]===active.instanceID&&['send','level','return','mute','solo'].includes(m.args[1]));
   if(controls.length){active.packets++;active.commands+=controls.length;active.bytes+=a[0].length;active.packetMax=Math.max(active.packetMax,a[0].length);if(messages.length>1)active.bundles++;}
  }catch{}}
  return send.apply(socket,a);
 };return socket;
};
async function port(){const s=socketFactory('udp4');await new Promise(r=>s.bind(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function until(f,ms=30000){const end=performance.now()+ms;while(performance.now()<end){const value=await f();if(value)return value;await pause(25);}throw Error('Condition timed out');}
const udpStats=async()=>(await exec('/usr/sbin/netstat',['-s','-p','udp'])).stdout;
const drops=s=>Number(s.match(/(\d+) dropped due to full socket buffers/)?.[1]??NaN);
async function stats(binding){const socket=socketFactory('udp4'),id=crypto.randomUUID(),result={gains:{},levels:{}};
 try{return await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('SC stats timed out')),6000);socket.on('message',bytes=>{
  const m=decodeOscPacket(bytes)[0];if(m.address!=='/awb/rack/transport-stats'||m.args[1]!==id)return;const [instance,request,kind,...a]=m.args;
  if(kind==='begin')Object.assign(result,{revision:a[0],writes:a[1],gainWrites:a[2],levelWrites:a[3],nodeManagerEnabled:a[4],nodeManagerTracked:a[5],ownedObjects:a[6],audioServerRunning:a[7]});
  if(kind==='gains')result.gains[a[0]]=a.slice(1);if(kind==='level')result.levels[a[0]]=a[1];
  if(kind==='end'){clearTimeout(timer);resolve(result);}
 });socket.send(encodeOSC({address:'/awb/rack/transport-test',args:[binding.instanceID,'stats',id]}),binding.port,'127.0.0.1');});}finally{socket.close();}}
const errors=[];
async function run(pass,mode){
 const dir=path.join(base,`pass${pass}-${mode}`);await mkdir(dir);const ready=path.join(dir,'ready.json'),langPort=await port();let child,runtime,ws,binding,log='',row;
 const entry={pass,mode,complete:false,dir};manifest.runs.push(entry);await save();console.log('START',pass,mode);
 try{
  child=spawn('/Applications/SuperCollider.app/Contents/MacOS/sclang',['-D','-u',String(langPort),'-l',config,path.join(base,'transport.scd')],{env:{...process.env,AWB_TRANSPORT_READY:ready},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
  binding=await until(async()=>{if(child.exitCode!==null)throw Error('sclang exited: '+log);try{return JSON.parse(await readFile(ready,'utf8'));}catch{return false;}});
  const runtimeFile=mode==='baseline'?path.join(oldRoot,'runtime/shell-runtime.mjs'):path.join(root,'apps/rack/runtime/shell-runtime.mjs');
  const {startRuntime}=await import(pathToFileURL(runtimeFile));runtime=await startRuntime({runtimeDirectory:path.join(dir,'runtime'),scBinding:{...binding,libraryRoot:dir}});
  const state=runtime.state(),before=await stats(binding);if(before.audioServerRunning)throw Error('Audio server unexpectedly running');
  const ids=[];for(const slot of state.sc.slots)for(const c of state.sc.channels)ids.push(`${c.id}/fx/${slot.id}`);
  ids.push(...state.sc.slots.map(s=>`global/levels/${s.id}`),...state.sc.channels.map(c=>`global/channel-levels/${c.id}`));if(ids.length!==296)throw Error('Topology mismatch');
  ws=new WebSocket(runtime.url.replace('http','ws')+'ws?token='+state.token);const notices=[];let errorCount=0;
  ws.on('message',bytes=>{const m=JSON.parse(bytes);if(m.type==='error'){errorCount++;if(notices.length<20)notices.push(m.message);}});
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});await runtime.command({type:'arm',armed:true});
  const udpBefore=await udpStats();active={instanceID:binding.instanceID,packets:0,commands:0,bytes:0,bundles:0,packetMax:0};const expected={};let lateFrames=0,maxLateMs=0;
  const started=performance.now();
  for(let frame=0;frame<frames;frame++){
   const lateness=Math.max(0,performance.now()-started-frame*cadenceMs);if(lateness>2)lateFrames++;maxLateMs=Math.max(maxLateMs,lateness);
   const changes=ids.map((id,k)=>{const p=(frame+1+k*7)%62,value=Math.round(((1+4*(p<=31?p:62-p))/127)*1000)/1000;expected[id]=value;return {id,value};});
   ws.send(JSON.stringify({type:'batch',changes}));await pause(Math.max(0,started+(frame+1)*cadenceMs-performance.now()));
  }
  const replayElapsedMs=performance.now()-started;
  // Same WS ordering barrier used by the GUI; a successful capture drains Node.
  const requestID=1;const barrier=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('WS capture barrier timed out')),10000);const fn=data=>{const m=JSON.parse(data);if(m.requestID===requestID){clearTimeout(timer);ws.off('message',fn);m.type==='error'?reject(Error(m.message)):resolve(m);}};ws.on('message',fn);});
  ws.send(JSON.stringify({type:'capture',label:'transport barrier',requestID}));await barrier;await pause(300);
  let syncError=null;try{await runtime.command({type:'sync-sc'});}catch(e){syncError=e.message;}
  await pause(100);const afterState=runtime.state(),after=await stats(binding),udpAfter=await udpStats();const wire={...active};active=null;
  const mismatches=[],shadowMismatches=[];const slots=afterState.sc.slots;
  for(const [id,want]of Object.entries(expected)){
   const got=runtime.store.get(id);if(Math.abs(got-want)>1e-5)mismatches.push({id,want,got});
   const [channel,region,destination]=id.split('/');const actual=region==='fx'?after.gains[channel]?.[slots.findIndex(s=>s.id===destination)]:after.levels[id];
   if(typeof actual!=='number'||Math.abs(actual-want)>1e-5)shadowMismatches.push({id,want,got:actual});
  }
  const accepted=after.revision-before.revision,sent=afterState.sent-state.sent;
  row={pass,mode,binding,requestedChanges:frames*ids.length,frames,controls:ids.length,replayElapsedMs,lateFrames,maxLateMs,sentCommands:sent,acceptedCommands:accepted,missingCommands:sent-accepted,wire,oscOutput:afterState.oscOutput??null,armedAtEnd:afterState.armed,bridgeFailures:afterState.failures-state.failures,errorCount,errors:notices,syncError,endpointMismatchCount:mismatches.length,shadowMismatchCount:shadowMismatches.length,endpointMismatches:mismatches.slice(0,20),shadowMismatches:shadowMismatches.slice(0,20),udpFullBufferDrops:drops(udpAfter)-drops(udpBefore),udpBefore,udpAfter,before,after,sourceGuardsVerified:false,noAudio:true};
  row.functionalPass=!syncError&&!row.bridgeFailures&&row.armedAtEnd&&accepted===sent&&!mismatches.length&&!shadowMismatches.length&&accepted>0;
  await writeFile(path.join(dir,'result.json'),JSON.stringify(row,null,2)+'\n');Object.assign(entry,{complete:true,functionalPass:row.functionalPass,missingCommands:row.missingCommands,packets:wire.packets,commands:wire.commands,udpFullBufferDrops:row.udpFullBufferDrops});await save();console.log('DONE',pass,mode,JSON.stringify({pass:row.functionalPass,sent,accepted,packets:wire.packets,drops:row.udpFullBufferDrops,mismatches:row.shadowMismatchCount,errors:row.bridgeFailures}));
 }finally{
  active=null;ws?.terminate();await runtime?.stop();
  if(binding&&child?.exitCode===null){const socket=socketFactory('udp4');await new Promise(resolve=>socket.send(encodeOSC({address:'/awb/rack/transport-test',args:[binding.instanceID,'finish']}),binding.port,'127.0.0.1',resolve));socket.close();await until(()=>child.exitCode!==null,6000).catch(()=>child.kill('SIGTERM'));}
  if(child?.exitCode===null)child.kill('SIGTERM');await writeFile(path.join(dir,'sclang.log'),log);
  entry.languagePID=child?.pid;entry.languageExitCode=child?.exitCode;await save();
 }
 return row;
}
try{
 const results=[];
 for(const [pass,modes]of [[1,['baseline','batched']],[2,['batched','baseline']]])for(const mode of modes)results.push(await run(pass,mode));
 for(const [file,hash]of Object.entries(manifest.sourceGuards))if(crypto.createHash('sha256').update(await readFile(file)).digest('hex')!==hash)throw Error('Protected source changed: '+file);
 manifest.complete=true;manifest.results=results;manifest.sourceGuardsVerified=true;await save();console.log('TRANSPORT_COMPARISON_COMPLETE',base);
}catch(e){errors.push(e.stack);manifest.error=e.stack;await save();throw e;}
