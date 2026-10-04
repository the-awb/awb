// One mono SC audio lane. Direct and broker routes share native source, reduction and GUI.
import {app,BrowserWindow,screen} from 'electron';
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';
import {performance} from 'node:perf_hooks';
import os from 'node:os';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openScSignalSource} from '../../../src/scSignalSource.mjs';
import {OSC} from '../../../src/scBusOsc.mjs';
import {ScopeReduction} from '../../../../../tool-artifacts/shared-loop/0.1.0/scope-reduction.mjs';
import {ScopeTransport} from '../../../../../tool-artifacts/shared-loop/0.1.0/scope-transport.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../../..'),loopRoot=resolve(root,'tool-artifacts/shared-loop/0.1.0');
const exec=promisify(execFile),cpuSeconds=s=>s.split(':').map(Number).reduce((v,n)=>v*60+n,0);
async function usage(pids){const {stdout}=await exec('/bin/ps',['-p',pids.join(','),'-o','pid=','-o','time=','-o','rss=']);return Object.fromEntries(stdout.trim().split('\n').filter(Boolean).map(l=>{const [p,t,r]=l.trim().split(/\s+/);return [p,{cpu:cpuSeconds(t),rss:Number(r)/1024}]}));}
async function until(fn,ms=12000){const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await delay(40);}throw new Error('One-line benchmark timed out');}
async function bounded(label,promise){let t;try{return await Promise.race([promise,new Promise((_,reject)=>t=setTimeout(()=>reject(new Error('Cleanup timed out: '+label)),6000))]);}finally{clearTimeout(t);}}
export async function measure({mode,host,broker,session,sclangPID,backgroundWindows=[],assertNoTools=()=>{}}){
 const smoke=process.argv.includes('--smoke'),seconds=Number(process.argv.find(a=>a.startsWith('--seconds='))?.slice(10)||12),repeats=smoke?1:4;
 const output=process.env.UI_COST_OUTPUT,probe=new OSC(session.port),phases=[];
 let server,transport,lease,source,timer,win,latest=null,rawFrames=0,rawGapFrames=0,lastEnd=null,sequence=0,error=null;
 const beforeSC=await probe.request('/status',[],'/status.reply');
 let configuration;
 async function close(){
  if(win&&!win.isDestroyed())win.destroy();win=null;await delay(100);
  if(timer){clearInterval(timer);timer=null;}
  if(transport){await bounded('transport',transport.close());transport=null;}
  if(lease){await bounded('broker lease',lease.stop());lease=null;}
  if(source){await bounded('direct source',source.stop());source=null;}
  if(server){await bounded('HTTP',new Promise((r,j)=>server.close(e=>e?j(e):r())));server=null;}
  if(broker.diagnostics().sources.length||broker.diagnostics().polling)throw new Error('Capture remained after closing case');
  const status=await probe.request('/status',[],'/status.reply');if(status[2]!==beforeSC[2]||status[3]!==beforeSC[3])throw new Error('Case leaked SC nodes/groups: '+status);
 }
 async function show(c){
  await close();assertNoTools();latest=null;rawFrames=0;rawGapFrames=0;lastEnd=null;sequence=0;error=null;
  if(c.name==='idle')return;
  configuration={bus:32,channels:c.kind==='control'?6:1,rate:c.kind==='control'?'control':'audio'};
  const reduction=new ScopeReduction(c.kind);
  const raw=(frame,info)=>{rawFrames++;if(lastEnd&&frame.sourceEnd-frame.frames>lastEnd)rawGapFrames+=frame.sourceEnd-frame.frames-lastEnd;lastEnd=frame.sourceEnd;return c.viewer?reduction.append(frame,info,c.step):null;};
  const publish=next=>{if(next){latest={...next,sourceChannels:configuration.channels,sequence:++sequence};transport?.publish({[c.kind]:latest},{connected:true});}};
  const fault=e=>{error=e.message;console.error('UI_COST_SOURCE',e.message);};
  if(c.viewer){
   server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(req.method==='POST'&&url.pathname==='/api/scope-view'){let body='';for await(const b of req)body+=b;const request=JSON.parse(body);if(request.kind!==c.kind||![1,c.zoom].includes(request.zoom)){res.writeHead(400);res.end('{"error":"Baseline is 1x only"}');return;}res.writeHead(200,{'Content-Type':'application/json'});res.end('{}');return;}
    const files={'/scope':'scope.html','/scope.js':'scope.js','/scope.css':'scope.css','/style.css':'style.css','/scope-protocol.js':'scope-protocol.js','/scope-history.js':'scope-history.js','/scope-painter.js':'scope-painter.js','/scope-metadata.js':'scope-metadata.js','/scope-trace.js':'scope-trace.js'},file=files[url.pathname];if(!file){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(readFileSync(c.version==='before'&&['scope.js','scope-painter.js','scope.html','scope.css'].includes(file)?resolve(root,'prepolish-public',file):resolve(loopRoot,'public',file)));});
   await new Promise(r=>server.listen(0,'127.0.0.1',r));transport=new ScopeTransport(server,1);
  }
  if(c.route==='direct'){
   source=await openScSignalSource({host,configuration});let directEnd=null;
   timer=setInterval(()=>{try{if(!host.isConnected())throw new Error('Direct host disconnected');const frame=source.read();if(frame&&frame.sourceEnd!==directEnd){directEnd=frame.sourceEnd;publish(raw(frame,source.info));}}catch(e){fault(e);}},4);
  }else if(c.viewer){lease=await broker.subscribeDerived({host,configuration,profile:'ui-cost:'+c.kind+':'+c.step,createTransform:()=>({append:raw}),onFrame:publish,onError:fault});}
  else lease=await broker.subscribe({host,configuration,onFrame:raw,onError:fault});
  if(c.viewer){win=new BrowserWindow({width:1100,height:700,x:20,y:20,show:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
   win.webContents.on('console-message',e=>{if(e.level>=2)console.error('UI_COST_RENDERER',e.message);});
   await win.loadURL(`http://127.0.0.1:${server.address().port}/scope?kind=${c.kind}&fps=30`);
   await until(async()=>win.webContents.executeJavaScript("window.__uiCostScope().packets>0")); // Wait for the socket before changing the channel selection.
   await win.webContents.executeJavaScript(`document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(Number('${c.zoom}')):Number('${c.zoom}'));document.querySelector('#zoom').dispatchEvent(new Event('change'));${c.kind==='control'&&c.channels===1?"document.querySelector('#signals').value='fast';document.querySelector('#signals').dispatchEvent(new Event('change'));":''}`);
   await until(async()=>{if(error)throw new Error(error);return await win.webContents.executeJavaScript(`(()=>{const d=window.__uiCostScope();return d.channels===${c.channels}&&d.displayFrames===${c.frames}&&d.step===${c.step}&&d.renderedSourceEnd>0})()`);});
   await delay(c.kind==='control'?3000:1000); // Fill the widened history before sampling.
  }else await until(()=>{if(error)throw new Error(error);return rawFrames>2;});
 }
 async function diagnostics(){return win?win.webContents.executeJavaScript('window.__uiCostScope()'):null;}
 async function phase(c,repeat){
  console.log('UI_COST_PHASE '+JSON.stringify({mode,name:c.name,repeat}));await show(c);await delay(smoke?500:2000);
  const roles=new Map([[process.pid,'main'],[sclangPID,'sclang'],[session.scPID,'scsynth']]);
  if(win)roles.set(win.webContents.getOSProcessId(),'renderer-scope');for(const [name,w] of backgroundWindows)if(w&&!w.isDestroyed())roles.set(w.webContents.getOSProcessId(),'renderer-'+name);
  for(const m of app.getAppMetrics())if(!roles.has(m.pid))roles.set(m.pid,m.type==='Tab'?'renderer-other-'+m.pid:'helper-'+m.type);
  const stateBefore=await diagnostics(),rawBefore=rawFrames,gapBefore=rawGapFrames,trafficBefore=transport?.diagnostics(),imageBefore=win?await win.webContents.executeJavaScript("document.querySelector('#scope').toDataURL()"):null;
  const before=await usage([...roles.keys()]),start=performance.now(),statuses=[];
  for(let i=0;i<(smoke?8:Math.round(seconds*4));i++){statuses.push(await probe.request('/status',[],'/status.reply'));await delay(250);}
  const after=await usage([...roles.keys()]),duration=(performance.now()-start)/1000,state=await diagnostics(),imageAfter=win?await win.webContents.executeJavaScript("document.querySelector('#scope').toDataURL()"):null;
  if(error)throw new Error(error);const processes=[...roles].map(([pid,role])=>{if(!before[pid]||!after[pid])throw new Error('Missing process sample '+pid);return {pid,role,corePercent:100*(after[pid].cpu-before[pid].cpu)/duration,rssMiB:after[pid].rss};});
  const sum=prefix=>processes.filter(p=>p.role.startsWith(prefix)).reduce((s,p)=>s+p.corePercent,0),span=state?(state.now-stateBefore.now)/1000:duration;
  const paintRate=state?(state.paints-stateBefore.paints)/span:null,packetRate=state?(state.packets-stateBefore.packets)/span:null;
  const paintTimes=state?[stateBefore.now,...state.paintTimes.filter(t=>t>stateBefore.now),state.now]:[],maxPaintGapMs=state?Math.max(...paintTimes.slice(1).map((t,i)=>t-paintTimes[i])):null;
  const sourceLagMs=state?1000*(state.sourceEnd-state.renderedSourceEnd)/(c.kind==='control'?session.sampleRate/session.blockSize:session.sampleRate):null;
  const traffic=transport?.diagnostics(),sourceInfo=c.route==='direct'?source?.info:lease;
  if(c.viewer){
   const rate=c.kind==='control'?session.sampleRate/session.blockSize:session.sampleRate;
   if(state.connection!=='Live'||state.sourceEnd<=stateBefore.sourceEnd||state.channels!==c.channels||state.sourceChannels!==configuration.channels||state.displayFrames!==c.frames||state.step!==c.step||state.format!==(c.step===1?'samples':'minmax')||state.sampleRate!==rate||state.selected!==(c.kind==='control'&&c.channels===1?'1':Array.from({length:c.channels},(_,i)=>i).join(','))||state.transport!=='binary-v5'||Math.abs(state.width*state.height-620*240)>1)throw new Error('Invalid comparison feed '+JSON.stringify(state));
   if(paintRate<18||paintRate>31||packetRate<(c.kind==='control'?15:40)||maxPaintGapMs>400||sourceLagMs>200||imageBefore===imageAfter)throw new Error('Comparison freshness/pixel check failed '+JSON.stringify({paintRate,packetRate,maxPaintGapMs,sourceLagMs,pixelsChanged:imageBefore!==imageAfter}));
   if(c.kind==='mic'&&(latest.peaks.length!==1||latest.peaks[0]<.025||latest.peaks[0]>.105))throw new Error('Mono source amplitude mismatch');
   if(state.node!=='undefined'||state.host!=='undefined')throw new Error('Scope escaped sandbox');
  }
  assertNoTools();const result={...c,repeat,seconds:duration,processes,mainCPU:sum('main'),scopeRendererCPU:sum('renderer-scope'),backgroundRendererCPU:sum('renderer')-sum('renderer-scope'),gpuCPU:sum('helper-GPU'),electronCPU:sum('main')+sum('renderer')+sum('helper'),rssMiB:processes.filter(p=>!['sclang','scsynth'].includes(p.role)).reduce((s,p)=>s+p.rssMiB,0),scAudioCPU:statuses.reduce((s,a)=>s+a[5],0)/statuses.length,scPeakCPU:Math.max(...statuses.map(s=>s[6])),rawRate:(rawFrames-rawBefore)/duration,rawGapFrames:rawGapFrames-gapBefore,packetRate,paintRate,labelRate:state?(state.labels-stateBefore.labels)/span:null,maxPaintGapMs,sourceLagMs,pixelsChanged:state?imageBefore!==imageAfter:null,KiBs:traffic?(traffic.binaryBytesSent-trafficBefore.binaryBytesSent)/duration/1024:0,sourceInfo:sourceInfo?{channels:sourceInfo.channels,bus:sourceInfo.bus,sampleRate:sourceInfo.sampleRate,blockSize:sourceInfo.blockSize,rate:sourceInfo.rate}:null,state,broker:broker.diagnostics()};phases.push(result);
  await writeFile(output,JSON.stringify({complete:false,mode,session,machine:os.cpus()[0].model,versions:{electron:process.versions.electron,node:process.versions.node},pollMs:4,paintFPS:30,plot:{width:620,height:240,dpr:1},sourceHashes:JSON.parse(readFileSync(resolve(root,'ui-cost-source-hashes.json'))),phases},null,2));
  console.log('UI_COST_COST '+JSON.stringify({mode,name:c.name,repeat,total:result.electronCPU,main:result.mainCPU,renderer:result.scopeRendererCPU,background:result.backgroundRendererCPU,gpu:result.gpuCPU,paintRate,packetRate,rawGapFrames:result.rawGapFrames}));
 }
 try{
  const cases=[{name:'idle'},...[['audio-1x','mic',1,1],['audio-wide','mic',.25,1],['control-one','control',.25,1],['control-six-wide','control',.0625,6]].flatMap(([group,kind,zoom,channels])=>['before','after'].map(version=>{const step=version==='after'&&kind==='control'?1:1/zoom;return {name:group+'-'+version,group,kind,zoom,channels,version,step,frames:(kind==='control'?128:1024)/zoom/step,route:'broker',viewer:true};}))];
  for(let r=1;r<=repeats;r++)for(const c of r%2?cases:[...cases].reverse())await phase(c,r);
  await close();const report=JSON.parse(readFileSync(output));Object.assign(report,{complete:true,cleanup:true,hostSurvives:host.isConnected(),unrelatedTools:0,gpuFeatures:app.getGPUFeatureStatus(),display:screen.getPrimaryDisplay().workAreaSize,beforeSC,afterSC:await probe.request('/status',[],'/status.reply')});await writeFile(output,JSON.stringify(report,null,2));console.log('UI_COST_COMPLETE '+JSON.stringify({mode,phases:phases.length,output}));return report;
 }finally{await close().catch(e=>console.error('UI_COST_CLEANUP',e));probe.close();}
}
