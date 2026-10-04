import {app,screen} from 'electron';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import os from 'node:os';
import assert from 'node:assert/strict';
import {OSC} from '../../../src/scBusOsc.mjs';
const exec=promisify(execFile),cpuSeconds=s=>s.split(':').map(Number).reduce((v,n)=>v*60+n,0);
async function usage(pids){const {stdout}=await exec('/bin/ps',['-p',pids.join(','),'-o','pid=','-o','time=','-o','rss=']);return Object.fromEntries(stdout.trim().split('\n').filter(Boolean).map(l=>{const [pid,time,rss]=l.trim().split(/\s+/);return [pid,{cpu:cpuSeconds(time),rss:Number(rss)/1024}];}));}
async function until(fn,label,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await delay(30);}throw new Error('Meter benchmark timeout: '+label);}
export async function measure({launchFromHome,closeToolView,windows,registry,signalCaptures,services,nativeScHost,homeWindow,renderExecutorWindow,session}){
 const output=process.env.METER_COST_OUTPUT,smoke=process.argv.includes('--smoke'),seconds=smoke?2:Number(process.argv.find(a=>a.startsWith('--seconds='))?.slice(10)||6),repeats=smoke?1:2;
 const osc=new OSC(session.port),beforeSC=await osc.request('/status',[],'/status.reply'),phases=[];
 const launched=await launchFromHome({toolID:'scope',profileID:'hosted',launchOrigin:'desktop'});assert.equal(launched.status,'accepted');
 await until(()=>registry.get(launched.viewID)?.lifecycle==='ready','Scope opens');const win=windows.get(launched.viewID);win.setSize(1100,900);win.show();win.focus();win.webContents.setBackgroundThrottling(false);
 const evaluate=code=>win.webContents.executeJavaScript(code),diag=()=>evaluate('window.__meterCost()');
 await until(()=>evaluate("!document.querySelector('#listen').disabled"),'socket');
 await evaluate("const option=document.createElement('option');option.value='capture';option.textContent='Benchmark capture only';document.querySelector('#displayMode').append(option);document.querySelector('#paintRate').value='30';document.querySelector('#paintRate').dispatchEvent(new Event('change'));void 0;");
 const meterSchedule=process.argv.find(a=>a.startsWith('--meter-schedule='))?.slice(17)||'aligned15',meterHz=meterSchedule==='legacy8'?8:15;
 const selectedChannels=process.argv.find(a=>a.startsWith('--channels='))?.slice(11).split(',').map(Number)||[1,4,16],selectedViews=process.argv.find(a=>a.startsWith('--views='))?.slice(8).split(',')||['capture','waves','meters','both'];
 const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7);
 const cases=[{rate:'idle',channels:0,view:'idle'},...['audio','control'].flatMap(rate=>selectedChannels.flatMap(channels=>selectedViews.map(view=>({rate,channels,view}))))].filter(c=>!only||c.rate==='idle'||c.rate===only);
 const previous={};
 const assertOnlyScope=()=>{const views=registry.list();assert.equal(views.length,1);assert.equal(views[0].toolID,'scope');};
 try{
  for(let repeat=1;repeat<=repeats;repeat++)for(const c of repeat%2?cases:[...cases].reverse()){
   console.log('METER_COST_PHASE '+JSON.stringify({...c,repeat}));assertOnlyScope();
   if(c.rate==='idle'){await evaluate("document.querySelector('#stop').click();void 0;");await until(()=>signalCaptures.diagnostics().sources.length===0,'idle cleanup');}
   else{
    if(previous.rate!==c.rate||previous.channels!==c.channels){await evaluate(`document.querySelector('#rate').value='${c.rate}';document.querySelector('#bus').value='32';document.querySelector('#channelCount').value='${c.channels}';document.querySelector('#busForm').requestSubmit();void 0;`);await until(async()=>{const d=await diag();if(d.error)throw new Error('Bus range error: '+JSON.stringify(d));return d.channels===c.channels&&d.rate===c.rate&&d.sourceEnd>0;},'new bus range',30000);}
    await evaluate(`document.querySelector('#displayMode').value='${c.view}';document.querySelector('#displayMode').dispatchEvent(new Event('change'));void 0;`);
   }
   Object.assign(previous,c);await delay(smoke?500:1200);
   const roles=new Map([[process.pid,'main'],[nativeScHost.snapshot().processID,'sclang'],[session.scPID,'scsynth'],[win.webContents.getOSProcessId(),'renderer-scope'],[homeWindow.webContents.getOSProcessId(),'renderer-home'],[renderExecutorWindow.webContents.getOSProcessId(),'renderer-worker']]);
   for(const m of app.getAppMetrics())if(!roles.has(m.pid))roles.set(m.pid,m.type==='Tab'?'renderer-other':'helper-'+m.type);
   const layout=await evaluate(`({footer:document.querySelector('footer').getBoundingClientRect().bottom,height:innerHeight,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight})`);assert.ok(layout.footer<=layout.height&&layout.scrollWidth<=layout.width&&layout.scrollHeight<=layout.height,'Complete benchmark UI must be visible '+JSON.stringify(layout));
   const stateBefore=await diag(),before=await usage([...roles.keys()]),start=performance.now(),statuses=[];
   const imageBefore=c.view==='meters'||c.view==='both'?await evaluate("document.querySelector('#meters canvas').toDataURL()"):c.view==='waves'?await evaluate("document.querySelector('#scope').toDataURL()"):null;
   for(let i=0;i<Math.round(seconds*4);i++){statuses.push(await osc.request('/status',[],'/status.reply'));await delay(250);}
   const duration=(performance.now()-start)/1000,after=await usage([...roles.keys()]),state=await diag();
   const imageAfter=imageBefore?await evaluate(c.view==='waves'?"document.querySelector('#scope').toDataURL()":"document.querySelector('#meters canvas').toDataURL()"):null;
   const processes=[...roles].map(([pid,role])=>{assert.ok(before[pid]&&after[pid],'CPU PID survived: '+role);return {pid,role,corePercent:100*(after[pid].cpu-before[pid].cpu)/duration,rssMiB:after[pid].rss};});
   const sum=fn=>processes.filter(fn).reduce((s,p)=>s+p.corePercent,0),span=(state.now-stateBefore.now)/1000;
   const result={...c,repeat,layout,seconds:duration,processes,electronCPU:sum(p=>!['sclang','scsynth'].includes(p.role)),mainCPU:sum(p=>p.role==='main'),rendererCPU:sum(p=>p.role==='renderer-scope'),gpuCPU:sum(p=>p.role==='helper-GPU'),sclangCPU:sum(p=>p.role==='sclang'),scProcessCPU:sum(p=>p.role==='scsynth'),rssMiB:processes.filter(p=>!['sclang','scsynth'].includes(p.role)).reduce((s,p)=>s+p.rssMiB,0),scAudioCPU:statuses.reduce((s,a)=>s+a[5],0)/statuses.length,scPeakCPU:Math.max(...statuses.map(a=>a[6])),packetHz:(state.packets-stateBefore.packets)/span,waveHz:(state.wavePaints-stateBefore.wavePaints)/span,meterHz:(state.meterUpdates-stateBefore.meterUpdates)/span,widgetPaintsHz:(state.widgetPaints-stateBefore.widgetPaints)/span,metadataHz:(state.labels-stateBefore.labels)/span,meterAppendMsPerSecond:(state.meterAppendMs-stateBefore.meterAppendMs)/span,meterDrawMsPerSecond:(state.meterDrawMs-stateBefore.meterDrawMs)/span,waveMsPerSecond:(state.waveMs-stateBefore.waveMs)/span,gapFrames:state.gapFrames-stateBefore.gapFrames,sourceAdvances:state.sourceEnd>stateBefore.sourceEnd,pixelsChanged:imageBefore?imageBefore!==imageAfter:null,canvasBytes:state.canvasBytes,state,broker:signalCaptures.diagnostics()};
   const meterFrames=state.meterTimes.filter(v=>v.at>stateBefore.now&&v.frame!==null),waveFrames=new Set(state.waveTimes.filter(v=>v.at>stateBefore.now).map(v=>v.frame));result.sharedFrameFraction=meterFrames.length?meterFrames.filter(v=>waveFrames.has(v.frame)).length/meterFrames.length:null;
   assertOnlyScope();assert.equal(state.node,'undefined');
   if(c.rate!=='idle'){assert.equal(state.connection,'Live');assert.ok(result.sourceAdvances);assert.ok(result.packetHz>(c.rate==='audio'?20:10));assert.equal(signalCaptures.diagnostics().sources.length,1);}
   if(c.view==='waves'||c.view==='both'){assert.ok(result.waveHz>(c.rate==='audio'?15:10));assert.ok(state.waveWidth===620&&state.waveHeight===240);}
   else assert.ok(result.waveHz<1);
   if(c.view==='meters'||c.view==='both'){assert.ok(result.meterHz>=meterHz-2&&result.meterHz<=meterHz+1,`Expected ${meterHz} Hz, got ${result.meterHz}`);assert.ok(result.widgetPaintsHz>1);assert.ok(result.pixelsChanged);}
   else assert.equal(result.meterHz,0);
   if(c.view==='waves')assert.ok(result.pixelsChanged);
   phases.push(result);await writeFile(output,JSON.stringify({complete:false,phases,session,seconds,repeats,machine:os.cpus()[0].model,logicalCores:os.cpus().length,versions:{electron:process.versions.electron,node:process.versions.node},plot:{width:620,height:240,dpr:1},widget:{width:88,height:38,dpr:1,hz:meterHz,schedule:meterSchedule},gpuFeatures:app.getGPUFeatureStatus(),display:screen.getPrimaryDisplay().workAreaSize},null,2));
   console.log('METER_COST_COST '+JSON.stringify({rate:c.rate,channels:c.channels,view:c.view,repeat,total:result.electronCPU,renderer:result.rendererCPU,gpu:result.gpuCPU,meterHz:result.meterHz,drawMsPerSecond:result.meterDrawMsPerSecond}));
  }
  await writeFile('/private/tmp/awb-meter-cost-layout.png',(await win.webContents.capturePage()).toPNG());await closeToolView(launched.viewID);await until(()=>!registry.list().length&&signalCaptures.diagnostics().sources.length===0&&!signalCaptures.diagnostics().polling,'last capture release');const afterSC=await osc.request('/status',[],'/status.reply');assert.equal(afterSC[2],beforeSC[2]);assert.equal(afterSC[3],beforeSC[3]);
  const report=JSON.parse(await (await import('node:fs/promises')).readFile(output,'utf8'));Object.assign(report,{complete:true,cleanup:true,hostSurvives:nativeScHost.snapshot().state==='running',unrelatedTools:0,beforeSC,afterSC});await writeFile(output,JSON.stringify(report,null,2));console.log('METER_COST_COMPLETE '+phases.length);
 }finally{if(registry.get(launched.viewID))await closeToolView(launched.viewID);osc.close();}
}
