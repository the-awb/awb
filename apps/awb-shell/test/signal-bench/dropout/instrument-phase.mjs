// Imported only into a disposable copy of refresh-measure.mjs.
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createInterface} from 'node:readline';
import {appendFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import crypto from 'node:crypto';
const exec=promisify(execFile);
let active=null;
const mode=process.env.AWB_PHASE_TRACE_MODE??'off';
const directory=process.env.AWB_PHASE_TRACE_DIRECTORY;
const clock=process.env.AWB_PHASE_CLOCK;
const developer=process.env.DEVELOPER_DIR;
const event=async data=>appendFile(join(directory,'phase-events.jsonl'),JSON.stringify({at:new Date().toISOString(),...data})+'\n');
async function mark(label) {
 const {stdout}=await exec(clock,['mark',label]);
 return stdout.trim().split('\n').map(line=>JSON.parse(line));
}
function completed(child){return new Promise(resolve=>{child.once('error',error=>resolve({error:error.message}));child.once('exit',(code,signal)=>resolve({code,signal}));});}
function waitNotification(name) {
 const child=spawn(clock,['wait-notify',name,'45000'],{stdio:['ignore','pipe','pipe']});
 let registeredResolve,registeredReject,startedResolve,startedReject,registered=false,done=false,stderr='';
 const registration=new Promise((a,b)=>{registeredResolve=a;registeredReject=b;});
 const started=new Promise((a,b)=>{startedResolve=a;startedReject=b;});started.catch(()=>{});
 const lines=createInterface({input:child.stdout});
 lines.on('line',line=>{try{const value=JSON.parse(line);if(value.event==='registered'){registered=true;registeredResolve(value);}else if(value.event==='tracingStartedNotification'){done=true;startedResolve(value);}}catch(error){registeredReject(error);startedReject(error);}});
 child.stderr.on('data',b=>stderr+=b);
 child.once('error',error=>{registeredReject(error);startedReject(error);});
 child.once('exit',code=>{if(!registered)registeredReject(Error(stderr||'Notification helper exited '+code));if(!done)startedReject(Error(stderr||'Notification helper exited '+code));});
 return {child,registration,started};
}
export async function openPhaseTrace(phase) {
 if(active)throw Error('A prior phase trace is still active.');
 if(!directory||!clock)throw Error('Missing phase instrumentation environment.');
 if(!['off','System Trace','Audio System Trace'].includes(mode))throw Error('Unknown Instruments mode.');
 await mkdir(directory,{recursive:true});
 const label=`n${phase.nodes}-${phase.condition}-r${phase.repeat}`;
 const record={label,phase,mode,tracePath:mode==='off'?null:join(directory,label+'.trace'),captureWindowSeconds:Math.ceil(phase.seconds+60),notificationPollingMs:5};
 active={record,child:null,waiter:null,completion:null,log:''};
 try {
  if(mode!=='off') {
   const notification='org.awb.rack.trace.'+crypto.randomUUID();
   active.waiter=waitNotification(notification);
   record.notificationRegistration=await active.waiter.registration;
   const args=['xctrace','record','--template',mode,'--instrument','Points of Interest','--all-processes','--window',record.captureWindowSeconds+'s','--time-limit',Math.ceil(phase.seconds+90)+'s','--no-prompt','--notify-tracing-started',notification,'--output',record.tracePath];
   active.child=spawn('/usr/bin/xcrun',args,{env:{...process.env,DEVELOPER_DIR:developer},stdio:['ignore','pipe','pipe']});
   active.completion=completed(active.child);
   for(const stream of [active.child.stdout,active.child.stderr])stream.on('data',b=>{if(active)active.log+=b;});
   record.tracePID=active.child.pid;
   await event({kind:'trace-launched',...record});
   record.notification=await Promise.race([active.waiter.started,active.completion.then(result=>{throw Error('Instruments exited before its start notification: '+JSON.stringify(result));})]);
  }
  record.beforePhase=await mark(label+':before');
  // Snapshot only names/PIDs/resource usage, not command-line arguments.
  record.backgroundBefore=(await exec('/bin/ps',['-axo','pid=,ppid=,%cpu=,time=,comm='])).stdout;
  await event({kind:'phase-start',...record});
 }catch(error){await abortPhaseTrace(error.message);throw error;}
}
export async function closePhaseTrace(result) {
 if(!active)throw Error('Missing active phase trace.');
 const state=active,record=state.record;
 record.afterPhase=await mark(record.label+':after');
 record.auditRange=result.auditRange;record.inputRange=result.inputRange;
 record.phaseStartedAt=result.phaseStartedAt;record.phaseEndedAt=result.phaseEndedAt;
 record.processes=result.processes;record.audio=result.audio;
 record.backgroundAfter=(await exec('/bin/ps',['-axo','pid=,ppid=,%cpu=,time=,comm='])).stdout;
 await event({kind:'phase-end',...record});
 if(state.child) {
  if(state.child.exitCode!==null)throw Error('Instruments ended before phase completion.');
  state.child.kill('SIGINT');
  const ended=await state.completion;
  if(ended.error||ended.code!==0)throw Error('Instruments capture failed: '+JSON.stringify(ended)+' '+state.log.slice(-1200));
  await writeFile(join(directory,record.label+'.xctrace.log'),state.log);
  await exec('/usr/bin/xcrun',['xctrace','export','--input',record.tracePath,'--toc','--output',join(directory,record.label+'.toc.xml')],{env:{...process.env,DEVELOPER_DIR:developer},maxBuffer:1024*1024,timeout:90000});
  const toc=await readFile(join(directory,record.label+'.toc.xml'),'utf8');
  if(!toc.includes('<table '))throw Error('Instruments saved no exportable data tables.');
  if(mode==='System Trace'&&!toc.includes('schema="context-switch"'))throw Error('System Trace contains no scheduling table.');
  record.exportedTOC=true;
  const markerPath=join(directory,record.label+'.signposts.xml');
  await exec('/usr/bin/xcrun',['xctrace','export','--input',record.tracePath,'--xpath','/trace-toc/run[@number="1"]/data/table[@schema="os-signpost"]','--output',markerPath],{env:{...process.env,DEVELOPER_DIR:developer},maxBuffer:1024*1024,timeout:90000});
  const pendingPath=join(directory,record.label+'.phase.json');
  await writeFile(pendingPath,JSON.stringify(record,null,2)+'\n');
  const {stdout}=await exec('python3',[new URL('./phase-align.py',import.meta.url).pathname,markerPath,pendingPath]);
  record.clockAlignment=JSON.parse(stdout);
  record.signpostExport=markerPath;
 }
 record.complete=true;
 await writeFile(join(directory,record.label+'.phase.json'),JSON.stringify(record,null,2)+'\n');
 await event({kind:'phase-saved',label:record.label,complete:true});
 result.instruments={mode,tracePath:record.tracePath,phaseMetadata:join(directory,record.label+'.phase.json'),captureWindowSeconds:record.captureWindowSeconds};
 active=null;
}
export async function abortPhaseTrace(reason='benchmark teardown') {
 if(!active)return;
 const state=active;active=null;
 state.waiter?.child.kill('SIGTERM');
 if(state.child&&state.child.exitCode===null){state.child.kill('SIGINT');await Promise.race([state.completion,new Promise(r=>setTimeout(r,5000))]);if(state.child.exitCode===null)state.child.kill('SIGTERM');}
 await event({kind:'phase-aborted',reason,label:state.record.label,complete:false});
}
