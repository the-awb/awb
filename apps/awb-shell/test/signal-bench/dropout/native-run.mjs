// Prepare-only by default. --run --quiet-window starts real audio/capture later.
import {mkdtemp,mkdir,readFile,writeFile,rm,access} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import crypto from 'node:crypto';
const exec=promisify(execFile),here=dirname(fileURLToPath(import.meta.url));
if(Number(process.versions.node.split('.')[0])<22)throw Error('Node 22+ is required.');
const argument=name=>process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3);
const run=process.argv.includes('--run'),quiet=process.argv.includes('--quiet-window');
process.env.AWB_NATIVE_RACK_SIZE??='small';process.env.AWB_NATIVE_BRIDGE??='on';process.env.AWB_NATIVE_DIRECTION??='gui';process.env.AWB_NATIVE_MAST??='include';
for(const [key,allowed] of [['AWB_NATIVE_RACK_SIZE',['small','large','32','sends32']],['AWB_NATIVE_BRIDGE',['off','on']],['AWB_NATIVE_DIRECTION',['gui','sc']],['AWB_NATIVE_MAST',['include','extra']]])if(!allowed.includes(process.env[key]))throw Error('Invalid '+key);

const mode=argument('trace-mode')??'off';
if(!['off','System Trace','Audio System Trace'].includes(mode))throw Error('trace-mode must be off, System Trace, or Audio System Trace.');
if(run&&!quiet)throw Error('Measured runs require --quiet-window after agreeing a quiet window with Willy.');
if(process.argv.includes('--help')){
 console.log('Native rack benchmark. Environment: AWB_NATIVE_RACK_SIZE=small|large|32|sends32, AWB_NATIVE_MAST=include|extra (sends32 only), AWB_NATIVE_BRIDGE=off|on, AWB_NATIVE_DIRECTION=gui|sc. Default: fixture preparation only, no Electron/SC launch.\n--run --quiet-window: actual measurement.\n--trace-mode="off|System Trace|Audio System Trace"\n--output=/absolute/fresh/stem.json\nPass normal refresh-run options such as --load-nodes=60 --seconds=30 --repeats=2 --conditions=idle,canvas2d-15,canvas2d-30');
 process.exit(0);
}
const output=resolve(argument('output')??join('/private/tmp','awb-instruments-'+crypto.randomUUID()+'.json'));
for(const p of [output,output+'.instruments',output+'.harness',output+'.renderers']){try{await access(p);throw Error('Refusing to overwrite evidence: '+p);}catch(error){if(error.code!=='ENOENT')throw error;}}
await mkdir(dirname(output),{recursive:true});
const temporary=await mkdtemp('/private/tmp/awb-instruments-runner-');
const developer=process.env.DEVELOPER_DIR??'/Applications/Xcode.app/Contents/Developer';
const nativeClock=join(temporary,'phase-clock');
const environment={...process.env,DEVELOPER_DIR:developer,AWB_PHASE_CLOCK:nativeClock,AWB_PHASE_TRACE_DIRECTORY:output+'.instruments',AWB_PHASE_TRACE_MODE:mode};
let child;
const replace=(text,needle,value)=>{if(text.split(needle).length!==2)throw Error('Fixture drift: expected one '+needle);return text.replace(needle,value);};
try {
 await exec('/usr/bin/xcrun',['clang++','-std=c++17','-O2',join(here,'phase-clock.cpp'),'-o',nativeClock],{env:environment});
 const clockProbe=JSON.parse((await exec(nativeClock,['clock'])).stdout);
 const sourcePath=join(here,'refresh-run.mjs');
 let runner=await readFile(sourcePath,'utf8');runner="import {installNative} from "+JSON.stringify(pathToFileURL(join(here,'native-rack-fixture.mjs')).href)+";\n"+runner;
 runner=replace(runner,"from './refresh-renderers.mjs'",'from '+JSON.stringify(pathToFileURL(join(here,'refresh-renderers.mjs')).href));
 runner=replace(runner,'here=dirname(fileURLToPath(import.meta.url))','here='+JSON.stringify(here));
 runner=replace(runner,"createRequire(import.meta.url)('electron')",'createRequire('+JSON.stringify(pathToFileURL(sourcePath).href)+")('electron')");
 const hooks=await readFile(join(here,'instrument-phase.mjs'),'utf8');
 const alignment=await readFile(join(here,'phase-align.py'),'utf8');
 const instrumentation=`
 const traceMeasure=resolve(fixture,'apps/awb-shell/test/signal-bench/dropout/refresh-measure.mjs');
 let traced=await readFile(traceMeasure,'utf8');
 const once=(needle,value)=>{if(traced.split(needle).length!==2)throw Error('Phase hook fixture drift: '+needle);traced=traced.replace(needle,value);};
 traced="import {openPhaseTrace,closePhaseTrace,abortPhaseTrace} from './instrument-phase.mjs';\\n"+traced;
 once('const phaseStartedAt=new Date().toISOString();','await openPhaseTrace({target,nodes,repeat,condition,seconds}); const phaseStartedAt=new Date().toISOString();');
 once("if(['focus','stopped-focus','focus-noop','spawn-noop'].includes(condition))", "if(recorder&&targets.length*cases.length*repeats===1){const recording=recorder;recorder=null;const stopped=new Promise((resolve,reject)=>recording.once('exit',code=>code===0?resolve():reject(Error('Input recorder exited '+code))));recording.kill('SIGTERM');await stopped;}await closePhaseTrace(r); if(['focus','stopped-focus','focus-noop','spawn-noop'].includes(condition))");
 once('}finally{if(recorder){','}finally{await abortPhaseTrace();if(recorder){');
 once("schedulerTrace:'xctrace unavailable: Command Line Tools only'", "schedulerTrace:process.env.AWB_PHASE_TRACE_MODE==='off'?'untraced comparator':process.env.AWB_PHASE_TRACE_MODE");
 await writeFile(traceMeasure,traced);
 await writeFile(resolve(fixture,'apps/awb-shell/test/signal-bench/dropout/instrument-phase.mjs'),${JSON.stringify(hooks)});
 await writeFile(resolve(fixture,'apps/awb-shell/test/signal-bench/dropout/phase-align.py'),${JSON.stringify(alignment)});
`;
 runner=replace(runner,'await writeFile(mainFile,main);',instrumentation+'\n main=await installNative({fixture,root,output,main});execFileSync(process.execPath,[resolve(root,\"node_modules/vite/bin/vite.js\"),\"build\",\"--configLoader\",\"native\"],{cwd:resolve(fixture,\"apps/rack\"),env:{...process.env,ELECTRON_RUN_AS_NODE:\"1\"},stdio:\"pipe\"});await writeFile(mainFile,main);');
 const generated=join(temporary,'refresh-instrumented-run.mjs');
 await writeFile(generated,runner);
 await exec(process.execPath,['--check',generated]);
 const options=process.argv.slice(2).filter(a=>!['--run','--quiet-window'].includes(a)&&!a.startsWith('--trace-mode=')&&!a.startsWith('--output=')&&!a.startsWith('--prepare-only'));
 if(!options.includes('--dropout-bench'))options.push('--dropout-bench');
 if(!run)options.push('--prepare-only');
 options.push('--output='+output);
 await mkdir(output+'.instruments',{recursive:true});
 const provenance={preparedAt:new Date().toISOString(),mode,run,quietWindowAcknowledged:quiet,developer,clockProbe,sources:{},note:'Preparation and capability probes are not performance evidence. Original renderer/store/control traffic are unchanged; phase hooks apply only to copied benchmark files.'};
 for(const name of ['refresh-run.mjs','refresh-measure.mjs','refresh-renderers.mjs','instrument-phase.mjs','phase-clock.cpp','instruments-run.mjs','phase-align.py','phase-align-test.py'])provenance.sources[name]=crypto.createHash('sha256').update(await readFile(join(here,name))).digest('hex');
 const nativeFiles=['native-rack-fixture.mjs','native-producer.scd','native-run.mjs'].map(name=>join(here,name));
 const rackRoot=resolve(here,'../../../../rack');nativeFiles.push(join(rackRoot,'sc/classes/AWBSendRackTool.sc'),join(rackRoot,'sc/classes/AWBSendRackVoice.sc'),join(rackRoot,'runtime/sc-bridge.mjs'),join(rackRoot,'runtime/shell-runtime.mjs'));
 const nativeGuards={};for(const path of nativeFiles)nativeGuards[path]=crypto.createHash('sha256').update(await readFile(path)).digest('hex');
 provenance.native={size:process.env.AWB_NATIVE_RACK_SIZE,mast:process.env.AWB_NATIVE_MAST,bridge:process.env.AWB_NATIVE_BRIDGE,direction:process.env.AWB_NATIVE_DIRECTION,guards:nativeGuards,note:'Real native rack; pass FX; private sclang include config; no production data writes.'};
 provenance.note='Native integration benchmark extension of the matched refresh harness; real SC writes and framed SC feedback when bridge is on. Source guards cover the native helper, SC classes and runtime.';
 await writeFile(join(output+'.instruments','provenance.json'),JSON.stringify(provenance,null,2)+'\n');
 await writeFile(join(output+'.instruments','generated-runner.mjs'),runner);
 child=spawn(process.execPath,[generated,...options],{cwd:resolve(here,'../../../../..'),env:environment,stdio:'inherit'});
 const terminate=()=>child?.kill('SIGTERM');process.once('SIGINT',terminate);process.once('SIGTERM',terminate);
 const code=await new Promise((a,b)=>{child.once('exit',a);child.once('error',b);});
 process.removeListener('SIGINT',terminate);process.removeListener('SIGTERM',terminate);
 if(code!==0)throw Error('Instrumented benchmark exited '+code);
 for(const [path,hash] of Object.entries(nativeGuards))if(crypto.createHash('sha256').update(await readFile(path)).digest('hex')!==hash)throw Error('Native source changed during capture: '+path);
 if(run){const session=JSON.parse(await readFile(output,'utf8')).session;provenance.native.coreClassGuards=session.coreClassHashes;for(const [path,hash]of Object.entries(session.coreClassHashes))if(crypto.createHash('sha256').update(await readFile(path)).digest('hex')!==hash)throw Error('Native core class changed during capture: '+path);}
 provenance.native.guardsVerified=true;await writeFile(join(output+'.instruments','provenance.json'),JSON.stringify(provenance,null,2)+'\n');
 console.log(run?'INSTRUMENTED_RUN_COMPLETE '+output:'INSTRUMENTED_FIXTURE_PREPARED '+output);
}finally {
 if(child&&child.exitCode===null)child.kill('SIGTERM');
 // Only traces owned by this unique evidence directory; never terminate another profiler.
 const {stdout}=await exec('/bin/ps',['-axo','pid=,command=']);
 for(const line of stdout.split('\n')){const m=line.trim().match(/^(\d+)\s+(.*)$/);if(m&&m[2].includes('xctrace record')&&m[2].includes(output+'.instruments/'))try{process.kill(Number(m[1]),'SIGINT');}catch(error){if(error.code!=='ESRCH')throw error;}}
 await rm(temporary,{recursive:true,force:true});
}
