import {app,BrowserWindow,screen} from 'electron';
import http from 'node:http';
import {createRequire} from 'node:module';
import {mkdtemp,cp,writeFile,readFile,rm,mkdir} from 'node:fs/promises';
import {readFileSync,existsSync} from 'node:fs';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import dgram from 'node:dgram';
import os from 'node:os';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';
import {SignalCaptureBroker} from '../../src/signalCaptureBroker.mjs';
import {openScSignalSource} from '../../src/scSignalSource.mjs';
import {ScBusAudioAccess} from '../../src/scBusAudioAccess.mjs';
import {OSC} from '../../src/scBusOsc.mjs';
import {ScopeReduction} from '../../../../tool-artifacts/shared-loop/0.1.0/scope-reduction.mjs';
import {ScopeTransport} from '../../../../tool-artifacts/shared-loop/0.1.0/scope-transport.mjs';
import {startHosted} from '../../../../tool-artifacts/shared-loop/0.1.0/server.mjs';
const require=createRequire(import.meta.url),WebSocket=require('ws'),exec=promisify(execFile),root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..'),loopRoot=resolve(root,'tool-artifacts/shared-loop/0.1.0');
const cadence=process.argv.includes('--cadence');
const smoke=process.argv.includes('--smoke'),tag=process.argv.find(a=>a.startsWith('--tag='))?.slice(6)||'baseline',seconds=Number(process.argv.find(a=>a.startsWith('--seconds='))?.slice(10)||8),repeats=smoke?1:2;
const temp=await mkdtemp('/private/tmp/awb-signal-bench-host-'),output=`/private/tmp/awb-signal-${tag}${smoke?'-smoke':''}.json`;
app.setPath('userData',resolve(temp,'electron'));app.commandLine.appendSwitch('force-device-scale-factor','1');app.on('window-all-closed',()=>{});
async function port(){const s=dgram.createSocket('udp4');await new Promise(r=>s.bind(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
async function until(fn,ms=10000){const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await delay(40)}throw new Error('Benchmark timed out')}
async function bounded(label,work){let timer;try{return await Promise.race([work,new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('Benchmark cleanup timed out: '+label)),6000))])}finally{clearTimeout(timer)}}
const time=s=>s.split(':').map(Number).reduce((v,n)=>v*60+n,0);
async function usage(pids){const {stdout}=await exec('/bin/ps',['-p',pids.join(','),'-o','pid=','-o','time=','-o','rss=']);return Object.fromEntries(stdout.trim().split('\n').filter(Boolean).map(l=>{const [pid,t,rss]=l.trim().split(/\s+/);return [pid,{cpu:time(t),rss:Number(rss)/1024}]}))}
app.whenReady().then(async()=>{
 let child,probe,session,host,looper,rawAccess,rawSocket;let log='',windows=[],backends=[],leases=[],results=[],rawPackets=0,captureError=null;
 const broker=new SignalCaptureBroker({open:openScSignalSource});
 async function backend(kind){
  let lease,sequence=0,latest=null,step=1,frames=0,captureTail=Promise.resolve(),epoch=0;
  const server=http.createServer(async(req,res)=>{
   const url=new URL(req.url,'http://localhost');
   if(req.method==='POST'&&url.pathname==='/api/scope-view'){
    let body='';for await(const b of req)body+=b;const next=JSON.parse(body);const requested=1/next.zoom;
    if(![1,4,16].includes(requested))throw new Error('Bad benchmark zoom');
    if(requested!==step){step=requested;await startCapture()}
    res.writeHead(200,{'Content-Type':'application/json'});res.end('{}');return;
   }
   const files={'/scope':'scope.html','/scope.js':'scope.js','/scope.css':'scope.css','/scope-protocol.js':'scope-protocol.js','/scope-history.js':'scope-history.js','/scope-painter.js':'scope-painter.js','/scope-metadata.js':'scope-metadata.js','/scope-trace.js':'scope-trace.js'};
   if(!files[url.pathname]){res.writeHead(404);res.end();return}const file=files[url.pathname];res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(readFileSync(resolve(loopRoot,'public',file)));
  });
  const transport=new ScopeTransport(server,1);
  function startCapture(){
   const requestedStep=step;
   captureTail=captureTail.catch(()=>{}).then(async()=>{
    if(lease&&!broker.subscribeDerived)return;
    const old=lease,reduction=new ScopeReduction(kind),localEpoch=++epoch;
    const configuration={bus:kind==='control'?session.controlBus:32,channels:6,rate:kind==='control'?'control':'audio'};
    const onFrame=(frame,info)=>{if(localEpoch!==epoch)return;const next=broker.subscribeDerived?frame:reduction.append(frame,info,step);if(next){frames++;latest={...next,sourceChannels:6,sequence:++sequence};transport.publish({[kind]:latest},{connected:true})}};
    lease=broker.subscribeDerived?await broker.subscribeDerived({host,configuration,profile:`scope:${kind==='control'?32:1024}:${requestedStep}`,createTransform:()=>({append:(frame,info)=>reduction.append(frame,info,requestedStep)}),onFrame,onError:error=>{captureError=error.message;console.error('BENCH_SOURCE',error.message)}}):await broker.subscribe({host,configuration,onFrame,onError:error=>{captureError=error.message;console.error('BENCH_SOURCE',error.message)}});
    await old?.stop();
   });return captureTail;
  }
  await new Promise(r=>server.listen(0,'127.0.0.1',r));await startCapture();
  const result={url:`http://127.0.0.1:${server.address().port}`,transport,stats:()=>({frames,latest}),stop:async()=>{console.log('BENCH_CLOSE transport');await bounded('scope transport',transport.close());console.log('BENCH_CLOSE capture');await bounded('capture tail',captureTail);await bounded('capture lease',lease?.stop());console.log('BENCH_CLOSE http');await bounded('HTTP server',new Promise(r=>server.close(r)));console.log('BENCH_CLOSE complete')}};backends.push(result);return result;
 }
 async function closeCase(){for(const w of windows)w.destroy();windows=[];await delay(100);
  rawSocket?.terminate();rawSocket=null;if(rawAccess){await rawAccess.close();rawAccess=null}
  for(const b of backends)await b.stop();backends=[];for(const lease of leases)await lease.stop();leases=[];
  if(looper){await looper.stop();looper=null}if(broker.diagnostics().sources.length)throw new Error('Case leaked capture');
 }
 async function viewer(url,config,index=0){const count=config.layout==='windows'?config.count:1;
  const win=new BrowserWindow({width:720,height:config.layout==='windows'?440:640,x:15+(index%3)*735,y:20+Math.floor(index/3)*450,show:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});windows.push(win);
  win.webContents.on('console-message',event=>{if(event.level>=2)console.error('BENCH_RENDERER',event.message)});
  await win.loadURL(url);if(!config.looperGUI){await win.webContents.executeJavaScript(`if(document.querySelector('#paintRate')){document.querySelector('#paintRate').value='${config.fps??0}';document.querySelector('#paintRate').dispatchEvent(new Event('change'));}document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(Number('${config.zoom??1}')):Number('${config.zoom??1}'));document.querySelector('#zoom').dispatchEvent(new Event('change'));void 0;`);
   await until(async()=>{if(captureError)throw new Error(captureError);return await win.webContents.executeJavaScript("window.__signalBench?.().sourceEnd>0&&!!window.__signalBench?.().renderedSequence")});
   if(config.frozen)await win.webContents.executeJavaScript("document.querySelector('#freeze').click();void 0;");
  }
  return win;
 }
 async function show(config){await closeCase();
  if(config.name==='idle')return;
  if(config.captureOnly){leases.push(await broker.subscribe({host,configuration:{bus:config.kind==='control'?session.controlBus:32,channels:6,rate:config.kind==='control'?'control':'audio'},onFrame:()=>{}}));return}
  if(config.looper){
   looper=await startHosted({nativeHost:host,signalCaptures:broker,seconds:1});await looper.control('outputGain',0);
   if(config.playback){await looper.control('record',1);await delay(1200)}
   if(config.looperGUI)await viewer(looper.url,{...config,looperGUI:true});
   if(config.peer){
    const scope=new URL('/scope',looper.url);scope.searchParams.set('kind','output');scope.searchParams.set('count','2');scope.searchParams.set('fps',config.fps??0);await viewer(scope.href,{...config,layout:'shared',count:2,zoom:1,looperGUI:false});
    rawAccess=new ScBusAudioAccess({broker,hostContext:async()=>host});const peer=await rawAccess.start('bench-peer',{bus:0,channels:2});rawSocket=new WebSocket(peer.endpoint);rawSocket.on('error',()=>{});rawSocket.on('message',b=>{if(b.readUInt32LE(40)!==512||b.readUInt32LE(36)!==2||b.readDoubleLE(16)!==session.sampleRate)throw new Error('Raw peer degraded');rawPackets++});await until(()=>rawPackets>2);
   }return;
  }
  const b=await backend(config.kind),n=config.layout==='windows'?config.count:1;
  for(let i=0;i<n;i++){
   const url=new URL('/scope',b.url);Object.entries({kind:config.kind,count:config.count,layout:config.layout,fps:config.fps??0,...(config.layout==='windows'?{channel:i}:{})}).forEach(([k,v])=>url.searchParams.set(k,v));await viewer(url.href,config,i);
  }
  if(config.adapters===2){const peer=await backend(config.kind),url=new URL('/scope',peer.url);url.searchParams.set('kind',config.kind);url.searchParams.set('count',config.count);await viewer(url.href,config,1)}
  await delay(config.kind==='control'&&config.zoom<1?3000:300);
 }
 async function diagnostics(){return Promise.all(windows.map(w=>w.webContents.executeJavaScript("window.__signalBench?.()??{looper:true}")))}
 async function phase(config,repeat){
  console.log('BENCH_PHASE '+config.name);await show(config);await delay(smoke?250:1800);
  const statesBefore=await diagnostics(),transportBefore=backends.map(b=>b.transport.diagnostics()),rawBefore=rawPackets,brokerBefore=broker.diagnostics().stats;
  const roles=new Map([[process.pid,'main'],[child.pid,'sclang'],[session.scPID,'scsynth']]);windows.forEach((w,i)=>roles.set(w.webContents.getOSProcessId(),'renderer-'+i));
  for(const m of app.getAppMetrics())if(!roles.has(m.pid)&&m.type!=='Tab'&&m.type!=='Browser')roles.set(m.pid,'helper-'+m.type);
  const before=await usage([...roles.keys()]),started=performance.now(),statuses=[];
  for(let i=0;i<(smoke?5:Math.round(seconds*4));i++){statuses.push(await probe.request('/status',[],'/status.reply'));await delay(250)}
  const after=await usage([...roles.keys()]),duration=(performance.now()-started)/1000,states=await diagnostics();
  const processes=[...roles].map(([pid,role])=>({pid,role,corePercent:before[pid]&&after[pid]?100*(after[pid].cpu-before[pid].cpu)/duration:null,rssMiB:after[pid]?.rss??null}));
  if(processes.some(p=>p.corePercent===null))throw new Error('Missing process CPU sample');
  const sum=prefix=>processes.filter(p=>p.role.startsWith(prefix)).reduce((v,p)=>v+p.corePercent,0),traffic=backends.map((b,i)=>{const a=b.transport.diagnostics(),z=transportBefore[i];return {bytesPerSecond:(a.binaryBytesSent-z.binaryBytesSent)/duration,framesPerSecond:(a.framesSent-z.framesSent)/duration,...a}});
  const paints=states.map((s,i)=>s.looper?null:(s.paints-statesBefore[i].paints)/(s.now?(s.now-statesBefore[i].now)/1000:duration)),gaps=states.map((s,i)=>s.looper?null:s.sourceGaps-statesBefore[i].sourceGaps);
  const packetRates=states.map((s,i)=>s.looper?null:(s.packets-statesBefore[i].packets)/(s.now?(s.now-statesBefore[i].now)/1000:duration));
  const paintMaxGapsMs=states.map((s,i)=>{if(s.looper||!s.paintTimes)return null;const times=[statesBefore[i].now,...s.paintTimes.filter(t=>t>statesBefore[i].now),s.now];return Math.max(...times.slice(1).map((t,j)=>t-times[j]))});
  const paintedLagMs=states.map(s=>s.looper?null:1000*(s.sourceEnd-s.renderedSourceEnd)/s.rate);
  const pixels=states.flatMap(s=>s.plots??[]).reduce((v,p)=>v+p.width*p.height,0);
  if(config.kind&&!config.captureOnly){
   if(states.some((s,i)=>s.sourceEnd<=statesBefore[i].sourceEnd||s.connected!=='Live'))throw new Error('Stalled source/connection: '+JSON.stringify(states));
   if(!config.frozen&&paints.some(p=>p<5))throw new Error('Paint stalled');if(cadence&&!config.frozen){if(config.fps&&paints.some(p=>p>config.fps+1))throw new Error('Paint cap exceeded');if(paintMaxGapsMs.some(t=>t>400))throw new Error('Paint pause over 400ms');if(paintedLagMs.some(t=>t>200))throw new Error('Paint lag over 200ms');}
   if(config.frozen&&paints.some(p=>p!==0))throw new Error('Frozen paint active');
   if(Math.abs(pixels-620*240*(config.adapters??1))>1)throw new Error('Unequal waveform area: '+pixels);
   if(backends.some(b=>b.stats().latest.peaks.some((p,i)=>config.kind==='output'&&Math.abs(p-(.1+.02*i))>.005)))throw new Error('Audio source amplitude mismatch');
  }
  const brokerAfter=broker.diagnostics().stats,brokerDelta=brokerBefore?Object.fromEntries(Object.keys(brokerBefore).map(k=>[k,brokerAfter[k]-brokerBefore[k]])):null;
  const result={...config,repeat,brokerDelta,seconds:duration,processes,mainCPU:sum('main'),rendererCPU:sum('renderer'),gpuCPU:sum('helper-GPU'),electronCPU:sum('main')+sum('renderer')+sum('helper'),rssMiB:processes.filter(p=>p.role!=='sclang'&&p.role!=='scsynth').reduce((v,p)=>v+p.rssMiB,0),scAudioCPU:statuses.reduce((v,s)=>v+s[5],0)/statuses.length,scPeakCPU:Math.max(...statuses.map(s=>s[6])),states,packetRates,paintMaxGapsMs,paintedLagMs,paintRates:paints,sourceGaps:gaps,pixels,traffic,rawFramesPerSecond:(rawPackets-rawBefore)/duration,broker:broker.diagnostics()};results.push(result);
  await writeFile(output,JSON.stringify({complete:false,tag,sampleRate:session.sampleRate,blockSize:session.blockSize,machine:os.cpus()[0].model,versions:{electron:process.versions.electron,node:process.versions.node},sourceHashes:JSON.parse(readFileSync(resolve(root,'source-hashes.json'))),phases:results},null,2));
  console.log('SIGNAL_COST '+JSON.stringify({name:config.name,repeat,main:result.mainCPU,renderer:result.rendererCPU,gpu:result.gpuCPU,total:result.electronCPU,KiBs:traffic.reduce((v,t)=>v+t.bytesPerSecond,0)/1024,paints,gaps,sources:result.broker.sources.length}));
 }
 try{
  const scApp='/Applications/SuperCollider.app',library=resolve(temp,'SCClassLibrary');await cp(resolve(scApp,'Contents/Resources/SCClassLibrary'),library,{recursive:true});
  const platform=resolve(library,'Platform/osx/OSXPlatform.sc');await writeFile(platform,(await readFile(platform,'utf8')).replace('this.loadStartupFiles;','// benchmark skips user startup'));
  await mkdir(resolve(temp,'classes'));
  await writeFile(resolve(temp,'classes/AWBHostControl.sc'),`// Test-only authentication shim; the isolated class library contains no AWB application services.\nAWBHostControl { classvar <default; var token; *start { |a,b,t| default=this.new.init(t); ^default } init { |t| token=t; ^this } allowedAddress { |addr| ^addr.ip == "127.0.0.1" } tokenMatches { |value| ^value.asString == token } }\n`);
  const config=resolve(temp,'sclang.yaml');await writeFile(config,`includePaths:\n  - ${JSON.stringify(library)}\n  - ${JSON.stringify(resolve(temp,'classes'))}\n  - ${JSON.stringify(resolve(loopRoot,'sc'))}\nexcludeDefaultPaths: true\n`);
  const serverPort=await port(),languagePort=await port(),token=crypto.randomUUID(),sessionFile=resolve(temp,'session.json');
  child=spawn(resolve(scApp,'Contents/MacOS/sclang'),['-a','-D','-u',String(languagePort),'-l',config,resolve(root,'apps/awb-shell/test/signal-bench/server.scd')],{env:{...process.env,BENCH_ROOT:root,BENCH_PORT:String(serverPort),BENCH_SESSION:sessionFile,BENCH_TOKEN:token},stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
  await until(()=>{if(child.exitCode!==null||log.includes('ERROR:'))throw new Error(log);return existsSync(sessionFile)},35000);
  session=JSON.parse(readFileSync(sessionFile));probe=new OSC(session.port);host={oscHost:'127.0.0.1',oscPort:languagePort,token,service:{},isConnected:()=>child.exitCode===null};
  const cases=[{name:'idle'},{name:'capture-control',kind:'control',captureOnly:true},{name:'capture-audio',kind:'output',captureOnly:true}];
  for(const kind of ['control','output'])for(const zoom of [1,.0625])for(const [count,layout] of [[1,'shared'],[6,'shared'],[6,'canvases'],[6,'windows']])cases.push({name:`${kind}-${zoom===1?'raw':'wide'}-${layout}-${count}`,kind,zoom,count,layout});
  cases.push({name:'two-audio-adapters',kind:'output',zoom:.0625,count:6,layout:'shared',adapters:2},{name:'frozen-control',kind:'control',zoom:.0625,count:6,layout:'shared',frozen:true},{name:'looper-no-viewer',looper:true},{name:'looper-playback',looper:true,playback:true},{name:'looper-gui-scope-raw-peer',looper:true,playback:true,looperGUI:true,peer:true});
  const cadenceCases=[];for(const kind of ['control','output'])for(const zoom of [1,.0625])for(const [count,layout] of [[1,'shared'],[6,'canvases'],[6,'windows']])for(const fps of [0,30,15])cadenceCases.push({name:`${kind}-${zoom===1?'raw':'wide'}-${layout}-${count}-fps${fps}`,kind,zoom,count,layout,fps});
  const selected=cadence?(smoke?[...cadenceCases.filter(c=>c.kind==='output'&&c.zoom===1&&c.layout==='windows'),{name:'control-wide-canvases-15',kind:'control',zoom:.0625,count:6,layout:'canvases',fps:15},{name:'frozen-control-15',kind:'control',zoom:.0625,count:6,layout:'shared',fps:15,frozen:true},{name:'looper-peer-15',looper:true,playback:true,looperGUI:true,peer:true,fps:15}]:cadenceCases):smoke?cases.filter(c=>['idle','control-wide-windows-6','output-raw-shared-1','two-audio-adapters','frozen-control','looper-gui-scope-raw-peer'].includes(c.name)):cases;
  for(let pass=1;pass<=repeats;pass++)for(const c of pass===1?selected:[...selected].reverse())await phase(c,pass);
  await closeCase();const final=await probe.request('/status',[],'/status.reply');if(final[2]!==2||final[3]!==2)throw new Error('Source cleanup left synth/group: '+final);
  const report=JSON.parse(readFileSync(output));report.complete=true;report.cleanup=true;report.authShim=true;report.gpuFeatures=app.getGPUFeatureStatus();report.display=screen.getPrimaryDisplay().workAreaSize;await writeFile(output,JSON.stringify(report,null,2));console.log('SIGNAL_BENCH_COMPLETE '+JSON.stringify({tag,phases:results.length,output}));
 }catch(error){console.error(error.stack,log);process.exitCode=1}
 finally{await closeCase().catch(console.error);await bounded('broker',broker.close()).catch(console.error);if(probe){await probe.request('/quit',[],'/done',a=>a[0]==='/quit').catch(console.error);probe.close()}
  if(child){for(let i=0;i<30&&child.exitCode===null;i++)await delay(100);if(child.exitCode===null)child.kill('SIGTERM')}
  await rm(temp,{recursive:true,force:true});app.exit(process.exitCode||0);
 }
});
