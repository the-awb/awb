// Minimal Electron process plus an isolated SC host: no Toolkit Home, Field or Studio.
import {app,BrowserWindow,screen} from 'electron';
import {createRequire} from 'node:module';
import {cpSync,readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import dgram from 'node:dgram';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';
import {OSC} from '../osc.mjs';
import {startBridge} from '../server.mjs';
import {encodeScopeFrame} from '../public/scope-protocol.js';
const controlCostOnly=process.argv.includes('--control-cost-only');
const wideOnly=process.argv.includes('--wide-only')||process.argv.includes('--rolling-only');
const binaryOnly=process.argv.includes('--binary-only')||wideOnly||controlCostOnly;
const require=createRequire(import.meta.url),native=require('../build/loopview.node'),scopes=require('../build/scopeview.node');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),exec=promisify(execFile);
const temp=await mkdtemp('/private/tmp/awb-component-bench-');app.setPath('userData',resolve(temp,'electron'));
app.on('window-all-closed',()=>{});app.whenReady().then(async()=>{
let child,bridge,probe,session,log='',viewers=[],results=[];
async function port(){const s=dgram.createSocket('udp4');await new Promise(r=>s.bind(0,'127.0.0.1',r));const n=s.address().port;await new Promise(r=>s.close(r));return n;}
const processTime=time=>time.split(':').map(Number).reduce((sum,v)=>sum*60+v,0);
async function usage(pids){const {stdout}=await exec('/bin/ps',['-p',pids.join(','),'-o','pid=','-o','time=','-o','rss=']);return Object.fromEntries(stdout.trim().split('\n').map(line=>{const [pid,time,rss]=line.trim().split(/\s+/);return [pid,{cpuSeconds:processTime(time),rssMiB:Number(rss)/1024}];}));}
async function phase(name){
 await delay(2000);
 const roles={electronMain:process.pid,sclang:child.pid,scsynth:session.scPID,...Object.fromEntries(viewers.map(({kind,win})=>[kind+'Renderer',win.webContents.getOSProcessId()]))};
 const transportBefore=bridge?(await(await fetch(new URL('/api/scopes',bridge.url))).json()).transport:null;
 const drawingBefore=controlCostOnly&&viewers.length?await viewers[0].win.webContents.executeJavaScript('window.__benchStrokes'):null;
 const before=await usage(Object.values(roles)),started=performance.now(),statuses=[];
 for(let i=0;i<20;i++){statuses.push(await probe.request('/status',[],'/status.reply'));await delay(250);}
 const seconds=(performance.now()-started)/1000,after=await usage(Object.values(roles));
 const state=bridge?await(await fetch(new URL('/api/scopes',bridge.url))).json():null;
 const wire=state?.connected?Object.fromEntries(['mic','output'].map(kind=>[kind,Buffer.byteLength(`data: ${JSON.stringify({kind,snapshot:{...bridge.scopeSnapshots()[kind],samples:Array.from(bridge.scopeSnapshots()[kind].samples)},connected:true,error:null})}\n\n`)])):null;
 const traffic=state&&transportBefore?{binaryBytesPerSecond:(state.transport.binaryBytesSent-transportBefore.binaryBytesSent)/seconds,statusBytesPerSecond:(state.transport.statusBytesSent-transportBefore.statusBytesSent)/seconds,ackBytesPerSecond:(state.transport.ackBytesReceived-transportBefore.ackBytesReceived)/seconds,framesPerSecond:(state.transport.framesSent-transportBefore.framesSent)/seconds}:null;
 const result={name,seconds,traffic,scAudioCPU:statuses.reduce((a,s)=>a+s[5],0)/statuses.length,scPeakCPU:Math.max(...statuses.map(s=>s[6])),processes:Object.fromEntries(Object.entries(roles).map(([role,pid])=>[role,{corePercent:100*(after[pid].cpuSeconds-before[pid].cpuSeconds)/seconds,rssMiB:after[pid].rssMiB}])),wireBytesPerSnapshot:wire};
 if(controlCostOnly&&viewers.length){result.rendererDiagnostics=await viewers[0].win.webContents.executeJavaScript(`({strokes:window.__benchStrokes,visibleChannels:document.querySelector('#scope').dataset.visibleChannels,sourceEnd:Number(document.querySelector('#scope').dataset.sourceEnd),missingSourceFrames:Number(document.querySelector('#scope').dataset.missingSourceFrames),transport:document.querySelector('#scope').dataset.transport})`);result.rendererDiagnostics.strokes-=drawingBefore;}
 results.push(result);console.log('COMPONENT '+JSON.stringify(result));
}
async function closeViews(){for(const {win} of viewers)win.destroy();viewers=[];await delay(100);}
async function startNode(interval=33,withScopes=true){if(bridge){await closeViews();await bridge.stop();bridge=null;}
 bridge=await startBridge({session,osc:new OSC(session.port),reader:native.attach(session.sharedId),scopeReader:withScopes?scopes.attach(session.port,session.micScope,session.outScope,session.controlScope):null,httpPort:0,isConnected:()=>true,release:async()=>{},updateIntervalMs:interval});
}
async function show(kind,paintHz=0){const win=new BrowserWindow({width:720,height:kind==='control'?640:520,x:20+(kind==='output'?740:0),y:40,show:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});viewers.push({kind,win});await win.loadURL(new URL(kind==='looper'?'/':`/scope?kind=${kind}`,bridge.url).href);if(kind!=='looper')await win.webContents.executeJavaScript(`document.querySelector('#gain').value=String(document.querySelector('#gain').dataset.scale==='log2'?Math.log2(16):16);document.querySelector('#gain').dispatchEvent(new Event('change'));
 if(${paintHz}>0){const raf=requestAnimationFrame.bind(window);let last=0;window.requestAnimationFrame=callback=>raf(function step(time){if(time-last>=1000/${paintHz}-.5){last=time;callback(time);}else raf(step);});} void 0;`);}
async function qt(kind,interval=33){await probeLanguage.request('/bench/qt',[kind,interval],'/bench/qt/ready',a=>a[0]===kind,6000);}
let probeLanguage;
try {
 const scApp=process.env.SC_APP||'/Applications/SuperCollider.app',library=resolve(temp,'SCClassLibrary');
 cpSync(resolve(scApp,'Contents/Resources/SCClassLibrary'),library,{recursive:true});
 const platform=resolve(library,'Platform/osx/OSXPlatform.sc');writeFileSync(platform,readFileSync(platform,'utf8').replace('this.loadStartupFiles;','// benchmark skips user startup'));
 const config=resolve(temp,'sclang.yaml');writeFileSync(config,`includePaths:\n  - ${JSON.stringify(library)}\n  - ${JSON.stringify(resolve(root,'sc'))}\nexcludePaths: []\nexcludeDefaultPaths: true\n`);
 const serverPort=await port(),languagePort=await port(),id=Math.floor(100000+Math.random()*15000000),sessionPath=resolve(temp,'session.json');
 child=spawn(resolve(scApp,'Contents/MacOS/sclang'),['-a','-D','-u',String(languagePort),'-l',config,resolve(root,'tests/component-server.scd')],{cwd:root,env:{...process.env,BENCH_ROOT:root,BENCH_PORT:String(serverPort),BENCH_ID:String(id),BENCH_SESSION:sessionPath},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',b=>{log+=b});child.stderr.on('data',b=>{log+=b});
 const started=Date.now();while(!existsSync(sessionPath)){if(child.exitCode!==null||log.includes('ERROR:')||Date.now()-started>35000)throw new Error('Benchmark SC startup failed: '+log);await delay(100);}
 session=JSON.parse(readFileSync(sessionPath));probe=new OSC(session.port);probeLanguage=new OSC(languagePort);
 await phase('idle-server-no-bridge-no-viewer');
 if(!binaryOnly){await startNode(33,false);probe.send('/n_run',session.nodeId,1);await probe.sync();await delay(100);await bridge.control('outputGain',0);await bridge.control('record');await delay(4300);
 await phase('looper-playing-node-reader-no-viewer');
 await show('looper');await phase('looper-playing-one-gui-no-scopes');await closeViews();
 await bridge.control('overdub',true);await phase('looper-overdub-node-reader-no-viewer');await bridge.control('overdub',false);}
 probe.send('/n_run',session.nodeId,0);probe.send('/n_run',session.scopeNodeId,1);await probe.sync();await startNode(33,true);
 await phase('scope-tap-node-reader-no-viewer');
 if(controlCostOnly){
  await show('control');const win=viewers[0].win;
  await win.webContents.executeJavaScript(`
   document.querySelector('#gain').value=String(document.querySelector('#gain').dataset.scale==='log2'?Math.log2(1):1);document.querySelector('#gain').dispatchEvent(new Event('change'));
   document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(0.0625):0.0625);document.querySelector('#zoom').dispatchEvent(new Event('change'));
   const context=document.querySelector('#scope').getContext('2d'),stroke=context.stroke.bind(context);
   window.__benchStrokes=0;context.stroke=function(...args){window.__benchStrokes++;return stroke(...args);};
   window.__benchRAF=requestAnimationFrame.bind(window);
   window.requestAnimationFrame=callback=>{window.__benchResume=callback;return 0;};void 0;`);
  // Keep WebSocket decoding, ring assembly and DOM updates active; stop Canvas painting.
  await phase('control-streaming-no-canvas-paint');
  probe.send('/n_run',session.scopeNodeId,0);await probe.sync();
  await phase('control-connected-idle-no-new-publications-no-canvas-paint');
  probe.send('/n_run',session.scopeNodeId,1);await probe.sync();
  await win.webContents.executeJavaScript(`window.requestAnimationFrame=window.__benchRAF;window.requestAnimationFrame(window.__benchResume);void 0;`);
  for(const [repeat,modes] of [[1,['slow','noise','all']],[2,['all','noise','slow']]])for(const mode of modes){
   await win.webContents.executeJavaScript(`document.querySelector('#signals').value=${JSON.stringify(mode)};document.querySelector('#signals').dispatchEvent(new Event('change'));void 0;`);
   const count=mode==='slow'?1:mode==='noise'?4:6;
   await phase(`control-draw-${count}-lanes-repeat-${repeat}`);
   const diag=results.at(-1).rendererDiagnostics;
   if(diag.strokes<100||diag.visibleChannels.split(',').length!==count||diag.transport!=='binary-v4')throw new Error('Control drawing benchmark did not exercise the selected live lanes');
  }
  await win.webContents.executeJavaScript(`window.requestAnimationFrame=callback=>{window.__benchResume=callback;return 0;};void 0;`);
  await phase('control-streaming-no-canvas-paint-repeat');
  await closeViews();await phase('scope-tap-node-reader-no-viewer-repeat');
  for(const result of results.filter(result=>result.name.includes('no-canvas-paint')))if(result.rendererDiagnostics.strokes!==0)throw new Error('Canvas continued painting during no-paint baseline');
 }else{
 await show('mic');await phase('one-mic-1024-source-frames-per-chunk');await closeViews();
 await show('output');await phase('one-stereo-output-1024-source-frames-per-chunk');await closeViews();
 await show('mic');await show('output');await phase('two-scopes-1024-source-frames-per-chunk');
 if(wideOnly){
  for(const {win} of viewers)await win.webContents.executeJavaScript(`document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(0.0625):0.0625);document.querySelector('#zoom').dispatchEvent(new Event('change'));void 0;`);
  await phase('two-scopes-rolling-16384-source-frame-window-1024-bins');await closeViews();
  await show('control');await phase('one-control-six-channels-rolling-128-source-frame-window');
  await viewers[0].win.webContents.executeJavaScript(`document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(0.0625):0.0625);document.querySelector('#zoom').dispatchEvent(new Event('change'));void 0;`);
  await phase('one-control-six-channels-rolling-2048-source-frame-window-128-bins');
 }
 }
 // Clock-stamped scopes have extra private channels. The historical Qt and
 // variable-capture-size comparison cannot fairly consume this layout.
 await closeViews();await bridge.stop();bridge=null;
 // Isolate serialization/copy costs on realistic input/output samples.
 const handle=scopes.attach(session.port,session.micScope,session.outScope);let pair;
 try{await delay(100);pair=scopes.read(handle);}finally{scopes.detach(handle);}
 const n=3000,times={};
 for(const mode of ['json','binary-copy','binary-wrap','binary-packet']){let bytes=0;const start=performance.now();for(let i=0;i<n;i++)for(const kind of ['mic','output']){const s={...pair[kind],sampleRate:session.sampleRate};if(mode==='json')bytes+=JSON.stringify({...s,samples:Array.from(s.samples)}).length;else if(mode==='binary-packet')bytes+=encodeScopeFrame(kind,s,session.sharedId).byteLength;else{const b=Buffer.from(s.samples.buffer,s.samples.byteOffset,s.samples.byteLength);bytes+=(mode==='binary-copy'?Buffer.from(b):b).length;}}times[mode]={pairMicroseconds:(performance.now()-start)*1000/n,bytesPerPair:bytes/n};}
 const final={protocol:'awb.scope.v4',controlCostOnly,controlDisplayGain:controlCostOnly?1:null,controlZoom:controlCostOnly?0.0625:null,scopePollMs:8,audioCaptureFrames:1024,controlCaptureFrames:32,display:screen.getPrimaryDisplay().workAreaSize,machine:os.cpus()[0].model,scVersion:'3.12.2',sampleRate:session.sampleRate,phases:results,encoding:times};
 await writeFile(controlCostOnly?'/private/tmp/awb-control-cost-results.json':'/private/tmp/awb-rolling-results.json',JSON.stringify(final,null,2));console.log('COMPONENT_ENCODING '+JSON.stringify(times));
} catch(error){console.error(error.stack,log);process.exitCode=1;}
finally {
 await closeViews();if(bridge)await bridge.stop().catch(console.error);
 if(probeLanguage){await qt('none').catch(()=>{});probeLanguage.close();}
 if(probe){try{probe.send('/n_free',session.nodeId,session.scopeNodeId);await probe.sync();await probe.request('/cmd',['loop_view_free',session.sharedId],'/done',a=>a[0]==='loop_view_free');await probe.request('/quit',[],'/done',a=>a[0]==='/quit');}catch(error){console.error('Benchmark cleanup:',error.message);process.exitCode=1;}probe.close();}
 if(child){for(let i=0;i<30&&child.exitCode===null;i++)await delay(100);if(child.exitCode===null)child.kill('SIGTERM');}
 await rm(temp,{recursive:true,force:true});app.exit(process.exitCode||0);
}

});
