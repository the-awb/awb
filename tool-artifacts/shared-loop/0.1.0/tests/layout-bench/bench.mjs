// Test-only minimal host. One SC reader per private index; no Studio/Field/app services.
import {app,BrowserWindow,screen} from 'electron';
import {createRequire} from 'node:module';
import {cpSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {spawn,execFile} from 'node:child_process';
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
const output=smoke?'/private/tmp/awb-layout-smoke-results.json':'/private/tmp/awb-layout-results.json';
// Keep Electron shutdown caches inside the runner-owned fixture, removed after exit.
const temp=await mkdtemp(resolve(root,'build/layout-host-'));app.setPath('userData',resolve(temp,'electron'));
app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{
let child,bridge,probe,session,log='',viewers=[],results=[];
async function port(){const s=dgram.createSocket('udp4');await new Promise(r=>s.bind(0,'127.0.0.1',r));const n=s.address().port;await new Promise(r=>s.close(r));return n;}
const processTime=time=>time.split(':').map(Number).reduce((sum,v)=>sum*60+v,0);
async function usage(pids){const {stdout}=await exec('/bin/ps',['-p',pids.join(','),'-o','pid=','-o','time=','-o','rss=']);return Object.fromEntries(stdout.trim().split('\n').filter(Boolean).map(line=>{const [pid,time,rss]=line.trim().split(/\s+/);return [pid,{cpuSeconds:processTime(time),rssMiB:Number(rss)/1024}];}));}
async function diagnostics(){return Promise.all(viewers.map(win=>win.webContents.executeJavaScript('window.__layoutState()')));}
async function closeViews(){for(const win of viewers)win.destroy();viewers=[];await delay(150);}
async function showCase({kind,zoom,layout,count,paint=true}){
 await closeViews();const n=layout==='windows'?count:1;
 for(let index=0;index<n;index++){
  const height=640-240+(layout==='windows'?240/count:240);
  const win=new BrowserWindow({width:720,height,x:20+(index%3)*740,y:40+Math.floor(index/3)*500,show:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  viewers.push(win);
  win.webContents.on('console-message',(_event,_level,message)=>{if(String(message).includes('Error'))console.error('LAYOUT_RENDERER',message);});
  const url=new URL('/scope',bridge.url);for(const [key,value] of Object.entries({kind,layout,count,...(layout==='windows'?{channel:index}:{})}))url.searchParams.set(key,String(value));
  await win.loadURL(url.href);
  await win.webContents.executeJavaScript(`document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(Number('${zoom}')):Number('${zoom}'));document.querySelector('#zoom').dispatchEvent(new Event('change'));window.__layoutFixture.paint=${paint};void 0;`);
 }
 // New viewers reset the shared source setting; let the full widest control history fill.
 await delay(kind==='control'&&zoom<1?3100:500);
}
async function phase(config){
 await delay(smoke?300:2000);
 const statesBefore=await diagnostics();
 const rendererPIDs=[...new Set(viewers.map(win=>win.webContents.getOSProcessId()))];
 const roles=new Map([[process.pid,'main'],[child.pid,'sclang'],[session.scPID,'scsynth'],...rendererPIDs.map((pid,index)=>[pid,'renderer-'+index])]);
 // Track GPU and helper processes with the same OS CPU clock as main/renderers.
 for(const metric of app.getAppMetrics())if(!roles.has(metric.pid)&&metric.type!=='Tab'&&metric.type!=='Browser')roles.set(metric.pid,'helper-'+metric.type);
 const transportBefore=bridge?(await(await fetch(new URL('/api/scopes',bridge.url))).json()).transport:null;
 const before=await usage([...roles.keys()]),started=performance.now(),statuses=[];
 const iterations=smoke?4:20;
 for(let i=0;i<iterations;i++){statuses.push(await probe.request('/status',[],'/status.reply'));await delay(250);}
 const after=await usage([...roles.keys()]),seconds=(performance.now()-started)/1000;
 const transportAfter=bridge?(await(await fetch(new URL('/api/scopes',bridge.url))).json()).transport:null;
 const states=await diagnostics();
 const processes=[...roles].map(([pid,role])=>({pid,role,corePercent:before[pid]&&after[pid]?100*(after[pid].cpuSeconds-before[pid].cpuSeconds)/seconds:null,rssMiB:after[pid]?.rssMiB??null}));
 const sums=prefix=>processes.filter(p=>p.role.startsWith(prefix)&&p.corePercent!==null).reduce((sum,p)=>sum+p.corePercent,0);
 const frameRates=states.map((state,index)=>(state.paintFrames-statesBefore[index].paintFrames)/seconds);
 const strokeCounts=states.map((state,index)=>state.strokes-statesBefore[index].strokes);
 const pixels=states.reduce((sum,state)=>sum+state.plots.reduce((a,p)=>a+p.width*p.height,0),0);
 const result={...config,seconds,windowCount:viewers.length,rendererProcessCount:rendererPIDs.length,sourceChannels:6,states,frameRates,strokeCounts,totalCSSWaveformPixels:pixels,processes,mainCPU:sums('main'),rendererCPU:sums('renderer'),gpuCPU:sums('helper-GPU'),helperCPU:sums('helper'),electronCPU:sums('main')+sums('renderer')+sums('helper'),rendererRSSMiB:processes.filter(p=>p.role.startsWith('renderer')).reduce((sum,p)=>sum+(p.rssMiB||0),0),traffic:transportBefore?{binaryBytesPerSecond:(transportAfter.binaryBytesSent-transportBefore.binaryBytesSent)/seconds,framesPerSecond:(transportAfter.framesSent-transportBefore.framesSent)/seconds,ackBytesPerSecond:(transportAfter.ackBytesReceived-transportBefore.ackBytesReceived)/seconds,subscribers:transportAfter.clients}:null,scAudioCPU:statuses.reduce((sum,status)=>sum+status[5],0)/statuses.length,scPeakCPU:Math.max(...statuses.map(status=>status[6]))};
 if(config.kind){
  const n=config.layout==='windows'?config.count:1;
  if(states.length!==n||result.traffic.subscribers!==n)throw new Error('Wrong window/subscriber count');
  const expectedRate=config.kind==='control'?session.sampleRate/session.blockSize:session.sampleRate;
  const expectedSpan=(config.kind==='control'?128:1024)/config.zoom;
  if(states.some(state=>state.channels!==6||state.rate!==expectedRate||state.sourceFrames!==expectedSpan||state.connection!=='Live'||state.frames!==(config.kind==='control'?128:1024)||state.format!==(config.zoom<1?'minmax':'samples')||!state.footerFits))throw new Error('Layout/rate/time-axis/viewport mismatch: '+JSON.stringify(states));
  if(Math.abs(pixels-620*240)>1)throw new Error('Total waveform area differs: '+pixels);
  if(config.paint){if(frameRates.some(rate=>rate<20||rate>90)||strokeCounts.some(n=>n<20))throw new Error('Drawing stalled or duplicated: '+frameRates);}
  else if(strokeCounts.some(n=>n!==0))throw new Error('No-paint baseline painted waveforms');
  if(config.layout==='windows'){if(states.some((state,index)=>state.selected.join(',')!==String(index)||state.plots.length!==1))throw new Error('Window channel selection mismatch');}
  else if(states[0].selected.length!==config.count||states[0].plots.length!==(config.layout==='canvases'?config.count:1))throw new Error('Canvas/channel count mismatch');
  if(states.some((state,index)=>state.sourceEnd<=statesBefore[index].sourceEnd))throw new Error('Source clock stopped');
  const snapshot=bridge.scopeSnapshots()[config.kind];
  if(config.kind==='output'&&snapshot.peaks.some((p,index)=>Math.abs(p-(.1+.02*index))>.006))throw new Error('Audio channel peaks/stride mismatch');
 }
 results.push(result);
 await writeFile(output,JSON.stringify({complete:false,machine:os.cpus()[0].model,sampleRate:session.sampleRate,blockSize:session.blockSize,display:screen.getPrimaryDisplay().workAreaSize,phases:results},null,2));
 console.log('LAYOUT '+JSON.stringify({kind:config.kind,zoom:config.zoom,layout:config.layout,count:config.count,paint:config.paint,repeat:config.repeat,mainCPU:result.mainCPU,rendererCPU:result.rendererCPU,gpuCPU:result.gpuCPU,electronCPU:result.electronCPU,KiBs:(result.traffic?.binaryBytesPerSecond||0)/1024,windows:result.windowCount,rendererProcesses:result.rendererProcessCount,missing:states.map(s=>s.missingSourceFrames),pixels}));
}
async function capture(config){
 if(config.count!==6||config.repeat!==1||config.zoom!==.0625||!config.paint)return;
 viewers[0].show();viewers[0].focus();
 await viewers[0].webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
 await writeFile(`/private/tmp/awb-layout-${config.kind}-${config.layout}.png`,(await viewers[0].webContents.capturePage()).toPNG());
}
try{
 const scApp=process.env.SC_APP||'/Applications/SuperCollider.app',library=resolve(temp,'SCClassLibrary');
 cpSync(resolve(scApp,'Contents/Resources/SCClassLibrary'),library,{recursive:true});
 const platform=resolve(library,'Platform/osx/OSXPlatform.sc');writeFileSync(platform,readFileSync(platform,'utf8').replace('this.loadStartupFiles;','// benchmark skips user startup'));
 const config=resolve(temp,'sclang.yaml');writeFileSync(config,`includePaths:\n  - ${JSON.stringify(library)}\n  - ${JSON.stringify(resolve(root,'sc'))}\nexcludePaths: []\nexcludeDefaultPaths: true\n`);
 const serverPort=await port(),languagePort=await port(),id=Math.floor(100000+Math.random()*15000000),sessionPath=resolve(temp,'session.json');
 child=spawn(resolve(scApp,'Contents/MacOS/sclang'),['-a','-D','-u',String(languagePort),'-l',config,resolve(root,'tests/component-server.scd')],{cwd:root,env:{...process.env,BENCH_ROOT:root,BENCH_PORT:String(serverPort),BENCH_ID:String(id),BENCH_SESSION:sessionPath},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',b=>{log+=b});child.stderr.on('data',b=>{log+=b});
 const started=Date.now();while(!existsSync(sessionPath)){if(child.exitCode!==null||log.includes('ERROR:')||Date.now()-started>35000)throw new Error('Layout SC startup failed: '+log);await delay(100);}
 session=JSON.parse(readFileSync(sessionPath));probe=new OSC(session.port);
 if(!smoke)await phase({name:'idle-no-bridge'});
 probe.send('/n_run',session.nodeId,0);probe.send('/n_run',session.scopeNodeId,1);await probe.sync();
 bridge=await startBridge({session,osc:new OSC(session.port),reader:native.attach(session.sharedId),scopeReader:scopes.attach(session.port,session.micScope,session.outScope,session.controlScope),httpPort:0,isConnected:()=>true,release:async()=>{}});
 if(!smoke)await phase({name:'active-bridge-no-viewer'});
 for(const kind of ['control','output'])for(const zoom of smoke?[.0625]:[1,.0625]){
  if(!smoke){const common={kind,zoom,layout:'shared',count:1,paint:true,repeat:1};await showCase(common);await phase(common);}
  for(const layout of ['shared','canvases','windows'])for(const count of smoke?[6]:[2,4,6]){
   const config={kind,zoom,layout,count,paint:true,repeat:1};await showCase(config);
   if(count===6&&!smoke){await Promise.all(viewers.map(win=>win.webContents.executeJavaScript('window.__layoutFixture.paint=false;void 0;')));await phase({...config,paint:false});await Promise.all(viewers.map(win=>win.webContents.executeJavaScript('window.__layoutFixture.paint=true;void 0;')));}
   await phase(config);await capture(config);
  }
  if(!smoke){for(const layout of ['windows','canvases','shared']){const config={kind,zoom,layout,count:6,paint:true,repeat:2};await showCase(config);await phase(config);}
   const common={kind,zoom,layout:'shared',count:1,paint:true,repeat:2};await showCase(common);await phase(common);}
 }
 await closeViews();if(!smoke)await phase({name:'active-bridge-no-viewer-final'});
 const report=JSON.parse(readFileSync(output,'utf8'));report.complete=true;report.versions={electron:process.versions.electron,node:process.versions.node};report.protocol='awb.scope.audio-bench.v4';report.totalSourceChannels=6;report.totalWaveformCSSPixels=620*240;report.includesGPUAndHelpers=true;await writeFile(output,JSON.stringify(report,null,2));
 console.log('LAYOUT_COMPLETE phases='+results.length);
}catch(error){console.error(error.stack,log);process.exitCode=1;}
finally{
 await closeViews();if(bridge)await bridge.stop().catch(error=>{console.error(error);process.exitCode=1;});
 if(probe){try{probe.send('/n_free',session.nodeId,session.scopeNodeId);await probe.sync();await probe.request('/cmd',['loop_view_free',session.sharedId],'/done',a=>a[0]==='loop_view_free');await probe.request('/quit',[],'/done',a=>a[0]==='/quit');}catch(error){console.error('Layout cleanup:',error.message);process.exitCode=1;}probe.close();}
 if(child){for(let i=0;i<30&&child.exitCode===null;i++)await delay(100);if(child.exitCode===null)child.kill('SIGTERM');}
 await rm(temp,{recursive:true,force:true});app.exit(process.exitCode||0);
}

});
