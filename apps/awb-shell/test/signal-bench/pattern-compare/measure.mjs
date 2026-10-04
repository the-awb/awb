// Actual-shell comparison: one mono scope versus one live paired 5,000-point Lissajous pattern.
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
export async function measure({mode,host,broker,session,sclangPID,backgroundWindows=[],assertNoTools=()=>{},launchPattern,closePattern,patternState}){
 const smoke=process.argv.includes('--smoke'),seconds=Number(process.argv.find(a=>a.startsWith('--seconds='))?.slice(10)||12),repeats=smoke?1:4;
 const output=process.env.ONE_LINE_OUTPUT,probe=new OSC(session.port),phases=[];
 let patternID=null,patternActive=false,server,transport,lease,source,timer,win,latest=null,rawFrames=0,rawGapFrames=0,lastEnd=null,sequence=0,error=null;
 const beforeSC=await probe.request('/status',[],'/status.reply');
 const configuration={bus:32,channels:1,rate:'audio'};
 async function close(){
  if(patternID){await bounded('pattern closure',closePattern(patternID));patternID=null;}else if(win&&!win.isDestroyed())win.destroy();win=null;patternActive=false;await delay(100);
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
  if(c.pattern){
   const launched=await launchPattern(c.fps);win=launched.win;patternID=launched.id;patternActive=true;win.show();win.focus();
   await win.webContents.executeJavaScript(`(()=>{const source=document.querySelector('button[title="Source"]');if(source.getAttribute('aria-pressed')!=='true')source.click();})()`);
   await until(()=>win.webContents.executeJavaScript(`!!document.querySelector('[aria-label="SC audio bus"]')`));
   await win.webContents.executeJavaScript(`(()=>{const input=document.querySelector('[aria-label="SC audio bus"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,32);input.dispatchEvent(new Event('input',{bubbles:true}));const select=document.querySelector('[aria-label="SC bus channels"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'2');select.dispatchEvent(new Event('change',{bubbles:true}));})()`);await delay(100);
   await win.webContents.executeJavaScript(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Start SC Bus');if(!b)throw new Error('Missing SC bus start');b.click();})()`);
   await until(()=>patternState(patternID)?.sourceKind==='sc-bus');
   await win.webContents.executeJavaScript(`document.querySelector('button[title="Patterns"]').click()`);
   await until(()=>win.webContents.executeJavaScript(`!!document.querySelector('[aria-label="Length (samples) slider"]')`));
   await win.webContents.executeJavaScript(`(()=>{const input=document.querySelector('[aria-label="Length (samples) slider"]');if(!input)throw new Error('Missing persistence slider');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'5000');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
   await until(()=>win.webContents.executeJavaScript(`document.querySelector('[aria-label="Length (samples) value"]')?.value==='5000'`));
   await win.webContents.executeJavaScript(`(()=>{const style=document.createElement('style');style.textContent='[data-bench-plot] {width:620px !important;height:240px !important;border:0 !important;}';document.head.append(style);for(const canvas of document.querySelectorAll('canvas'))canvas.parentElement.dataset.benchPlot='true';})()`);
   await until(()=>win.webContents.executeJavaScript(`window.__patternBench().plots.some(p=>p.pointCount===5000&&p.width===620&&p.height===240&&p.bufferWidth===620&&p.bufferHeight===240)`));
   return;
  }
  const reduction=new ScopeReduction('mic');
  const raw=(frame,info)=>{rawFrames++;if(lastEnd&&frame.sourceEnd-frame.frames>lastEnd)rawGapFrames+=frame.sourceEnd-frame.frames-lastEnd;lastEnd=frame.sourceEnd;return c.viewer?reduction.append(frame,info,1):null;};
  const publish=next=>{if(next){latest={...next,sourceChannels:1,sequence:++sequence};transport?.publish({mic:latest},{connected:true});}};
  const fault=e=>{error=e.message;console.error('ONE_LINE_SOURCE',e.message);};
  if(c.viewer){
   server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(req.method==='POST'&&url.pathname==='/api/scope-view'){let body='';for await(const b of req)body+=b;const request=JSON.parse(body);if(request.kind!=='mic'||request.zoom!==1){res.writeHead(400);res.end('{"error":"Baseline is 1x only"}');return;}res.writeHead(200,{'Content-Type':'application/json'});res.end('{}');return;}
    const files={'/scope':'scope.html','/scope.js':'scope.js','/scope.css':'scope.css','/scope-protocol.js':'scope-protocol.js','/scope-history.js':'scope-history.js','/scope-painter.js':'scope-painter.js','/scope-metadata.js':'scope-metadata.js','/scope-trace.js':'scope-trace.js'},file=files[url.pathname];if(!file){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(readFileSync(resolve(loopRoot,'public',file)));});
   await new Promise(r=>server.listen(0,'127.0.0.1',r));transport=new ScopeTransport(server,1);
  }
  if(c.route==='direct'){
   source=await openScSignalSource({host,configuration});let directEnd=null;
   timer=setInterval(()=>{try{if(!host.isConnected())throw new Error('Direct host disconnected');const frame=source.read();if(frame&&frame.sourceEnd!==directEnd){directEnd=frame.sourceEnd;publish(raw(frame,source.info));}}catch(e){fault(e);}},4);
  }else if(c.viewer){lease=await broker.subscribeDerived({host,configuration,profile:'scope:1024:1',createTransform:()=>({append:raw}),onFrame:publish,onError:fault});}
  else lease=await broker.subscribe({host,configuration,onFrame:raw,onError:fault});
  if(c.viewer){win=new BrowserWindow({width:1100,height:700,x:20,y:20,show:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
   win.webContents.on('console-message',e=>{if(e.level>=2)console.error('ONE_LINE_RENDERER',e.message);});
   await win.loadURL(`http://127.0.0.1:${server.address().port}/scope?kind=mic&fps=30`);
   await until(async()=>{if(error)throw new Error(error);return await win.webContents.executeJavaScript("!!document.querySelector('#scope').dataset.renderedSequence");});
  }else await until(()=>{if(error)throw new Error(error);return rawFrames>2;});
 }
 async function diagnostics(){return win?win.webContents.executeJavaScript(patternActive?'window.__patternBench()':'window.__oneLineScope()'):null;}
 async function patternImage(){const r=await win.webContents.executeJavaScript(`(()=>{const c=document.querySelector('canvas[data-bench-points="5000"]');const r=c.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),width:620,height:240};})()`);return (await win.webContents.capturePage(r)).toPNG().toString('base64');}
 async function phase(c,repeat){
  console.log('ONE_LINE_PHASE '+JSON.stringify({mode,name:c.name,repeat}));await show(c);await delay(smoke?500:2000);
  const roles=new Map([[process.pid,'main'],[sclangPID,'sclang'],[session.scPID,'scsynth']]);
  if(win)roles.set(win.webContents.getOSProcessId(),'renderer-scope');for(const [name,w] of backgroundWindows)if(w&&!w.isDestroyed())roles.set(w.webContents.getOSProcessId(),'renderer-'+name);
  for(const m of app.getAppMetrics())if(!roles.has(m.pid))roles.set(m.pid,m.type==='Tab'?'renderer-other-'+m.pid:'helper-'+m.type);
  const stateBefore=await diagnostics(),rawBefore=rawFrames,gapBefore=rawGapFrames,trafficBefore=transport?.diagnostics(),imageBefore=win?(patternActive?await patternImage():await win.webContents.executeJavaScript("document.querySelector('#scope').toDataURL()")):null;
  const before=await usage([...roles.keys()]),start=performance.now(),statuses=[];
  for(let i=0;i<(smoke?8:Math.round(seconds*4));i++){statuses.push(await probe.request('/status',[],'/status.reply'));await delay(250);}
  const after=await usage([...roles.keys()]),duration=(performance.now()-start)/1000,state=await diagnostics(),imageAfter=win?(patternActive?await patternImage():await win.webContents.executeJavaScript("document.querySelector('#scope').toDataURL()")):null;
  if(error)throw new Error(error);const processes=[...roles].map(([pid,role])=>{if(!before[pid]||!after[pid])throw new Error('Missing process sample '+pid+' role '+role+' before '+JSON.stringify(before[pid])+' after '+JSON.stringify(after[pid]));return {pid,role,corePercent:100*(after[pid].cpu-before[pid].cpu)/duration,rssMiB:after[pid].rss};});
  const sum=prefix=>processes.filter(p=>p.role.startsWith(prefix)).reduce((s,p)=>s+p.corePercent,0),span=state?(state.now-stateBefore.now)/1000:duration;
  const pointPlot=state?.plots?.find(p=>p.pointCount===5000),pointBefore=stateBefore?.plots?.find(p=>p.pointCount===5000);const paintRate=state?(c.pattern?(pointPlot.points-pointBefore.points)/span:(state.paints-stateBefore.paints)/span):null,packetRate=state?(state.packets-stateBefore.packets)/span:null;
  const actualTimes=c.pattern?pointPlot?.pointTimes:state?.paintTimes;const paintTimes=state?[stateBefore.now,...actualTimes.filter(t=>t>stateBefore.now),state.now]:[],maxPaintGapMs=state?Math.max(...paintTimes.slice(1).map((t,i)=>t-paintTimes[i])):null;
  const sourceLagMs=state&&!c.pattern?1000*(state.sourceEnd-state.renderedSourceEnd)/session.sampleRate:null;
  const traffic=transport?.diagnostics(),sourceInfo=c.route==='direct'?source?.info:lease;
  if(c.pattern){if(state.channels!==2||state.sampleRate!==session.sampleRate||state.sourceEnd<=stateBefore.sourceEnd||pointPlot.pointCount!==5000||packetRate<80||paintRate<25||(c.fps&&paintRate>31)||maxPaintGapMs>400||imageBefore===imageAfter||pointPlot.uploads<=pointBefore.uploads||patternState(patternID)?.sourceKind!=='sc-bus')throw new Error('Pattern activity/5000-point/rate contract failed '+JSON.stringify({state,paintRate,packetRate,maxPaintGapMs,pixelsChanged:imageBefore!==imageAfter}));}
  else if(c.viewer){
   if(state.connection!=='Live'||state.sourceEnd<=stateBefore.sourceEnd||state.channels!==1||state.sourceChannels!==1||state.chunkFrames!==1024||state.sampleRate!==session.sampleRate||state.selected!=='0'||state.transport!=='binary-v5'||Math.abs(state.width*state.height-620*240)>1)throw new Error('Invalid single-line feed '+JSON.stringify(state));
   if(paintRate<25||paintRate>31||packetRate<40||maxPaintGapMs>400||sourceLagMs>200||imageBefore===imageAfter)throw new Error('Single-line freshness/pixel check failed '+JSON.stringify({paintRate,packetRate,maxPaintGapMs,sourceLagMs,pixelsChanged:imageBefore!==imageAfter}));
   if(latest.peaks.length!==1||latest.peaks[0]<.025||latest.peaks[0]>.105)throw new Error('Mono source amplitude mismatch');
   if(state.node!=='undefined'||state.host!=='undefined')throw new Error('Scope escaped sandbox');
  }
  assertNoTools();const geometryHz=c.pattern?(pointPlot.uploads-pointBefore.uploads)/span/2:null;const result={...c,geometryHz,repeat,seconds:duration,processes,mainCPU:sum('main'),scopeRendererCPU:sum('renderer-scope'),backgroundRendererCPU:sum('renderer')-sum('renderer-scope'),gpuCPU:sum('helper-GPU'),electronCPU:sum('main')+sum('renderer')+sum('helper'),rssMiB:processes.filter(p=>!['sclang','scsynth'].includes(p.role)).reduce((s,p)=>s+p.rssMiB,0),scAudioCPU:statuses.reduce((s,a)=>s+a[5],0)/statuses.length,scPeakCPU:Math.max(...statuses.map(s=>s[6])),rawRate:c.pattern?packetRate:(rawFrames-rawBefore)/duration,rawGapFrames:c.pattern?state.gapFrames-stateBefore.gapFrames:rawGapFrames-gapBefore,packetRate,paintRate,maxPaintGapMs,sourceLagMs,pixelsChanged:state?imageBefore!==imageAfter:null,KiBs:c.pattern?(state.bytes-stateBefore.bytes)/span/1024:traffic?(traffic.binaryBytesSent-trafficBefore.binaryBytesSent)/duration/1024:0,sourceInfo:sourceInfo?{channels:sourceInfo.channels,bus:sourceInfo.bus,sampleRate:sourceInfo.sampleRate,blockSize:sourceInfo.blockSize,rate:sourceInfo.rate}:null,state,broker:broker.diagnostics()};phases.push(result);
  await writeFile(output,JSON.stringify({complete:false,mode,session,machine:os.cpus()[0].model,versions:{electron:process.versions.electron,node:process.versions.node},pollMs:4,scopePaintFPS:30,patternPoints:5000,plot:{width:620,height:240,dpr:1},sourceHashes:JSON.parse(readFileSync(resolve(root,'pattern-compare-source-hashes.json'))),phases},null,2));
  console.log('ONE_LINE_COST '+JSON.stringify({mode,name:c.name,repeat,total:result.electronCPU,main:result.mainCPU,renderer:result.scopeRendererCPU,background:result.backgroundRendererCPU,gpu:result.gpuCPU,paintRate,packetRate,rawGapFrames:result.rawGapFrames}));
 }
 try{
  const cases=[{name:'idle'},{name:'scope-1024-30fps',route:'broker',viewer:true},{name:'pattern-5000-normal',pattern:true,viewer:true,fps:0},{name:'pattern-5000-30fps',pattern:true,viewer:true,fps:30}];
  for(let r=1;r<=repeats;r++)for(const c of r%2?cases:[...cases].reverse())await phase(c,r);
  await close();const report=JSON.parse(readFileSync(output));Object.assign(report,{complete:true,cleanup:true,hostSurvives:host.isConnected(),unrelatedTools:0,gpuFeatures:app.getGPUFeatureStatus(),display:screen.getPrimaryDisplay().workAreaSize,beforeSC,afterSC:await probe.request('/status',[],'/status.reply')});await writeFile(output,JSON.stringify(report,null,2));console.log('ONE_LINE_COMPLETE '+JSON.stringify({mode,phases:phases.length,output}));return report;
 }finally{await close().catch(e=>console.error('ONE_LINE_CLEANUP',e));probe.close();}
}
