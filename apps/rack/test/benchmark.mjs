// Isolated, sequential renderer comparison. Run with Electron from the repo root.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {startRuntime} from '../runtime/shell-runtime.mjs';
import {makeLayout,descriptors,transitionWindow} from '../src/model.mjs';
const {app,BrowserWindow,screen}=createRequire(import.meta.url)('electron');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const smoke=process.argv.includes('--smoke'),trials=smoke?1:3;
const out=path.resolve('apps/rack/test/artifacts/benchmark');
app.setPath('userData',path.join(os.tmpdir(),`rack-benchmark-electron-${process.pid}`));
app.on('window-all-closed',()=>{});
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
function trace(document){
 const ids=descriptors(document.config).map(d=>d.id),values=Object.fromEntries(ids.map(id=>[id,0]));
 const workloads=[];
 const add=(name,duration,events)=>workloads.push({name,duration,events});
 add('idle',smoke?500:3000,[]);
 let events=[];const singleDuration=smoke?700:6000;
 for(let t=0;t<=singleDuration;t+=16){const v=Math.round((Math.sin(t/600)+1)*63.5);if(values[ids[0]]!==v){values[ids[0]]=v;events.push({at:t,changes:[[ids[0],v]]});}}
 add('single-control',singleDuration,events);
 events=[];let offset=0;
 for(const s of document.snapshots.slice(0,4)){
  const duration=smoke?250:s.duration,items=Object.entries(s.targets).map(([id,target])=>({id,from:values[id],to:target.value,...transitionWindow(duration,target)}));
  for(let t=0;t<=duration+31;t+=32){const now=Math.min(t,duration),changes=[];for(const i of items){if(now<i.delay)continue;const p=i.length?Math.max(0,Math.min(1,(now-i.delay)/i.length)):1;const v=Math.round(i.from+(i.to-i.from)*p);if(v!==values[i.id]){values[i.id]=v;changes.push([i.id,v]);}}if(changes.length)events.push({at:offset+now,changes});}
  offset+=duration+250;
 }
 add('INIT-open-attune-arise',offset,events);
 events=[];const stressDuration=smoke?700:6000;
 for(let t=0;t<=stressDuration;t+=32){const changes=[];for(let i=0;i<ids.length;i++){const v=Math.round((Math.sin(t/500+i*.05)+1)*63.5);if(v!==values[ids[i]]){values[ids[i]]=v;changes.push([ids[i],v]);}}events.push({at:t,changes});}
 add('all-354-controls',stressDuration,events);
 return {ids,workloads,finalValues:values};
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
 const ids=${JSON.stringify(ids)};window.benchMode=${JSON.stringify(mode)};
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
 const work=${JSON.stringify(workload)};const frames=[],lateness=[],apply=[],longTasks=[];let stopped=false,last,raf;
 const frame=t=>{if(last!==undefined)frames.push(t-last);last=t;if(!stopped)raf=requestAnimationFrame(frame);};
 const observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));observer.observe({entryTypes:['longtask']});
 if(window.rackDebug)rackDebug.reset();benchCounts.draws=0;
 const started=performance.now();raf=requestAnimationFrame(frame);let changes=0;
 for(const event of work.events){const delay=started+event.at-performance.now();if(delay>0)await new Promise(r=>setTimeout(r,delay));lateness.push(Math.max(0,performance.now()-started-event.at));const t=performance.now();for(const [id,v]of event.changes){benchSet(id,v);changes++;}apply.push(performance.now()-t);}
 const remainder=started+work.duration+100-performance.now();if(remainder>0)await new Promise(r=>setTimeout(r,remainder));stopped=true;cancelAnimationFrame(raf);observer.disconnect();
 const expected=new Map(work.events.flatMap(e=>e.changes)),mismatches=[...expected].filter(([id,v])=>benchGet(id)!==v);
 const p=(a,q)=>{a=[...a].sort((a,b)=>a-b);return a.length?a[Math.min(a.length-1,Math.floor(a.length*q))]:0;};
 return {elapsedMs:performance.now()-started,updates:changes,batches:work.events.length,frameCount:frames.length,frameMedianMs:p(frames,.5),frameP95Ms:p(frames,.95),frameMaxMs:p(frames,1),framesOver25ms:frames.filter(v=>v>25).length,applyTotalMs:apply.reduce((a,b)=>a+b,0),applyP95Ms:p(apply,.95),scheduleP95Ms:p(lateness,.95),longTasks,mismatches,oscDraws:benchCounts.draws,svg:window.rackDebug?structuredClone(rackDebug.svgStats):null,canvas:window.rackDebug?structuredClone(rackDebug.canvasStats):null,appRenders:window.rackDebug?rackDebug.appStats.renders:null,heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null};
})()`;}
app.whenReady().then(async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'rack-benchmark-'));let osc,win,runtime;let exitCode=0;
 const results={method:'Same Electron engine; actual installed OSC client; isolated generated send-only session; no OSC/MIDI output; deterministic value trace applied in renderer; one view mounted per trial.',smoke,trials,engine:process.versions,hardware:execFileSync('/usr/sbin/sysctl',['-n','hw.model'],{encoding:'utf8'}).trim(),display:screen.getPrimaryDisplay(),runs:[]};
 try{
  await mkdir(out,{recursive:true});
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
   for(const work of common.workloads){
    const pid=win.webContents.getOSProcessId(),before=app.getAppMetrics();
    const result=await js(replay(work));const after=app.getAppMetrics();
    const cpu=after.map(p=>{const b=before.find(b=>b.pid===p.pid);return {pid:p.pid,type:p.type,isRenderer:p.pid===pid,cpuSeconds:b?Math.max(0,(p.cpu.cumulativeCPUUsage??0)-(b.cpu.cumulativeCPUUsage??0)):null,workingSetKB:p.memory?.workingSetSize};});
    if(result.mismatches.length)throw Error('Final value mismatch: '+JSON.stringify(result.mismatches));
    const run={trial:trial+1,mode,workload:work.name,topology,...result,cpu,errors};results.runs.push(run);
    await writeFile(path.join(out,smoke?'smoke.json':'results.json'),JSON.stringify(results,null,2));
    console.log(`BENCH_RESULT ${JSON.stringify({trial:trial+1,mode,workload:work.name,updates:result.updates,p95Frame:result.frameP95Ms,applyMs:result.applyTotalMs,cpu:cpu.filter(p=>p.isRenderer||p.type==='GPU').map(p=>({type:p.type,seconds:p.cpuSeconds}))})}`);
   }
   await writeFile(path.join(out,`${mode}-${trial+1}.png`),(await win.webContents.capturePage()).toPNG());
   win.destroy();win=null;await runtime?.stop();runtime=null;await wait(400);
  }
  console.log('RACK_BENCHMARK_PASS');
 }catch(e){console.error(e);exitCode=1;}finally{win?.destroy();await runtime?.stop();osc?.kill('SIGTERM');await rm(dir,{recursive:true,force:true});app.exit(exitCode);}
}).catch(e=>{console.error(e);app.exit(1);});
