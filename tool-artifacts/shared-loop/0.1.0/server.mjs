import http from 'node:http';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {OSC} from './osc.mjs';
import {ScopeReduction} from './scope-reduction.mjs';
import {ScopeTransport} from './scope-transport.mjs';
import {runSclang} from './scripts/run-sclang.mjs';
const root=dirname(fileURLToPath(import.meta.url)),require=createRequire(import.meta.url);
const native=require('./build/loopview.node'),scopeNative=require('./build/scopeview.node');
export async function startDemo({port=57983,httpPort=8793,seconds=4,runtimeDirectory=resolve(root,'build')}={}){
 const preflight=new OSC(port);
 try {await preflight.request('/status',[],'/status.reply',()=>true,300);throw new Error(`SC port ${port} is already in use`);} catch(e){if(!e.message.includes('timed out'))throw e;} finally {preflight.close();}
 const sharedId=Math.floor(100000+Math.random()*15000000);
 const log=[];const child=runSclang({port,id:sharedId,seconds,runtimeDirectory});let exited=false;
 child.on('exit',()=>{exited=true;});for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{const s=b.toString();log.push(s);if(log.length>200)log.shift();writeFileSync(resolve(runtimeDirectory,'sclang.log'),log.join(''));});
 let session;
 try{
  for(let i=0;i<450;i++){if(exited)throw new Error('sclang exited during startup');if(log.some(s=>s.includes('ERROR:')))throw new Error('SC startup error');if(existsSync(resolve(runtimeDirectory,'session.json'))){session=JSON.parse(readFileSync(resolve(runtimeDirectory,'session.json')));break;}await delay(100);}
  if(!session)throw new Error('SC startup timed out');
 }catch(e){child.kill('SIGTERM');throw new Error(`${e.message}\n${log.join('')}`);}
 const osc=new OSC(port);osc.on('serverFailure',a=>console.error('SC:',...a));
 let reader;
 try {reader=native.attach(sharedId);} catch(e){osc.send('/n_free',session.nodeId);await osc.sync();await osc.request('/cmd',['loop_view_free',sharedId],'/done');await osc.request('/quit',[],'/done',a=>a[0]==='/quit');osc.close();child.kill('SIGTERM');throw e;}
 return startBridge({session:{...session,sharedId},osc,reader,httpPort,isConnected:()=>!exited,release:async()=>{
  try {if(!exited){osc.send('/n_free',session.nodeId);await osc.sync();await osc.request('/cmd',['loop_view_free',sharedId],'/done',a=>a[0]==='loop_view_free');osc.send('/b_free',session.bufnum);await osc.sync();await osc.request('/quit',[],'/done',a=>a[0]==='/quit');}}
  finally {for(let i=0;i<30&&!exited;i++)await delay(100);if(!exited)child.kill('SIGTERM');}
 }});
}
export async function startHosted({nativeHost,signalCaptures,httpPort=0,seconds=4}) {
 if(!nativeHost || nativeHost.oscHost!=='127.0.0.1') throw new Error('Shared Loop needs the shell local SC host.');
 const sharedId=Math.floor(100000+Math.random()*15000000);
 const language=new OSC(nativeHost.oscPort);
 let session,reader,osc,scopeReader;
 const release=async()=>{try{await language.request('/awb/loop/close',[sharedId,nativeHost.token],'/awb/loop/closed',a=>a[0]===sharedId,7000);}finally{language.close();}};
 try {
  const reply=await language.request('/awb/loop/open',[sharedId,seconds,signalCaptures?2:1,nativeHost.token],'/awb/loop/ready',a=>a[0]===sharedId,15000);
  session={sharedId,port:reply[1],bufnum:reply[2],nodeId:reply[3],sampleRate:reply[4],micScope:reply[5],outScope:reply[6],scopeNodeId:reply[7],controlScope:reply[8],controlBus:reply[9],blockSize:reply[10],inputBus:reply[11],scopeEngine:signalCaptures?'shared':'legacy',host:'shell'};
  osc=new OSC(session.port);reader=native.attach(sharedId);
  if(!signalCaptures)scopeReader=scopeNative.attach(session.port,session.micScope,session.outScope,session.controlScope);
 } catch(error) {
  // A lost reply may have left a completed allocation; ask this host to release it.
  if(scopeReader)scopeNative.detach(scopeReader);if(reader)native.detach(reader);
  await release().catch(()=>{}); osc?.close();
  throw new Error(`${error.message}. Shared Loop requires its host bridge and plugin; restart the shell-owned host after updating AWB.`);
 }
 let controlLeaseCount=0;
 const openSignal=signalCaptures?async(kind,onFrame,onError,step=1)=>{
  if(kind==='control'&&controlLeaseCount===0)await language.request('/awb/loop/signals',[sharedId,1,nativeHost.token],'/awb/loop/signals-ready',a=>a[0]===sharedId&&a[1]===1);
  if(kind==='control')controlLeaseCount++;
  try{
   const reduction=new ScopeReduction(kind);
   const subscribe=signalCaptures.subscribeDerived?signalCaptures.subscribeDerived.bind(signalCaptures):signalCaptures.subscribe.bind(signalCaptures);
   const lease=await subscribe({host:nativeHost,configuration:{bus:kind==='mic'?session.inputBus:kind==='output'?0:session.controlBus,channels:kind==='mic'?1:kind==='output'?2:6,rate:kind==='control'?'control':'audio'},onFrame,onError,profile:`scope:${kind==='control'?32:1024}:${step}`,createTransform:()=>({append:(frame,info)=>reduction.append(frame,info,step)})});
   let stopped=false;return {derived:!!signalCaptures.subscribeDerived,step,stop:async()=>{if(stopped)return;stopped=true;await lease.stop();if(kind==='control')controlLeaseCount--;if(kind==='control'&&controlLeaseCount===0&&nativeHost.isConnected())await language.request('/awb/loop/signals',[sharedId,0,nativeHost.token],'/awb/loop/signals-ready',a=>a[0]===sharedId&&a[1]===0)}};
  }catch(error){if(kind==='control')controlLeaseCount--;if(kind==='control'&&controlLeaseCount===0)await language.request('/awb/loop/signals',[sharedId,0,nativeHost.token],'/awb/loop/signals-ready',a=>a[0]===sharedId).catch(()=>{});throw error}
 }:null;
 return startBridge({session,osc,reader,scopeReader,openSignal,httpPort,isConnected:nativeHost.isConnected,release});
}
export async function startBridge({session,osc,reader,scopeReader=null,openSignal=null,httpPort,isConnected,release,updateIntervalMs=33}) {
 if(!Number.isFinite(updateIntervalMs)||updateIntervalMs<16||updateIntervalMs>1000)throw new Error("Bridge update interval must be 16–1000 ms");
 let snapshot=null,closing=false,bridgeError=null;
 const config={source:0,frequency:220,toneLevel:.25,inputGain:1,outputGain:.25,feedback:1};
 const clients=new Set();let scopeTransport;let legacySequence=null;let lastAt=0,scopeAt=0,scopeError=null;
 let scopes={mic:null,output:null,control:null};
 const scopeView={mic:1,output:1,control:1};
 const scopesAvailable=()=>!!(scopeReader||openSignal)&&!scopeError&&isConnected()&&scopeAt>0&&Date.now()-scopeAt<2000;
 const scopeMetadata=()=>Object.fromEntries(Object.entries(scopes).map(([kind,snapshot])=>{if(!snapshot)return [kind,null];const {samples,...metadata}=snapshot;return [kind,metadata];}));
 const status=()=>({snapshot:snapshot?{...snapshot,envelope:Array.from(snapshot.envelope)}:null,config,connected:isConnected()&&!bridgeError&&(!lastAt||Date.now()-lastAt<2000),bridgeError,scopes:{available:!!(scopeReader||openSignal)&&!closing&&isConnected(),live:scopesAvailable(),error:scopeError},ageMs:lastAt?Date.now()-lastAt:null,session});
 const timer=setInterval(()=>{
  if(closing)return;
  try{const next=native.read(reader);if(next){snapshot=next;lastAt=Date.now();bridgeError=null;const event=`data: ${JSON.stringify(status())}\n\n`;for(const res of clients)res.write(event);} }
  catch(e){bridgeError=e.message;for(const res of clients)res.write(`data: ${JSON.stringify(status())}\n\n`);}
 },updateIntervalMs);
 // A separate bounded collector services short captures before the next audio chunk finishes.
 const scopeTimer=scopeReader?setInterval(()=>{
  if(closing)return;
  if(scopeReader){try{
   const next=scopeNative.read(scopeReader);
   for(const kind of ['mic','output','control'])if(next[kind])scopes[kind]={...next[kind],sampleRate:kind==='control'?session.sampleRate/session.blockSize:session.sampleRate,audioSampleRate:session.sampleRate,blockSize:session.blockSize||64};
   if(next.mic&&next.output){if(next.mic.sequence!==legacySequence){scopeAt=Date.now();legacySequence=next.mic.sequence;}scopeError=null;}else scopeError='SC scopes are unavailable';
  }catch(error){scopeError=error.message;}
  scopeTransport?.publish(scopes,{connected:scopesAvailable(),error:scopeError});}
 },8):null;
 const signalLeases={},signalTails={},signalEpochs={},scopeTimes={},scopeErrors={},scopeSequences={mic:0,output:0,control:0};
 function publishSignals(){
  if(!openSignal)return;
  const now=Date.now(),live={},kinds={};
  for(const kind of ['mic','output','control']){
   const connected=!!signalLeases[kind]&&!!scopes[kind]&&!scopeErrors[kind]&&isConnected()&&now-(scopeTimes[kind]??0)<2000;
   live[kind]=connected?scopes[kind]:null;kinds[kind]={connected,error:scopeErrors[kind]??null};
  }
  scopeAt=Math.max(0,...Object.values(scopeTimes));scopeError=Object.values(scopeErrors).find(Boolean)??null;
  scopeTransport?.publish(live,{connected:Object.values(kinds).some(s=>s.connected),error:scopeError,kinds});
 }
 function reconcileSignal(kind){
  if(!openSignal)return;
  const job=(signalTails[kind]??Promise.resolve()).catch(()=>{}).then(async()=>{
   const needed=!closing&&scopeTransport.subscribers(kind)>0;
   if(!needed){
    const lease=signalLeases[kind];delete signalLeases[kind];scopes[kind]=null;delete scopeTimes[kind];delete scopeErrors[kind];
    if(lease)await lease.stop();publishSignals();return;
   }
   const old=signalLeases[kind],step=1/scopeView[kind];if(old?.step===step)return;
   const epoch=signalEpochs[kind]=(signalEpochs[kind]??0)+1;
   const reduction=new ScopeReduction(kind);scopeErrors[kind]=null;
   try{const lease=await openSignal(kind,(frame,info)=>{
    if(closing||epoch!==signalEpochs[kind])return;
    const next=frame.sourceFrames?frame:reduction.append(frame,info,step);
    if(next){scopes[kind]={...next,sequence:++scopeSequences[kind]};scopeTimes[kind]=info.publishedAt??Date.now();scopeErrors[kind]=null;publishSignals();}
   },error=>{if(epoch===signalEpochs[kind]){scopeErrors[kind]=error.message;publishSignals()}},step);
    signalLeases[kind]=lease;await old?.stop();publishSignals();
   }catch(error){scopeErrors[kind]=error.message;publishSignals();}
  });signalTails[kind]=job;job.catch(error=>{scopeErrors[kind]=error.message;publishSignals()});
 }
 const signalHeartbeat=openSignal?setInterval(publishSignals,250):null;
 async function control(action,value){
  if(closing||!isConnected()||bridgeError||lastAt&&Date.now()-lastAt>=2000)throw new Error('SC is disconnected');
  switch(action){
   case 'record':osc.send('/n_set',session.nodeId,'record',0,'overdub',0,'play',1);await osc.sync();osc.send('/n_set',session.nodeId,'record',1);break;
   case 'play':osc.send('/n_set',session.nodeId,'play',value?1:0,'overdub',0,'record',0);break;
   case 'overdub':osc.send('/n_set',session.nodeId,'overdub',value?1:0,'play',1,'record',0);break;
   case 'clear':osc.send('/n_set',session.nodeId,'clear',0,'record',0,'overdub',0);await osc.sync();osc.send('/n_set',session.nodeId,'clear',1);break;
   default:{const ranges={source:[0,1],frequency:[40,1500],toneLevel:[0,.8],inputGain:[0,2],outputGain:[0,1],feedback:[0,1]};if(!(action in ranges)||!Number.isFinite(value))throw new Error('Invalid control');const [min,max]=ranges[action];config[action]=Math.max(min,Math.min(max,value));if(action==='source')config[action]=Math.round(config[action]);osc.send('/n_set',session.nodeId,action,config[action]);}
  }
  await osc.sync();return status();
 }
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='POST'&&url.pathname==='/api/scope-view'){
   if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);res.end();return;}
   try{let body='';for await(const chunk of req){body+=chunk;if(body.length>512)throw new Error('Request too large');}
    const {kind,zoom}=JSON.parse(body);
    if(!['mic','output','control'].includes(kind)||![1,0.25,0.0625].includes(zoom)||!(scopeReader||openSignal)||!isConnected())throw new Error('Invalid scope capture request');
    const frames=(kind==='control'?128:1024)/zoom;
    if(scopeReader)scopeNative.setReduction(scopeReader,['mic','output','control'].indexOf(kind),1/zoom);scopeView[kind]=zoom;if(openSignal)reconcileSignal(kind);
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({kind,zoom,sourceFrames:frames,captureFrames:kind==='control'?32:1024,rolling:true}));
   }catch(error){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}return;
  }
  if(req.method==='GET'&&url.pathname==='/api/scopes'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({connected:scopesAvailable(),scopes:scopeMetadata(),view:scopeView,error:scopeError,transport:scopeTransport.diagnostics()}));return;}
  if(req.method==='GET'&&url.pathname==='/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(`data: ${JSON.stringify(status())}\n\n`);clients.add(res);req.on('close',()=>clients.delete(res));return;}
  if(req.method==='GET'&&url.pathname==='/api/state'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(status()));return;}
  if(req.method==='POST'&&url.pathname==='/api/control'){
   if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);res.end();return;}
   try{let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw new Error('Request too large');}const {action,value}=JSON.parse(body);const state=await control(action,value);res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(state));}catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}return;
  }
  const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/scope':'scope.html','/scope.js':'scope.js','/scope-protocol.js':'scope-protocol.js','/scope-history.js':'scope-history.js','/scope-painter.js':'scope-painter.js','/scope-metadata.js':'scope-metadata.js','/scope-trace.js':'scope-trace.js','/scope.css':'scope.css'};if(req.method!=='GET'||!files[url.pathname]){res.writeHead(404);res.end();return;}
  const name=files[url.pathname];res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});res.end(readFileSync(resolve(root,'public',name)));
 });
 scopeTransport=new ScopeTransport(server,session.sharedId,{onSubscribersChanged:reconcileSignal});
 await new Promise((accept,reject)=>{server.once('error',reject);server.listen(httpPort,'127.0.0.1',accept);}).catch(async e=>{await stop();throw e;});
 async function stop(){if(closing)return;closing=true;clearInterval(timer);clearInterval(scopeTimer);clearInterval(signalHeartbeat);for(const c of clients)c.end();await scopeTransport?.close();
  if(openSignal){for(const kind of ['mic','output','control'])reconcileSignal(kind);await Promise.all(Object.values(signalTails));}
  if(scopeReader)scopeNative.detach(scopeReader);
  try {await release();} finally {native.detach(reader);osc.close();await new Promise(r=>server.close(r));}
 }
 return {url:`http://127.0.0.1:${server.address().port}`,session,control,status,stop,osc,native,scopeSnapshots:()=>scopes,get reader(){return reader;},reattach(){native.detach(reader);reader=native.attach(session.sharedId);}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const demo=await startDemo({port:Number(process.env.SC_PORT||57983),httpPort:Number(process.env.PORT||8793),seconds:Number(process.env.LOOP_SECONDS||4)});
 console.log(`Shared looper: ${demo.url}`);console.log('Tone input selected. Record one pass to create a loop. Ctrl-C shuts down the isolated SC server.');
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await demo.stop();process.exit(0);});
}
