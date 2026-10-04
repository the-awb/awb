// Isolated before/after HTML-SVG comparison; builds both variants in a temporary directory.
import {createRequire} from 'node:module';import {readFile,writeFile,mkdir,mkdtemp,rm,cp,copyFile,symlink} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {trace,prepare,replay,motionTrace} from './benchmark-react-workload.mjs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const {app,BrowserWindow,screen}=createRequire(import.meta.url)('electron');
const testRoot=path.dirname(new URL(import.meta.url).pathname),rackRoot=path.dirname(testRoot),out=path.join(testRoot,'artifacts/react-investigation');let root;
const profile=process.argv.includes('--profile'),screening=process.argv.includes('--screen');
const variants=process.argv.find(a=>a.startsWith('--variants='))?.split('=')[1].split(',')??['baseline','readout'];
const label=process.argv.find(a=>a.startsWith('--label='))?.split('=')[1]??(profile?'profiles':screening?'screen':'comparison');
const trials=profile||screening?1:3,counts=profile||screening?[1,100,354]:[1,5,10,25,50,100,354];
const wait=ms=>new Promise(r=>setTimeout(r,ms));app.setPath('userData',path.join(os.tmpdir(),`rack-react-${process.pid}`));app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'rack-react-runtime-'));root=path.join(dir,'builds');let runtime,win,status=0;
 const results={profile,variants,trials,engine:process.versions,runs:[]};
 try{
  await mkdir(out,{recursive:true});await mkdir(root,{recursive:true});
  const require=createRequire(import.meta.url),modules=path.dirname(path.dirname(require.resolve('react/package.json')));
  await symlink(modules,path.join(root,'node_modules'),'dir');
  results.method={window:[1400,1040],zoom:.8,controls:354,cadenceMs:32,durationMs:6000,warmupMs:700,selection:'round-robin channels; all controls mounted',output:'disabled',cpu:'renderer plus own Chromium GPU-process cumulative CPU; 100 percent is one core',excludes:['browser/main','runtime/server','WindowServer','hardware GPU utilisation'],validation:['actual store changes','all final store values','all final SVG aria values and displayed numeric readouts','renderer errors'],profilerEnabled:profile};
  results.display={bounds:screen.getPrimaryDisplay().bounds,scaleFactor:screen.getPrimaryDisplay().scaleFactor,refreshHz:screen.getPrimaryDisplay().displayFrequency};results.hardware={cpus:os.cpus().length,cpu:os.cpus()[0]?.model,totalMemory:os.totalmem()};results.sources={};
  for(const variant of variants){
   if(!['baseline','readout'].includes(variant))throw Error('Use baseline or readout');
   const destination=path.join(root,'variants',variant,'apps/rack');await mkdir(destination,{recursive:true});
   for(const entry of ['src','runtime','fixtures','index.html','package.json','vite.config.mjs'])await cp(path.join(rackRoot,entry),path.join(destination,entry),{recursive:true});
   if(variant==='baseline')for(const f of ['SvgRack.jsx','main.jsx','style.css'])await copyFile(path.join(testRoot,'fixtures/react-baseline',f),path.join(destination,'src',f));
   execFileSync(process.execPath,[path.join(path.dirname(require.resolve('vite/package.json')),'bin/vite.js'),'build','--configLoader','native'],{cwd:destination,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},stdio:'pipe'});
   results.sources[variant]={};for(const f of ['src/SvgRack.jsx','src/main.jsx','src/style.css','src/model.mjs','fixtures/live-set.rack.json'])results.sources[variant][f]=createHash('sha256').update(await readFile(path.join(destination,f))).digest('hex');
  }
  for(let trial=0;trial<trials;trial++)for(const variant of trial%2?[...variants].reverse():variants){
   const {startRuntime}=await import(path.join(root,'variants',variant,'apps/rack/runtime/shell-runtime.mjs'));
   const document=JSON.parse(await readFile(path.join(root,'variants',variant,'apps/rack/fixtures/live-set.rack.json'),'utf8'));document.config.output.mode='off';document.values={};
   runtime=await startRuntime({runtimeDirectory:path.join(dir,variant+trial,'view'),seedDocument:document});
   win=new BrowserWindow({width:1400,height:1040,show:false,webPreferences:{backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});
   const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
   await win.loadURL(runtime.url);win.webContents.setZoomFactor(.8);win.showInactive();const js=s=>win.webContents.executeJavaScript(s,true);
   for(let i=0;i<200;i++){if(await js('!!(window.rackDebug&&document.querySelector(".connected"))'))break;await wait(50);if(i===199)throw Error('App not ready');}
   await js("[...document.querySelectorAll('button')].find(b=>b.textContent==='HTML / SVG').click()");await wait(1200);
   const common=trace(document),topology=await js(prepare('svg',common.ids));if(topology.canvases||topology.svgControls!==354)throw Error('Wrong renderer topology');await wait(300);
   if(profile){win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Performance.enable');await win.webContents.debugger.sendCommand('Profiler.enable');await win.webContents.debugger.sendCommand('Profiler.setSamplingInterval',{interval:1000});}
   const ordered=trial===1?[...counts].reverse():counts;
   for(const count of ordered){
    console.log(`REACT_START ${variant} trial=${trial+1} count=${count} profile=${profile}`);
    await js('for(const id of benchIDs)benchSet(id,0)');await wait(250);
    const warm=motionTrace(common.ids,count,700);await js(`window.benchWork=${JSON.stringify(warm)}`);await js(replay(warm));
    await js('for(const id of benchIDs)benchSet(id,0)');await wait(250);
    const work=motionTrace(common.ids,count,6000);await js(`window.benchWork=${JSON.stringify(work)}`);
    let perfBefore,traceDone;
    if(profile){perfBefore=await win.webContents.debugger.sendCommand('Performance.getMetrics');await win.webContents.debugger.sendCommand('Profiler.start');traceDone=new Promise(resolve=>{const onMessage=(_e,method,params)=>{if(method==='Tracing.tracingComplete'){win.webContents.debugger.off('message',onMessage);resolve(params.stream);}};win.webContents.debugger.on('message',onMessage);});await win.webContents.debugger.sendCommand('Tracing.start',{categories:'devtools.timeline',transferMode:'ReturnAsStream'});}
    const before=app.getAppMetrics(),pid=win.webContents.getOSProcessId(),result=await js(replay(work)),after=app.getAppMetrics();
    if(result.actualValueChanges!==result.updates||result.mismatches.length||errors.length)throw Error('Value or renderer validation failed '+JSON.stringify({result,errors}));
    if(!(result.svg.valueUpdates??result.svg.controlRenders))throw Error('No SVG value paints');
    const visible=await js(`(()=>benchIDs.flatMap(id=>{const root=[...document.querySelectorAll('[data-control]')].find(el=>el.dataset.control===id);const want=benchGet(id),aria=Number(root.querySelector('svg').getAttribute('aria-valuenow')),readout=Number(root.querySelector('.control-readout')?.textContent??root.querySelector('.control-value').value);return aria===want&&readout===want?[]:[{id,want,aria,readout}];}))()`);if(visible.length)throw Error('Visible endpoint validation failed '+JSON.stringify(visible));
    const cpu=after.map(p=>{const b=before.find(b=>b.pid===p.pid);return {type:p.type,isRenderer:p.pid===pid,cpuSeconds:b?(p.cpu.cumulativeCPUUsage??0)-(b.cpu.cumulativeCPUUsage??0):0};});
    let metrics;
    if(profile){const perfAfter=await win.webContents.debugger.sendCommand('Performance.getMetrics');metrics=Object.fromEntries(perfAfter.metrics.map(m=>[m.name,m.value-(perfBefore.metrics.find(b=>b.name===m.name)?.value??0)]));const cpuProfile=await win.webContents.debugger.sendCommand('Profiler.stop');await writeFile(path.join(out,`${variant}-${count}.cpuprofile`),JSON.stringify(cpuProfile.profile));await win.webContents.debugger.sendCommand('Tracing.end');const handle=await traceDone;let raw='';for(;;){const chunk=await win.webContents.debugger.sendCommand('IO.read',{handle});raw+=chunk.data;if(chunk.eof)break;}await win.webContents.debugger.sendCommand('IO.close',{handle});await writeFile(path.join(out,`${variant}-${count}.trace.json`),raw);}
    const run={variant,trial:trial+1,count,topology,...result,visibleMismatches:visible,cpu,metrics};results.runs.push(run);await writeFile(path.join(out,label+'.json'),JSON.stringify(results,null,2));
    console.log('REACT_RESULT '+JSON.stringify({variant,trial:trial+1,count,cpu:cpu.filter(p=>p.isRenderer||p.type==='GPU').reduce((n,p)=>n+p.cpuSeconds,0)*100/(result.elapsedMs/1000),p95:result.frameP95Ms,metrics:metrics&&{script:metrics.ScriptDuration,layout:metrics.LayoutDuration,style:metrics.RecalcStyleDuration,task:metrics.TaskDuration}}));
   }
   await writeFile(path.join(out,`${variant}-${trial+1}.png`),(await win.webContents.capturePage()).toPNG());win.destroy();win=null;await runtime.stop();runtime=null;
  }
  console.log('REACT_INVESTIGATION_PASS');
 }catch(e){console.error(e);status=1;}finally{win?.destroy();await runtime?.stop();await rm(dir,{recursive:true,force:true});app.exit(status);}
}).catch(e=>{console.error(e);app.exit(1);});
