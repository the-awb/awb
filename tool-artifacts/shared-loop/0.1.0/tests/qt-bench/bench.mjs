// Paired native Qt/installed Electron scope experiment; no normal shell services.
import {app,BrowserWindow} from 'electron';
import {createRequire} from 'node:module';
import {cpSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {mkdtemp,rm,writeFile,copyFile} from 'node:fs/promises';
import {spawn,execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import dgram from 'node:dgram';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';
import {OSC} from '../../osc.mjs';
import {startBridge} from '../../server.mjs';
const require=createRequire(import.meta.url),native=require('../../build/loopview.node'),scopes=require('../../build/scopeview.node');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),exec=promisify(execFile),smoke=process.argv.includes('--smoke');
const output=smoke?'/private/tmp/awb-qt-smoke-results.json':'/private/tmp/awb-qt-results.json';
const temp=await mkdtemp(resolve(root,'build/qt-host-'));app.setPath('userData',resolve(temp,'electron'));app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{
let child,bridge,probe,qt,session,log='',viewers=[],results=[],qtConfig;
const processTime=time=>time.split(':').map(Number).reduce((sum,v)=>sum*60+v,0);
async function port(){const s=dgram.createSocket('udp4');await new Promise(r=>s.bind(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function usage(pids){const {stdout}=await exec('/bin/ps',['-p',pids.join(','),'-o','pid=','-o','time=','-o','rss=']);return Object.fromEntries(stdout.trim().split('\n').filter(Boolean).map(line=>{const [pid,time,rss]=line.trim().split(/\s+/);return [pid,{cpuSeconds:processTime(time),rssMiB:Number(rss)/1024}];}));}
async function closeViews(){for(const win of viewers)win.destroy();viewers=[];await delay(150);if(bridge){await bridge.stop();bridge=null;}}
async function qtShow(kind='none',mode='short',layout='shared',count=1){
 const reply=await qt.request('/bench/qt/show',[kind,mode,layout,count],'/bench/qt/ready',a=>a[0]===kind&&a[1]===mode&&a[2]===layout&&a[3]===count,15000);
 if(kind!=='none'&&(reply[4]!== (layout==='shared'?1:count)||reply[5]!== (layout==='windows'?count:1)))throw new Error('Wrong Qt view/window count '+reply);
 qtConfig={kind,mode,layout,count,views:reply[4],windows:reply[5],frames:reply[6]};return qtConfig;
}
async function showCase(config){
 await closeViews();await qtShow();
 if(config.implementation==='qt'){await qtShow(config.kind,config.mode,config.layout,config.count);}
 else{
  bridge=await startBridge({session,osc:new OSC(session.port),reader:native.attach(session.sharedId),scopeReader:scopes.attach(session.port,session.micScope,session.outScope,session.controlScope),httpPort:0,isConnected:()=>true,release:async()=>{}});
  const n=config.layout==='windows'?config.count:1;
  for(let index=0;index<n;index++){
   const win=new BrowserWindow({width:720,height:400+(config.layout==='windows'?240/config.count:240),x:20+(index%3)*740,y:40+Math.floor(index/3)*500,show:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});viewers.push(win);
   const url=new URL('/scope',bridge.url);for(const [k,v] of Object.entries({kind:config.kind,layout:config.layout,count:config.count,...(config.layout==='windows'?{channel:index}:{})}))url.searchParams.set(k,String(v));
   await win.loadURL(url.href);
   const zoom=config.mode==='wide'?.0625:config.kind==='control'?4:1;
   await win.webContents.executeJavaScript(`document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(Number('${zoom}')):Number('${zoom}'));document.querySelector('#zoom').dispatchEvent(new Event('change'));void 0;`);
  }
 }
 await delay(config.mode==='wide'&&config.kind==='control'?3100:600);
}
async function inspect(prefix){
 if(qtConfig.kind!=='none'){
  const reply=await qt.request('/bench/qt/inspect',[prefix],'/bench/qt/inspected',a=>a[0]===prefix,10000);
  if(reply[3]!==620*240||reply.slice(5).some(interval=>interval!==33))throw new Error('Qt geometry/timer mismatch '+reply);
  const hashes=[];for(let i=0;i<reply[1];i++){const bytes=readFileSync(prefix+'-plot-'+i+'.png');hashes.push(createHash('sha256').update(bytes).digest('hex'));}
  return {config:{...qtConfig},area:reply[3],hashes};
 }
 return Promise.all(viewers.map(win=>win.webContents.executeJavaScript('window.__layoutState()')));
}
async function phase(config){
 await delay(smoke?500:2000);
 const prefix=resolve(temp,'image-'+results.length),statesBefore=await inspect(prefix+'-before');
 const rendererPIDs=[...new Set(viewers.map(win=>win.webContents.getOSProcessId()))];
 const roles=new Map([[process.pid,'main'],[child.pid,'sclang'],[session.scPID,'scsynth'],...rendererPIDs.map((pid,i)=>[pid,'renderer-'+i])]);
 for(const m of app.getAppMetrics())if(!roles.has(m.pid)&&m.type!=='Tab'&&m.type!=='Browser')roles.set(m.pid,'helper-'+m.type);
 const wireBefore=bridge?(await(await fetch(new URL('/api/scopes',bridge.url))).json()).transport:null;
 const before=await usage([...roles.keys()]),started=performance.now(),statuses=[];
 for(let i=0;i<(smoke?12:20);i++){statuses.push(await probe.request('/status',[],'/status.reply'));await delay(250);}
 const after=await usage([...roles.keys()]),seconds=(performance.now()-started)/1000;
 const wireAfter=bridge?(await(await fetch(new URL('/api/scopes',bridge.url))).json()).transport:null;
 const states=await inspect(prefix+'-after');
 const processes=[...roles].map(([pid,role])=>({pid,role,corePercent:before[pid]&&after[pid]?100*(after[pid].cpuSeconds-before[pid].cpuSeconds)/seconds:null,rssMiB:after[pid]?.rssMiB??null}));
 if(processes.some(p=>p.corePercent===null))throw new Error('Process disappeared during measurement');
 const sum=prefix=>processes.filter(p=>p.role.startsWith(prefix)).reduce((n,p)=>n+p.corePercent,0);
 const result={...config,seconds,processes,states,mainCPU:sum('main'),rendererCPU:sum('renderer'),gpuProcessCPU:sum('helper-GPU'),sclangCPU:sum('sclang'),electronCPU:sum('main')+sum('renderer')+sum('helper'),scsynthProcessCPU:sum('scsynth'),scAudioCPU:statuses.reduce((n,s)=>n+s[5],0)/statuses.length,scPeakCPU:Math.max(...statuses.map(s=>s[6])),traffic:wireBefore?{bytesPerSecond:(wireAfter.binaryBytesSent-wireBefore.binaryBytesSent)/seconds,framesPerSecond:(wireAfter.framesSent-wireBefore.framesSent)/seconds,subscribers:wireAfter.clients}:null};
 if(config.kind){
  if(config.implementation==='qt'){
   result.qtChangedPlots=states.hashes.map((h,i)=>h!==statesBefore.hashes[i]);
   // Periodic sine captures can repeat exactly for an individual channel.
   if(!result.qtChangedPlots.some(Boolean)){
    for(let i=0;i<states.hashes.length;i++)for(const when of ['before','after'])await copyFile(prefix+'-'+when+'-plot-'+i+'.png',`/private/tmp/awb-qt-failed-${when}-${i}.png`);
    await copyFile(resolve(root,'tests/component-server.scd'),'/private/tmp/awb-qt-failed-server.scd');
    throw new Error('Qt plot image did not change during phase: '+JSON.stringify(states.hashes.map((h,i)=>h===statesBefore.hashes[i])));
   }
   result.freshCaptureHz=(config.kind==='control'?session.sampleRate/session.blockSize:session.sampleRate)/states.config.frames;
  }else{
   const n=config.layout==='windows'?config.count:1;
   const expectedSpan=config.kind==='control'?(config.mode==='wide'?2048:32):(config.mode==='wide'?16384:1024);
   result.frameRates=states.map((s,i)=>(s.paintFrames-statesBefore[i].paintFrames)/seconds);
   if(states.length!==n||wireAfter.clients!==n||result.frameRates.some(r=>r<23||r>35))throw new Error('Electron count/capped paint cadence failed '+JSON.stringify(result.frameRates));
   if(states.some((s,i)=>s.channels!==6||s.connection!=='Live'||!s.footerFits||s.sourceEnd<=statesBefore[i].sourceEnd||Math.abs(s.sourceFrames/(config.mode==='short'&&config.kind==='control'?4:1)-expectedSpan)>.1))throw new Error('Electron time span/source/view mismatch');
   const pixels=states.reduce((n,s)=>n+s.plots.reduce((p,c)=>p+c.width*c.height,0),0);if(pixels!==620*240)throw new Error('Electron area mismatch '+pixels);
   result.freshCaptureHz=(config.kind==='control'?session.sampleRate/session.blockSize:session.sampleRate)/(config.kind==='control'?32:1024);
  }
 }
 results.push(result);
 await writeFile(output,JSON.stringify({complete:false,machine:os.cpus()[0].model,sampleRate:session.sampleRate,blockSize:session.blockSize,configuredPaintHz:30,versions:{electron:process.versions.electron,node:process.versions.node,sc:'3.12.2'},phases:results},null,2));
 console.log('QT_COMPARE '+JSON.stringify({implementation:config.implementation,kind:config.kind,mode:config.mode,layout:config.layout,count:config.count,repeat:config.repeat,qtCPU:result.sclangCPU,electronCPU:result.electronCPU,gpuProcessCPU:result.gpuProcessCPU,frames:result.frameRates,KiBs:(result.traffic?.bytesPerSecond||0)/1024}));
 if(config.kind&&config.count===6&&config.repeat===1){
  const destination=`/private/tmp/awb-qt-${config.implementation}-${config.kind}-${config.mode}-${config.layout}.png`;
  if(config.implementation==='qt')await copyFile(prefix+'-after-window.png',destination);
  else{await writeFile(destination,(await viewers[0].webContents.capturePage()).toPNG());}
 }
}
try{
 const scApp=process.env.SC_APP||'/Applications/SuperCollider.app',library=resolve(temp,'SCClassLibrary');cpSync(resolve(scApp,'Contents/Resources/SCClassLibrary'),library,{recursive:true});
 const platform=resolve(library,'Platform/osx/OSXPlatform.sc');writeFileSync(platform,readFileSync(platform,'utf8').replace('this.loadStartupFiles;','// benchmark skips user startup'));
 const config=resolve(temp,'sclang.yaml');writeFileSync(config,`includePaths:\n  - ${JSON.stringify(library)}\n  - ${JSON.stringify(resolve(root,'sc'))}\nexcludePaths: []\nexcludeDefaultPaths: true\n`);
 const serverPort=await port(),languagePort=await port(),id=Math.floor(100000+Math.random()*15000000),sessionPath=resolve(temp,'session.json');
 child=spawn(resolve(scApp,'Contents/MacOS/sclang'),['-a','-D','-u',String(languagePort),'-l',config,resolve(root,'tests/component-server.scd')],{cwd:root,env:{...process.env,BENCH_ROOT:root,BENCH_PORT:String(serverPort),BENCH_ID:String(id),BENCH_SESSION:sessionPath},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',b=>{log+=b});child.stderr.on('data',b=>{log+=b});
 const started=Date.now();while(!existsSync(sessionPath)){if(child.exitCode!==null||log.includes('ERROR:')||Date.now()-started>40000)throw new Error('Qt fixture startup failed: '+log);await delay(100);}
 session=JSON.parse(readFileSync(sessionPath));probe=new OSC(session.port);qt=new OSC(languagePort);await qtShow();
 probe.send('/n_run',session.nodeId,0);probe.send('/n_run',session.scopeNodeId,1);await probe.sync();
 if(!smoke)await phase({name:'tap-active-no-viewers-before'});
 for(const kind of ['control','output'])for(const mode of ['short','wide']){
  if(smoke){for(const implementation of ['qt','electron']){const c={implementation,kind,mode,layout:'canvases',count:6,repeat:1};await showCase(c);await phase(c);}}
  else for(const repeat of [1,2]){
   const layouts=repeat===1?['shared','canvases','windows']:['windows','canvases','shared'];
   for(const layout of layouts)for(const implementation of repeat===1?['qt','electron']:['electron','qt']){
    const c={implementation,kind,mode,layout,count:6,repeat};await showCase(c);await phase(c);
   }
   if(mode==='short')for(const implementation of repeat===1?['qt','electron']:['electron','qt']){
    const c={implementation,kind,mode,layout:'shared',count:1,repeat};await showCase(c);await phase(c);
   }
  }
 }
 await closeViews();await qtShow();if(!smoke)await phase({name:'tap-active-no-viewers-after'});
 const report=JSON.parse(readFileSync(output));report.complete=true;await writeFile(output,JSON.stringify(report,null,2));console.log('QT_COMPLETE phases='+results.length);
}catch(error){console.error(error.stack,log);process.exitCode=1;}
finally{
 await closeViews().catch(()=>{});if(qt){await qtShow().catch(()=>{});qt.close();}
 if(probe){try{probe.send('/n_free',session.nodeId,session.scopeNodeId);await probe.sync();await probe.request('/cmd',['loop_view_free',session.sharedId],'/done',a=>a[0]==='loop_view_free');await probe.request('/quit',[],'/done',a=>a[0]==='/quit');}catch(error){console.error('Qt cleanup',error.message);process.exitCode=1;}probe.close();}
 if(child){for(let i=0;i<30&&child.exitCode===null;i++)await delay(100);if(child.exitCode===null)child.kill('SIGTERM');}
 await rm(temp,{recursive:true,force:true});app.exit(process.exitCode||0);
}
});
