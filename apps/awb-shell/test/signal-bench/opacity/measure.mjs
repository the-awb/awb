import {app,screen} from 'electron';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {writeFile,readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import os from 'node:os';
import assert from 'node:assert/strict';
import {OSC} from '../../../src/scBusOsc.mjs';
const exec=promisify(execFile),cpuSeconds=s=>s.split(':').map(Number).reduce((v,n)=>v*60+n,0);
async function usage(pids){const {stdout}=await exec('/bin/ps',['-p',pids.join(','),'-o','pid=','-o','time=','-o','rss=']);return Object.fromEntries(stdout.trim().split('\n').filter(Boolean).map(l=>{const [pid,time,rss]=l.trim().split(/\s+/);return [pid,{cpu:cpuSeconds(time),rss:Number(rss)/1024}];}));}
async function until(fn,label,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await delay(30);}throw new Error('Opacity benchmark timeout: '+label);}
export async function measure({launchFromHome,closeToolView,windows,registry,signalCaptures,nativeScHost,homeWindow,renderExecutorWindow,session}){
 const output=process.env.METER_COST_OUTPUT,smoke=process.argv.includes('--smoke'),seconds=smoke?2:6,repeats=smoke?1:2,osc=new OSC(session.port),beforeSC=await osc.request('/status',[],'/status.reply'),phases=[];
 const launched=await launchFromHome({toolID:'scope',profileID:'hosted',launchOrigin:'desktop'});assert.equal(launched.status,'accepted');await until(()=>registry.get(launched.viewID)?.lifecycle==='ready','Scope opens');
 const win=windows.get(launched.viewID);win.setSize(1100,900);win.show();win.focus();win.webContents.setBackgroundThrottling(false);const evaluate=code=>win.webContents.executeJavaScript(code),diag=()=>evaluate('window.__meterCost()');
 await until(()=>evaluate("!document.querySelector('#listen').disabled"),'socket');await evaluate("const option=document.createElement('option');option.value='capture';option.textContent='Benchmark capture only';document.querySelector('#displayMode').append(option);document.querySelector('#paintRate').value='30';document.querySelector('#paintRate').dispatchEvent(new Event('change'));void 0;");
 const cases=[{rate:'idle',channels:0,view:'idle'},...['audio','control'].flatMap(rate=>[16,1].flatMap(channels=>[
  ...(['capture',...(channels===16?['waves','meters']:[])].map(view=>({rate,channels,view}))),
  ...(channels===16?[24,48,96]:[48]).flatMap(size=>[8,15].map(hz=>({rate,channels,view:'opacity',size,hz}))),
  ...(channels===16?[{rate,channels,view:'wave-opacity',size:24,hz:15}]:[])
 ]))];let previous={};
 const onlyScope=()=>{assert.equal(registry.list().length,1);assert.equal(registry.list()[0].toolID,'scope');};
 const image=async c=>{
  if(c.view.includes('opacity')){const r=(await diag()).faces[0].rect;return (await win.webContents.capturePage({x:Math.floor(r.x),y:Math.floor(r.y),width:Math.ceil(r.width),height:Math.ceil(r.height)})).toPNG().toString('base64');}
  if(c.view==='waves')return evaluate("document.querySelector('#scope').toDataURL()");
  if(c.view==='meters')return evaluate("document.querySelector('#meters canvas').toDataURL()");
  return null;
 };
 try{
  for(let repeat=1;repeat<=repeats;repeat++)for(const c of repeat%2?cases:[...cases].reverse()){
   console.log('OPACITY_PHASE '+JSON.stringify({...c,repeat}));onlyScope();
   if(c.rate==='idle'){await evaluate("document.querySelector('#stop').click();void 0;");await until(()=>signalCaptures.diagnostics().sources.length===0,'idle cleanup');}
   else{
    if(previous.rate!==c.rate||previous.channels!==c.channels){await evaluate(`document.querySelector('#rate').value='${c.rate}';document.querySelector('#bus').value='32';document.querySelector('#channelCount').value='${c.channels}';document.querySelector('#busForm').requestSubmit();void 0;`);await until(async()=>{const d=await diag();if(d.error)throw new Error(d.error);return d.channels===c.channels&&d.rate===c.rate&&d.sourceEnd>0;},'new range');}
    await evaluate(`document.querySelector('#opacitySize').value='${c.size||48}';document.querySelector('#opacityRate').value='${c.hz||15}';document.querySelector('#opacityRate').dispatchEvent(new Event('change'));document.querySelector('#displayMode').value='${c.view}';document.querySelector('#displayMode').dispatchEvent(new Event('change'));void 0;`);
   }
   previous=c;await delay(smoke?500:1200);
   const layout=await evaluate(`({footer:document.querySelector('footer').getBoundingClientRect().bottom,height:innerHeight,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight})`);assert.ok(layout.footer<=layout.height&&layout.scrollWidth<=layout.width&&layout.scrollHeight<=layout.height,'Whole UI visible '+JSON.stringify(layout));
   const roles=new Map([[process.pid,'main'],[nativeScHost.snapshot().processID,'sclang'],[session.scPID,'scsynth'],[win.webContents.getOSProcessId(),'renderer-scope'],[homeWindow.webContents.getOSProcessId(),'renderer-home'],[renderExecutorWindow.webContents.getOSProcessId(),'renderer-worker']]);for(const m of app.getAppMetrics())if(!roles.has(m.pid))roles.set(m.pid,m.type==='Tab'?'renderer-other':'helper-'+m.type);
   const imageBefore=await image(c),stateBefore=await diag(),before=await usage([...roles.keys()]),start=performance.now(),statuses=[];
   for(let i=0;i<seconds*4;i++){statuses.push(await osc.request('/status',[],'/status.reply'));await delay(250);}
   const duration=(performance.now()-start)/1000,after=await usage([...roles.keys()]),state=await diag(),span=(state.now-stateBefore.now)/1000;
   let imageAfter=await image(c),pixelProbeExtraMs=0;
   // Periodic values can match at both endpoints; probe another actual rendered frame.
   // These extra observations occur after CPU counters and duration are captured.
   while(imageBefore&&imageBefore===imageAfter&&pixelProbeExtraMs<600){await delay(100);pixelProbeExtraMs+=100;imageAfter=await image(c);}
   const processes=[...roles].map(([pid,role])=>{assert.ok(before[pid]&&after[pid],'PID survived '+role);return {pid,role,corePercent:100*(after[pid].cpu-before[pid].cpu)/duration,rssMiB:after[pid].rss};}),sum=fn=>processes.filter(fn).reduce((s,p)=>s+p.corePercent,0);
   const result={...c,repeat,seconds:duration,layout,processes,electronCPU:sum(p=>!['sclang','scsynth'].includes(p.role)),rendererCPU:sum(p=>p.role==='renderer-scope'),gpuCPU:sum(p=>p.role==='helper-GPU'),mainCPU:sum(p=>p.role==='main'),rssMiB:processes.filter(p=>!['sclang','scsynth'].includes(p.role)).reduce((s,p)=>s+p.rssMiB,0),scAudioCPU:statuses.reduce((s,a)=>s+a[5],0)/statuses.length,packetHz:(state.packets-stateBefore.packets)/span,waveHz:(state.wavePaints-stateBefore.wavePaints)/span,meterHz:(state.meterUpdates-stateBefore.meterUpdates)/span,opacityHz:(state.opacityUpdates-stateBefore.opacityUpdates)/span,opacityWritesHz:(state.opacityWrites-stateBefore.opacityWrites)/span,opacityAppendMsPerSecond:(state.opacityAppendMs-stateBefore.opacityAppendMs)/span,opacityDrawMsPerSecond:(state.opacityDrawMs-stateBefore.opacityDrawMs)/span,meterDrawMsPerSecond:(state.meterDrawMs-stateBefore.meterDrawMs)/span,metadataHz:(state.labels-stateBefore.labels)/span,pixelProbeExtraMs,pixelsChanged:imageBefore?imageBefore!==imageAfter:null,sourceAdvances:state.sourceEnd>stateBefore.sourceEnd,faces:state.faces,broker:signalCaptures.diagnostics()};
   const waveFrames=new Set(state.waveTimes.filter(v=>v.at>stateBefore.now).map(v=>v.frame)),opacityFrames=state.opacityTimes.filter(v=>v.at>stateBefore.now);result.sharedFrameFraction=opacityFrames.length?opacityFrames.filter(v=>waveFrames.has(v.frame)).length/opacityFrames.length:null;
   onlyScope();assert.equal(state.node,'undefined');
   if(c.rate!=='idle'){assert.equal(state.connection,'Live');assert.ok(result.sourceAdvances);assert.ok(result.packetHz>(c.rate==='audio'?20:10));assert.equal(signalCaptures.diagnostics().sources.length,1);}
   if(c.view==='waves'||c.view==='wave-opacity')assert.ok(result.waveHz>(c.rate==='audio'?15:10));else assert.ok(result.waveHz<1);
   if(c.view==='meters')assert.ok(result.meterHz>13&&result.meterHz<16);else assert.equal(result.meterHz,0);
   if(c.view.includes('opacity')){assert.ok(result.opacityHz>=c.hz-1.5&&result.opacityHz<=c.hz+1);assert.ok(result.opacityWritesHz>c.channels*2);assert.equal(state.faces.length,c.channels);assert.ok(state.faces.every(f=>f.size===c.size&&f.rect.width===c.size&&f.rect.height===c.size));assert.ok(result.pixelsChanged);assert.ok(state.faces.some((f,i)=>f.value!==stateBefore.faces[i].value));}else assert.equal(result.opacityHz,0);
   if(c.view==='waves'||c.view==='meters')assert.ok(result.pixelsChanged);
   phases.push(result);await writeFile(output,JSON.stringify({complete:false,phases,session,seconds,repeats,machine:os.cpus()[0].model,logicalCores:os.cpus().length,versions:{electron:process.versions.electron,node:process.versions.node},window:{width:1100,height:900},plot:{width:620,height:240,dpr:1},opacity:{sizes:[24,48,96],rates:[8,15],transitions:false,willChange:'opacity',minimum:.12,audioMapping:'RMS -60..0 dBFS',controlMapping:'signed -1..+1'},gpuFeatures:app.getGPUFeatureStatus(),display:screen.getPrimaryDisplay().workAreaSize},null,2));
   console.log('OPACITY_COST '+JSON.stringify({rate:c.rate,channels:c.channels,view:c.view,size:c.size,hz:c.hz,repeat,total:result.electronCPU,renderer:result.rendererCPU,gpu:result.gpuCPU,updates:result.opacityHz,jsMs:result.opacityDrawMsPerSecond}));
  }
  await closeToolView(launched.viewID);await until(()=>!registry.list().length&&signalCaptures.diagnostics().sources.length===0&&!signalCaptures.diagnostics().polling,'release');const afterSC=await osc.request('/status',[],'/status.reply');assert.equal(afterSC[2],beforeSC[2]);assert.equal(afterSC[3],beforeSC[3]);const report=JSON.parse(await readFile(output,'utf8'));Object.assign(report,{complete:true,cleanup:true,hostSurvives:nativeScHost.snapshot().state==='running',unrelatedTools:0,beforeSC,afterSC});await writeFile(output,JSON.stringify(report,null,2));console.log('OPACITY_COMPLETE '+phases.length);
 }finally{if(registry.get(launched.viewID))await closeToolView(launched.viewID);osc.close();}
}
