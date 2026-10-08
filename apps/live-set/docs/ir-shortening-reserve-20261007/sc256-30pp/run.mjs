// Real IR rack only. Uses the existing audited pilot/return detector; no GUI.
import {readFile,writeFile,mkdir,mkdtemp,copyFile,access} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import dgram from 'node:dgram';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const exec=promisify(execFile),arg=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)??fallback;
const root=resolve(arg('repo','/Users/willy/awb')),rack=join(root,'apps/rack'),set=join(rack,'sc/sets/awb52'),bench=join(root,'apps/awb-shell/test/signal-bench/dropout');
const block=Number(arg('block',256));assert.ok([64,128,256,512].includes(block));
const irCapSeconds=Number(arg('ir-cap',30));assert.ok(Number.isFinite(irCapSeconds)&&irCapSeconds>0&&irCapSeconds<=30,'IR cap must be in (0,30] seconds');
const reservePercent=Number(arg('reserve-percent',0)),pluginWorkers=Number(arg('plugin-workers',0)),pluginBlock=Number(arg('plugin-block',0)),fftSize=Number(arg('fft-size',2048));
assert.ok(Number.isFinite(reservePercent)&&reservePercent>=0&&reservePercent<=40);assert.ok([0,2,4].includes(pluginWorkers));assert.ok([0,256,512,1024].includes(pluginBlock)&&(!pluginBlock||pluginBlock>=block));assert.ok([2048,4096,8192].includes(fftSize));
const seconds=Number(arg('seconds',300)),repeats=Number(arg('repeats',3)),output=resolve(arg('output','/private/tmp/awb52-dropout-'+crypto.randomUUID()));
assert.ok(seconds>=5&&seconds<=600&&Number.isInteger(repeats)&&repeats>=1&&seconds*repeats+150+(reservePercent?300:0)<1050);
if(!process.argv.includes('--run')||!process.argv.includes('--quiet-window'))throw Error('Use --run --quiet-window for the agreed hardware test');
await mkdir(output,{recursive:false});
const fixture=join(output,'fixture');await mkdir(fixture);for(const p of ['framework','rack','source/prepared','plugins'])await mkdir(join(fixture,p),{recursive:true});
const {OSC}=await import(pathToFileURL(join(root,'apps/awb-shell/src/scBusOsc.mjs')));
const {readAudit,summarise}=await import(pathToFileURL('/private/tmp/awb-earth5-echo20-sc256-30-prep/audit.mjs'));
const {inputCount,inputSummary}=await import(pathToFileURL(join(bench,'input-audit.mjs')));
const app='/Applications/SuperCollider.app/Contents',extension='/Library/Application Support/SuperCollider/Extensions/VSTPlugin';
const hashes={},guard=async p=>{const bytes=await readFile(p);hashes[p]=crypto.createHash('sha256').update(bytes).digest('hex');return bytes;};
for(const [name,rel]of Object.entries(JSON.parse(await readFile(join(rack,'sc/test/framework-files.json'))))){const p=join('/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider',rel);await writeFile(join(fixture,'framework',name),await guard(p));}
for(const dir of ['apps/rack/sc/classes','apps/core/sc/classes','apps/chain/sc/classes','apps/param/sc/classes','apps/live-set/sc/classes','apps/live-set/sc/dependencies/unified-buffer']){
 const {readdir}=await import('node:fs/promises');for(const name of await readdir(join(root,dir)))if(name.endsWith('.sc'))await writeFile(join(fixture,'rack',name),await guard(join(root,dir,name)));
}
await writeFile(join(fixture,'framework','EventExtensions.sc'),await guard('/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider/Classes/EventExtensions.sc'));
const {readdir}=await import('node:fs/promises');for(const name of await readdir(set))if(name.endsWith('.sc')||name.endsWith('.json'))await writeFile(join(fixture,'source',name),await guard(join(set,name)));
for(const name of ['EnvDetect3.sc','EnvDetect3.scx'])await writeFile(join(fixture,name.endsWith('.sc')?'rack':'plugins',name),await guard('/Library/Application Support/SuperCollider/Extensions/EnvDetect3/'+name));
const userCache='/Users/willy/Library/Application Support/vstplugin/sc/cache_amd64.ini',privateData=join(fixture,'vst-data');
await mkdir(join(privateData,'vstplugin/sc'),{recursive:true});await writeFile(join(privateData,'vstplugin/sc/cache_amd64.ini'),await guard(userCache));
for(const name of ['first-pass.scd','first-pass.json','source-provenance.json'])await writeFile(join(fixture,'source/prepared',name),await guard(join(set,'prepared',name)));
const specification=JSON.parse(await readFile(join(fixture,'source/prepared/first-pass.json')));assert.equal(specification.irMaxSeconds,30);assert.equal(specification.components&&Object.keys(specification.components).length,13);
for(const ir of specification.irProvenance){const bytes=await guard(ir.path);assert.equal(hashes[ir.path],ir.sha256,'Original IR must match prepared provenance');}
const testTransforms=[];
for(const name of ['AWBFirstPassSet.sc','AWBSharedFXChain.sc']){
 const path=join(fixture,'source',name);let code=await readFile(path,'utf8');
 if(pluginWorkers){const before=code;code=code.replaceAll('editor:false,mode:item[\\mode],action:', 'editor:false,multiThreading:true,mode:item[\\mode],action:');assert.notEqual(code,before,'Worker override must apply to '+name);}
 if(pluginBlock&&name==='AWBFirstPassSet.sc'){let matches=0;code=code.replace(/VSTPlugin\.ar\(([^;\n]*?)id:(\\[A-Za-z0-9_]+)/g,(all,args,id)=>{matches++;return 'VSTPlugin.ar('+args+'id:'+id+',blockSize:'+pluginBlock;});assert.equal(matches,23,'Reblocking must cover every plugin graph alternative');}
 // Private startup diagnostics: these prints occur only while opening plugins.
 code=code.replaceAll('controller.open(item', '("AWB52_PLUGIN_OPEN_BEGIN "++item[\\name]).postln;controller.open(item');
 code=code.replaceAll('action:{|vst,ok|', 'action:{|vst,ok|("AWB52_PLUGIN_OPEN_END "++item[\\name]++" ok="++ok).postln;');
 await writeFile(path,code);testTransforms.push({name,sha256:crypto.createHash('sha256').update(code).digest('hex')});
}
for(const name of ['VSTPlugin.scx','host'])await copyFile(join(extension,'plugins',name),join(fixture,'plugins',name));
for(const name of ['audit.mjs','input-audit.mjs','callback-audit.cpp','input-record.cpp'])await writeFile(join(fixture,name),await guard(join(bench,name)));
const auditSourcePath=join(fixture,'callback-audit.cpp');let privateAudit=await readFile(auditSourcePath,'utf8');privateAudit=privateAudit.replace('__attribute__((constructor)) static void setup(){','__attribute__((constructor)) static void setup(){ const char* owner=getenv("AWB_AUDIO_AUDIT_PID"); if(!owner||getpid()!=atoi(owner))return;');await writeFile(auditSourcePath,privateAudit);testTransforms.push({name:'callback-audit.cpp PID ownership guard',sha256:crypto.createHash('sha256').update(privateAudit).digest('hex')});
const engine=join(fixture,'scsynth');await copyFile(join(app,'Resources/scsynth'),engine);
await exec('/usr/bin/codesign',['--force','--sign','-',engine]);
const launcher='#include <cstdlib>\n#include <unistd.h>\n#include <cstdio>\nint main(int argc,char** argv){char owner[32];snprintf(owner,sizeof(owner),"%d",int(getpid()));setenv("AWB_AUDIO_AUDIT_PID",owner,1);setenv("DYLD_INSERT_LIBRARIES",getenv("AWB_AUDIO_AUDIT_LIBRARY"),1);argv[0]=(char*)'+JSON.stringify(engine)+';execv(argv[0],argv);perror("exec owned audited engine");return 1;}\n';
await writeFile(join(fixture,'audit-launch.cpp'),launcher);
const env={...process.env,DEVELOPER_DIR:process.env.DEVELOPER_DIR??'/Applications/Xcode.app/Contents/Developer'};
await Promise.all([
exec('/usr/bin/xcrun',['clang++','-std=c++17','-dynamiclib','-O2','-framework','CoreAudio',join(fixture,'callback-audit.cpp'),'-o',join(fixture,'callback-audit.dylib')],{env}),
exec('/usr/bin/xcrun',['clang++','-O2',join(fixture,'audit-launch.cpp'),'-o',join(fixture,'audit-launch')],{env}),
exec('/usr/bin/xcrun',['clang++','-std=c++17','-O2','-framework','CoreAudio','-framework','CoreFoundation',join(fixture,'input-record.cpp'),'-o',join(fixture,'input-record')],{env})
]);
const paths=[join(app,'Resources/SCClassLibrary'),join(fixture,'framework'),join(fixture,'rack'),join(fixture,'source'),join(extension,'classes')];
await writeFile(join(fixture,'sclang_conf.yaml'),'includePaths:\n'+paths.map(v=>'  - '+JSON.stringify(v)+'\n').join('')+'excludeDefaultPaths: true\nexcludePaths: []\npostInlineWarnings: false\n');
const source=await readFile(arg('sc-source',join(dirname(fileURLToPath(import.meta.url)),'cello-source.scd')));await writeFile(join(fixture,'dropout.scd'),source);
const port=await new Promise((resolve,reject)=>{const s=dgram.createSocket('udp4');s.on('error',reject);s.bind(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const token=crypto.randomUUID(),auditPath=join(output,'output.audit'),inputPath=join(output,'return.input');
Object.assign(env,{XDG_DATA_HOME:privateData,AWB52_BLOCK:String(block),AWB52_IR_CAP:String(irCapSeconds),AWB52_FFT_SIZE:String(fftSize),AWB52_PLUGIN_WORKERS:String(pluginWorkers),AWB52_SAMPLE:'/Volumes/ARMED WITH SOUND/Samples/Ali March 22/Cello 1-bounce-1.wav',AWB52_DROPOUT_PORT:String(port),AWB52_DROPOUT_TOKEN:token,AWB_NATIVE_SAMPLE_RATE:'44100',AWB_AUDIO_AUDIT:auditPath,AWB_AUDIO_AUDIT_CHANNEL:'2',AWB_AUDIO_AUDIT_LIBRARY:join(fixture,'callback-audit.dylib')});
await guard(env.AWB52_SAMPLE);
const report={complete:false,output,seconds,repeats,preparedAt:new Date().toISOString(),workload:{channels:2,plugins:13,partConvs:6,fullLoad:false,blockSize:block,fftSize,pluginWorkers,pluginBlock,reserveTargetPercent:reservePercent,controlSends:16,followers:25,modulated:true,irMaxSeconds:irCapSeconds,fxOutputCleared:true,irMaxSecondsByBranch:specification.irMaxSecondsByBranch,irProvenance:specification.irProvenance.map((ir,i)=>{const cap=Math.min(irCapSeconds,specification.irMaxSecondsByBranch?.[['earth','composite','echo'][i]]??irCapSeconds),frames=Math.min(ir.sourceFrames,Math.floor(cap*ir.sampleRate));return {...ir,usedFrames:frames,usedSeconds:frames/ir.sampleRate};}),gui:false,syntheticInput:false,celloSample:env.AWB52_SAMPLE,celloSourceMono:true,pro2Silent:true,hardwareFXMix:false,note:'A final ReplaceOut node clears FX hardware channels 0/1 after the entire rack computes; pilot detects global engine/output and returned-audio continuity. Actual cello feeds every active FX and control send. Recorded FX output is metered before hardware silencing. GUI and shell bridge are not part of this run.'},detector:{threshold:1e-5,silenceFrames:32},calibration:{},phases:[],audioMeters:[],timeline:[],cpuSamples:[],serverFailures:[],guards:hashes,ownedPIDs:[],testTransforms};
let language,recorder,osc,control,session,languageExit,recorderExit,engineShutdownConfirmed=false,monitoring=false,monitorTask;
const logs=[];const watch=(p,label)=>{report.ownedPIDs.push(p.pid);p.stdout?.on('data',v=>{logs.push([label,v.toString()]);if(v.toString().includes('AWB52_COMMAND')||v.toString().includes('AWB52_PLUGIN_OPEN')||v.toString().includes('ERROR:'))console.log(label+': '+v.toString());});p.stderr?.on('data',v=>logs.push([label,v.toString()]));return new Promise((resolve,reject)=>{p.once('exit',(code,signal)=>resolve({code,signal}));p.once('error',reject);});};
const save=async()=>{await writeFile(join(output,'results.json'),JSON.stringify(report,null,2));await writeFile(join(output,'process.log'),logs.map(([label,v])=>label+': '+v).join(''));};
async function until(fn,label,timeout=60000){const deadline=Date.now()+timeout;while(Date.now()<deadline){if(await fn())return;if(language?.signalCode||language?.exitCode!==null&&language?.exitCode!==undefined)throw Error('Language exited while waiting for '+label);if(recorder?.signalCode||recorder?.exitCode!==null&&recorder?.exitCode!==undefined)throw Error('Recorder exited while waiting for '+label);await delay(100);}throw Error('Timed out: '+label);}
async function rangeStart(){return {audit:(await readAudit(auditPath)).count,input:await inputCount(inputPath)};}
const mark=label=>{const m={label,utc:new Date().toISOString(),hostNs:Number(process.hrtime.bigint())};report.timeline.push(m);return m;};
async function monitorCPU(){while(monitoring){const requestedHostNs=Number(process.hrtime.bigint()),requestedAt=new Date().toISOString();try{const r=await osc.request('/status',[],'/status.reply');report.cpuSamples.push({requestedAt,requestedHostNs,receivedHostNs:Number(process.hrtime.bigint()),average:r[5],peak:r[6],ugens:r[1],synths:r[2]});}catch(e){if(monitoring)report.serverFailures.push(e.message);}await delay(250);}}
async function capture(label,duration){
const phaseStart=mark(label+' begin'),first=await rangeStart(),startedAt=phaseStart.utc,start=performance.now();
let remaining=duration;while(remaining>0){const chunk=Math.min(remaining,60);await delay(chunk*1000);remaining-=chunk;if(remaining>0){await save();const recent=report.cpuSamples.slice(-200);console.log('CELLO_PROGRESS '+JSON.stringify({block,elapsed:duration-remaining,average:recent.reduce((n,r)=>n+r.average,0)/recent.length,reportedPeak:Math.max(...recent.map(r=>r.peak)),meter:report.audioMeters.at(-1)?.values}));}}const phaseEnd=mark(label+' end'),statuses=report.cpuSamples.filter(v=>v.receivedHostNs>=phaseStart.hostNs&&v.receivedHostNs<=phaseEnd.hostNs);
const last=await rangeStart(),out=(await readAudit(auditPath,first.audit)).rows.slice(0,last.audit-first.audit),audio=summarise(out),input=await inputSummary(inputPath,first.input,last.input);
const r={label,startedAt,endedAt:new Date().toISOString(),elapsedSeconds:(performance.now()-start)/1000,outputRange:{first:first.audit,end:last.audit},inputRange:{first:first.input,end:last.input},audioMeters:report.audioMeters.filter(v=>v.hostNs>=phaseStart.hostNs&&v.hostNs<=phaseEnd.hostNs),scAverage:statuses.reduce((s,r)=>s+r.average,0)/statuses.length,scPeak:Math.max(...statuses.map(r=>r.peak)),synths:statuses.at(-1).synths,ugens:statuses.at(-1).ugens,audio,input,hostNsRange:[phaseStart.hostNs,phaseEnd.hostNs],peakReportedAt:statuses.reduce((a,b)=>a.peak>=b.peak?a:b)};
if(label.startsWith('cello-profile-')){assert.ok(r.audioMeters.every(m=>m.values.every(Number.isFinite)),'Invalid FX/follower meter values');assert.ok(r.audioMeters.length>duration/2,'Audio meter coverage');assert.ok(r.audioMeters.some(m=>m.values[0]>.0001),'FX output silent throughout capture');}
r.recorderReliable=input.recorderVersion===2&&input.captureDrops===0&&input.recorderOverBudgetCallbacks===0&&input.frameGaps===0;
assert.equal(audio.sampleRate,44100);assert.equal(audio.hardwareFrames,512);assert.equal(input.rate,44100);assert.equal(input.channel,6);assert.equal(audio.rateChanges,0);assert.equal(audio.bufferChanges,0);
console.log('PHASE '+JSON.stringify({label,scAverage:r.scAverage,scPeak:r.scPeak,outputFaults:audio.residualCallbacks,returnFaults:input.residualCallbacks,lateCallbacks:audio.lateCallbacks,overBudget:audio.overBudgetCallbacks,recorderReliable:r.recorderReliable}));return r;
}
const faultSummary=async first=>{const last=await rangeStart();return {audio:summarise((await readAudit(auditPath,first.audit)).rows.slice(0,last.audit-first.audit)),input:await inputSummary(inputPath,first.input,last.input)};};
async function stopChild(p,done){if(!p||p.exitCode!==null||p.signalCode!==null)return;if(p===recorder)p.kill('SIGTERM');const result=await Promise.race([done,delay(6000).then(()=>null)]);if(!result&&p.exitCode===null){p.kill('SIGTERM');await Promise.race([done,delay(2000)]);if(p.exitCode===null&&p.signalCode===null){p.kill('SIGKILL');await done;}}}
if(process.argv.includes('--prepare-only')){await save();console.log('CELLO_BENCH_PREPARED '+output);process.exit(0);}
try{
const inventory=await exec('/bin/ps',['-axo','pid=,comm=']);report.initialInventory=inventory.stdout.split('\n').filter(v=>/Bitwig|\/(scsynth|supernova|awb-audit-scsynth)$/.test(v));assert.equal(report.initialInventory.length,0,'Other audio/language engine running');
recorder=spawn(join(fixture,'input-record'),['record','6','1050',inputPath],{env,stdio:['ignore','pipe','pipe']});recorderExit=watch(recorder,'recorder');
await until(async()=>{try{return await inputCount(inputPath)>10;}catch{return false;}},'MOTU return recorder',10000);
language=spawn(join(app,'MacOS/sclang'),['-l',join(fixture,'sclang_conf.yaml'),join(fixture,'dropout.scd')],{env,stdio:['ignore','pipe','pipe']});languageExit=watch(language,'sclang');
await until(async()=>{try{session=JSON.parse(await readFile(join(fixture,'session.json')));return !!session.scPID;}catch{return false;}},'pilot session');report.session=session;report.ownedPIDs.push(session.scPID);osc=new OSC(session.port);control=new OSC(session.langPort);osc.on('serverFailure',v=>report.serverFailures.push(v));control.on('message',v=>{if(v.address==='/awb52/audio')report.audioMeters.push({utc:new Date().toISOString(),hostNs:Number(process.hrtime.bigint()),values:v.args.slice(2)});if(v.address==='/awb52/stage'&&v.args[0]===token)mark(v.args[1]);});monitoring=true;monitorTask=monitorCPU();
assert.equal(session.sampleRate,44100);assert.equal(session.blockSize,block);await osc.sync();await delay(1500);
const clean=await capture('idle-calibration',3);assert.equal(clean.audio.residualCallbacks,0);assert.equal(clean.audio.silentCallbacks,0);assert.equal(clean.input.residualCallbacks,0);assert.equal(clean.input.silentCallbacks,0);assert.ok(clean.audio.meanRMS>.001&&clean.input.rms>.0001);assert.ok(clean.recorderReliable);report.calibration.clean=clean;
let first=await rangeStart();osc.send('/n_set',session.toneNode,'gain',0);await delay(80);osc.send('/n_set',session.toneNode,'gain',1);await delay(400);const mute=await faultSummary(first);report.calibration.injectedMute=mute;assert.ok(mute.audio.silentCallbacks>0&&mute.audio.residualCallbacks>0&&mute.input.silentCallbacks>0&&mute.input.residualCallbacks>0);report.calibration.injectedMute=mute;await delay(600);
first=await rangeStart();osc.send('/n_set',session.toneNode,'phase',2.5);await delay(150);osc.send('/n_set',session.toneNode,'phase',0);await delay(400);const phase=await faultSummary(first);report.calibration.injectedPhase=phase;assert.ok(phase.audio.residualCallbacks>=2&&phase.input.residualCallbacks>=2);report.calibration.injectedPhase=phase;await delay(1000);
let reserveCount=0;
async function setStress(count){control.send('/awb52/dropout',token,'stress',count);await until(async()=>{try{return JSON.parse(await readFile(join(fixture,'stress-state.json'))).count===count;}catch{return false;}},'stress count '+count,10000);}
async function measureStress(count,duration=6000){await setStress(count);await delay(duration);const since=Number(process.hrtime.bigint())-Math.min(duration-3000,30000)*1e6,samples=report.cpuSamples.filter(v=>v.receivedHostNs>=since);assert.ok(samples.length>=8);return {count,average:samples.reduce((n,v)=>n+v.average,0)/samples.length};}
if(reservePercent){
 const baseline=await measureStress(0),probe=await measureStress(10);const unit=(probe.average-baseline.average)/10;assert.ok(unit>0.01,'Stress calibration must add measurable DSP');
 reserveCount=Math.max(1,Math.min(100,Math.ceil(reservePercent/unit)));report.reserveCalibration={isolatedBaseline:baseline,isolatedProbe:probe,targetPercent:reservePercent,source:'32 SinOsc -> RLPF -> tanh per synth, private unconsumed audio bus; serial group'};await setStress(0);await delay(2000);
}
report.backgroundBefore=(await exec('/bin/ps',['-axo','pid=,pcpu=,comm='])).stdout;
first=await rangeStart();mark('rack load requested');control.send('/awb52/dropout',token,'load');await until(async()=>{try{return JSON.parse(await readFile(join(fixture,'loaded.json'))).ready;}catch{return false;}},'loaded rack');report.loading=await faultSummary(first);mark('rack sources ready / warmup begin');
await delay(5000);assert.ok(report.audioMeters.some(m=>m.values[0]>.0001),'FX output must contain actual audio');mark('warmup end');const audited=await readAudit(auditPath);assert.deepEqual(audited.listenerStatus,[0,0,0]);report.listenerStatus=audited.listenerStatus;await save();
let pluginCheckID=0;async function checkPlugins(label){const id=++pluginCheckID;control.send('/awb52/dropout',token,'checkPlugins',id);let state;await until(async()=>{try{state=JSON.parse(await readFile(join(fixture,'plugin-state.json')));return state.checkID===id;}catch{return false;}},'all 13 plugin readbacks',10000);assert.equal(state.plugins.length,13);assert.equal(new Set(state.plugins.map(p=>p.role)).size,13);assert.ok(state.plugins.every(p=>p.open&&Number.isFinite(p.parameter0)&&Number.isFinite(p.latencySamples)));(report.pluginChecks??=[]).push({label,...state});}
await checkPlugins('before timed playback');
report.workload={...report.workload,channels:9,delayCells:4,delayBufferSeconds:32,gui:true,scopes:'8 stereo native bus readers plus 4 stereo delay waveforms',rackEdits:'16 simultaneous send changes at 15Hz',reserveTargetPercent:reservePercent,guiWarmupSeconds:90};
const gui=spawn('/Users/willy/awb/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',['/private/tmp/awb-earth5-echo20-sc256-30-prep/gui.mjs',join(fixture,'live-binding.json'),fixture,token],{env,stdio:['ignore','pipe','pipe']});const guiDone=watch(gui,'GUI');
try {
await until(async()=>{try{return JSON.parse(await readFile(join(fixture,'gui-ready.json'))).ready;}catch{return false;}},'live GUI and eight scopes',20000);mark('full GUI warmup begin');await delay(90000);mark('full GUI warmup end');
report.phases.push(await capture('cello-profile-full-gui-baseline',90));await save();
if(reserveCount){
 const baseline=await measureStress(0,45000),trials=[];let added;
 for(let attempt=0;attempt<5;attempt++){const measured=await measureStress(reserveCount,45000);added=measured.average-baseline.average;trials.push({...measured,addedPercent:added});if(added>=reservePercent&&added<=reservePercent+1.5)break;reserveCount=Math.max(1,Math.min(100,Math.ceil(reserveCount*(reservePercent+0.75)/Math.max(added,0.1))));}
 report.reserveCalibration={...report.reserveCalibration,liveBaseline:baseline,liveTrials:trials,addedPercent:added,count:trials.at(-1).count};assert.ok(added>=reservePercent&&added<=reservePercent+1.5,'Live extra DSP must meet or exceed requested reserve');console.log('RESERVE_CALIBRATED '+JSON.stringify(report.reserveCalibration));mark('calibrated reserve DSP active');await save();await delay(30000);mark('reserve settled');
}
report.phases.push(await capture('cello-profile-full-gui-plus-reserve',seconds));await save();
await setStress(0);await delay(5000);report.phases.push(await capture('cello-profile-full-gui-restored',30));await save();
}finally{await writeFile(join(fixture,'gui-stop'),'stop');await Promise.race([guiDone,delay(5000)]);if(gui.exitCode===null)gui.kill('SIGTERM');}

await checkPlugins('after timed playback');
report.backgroundAfter=(await exec('/bin/ps',['-axo','pid=,pcpu=,comm='])).stdout;mark('rack teardown begin');monitoring=false;await monitorTask;control.send('/awb52/dropout',token,'close');const stopped=await Promise.race([languageExit,delay(10000).then(()=>null)]);assert.ok(stopped&&stopped.code===0,'Owned language shutdown');engineShutdownConfirmed=logs.some(([label,v])=>label==='sclang'&&v.includes('exited with exit code 0'));assert.ok(engineShutdownConfirmed,'Owned engine exit marker');
recorder.kill('SIGTERM');assert.equal((await recorderExit).code,0);report.finalCapture=await inputSummary(inputPath,report.phases[0].inputRange.first,report.phases.at(-1).inputRange.end);assert.ok(report.phases.every(p=>p.recorderReliable),'Unreliable returned capture');
for(const [p,h]of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(await readFile(p)).digest('hex'),h,'Protected source changed: '+p);
assert.equal(report.serverFailures.length,0,'SC OSC failures');
const allRows=(await readAudit(auditPath)).rows;
const loadAt=report.timeline.find(v=>v.label==='rack load requested').hostNs,closeAt=report.timeline.find(v=>v.label==='rack teardown begin').hostNs;
const relevant=allRows.filter(r=>r.entryNs>=loadAt&&r.entryNs<closeAt);
const stageAt=ns=>report.timeline.filter(v=>v.hostNs<=ns).at(-1)?.label??'before timeline';
report.heaviestCallbacks=[...relevant].sort((a,b)=>b.dspNs-a.dspNs).slice(0,30).map(r=>({...r,stage:stageAt(r.entryNs),sinceLoadSeconds:(r.entryNs-loadAt)/1e9,dspPercentOfHardwarePeriod:r.dspNs/(r.frames/r.sampleRate*1e9)*100}));
report.stageCosts=report.timeline.filter(m=>m.hostNs>=loadAt&&m.hostNs<closeAt).map((m,i,a)=>{const end=a[i+1]?.hostNs??closeAt,rows=relevant.filter(r=>r.entryNs>=m.hostNs&&r.entryNs<end),cpu=report.cpuSamples.filter(c=>c.receivedHostNs>=m.hostNs&&c.receivedHostNs<end);return {label:m.label,utc:m.utc,seconds:(end-m.hostNs)/1e9,callbacks:rows.length,maxCallbackDspMs:rows.length?Math.max(...rows.map(r=>r.dspNs))/1e6:null,peakReported:cpu.length?Math.max(...cpu.map(c=>c.peak)):null,lateCallbacks:rows.filter(r=>r.entryNs+r.dspNs+r.auditNs>r.outputNs).length};});
report.complete=true;report.blockSize=block;report.guardsVerified=true;report.engineShutdownConfirmed=true;console.log('AWB52_DROPOUT_COMPLETE '+output);
}catch(error){report.error=error.stack;throw error;}finally{
monitoring=false;if(monitorTask)await monitorTask;
if(language?.exitCode===null&&control)control.send('/awb52/dropout',token,'close');await stopChild(language,languageExit);await stopChild(recorder,recorderExit);
if(session?.scPID&&!engineShutdownConfirmed){try{await exec('/bin/kill',['-TERM',String(session.scPID)]);}catch{}}
osc?.close();control?.close();report.teardown={languageExited:!language||language.exitCode!==null||language.signalCode!==null,recorderExited:!recorder||recorder.exitCode!==null||recorder.signalCode!==null};await save();
}
