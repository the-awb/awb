// Isolated, sequential renderer comparison. Run with Electron from the repo root.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {startRuntime} from '../runtime/shell-runtime.mjs';
import {makeLayout,descriptors} from '../src/model.mjs';
const {app,BrowserWindow,screen}=createRequire(import.meta.url)('electron');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const smoke=process.argv.includes('--smoke'),trials=smoke?1:3,resume=process.argv.includes('--resume-svg-third');
const out=path.resolve('apps/rack/test/artifacts/benchmark-scaling');
app.setPath('userData',path.join(os.tmpdir(),`rack-benchmark-electron-${process.pid}`));
app.on('window-all-closed',()=>{});
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
function motionTrace(ids,count,duration){
 const active=ids.slice(0,count),events=[];
 for(let frame=0,at=0;at<duration;frame++,at+=32){
  const changes=active.map((id,k)=>{const p=(frame+1+k*7)%62;return [id,1+4*(p<=31?p:62-p)];});
  events.push({at,changes});
 }
 return {name:`moving-${count}`,count,cadenceMs:32,duration,events};
}
function trace(document){
 const ds=descriptors(document.config),byInstrument=document.config.instruments.map(i=>ds.filter(d=>d.instrument===i.id));
 // Spread each prefix across channel strips. Up to 100 controls are all send knobs;
 // the maximum also includes the 18 shared bus faders. All 354 stay mounted.
 const ids=[];for(let row=0;row<24;row++)for(const channel of byInstrument)if(channel[row])ids.push(channel[row].id);
 ids.push(...ds.filter(d=>d.instrument==='global').map(d=>d.id));
 const counts=smoke?[1,25,354]:[1,5,10,25,50,100,354];
 const workloads=[{name:'idle',count:0,duration:smoke?300:2000,events:[]},...counts.map(n=>motionTrace(ids,n,smoke?700:6000))];
 for(const w of workloads){if(w.count){const state=new Map(ids.map(id=>[id,0]));for(const e of w.events){if(e.changes.length!==w.count)throw Error('Wrong batch size');for(const [id,v]of e.changes){if(state.get(id)===v)throw Error('A selected control did not change');state.set(id,v);}}}}
 return {ids,counts,cadenceMs:32,durationMs:smoke?700:6000,selection:'round-robin channels; fixed visible 354-control rack',workloads};
}
function oscSession(document){
 const layout=makeLayout(document.config);
 const text=(id,label,x,y,width,height)=>({type:'text',id,top:y,left:x,width,height,value:label,align:'center',colorFill:'none',css:'font-size:8px;',address:'',target:'',interaction:false});
 const widgets=layout.racks.map(r=>({type:'panel',id:`rack_${r.id}`,top:r.y,left:r.x,width:r.width,height:r.height,padding:0,innerPadding:false,scroll:false,contain:true,layout:'default',colorBg:'none',widgets:[
  ...r.headers.map((h,i)=>text(`header_${r.id}_${i}`,h.text,h.x-r.x,h.y-r.y,h.width,h.height)),
  ...r.rows.map((h,i)=>text(`row_${r.id}_${i}`,h.text,h.x-r.x,h.y-r.y,h.width,h.height)),
  ...r.cells.map(c=>({type:c.descriptor.region.widget,id:c.descriptor.id,top:c.y-r.y+(c.large?0:8),left:c.x-r.x,width:c.width,height:c.large?88:24,padding:0,range:{min:0,max:127},steps:128,decimals:0,design:c.large?'default':'line',angle:270,mode:'vertical',pips:false,default:0,value:0,address:'',target:'',ignoreDefaults:true}))
 ]}));
 return {createdWith:'Open Stage Control',version:'1.16.2',type:'session',content:{type:'root',id:'root',hideMenu:true,innerPadding:false,padding:0,layout:'default',width:'100%',height:'100%',scroll:true,widgets}};
}
const prepare=(mode,ids)=>`(()=>{
 const ids=${JSON.stringify(ids)};window.benchMode=${JSON.stringify(mode)};window.benchIDs=ids;
 if(benchMode==='osc'){
  const widgets=new Map([...document.querySelectorAll('[data-widget]')].map(el=>el._widget_instance).filter(Boolean).map(w=>[w.getProp('id'),w]));
  window.benchWidgets=ids.map(id=>{const w=widgets.get(id);if(!w)throw Error('missing OSC control '+id);return w;});
  window.benchSet=(id,v)=>widgets.get(id).setValue(v,{sync:true,send:false});
  window.benchGet=id=>widgets.get(id).getValue();
 }else{window.benchSet=(id,v)=>rackDebug.store.set(id,v,'remote');window.benchGet=id=>rackDebug.store.get(id);}
 window.benchCounts={draws:0};if(benchMode==='osc')for(const w of benchWidgets){const draw=w.draw.bind(w);w.draw=(...args)=>{benchCounts.draws++;return draw(...args);};}
 for(const id of ids)benchSet(id,0);
 return {controls:ids.length,canvases:document.querySelectorAll('canvas').length,svgControls:document.querySelectorAll('[data-control]').length,dpr:devicePixelRatio,canvasScaling:window.CANVAS_SCALING||1,viewport:[innerWidth,innerHeight],domNodes:document.querySelectorAll('*').length};
})()`;
function replay(workload){return `(async()=>{
 const work=window.benchWork;const frames=[],lateness=[],apply=[],longTasks=[];let stopped=false,last,raf;
 const frame=t=>{if(last!==undefined)frames.push(t-last);last=t;if(!stopped)raf=requestAnimationFrame(frame);};
 const observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));observer.observe({entryTypes:['longtask']});
 if(window.rackDebug)rackDebug.reset();benchCounts.draws=0;
 const storeChangesBefore=window.rackDebug?.store.stats.changes;const started=performance.now();raf=requestAnimationFrame(frame);let changes=0;
 for(const event of work.events){const delay=started+event.at-performance.now();if(delay>0)await new Promise(r=>setTimeout(r,delay));lateness.push(Math.max(0,performance.now()-started-event.at));const t=performance.now();for(const [id,v]of event.changes){benchSet(id,v);changes++;}apply.push(performance.now()-t);}
 const remainder=started+work.duration+100-performance.now();if(remainder>0)await new Promise(r=>setTimeout(r,remainder));stopped=true;cancelAnimationFrame(raf);observer.disconnect();
 const expected=new Map(benchIDs.map(id=>[id,0]));for(const e of work.events)for(const [id,v]of e.changes)expected.set(id,v);const mismatches=[...expected].filter(([id,v])=>benchGet(id)!==v);
 const p=(a,q)=>{a=[...a].sort((a,b)=>a-b);return a.length?a[Math.min(a.length-1,Math.floor(a.length*q))]:0;};
 return {elapsedMs:performance.now()-started,updates:changes,actualValueChanges:window.rackDebug?rackDebug.store.stats.changes-storeChangesBefore:null,batches:work.events.length,frameCount:frames.length,frameMedianMs:p(frames,.5),frameP95Ms:p(frames,.95),frameMaxMs:p(frames,1),framesOver25ms:frames.filter(v=>v>25).length,applyTotalMs:apply.reduce((a,b)=>a+b,0),applyP95Ms:p(apply,.95),scheduleP95Ms:p(lateness,.95),longTasks,mismatches,oscDraws:benchCounts.draws,svg:window.rackDebug?structuredClone(rackDebug.svgStats):null,canvas:window.rackDebug?structuredClone(rackDebug.canvasStats):null,appRenders:window.rackDebug?rackDebug.appStats.renders:null,heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null};
})()`;}
app.whenReady().then(async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'rack-benchmark-'));let osc,win,runtime;let exitCode=0;
 const results={method:'Same Electron engine; actual installed OSC client; isolated generated send-only session; no OSC/MIDI output; deterministic value trace applied in renderer; one view mounted per trial.',smoke,trials,controlled:{cadenceMs:32,durationMs:smoke?700:6000,alwaysChanging:true,allControlsMounted:354},engine:process.versions,hardware:execFileSync('/usr/sbin/sysctl',['-n','hw.model'],{encoding:'utf8'}).trim(),display:screen.getPrimaryDisplay(),runs:[]};
 try{
  await mkdir(out,{recursive:true});
  if(resume){const previous=JSON.parse(await readFile(path.join(out,'results.json'),'utf8'));if(previous.runs.length!==71)throw Error('Resume requires the 71 saved runs');Object.assign(results,previous);results.runs=previous.runs.filter(r=>!(r.trial===3&&r.mode==='svg'));results.audit=[{reason:'Reran SVG trial 3 after removing the invalid requirement of exactly one React render per value change. Actual store changes and final values are verified independently; rendering may coalesce or retry.',previousRunsSaved:'pre-validation-fix-results.json'}];}
  const document=JSON.parse(await readFile(new URL('../fixtures/live-set.rack.json',import.meta.url),'utf8'));document.config.output.mode='off';document.values={};
  const common=trace(document);await writeFile(path.join(out,'trace.json'),JSON.stringify(common));
  await writeFile(path.join(dir,'osc-session.json'),JSON.stringify(oscSession(document)));
  await writeFile(path.join(dir,'block-output.js'),'module.exports={oscOutFilter:()=>null};');
  const port=await freePort(),oscPort=await freePort();let log='';
  osc=spawn('/Users/willy/.nvm/versions/node/v22.23.2/bin/node',['/Applications/open-stage-control.app/Contents/Resources/app/index.js','--no-gui','--port',String(port),'--osc-port',String(oscPort),'--cache-dir',dir,'--load',path.join(dir,'osc-session.json'),'--custom-module',path.join(dir,'block-output.js'),'--read-only'],{stdio:['ignore','pipe','pipe']});
  osc.stdout.on('data',b=>{log+=b;});osc.stderr.on('data',b=>{log+=b;});
  for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${port}`)).ok)break;}catch{}if(osc.exitCode!==null)throw Error('OSC exited: '+log);await wait(100);if(i===99)throw Error('OSC startup timeout: '+log);}
  results.oscLog=log;
  const order=[['svg','canvas','osc'],['osc','svg','canvas'],['canvas','osc','svg']];
  for(let trial=0;trial<trials;trial++)for(const mode of order[trial]){
   if(resume&&(trial!==2||mode!=='svg'))continue;
   console.log(`BENCH_START trial=${trial+1} view=${mode}`);
   if(mode!=='osc')runtime=await startRuntime({runtimeDirectory:path.join(dir,`${mode}-${trial}`,'view'),seedDocument:document});
   win=new BrowserWindow({width:1400,height:1040,show:false,webPreferences:{backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});
   const errors=[];win.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message);});
   await win.loadURL(mode==='osc'?`http://127.0.0.1:${port}`:runtime.url);win.webContents.setZoomFactor(.8);win.showInactive();
   const js=s=>win.webContents.executeJavaScript(s,true);
   for(let i=0;i<200;i++){const ready=await js(mode==='osc'?"[...document.querySelectorAll('[data-widget]')].filter(e=>e._widget_instance&&e._widget_instance.getProp('id')==='in0/fx/splut').length===1":"!!(window.rackDebug&&document.querySelector('.connected'))");if(ready)break;await wait(50);if(i===199)throw Error(`View ${mode} did not initialize: ${errors.join(';')}`);}
   if(mode!=='osc')await js(`([...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(mode==='svg'?'HTML / SVG':'Three.js canvas')})).click()`);
   await wait(1200);const topology=await js(prepare(mode,common.ids));await wait(300);
   // Ensure each trial has only the requested renderer.
   if(mode==='svg'&&topology.canvases!==0||mode==='canvas'&&(topology.canvases!==1||topology.svgControls!==0)||mode==='osc'&&topology.canvases!==354)throw Error('Unexpected topology '+JSON.stringify(topology));
   const motion=common.workloads.filter(w=>w.count);const ordered=trial===1?[...motion].reverse():trial===2?[...motion.filter((_,i)=>i%2===1),...motion.filter((_,i)=>i%2===0)]:motion;
   for(const work of [common.workloads[0],...ordered]){
    await js('for(const id of benchIDs)benchSet(id,0)');await wait(250);
    if(work.count){
     const warm=motionTrace(common.ids,work.count,smoke?200:700);
     await js(`window.benchWork=${JSON.stringify(warm)}`);await js(replay(warm));
    }
    await js('for(const id of benchIDs)benchSet(id,0)');await wait(250);
    await js(`window.benchWork=${JSON.stringify(work)}`);
    const pid=win.webContents.getOSProcessId(),before=app.getAppMetrics();
    const result=await js(replay(work));const after=app.getAppMetrics();
    const cpu=after.map(p=>{const b=before.find(b=>b.pid===p.pid);return {pid:p.pid,type:p.type,isRenderer:p.pid===pid,cpuSeconds:b?Math.max(0,(p.cpu.cumulativeCPUUsage??0)-(b.cpu.cumulativeCPUUsage??0)):null,workingSetKB:p.memory?.workingSetSize};});
    if(mode!=='osc'&&result.actualValueChanges!==result.updates)throw Error('Actual store value-change count mismatch');if(mode==='svg'&&work.count&&(result.svg.valueUpdates??result.svg.controlRenders)===0)throw Error('SVG did not paint');if(mode==='canvas'&&result.canvas.attributeUpdates!==result.updates)throw Error('Canvas attribute update count mismatch');if(mode==='osc'&&work.count&&result.oscDraws===0)throw Error('OSC did not draw');
    if(result.mismatches.length)throw Error('Final value mismatch: '+JSON.stringify(result.mismatches));
    const run={trial:trial+1,mode,workload:work.name,movingControls:work.count,cadenceMs:work.cadenceMs??32,requestedDurationMs:work.duration,topology,...result,cpu,errors};results.runs.push(run);
    await writeFile(path.join(out,smoke?'smoke.json':'results.json'),JSON.stringify(results,null,2));
    console.log(`BENCH_RESULT ${JSON.stringify({trial:trial+1,mode,workload:work.name,updates:result.updates,actualValueChanges:result.actualValueChanges,svgRenders:result.svg?.controlRenders,p95Frame:result.frameP95Ms,applyMs:result.applyTotalMs,cpu:cpu.filter(p=>p.isRenderer||p.type==='GPU').map(p=>({type:p.type,seconds:p.cpuSeconds}))})}`);
   }
   await writeFile(path.join(out,`${mode}-${trial+1}.png`),(await win.webContents.capturePage()).toPNG());
   win.destroy();win=null;await runtime?.stop();runtime=null;await wait(400);
  }
  console.log('RACK_SCALING_BENCHMARK_PASS');
 }catch(e){console.error(e);exitCode=1;}finally{win?.destroy();await runtime?.stop();osc?.kill('SIGTERM');await rm(dir,{recursive:true,force:true});app.exit(exitCode);}
}).catch(e=>{console.error(e);app.exit(1);});
