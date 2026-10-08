import http from 'node:http';
import {createRackTiming} from './timing.mjs';
import dgram from 'node:dgram';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir,rename,open,unlink} from 'node:fs/promises';
import {WebSocketServer} from 'ws';
import {RackStore,defaultConfig,wireMessage,createRecall} from '../src/model.mjs';

import {encodeOSC,createSCBridge,documentFromState,envBinding} from './sc-bridge.mjs';
import {createOscOutput} from '../../awb-shell/services/oscOutput.mjs';
export {encodeOSC} from './sc-bridge.mjs';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.map':'application/json','.svg':'image/svg+xml'};
export async function startRuntime({runtimeDirectory,httpPort=0,seedDocument,sendPacket,scBinding=envBinding(),fixedFXReturns=false,autoArmSC=false,levelRanges={}}={}){
  await mkdir(runtimeDirectory,{recursive:true});
  let scState=null,bridge=null,reportSCError=()=>{},applySCUpdate=()=>{},feedbackReady=false;const feedbackQueue=[];
  if(scBinding){bridge=await createSCBridge(scBinding,{onError:message=>reportSCError(message),onUpdate:event=>{if(feedbackReady)applySCUpdate(event);else feedbackQueue.push(event)}});try{scState=await bridge.sync();}catch(e){bridge.close();throw e;}}
  const libraryPath=path.join(scState&&scBinding.libraryRoot?path.resolve(scBinding.libraryRoot):path.dirname(runtimeDirectory),scState?`rack-library-sc-${scState.libraryID}.json`:'rack-library.json');
  try{await mkdir(path.dirname(libraryPath),{recursive:true});}catch(e){bridge?.close();throw e;}
  let libraryLock=null;
  const unlock=async()=>{if(libraryLock){await libraryLock.close();libraryLock=null;await unlink(libraryPath+'.lock').catch(e=>{if(e.code!=='ENOENT')throw e;});}};
  if(bridge){
    try{
      for(let attempt=0;attempt<2;attempt++){
        try{libraryLock=await open(libraryPath+'.lock','wx');await libraryLock.writeFile(String(process.pid));break;}
        catch(e){if(e.code!=='EEXIST')throw e;const pid=Number(await readFile(libraryPath+'.lock','utf8'));if(!Number.isInteger(pid)||pid<1)throw Error('SC mix library lock is incomplete; another rack may be opening.');try{process.kill(pid,0);}catch(check){if(check.code==='ESRCH'){await unlink(libraryPath+'.lock');continue;}throw check;}throw Error('This SC mix library is already open in another rack. Use a different libraryID for an independent rack.');}
      }
      if(!libraryLock)throw Error('Unable to acquire SC mix library.');
    }catch(e){bridge.close();await unlock();throw e;}
  }
  const boundDocument=(state,snapshots=[])=>{
    const doc=documentFromState(state,snapshots),region=doc.config.regions.find(r=>r.kind==='channel-levels');
    region.ranges={...levelRanges,...region.ranges};return doc;
  };
  let document=seedDocument;
  try {
    if(!document){try{document=JSON.parse(await readFile(libraryPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;if(!scState){try{document=JSON.parse(await readFile(new URL('../fixtures/live-set.rack.json',import.meta.url),'utf8'));}catch{document={config:defaultConfig(),values:{},snapshots:[]};}}}}
    if(scState)document={...boundDocument(scState,document?.snapshots??[]),mixSet:document?.mixSet};
  }catch(e){bridge?.close();await unlock();throw e;}
  if(!bridge&&document.config.output.mode==='sc')throw Error('Native SC rack requires its ToolInstance binding.');
  let store;try{store=new RackStore(document);}catch(e){bridge?.close();await unlock();throw e;}
  const fixedReturns=new Set(fixedFXReturns?[...store.byID.values()].filter(d=>d.instrument==='global'&&d.region.id==='levels').map(d=>d.id):[]);
  for(const id of fixedReturns)store.set(id,1,'unity-return');
  const token=crypto.randomUUID(),udp=dgram.createSocket('udp4'),peers=new Set();
  const root=path.resolve(fileURLToPath(new URL('../dist/',import.meta.url)));let armed=!!(autoArmSC&&bridge),recall=null,saveTimer,flushTimer,closed=false,writeQueue=Promise.resolve(),transmitQueue=Promise.resolve();const pending=new Map(),localVersions=new Map();let sent=0,failures=0;
  const output=createOscOutput({encodeMessage:encodeOSC,sendPacket:(bytes,packets)=>sendPacket?sendPacket(bytes,packets.length===1?packets[0]:{controls:packets}):new Promise((resolve,reject)=>udp.send(bytes,store.config.output.port,store.config.output.host,e=>e?reject(e):resolve()))});
  const timing=createRackTiming();
  const state=()=>({timing:timing.snapshot(),recall:!!recall,document:store.document(),armed,token,libraryPath,sent,failures,sc:scState,oscOutput:bridge&&!sendPacket?bridge.outputStats():output.snapshot()});
  const broadcast=message=>{const text=JSON.stringify(message);for(const ws of peers)if(ws.readyState===1)ws.send(text);};
  reportSCError=message=>{
    failures++;armed=false;recall?.stop();recall=null;timing.finishScene();pending.clear();
    broadcast({type:'armed',armed});broadcast({type:'error',message:`SC: ${message}`});
    // A rejected command must roll optimistic GUI state back to actual SC values.
    // Stay disarmed and never retry failed edits automatically.
    if(!closed&&!syncingSC)queueMicrotask(()=>syncSC().catch(()=>{}));
  };
  const save=()=>{const text=JSON.stringify(store.document(),null,2)+'\n';writeQueue=writeQueue.catch(()=>{}).then(async()=>{await writeFile(libraryPath+'.tmp',text);await rename(libraryPath+'.tmp',libraryPath);}).catch(e=>{broadcast({type:'error',message:`Save failed: ${e.message}`});throw e;});return writeQueue;};
  const queueSave=()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>save().catch(()=>{}),300);};
  const cacheSCValue=(id,value)=>{
    if(!scState)return;
    const [channel,region,destination]=id.split('/');
    if(region==='fx'||region==='followers')scState.sends[channel][scState.slots.findIndex(s=>s.id===destination)]=value;
    else if(region==='state')scState.channels.find(c=>c.id===channel)[destination]=value;
    else if(region==='channel-levels')scState.channels.find(c=>c.id===destination).level=value;
    else if(region==='levels'||region==='control-levels')scState.slots.find(s=>s.id===destination).level=value;
  };
  const transmitMany=async(changes)=>{
    const packets=[];
    for(const {id,value,scRevision=scState?.revision} of changes){
      try{
        const d=store.byID.get(id),message=wireMessage(d,value,store.config);if(!message)continue;
        if(bridge)message.args.push(scRevision);
        const packet={id,value,message,endpoint:store.config.output,armed};broadcast({type:'wire',...packet});
        if(armed){
          packets.push(packet);
          // GUI values are authoritative commanded state; SC acknowledges revisions
          // without returning these values. Explicit Sync still reads actual SC state.
          if(bridge)cacheSCValue(id,value);
        }
      }catch(e){failures++;broadcast({type:'error',message:`${id}: ${e.message}`});}
    }
    if(!packets.length)return;
    try{
      if(bridge&&!sendPacket)await bridge.sendBatch(packets.map(p=>p.message));
      else await output.sendMany(packets.map(p=>({message:p.message,context:p})));
      sent+=packets.length;
    }catch(e){if(bridge)reportSCError(e.message);else {failures++;broadcast({type:'error',message:`OSC: ${e.message}`});}}
  };
  const flush=async()=>{clearTimeout(flushTimer);flushTimer=null;const changes=[...pending].map(([id,change])=>({id,...change}));pending.clear();if(changes.length)broadcast({type:'patch',changes});transmitQueue=transmitQueue.then(()=>transmitMany(changes.filter(c=>!c.origin.startsWith('sc-'))));return await transmitQueue;};

  const unsub=store.subscribeAll(event=>{if(event.kind==='value'){if(!event.origin.startsWith('sc-'))localVersions.set(event.id,(localVersions.get(event.id)??0)+1);pending.set(event.id,{value:event.value,origin:event.origin,scRevision:scState?.revision});if(!flushTimer)flushTimer=setTimeout(()=>void flush(),16);}else broadcast({type:'document',document:store.document()});queueSave();});
  const compatible=(doc)=>{
    if(!bridge){if(doc.config.output.mode==='sc')throw Error('Open this rack from its SC ToolInstance to bind native routing.');return;}
    const current=store.config;
    if(doc.config.output.mode!=='sc'||doc.config.output.libraryID!==current.output.libraryID||JSON.stringify(doc.config.instruments)!==JSON.stringify(current.instruments)||JSON.stringify(doc.config.regions)!==JSON.stringify(current.regions))throw Error('Stable SC topology is defined by the ToolInstance. Open a new rack to change channels or capacity.');
  };
  let syncingSC=null;const updatesDuringSync=[];
  const syncSC=({recovery=false}={})=>{if(syncingSC)return syncingSC;syncingSC=(async()=>{
    if(!bridge)throw Error('No native SC rack is bound.');
    if(!recovery){recall?.stop();recall=null;timing.finishScene();}
    const versions=new Map(localVersions);await flush();
    let next;try{next=await bridge.sync();}catch(e){reportSCError(e.message);throw e;}const doc=boundDocument(next,store.snapshots);
    compatible(doc);scState=next;
    for(const [id,value]of Object.entries(doc.values)){
      // A recovery snapshot may predate a gesture made while awaiting SC.
      // Preserve that gesture (and its pending transmission), including recalls.
      if(recovery&&localVersions.get(id)!==versions.get(id))cacheSCValue(id,store.get(id));
      else store.set(id,value,'sc-sync');
    }
    broadcast({type:'sc',sc:scState});if(!recovery)broadcast({type:'recall',active:false,timing:timing.snapshot()});await save();return {revision:scState.revision};
  })().finally(()=>{syncingSC=null;for(const event of updatesDuringSync.splice(0))applySCUpdate(event);});return syncingSC;
  };
  applySCUpdate=event=>{
    if(closed)return;
    const recover=()=>void syncSC({recovery:true}).catch(()=>{});
    if(syncingSC){if(updatesDuringSync.length<64)updatesDuringSync.push(event);else updatesDuringSync.splice(0,updatesDuringSync.length,{kind:'recover'});return;}
    if(event.kind==='recover'){recover();return;}
    if(event.kind==='heartbeat'){if(event.revision>scState.revision)recover();return;}
    if(event.revision<=scState.revision)return;
    if(event.metadata||event.baseRevision>scState.revision){recover();return;}
    for(const change of event.changes){
      const d=store.byID.get(change.id);
      if(!d||change.value<d.region.min||change.value>d.region.max){reportSCError('Invalid SC feedback control/value.');recover();return;}
    }
    scState.revision=event.revision;
    for(const {id,value,source} of event.changes){
      cacheSCValue(id,value);
      // Retain suppression for older classes that still echo originating values.
      if(source!==bridge.watchToken){recall?.override(id);store.set(id,value,'sc-feedback');}
    }
  };

  const command=async (c,origin='local')=>{
    if(!c||typeof c.type!=='string')throw Error('Invalid Rack command.');
    if(c.type==='batch'){if(!Array.isArray(c.changes)||c.changes.length>4096)throw Error('Invalid control batch.');for(const x of c.changes){if(!store.byID.has(x.id)||!Number.isFinite(x.value))throw Error('Unknown control or value.');}for(const x of c.changes){recall?.override(x.id);store.set(x.id,x.value,origin);}return;}
    if(c.type==='arm'){armed=c.armed===true;broadcast({type:'armed',armed});return;}
    if(c.type==='set-timer'){timing.setClock(c.action);broadcast({type:'timing',timing:timing.snapshot()});return;}
    if(c.type==='stop'){recall?.stop();recall=null;timing.finishScene();broadcast({type:'recall',active:false,timing:timing.snapshot()});return;}
    if(c.type==='sync-sc')return await syncSC();
    if(c.type==='enable-control-send'){
      if(!bridge||!armed)throw Error('Enable output before changing an SC control send.');
      const slot=scState.slots.find(s=>s.id===c.slotID);if(!slot||slot.kind!=='follower'||typeof c.enabled!=='boolean')throw Error('Invalid control send enable command.');
      await flush();await bridge.control(c.type,[c.slotID,c.enabled?1:0]);const result=await syncSC();
      if(scState.slots.find(s=>s.id===c.slotID).controlEnabled!==(c.enabled?1:0))throw Error('SC did not apply control send enable change.');
      return result;
    }
    if(['set-fx','clear-fx','set-follower','clear-follower'].includes(c.type)){
      if(!bridge||!armed)throw Error('Enable output before changing an SC processor.');
      const slot=scState.slots.find(s=>s.id===c.slotID);if(!slot||slot.kind!==(c.type.includes('follower')?'follower':'fx'))throw Error('Unknown SC slot.');
      if(c.type==='set-fx'&&!scState.processors.includes(c.processor))throw Error('Choose a registered SC processor.');
      const args=c.type==='set-fx'?[c.slotID,c.processor]:[c.slotID];
      if(c.type==='set-follower'){const f=c.settings??{};if(!['linear','log','sqrt'].includes(f.curve)||![f.attack,f.release,f.scale,f.blend,f.floorDb].every(Number.isFinite)||f.attack<0||f.attack>60||f.release<0||f.release>60||f.scale<0||f.scale>scState.maxGain||f.blend<0||f.blend>1||f.floorDb>=0||f.floorDb< -120)throw Error('Invalid follower configuration.');args.push(f.curve,f.attack,f.release,f.scale,f.blend,f.floorDb);}
      await flush();await bridge.control(c.type,args);const result=await syncSC(),updated=scState.slots.find(s=>s.id===c.slotID);
      if(c.type.startsWith('clear')?updated.active!==0:updated.active!==1||updated.processor!==(c.type==='set-fx'?c.processor:c.settings.curve))throw Error('SC did not apply the processor change; inspect the SC error.');
      return result;
    }
    if(c.type==='document'){const next=new RackStore(c.document),doc=next.document();compatible(doc);if(bridge)doc.config.output={...store.config.output};recall?.stop();recall=null;timing.finishScene();armed=false;pending.clear();store.replace(doc);broadcast({type:'recall',active:false,timing:timing.snapshot()});broadcast({type:'armed',armed});await save();return;}
    if(c.type==='mix-set'){
      if(typeof c.name!=='string'||!c.name.trim()||c.name.length>120)throw Error('Invalid mix set name.');
      const next=new RackStore({...store.document(),snapshots:c.snapshots,mixSet:{name:c.name.trim()}});
      recall?.stop();recall=null;timing.finishScene();broadcast({type:'recall',active:false,timing:timing.snapshot()});
      store.snapshots=next.snapshots;store.mixSet=next.mixSet;store.notifyMeta();await save();return {count:store.snapshots.length};
    }
    if(c.type==='capture'){await flush();const snapshot=store.capture(c.label,c.sceneID??null,c.ids,{duration:c.duration??1000,targetDuration:c.targetDuration??c.duration??1000,alignment:c.alignment??'L'});await save();return {snapshotID:snapshot.id};}
    if(c.type==='snapshot'){store.updateSnapshot(c.snapshot);await save();return;}
    if(c.type==='delete-snapshot'){store.snapshots=store.snapshots.filter(s=>s.id!==c.id);store.notifyMeta();await save();return;}
    if(c.type==='recall'){const s=store.snapshots.find(s=>s.id===c.id);if(!s)throw Error('Unknown snapshot.');recall?.stop();timing.startScene(s,c.direct?0:s.duration);broadcast({type:'recall',active:true,id:s.id,timing:timing.snapshot()});let finished=false;const next=createRecall(store,{...s,targets:Object.fromEntries(Object.entries(s.targets).filter(([id])=>!fixedReturns.has(id))),duration:c.direct?0:s.duration},{onFinish:()=>{finished=true;recall=null;timing.finishScene(true);broadcast({type:'recall',active:false,timing:timing.snapshot()});}});recall=finished?null:next;return;}
    if(c.type==='send-all'){await flush();transmitQueue=transmitQueue.then(()=>transmitMany(store.controls.map(d=>({id:d.id,value:store.get(d.id)}))));await transmitQueue;return;}
    if(c.type==='save'){await save();return;}
    throw Error('Unknown Rack command.');
  };
  const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://127.0.0.1');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    if(req.method==='GET'&&url.pathname==='/api/state'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(state()));return;}
    if(req.method==='POST'&&url.pathname==='/api/command'){
      if(req.headers['x-rack-token']!==token)throw Error('Rack token missing.');let text='';for await(const b of req){text+=b;if(text.length>4*1024*1024)throw Error('Rack document is too large.');}const result=await command(JSON.parse(text));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,...result}));return;
    }
    if(req.method!=='GET'){res.writeHead(405);res.end();return;}
    const relative=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const bytes=await readFile(file);res.setHeader('Content-Type',MIME[path.extname(file)]??'application/octet-stream');res.end(bytes);
  }catch(e){res.writeHead(e.code==='ENOENT'?404:400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}});
  const wss=new WebSocketServer({noServer:true});
  server.on('upgrade',(req,socket,head)=>{const u=new URL(req.url,'http://127.0.0.1');if(u.pathname!=='/ws'||u.searchParams.get('token')!==token){socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
  wss.on('connection',ws=>{peers.add(ws);const clientID=crypto.randomUUID();let sequence=Promise.resolve();ws.send(JSON.stringify({type:'state',clientID,...state()}));ws.on('close',()=>{peers.delete(ws);if(!peers.size){if(!autoArmSC)armed=false;recall?.stop();recall=null;timing.finishScene();}});ws.on('message',data=>{if(data.length>4*1024*1024){ws.close(1009);return;}sequence=sequence.then(async()=>{let c;try{c=JSON.parse(data);const result=await command(c,clientID);if(c.requestID&&ws.readyState===1)ws.send(JSON.stringify({type:'ack',requestID:c.requestID,result}));}catch(e){if(ws.readyState===1)ws.send(JSON.stringify({type:'error',requestID:c?.requestID,message:e.message}));}});});});
  try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(httpPort,'127.0.0.1',resolve);});}catch(e){bridge?.close();await unlock();throw e;}
  if(bridge){
    try{await bridge.watch();await syncSC();feedbackReady=true;for(const event of feedbackQueue.splice(0))applySCUpdate(event);}
    catch(e){bridge.close();unsub();clearTimeout(saveTimer);clearTimeout(flushTimer);await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));await unlock();throw e;}
  }
  return {url:`http://127.0.0.1:${server.address().port}/`,libraryPath,store,command,state,
    async stop(){if(closed)return;closed=true;recall?.stop();clearTimeout(saveTimer);clearTimeout(flushTimer);pending.clear();unsub();armed=false;await transmitQueue;await bridge?.close();await output.close();try{await save();}finally{for(const ws of peers)ws.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));try{udp.close();}catch{};await unlock();}}};
}
