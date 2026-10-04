// Snapshot production files; instrumentation changes only the disposable fixture.
import {mkdtemp,cp,symlink,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import dgram from 'node:dgram';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../../..'),require=createRequire(import.meta.url),electron=require('electron');
const mode=process.argv.find(a=>a.startsWith('--mode='))?.slice(7)||'shell';if(!['shell','minimal'].includes(mode))throw new Error('mode must be shell or minimal');
if(mode!=='shell')throw new Error('This comparison runs inside the actual shell only');
const smoke=process.argv.includes('--smoke'),output=`/private/tmp/awb-ui-cost-${mode}${smoke?'-smoke':''}.json`,temp=await mkdtemp('/private/tmp/awb-ui-cost-'),fixture=resolve(temp,'awb');
let child;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function port(){const s=dgram.createSocket('udp4');await new Promise((r,j)=>{s.once('error',j);s.bind(0,'127.0.0.1',r)});const p=s.address().port;await new Promise(r=>s.close(r));return p;}
function replace(s,a,b){if(!s.includes(a))throw new Error('UI-cost fixture source drift: '+a);return s.replace(a,b);}
try{
 const {protectedFilesSHA256,priorEvidenceSHA256}=JSON.parse(await readFile(resolve(root,'apps/awb-shell/test/signal-bench/results/cadence-environment-2026-10-02.json'),'utf8'));
 const productionNames=['apps/awb-shell/shell/main.mjs','apps/awb-shell/sc/AWBHeadlessHost.scd','apps/awb-shell/src/signalCaptureBroker.mjs','apps/awb-shell/src/scSignalSource.mjs','apps/awb-shell/.build/sc-bus-reader.node','tool-artifacts/shared-loop/0.1.0/public/scope.js','tool-artifacts/shared-loop/0.1.0/public/scope-painter.js','tool-artifacts/shared-loop/0.1.0/public/scope-metadata.js','tool-artifacts/shared-loop/0.1.0/public/scope-trace.js','apps/awb-shell/test/scope-ui/baseline/scope.js','apps/awb-shell/test/scope-ui/baseline/scope-painter.js','tool-artifacts/shared-loop/0.1.0/public/scope-history.js','tool-artifacts/shared-loop/0.1.0/public/scope-protocol.js','tool-artifacts/shared-loop/0.1.0/scope-reduction.mjs','tool-artifacts/shared-loop/0.1.0/scope-transport.mjs'];
 const guardNames=[...new Set([...Object.keys({...protectedFilesSHA256,...priorEvidenceSHA256}),...productionNames.map(p=>resolve(root,p))])];
 const guards=Object.fromEntries(await Promise.all(guardNames.map(async p=>[p,hash(await readFile(p))])));
 for(const name of ['src','sc','.build','shell','home','render-worker','services','dist'])await cp(resolve(root,'apps/awb-shell',name),resolve(fixture,'apps/awb-shell',name),{recursive:true});
 for(const name of ['tools.json','package.json'])await cp(resolve(root,'apps/awb-shell',name),resolve(fixture,'apps/awb-shell',name));
 await cp(here,resolve(fixture,'apps/awb-shell/test/signal-bench/ui-cost'),{recursive:true});
 await cp(resolve(root,'tool-artifacts/shared-loop/0.1.0'),resolve(fixture,'tool-artifacts/shared-loop/0.1.0'),{recursive:true,filter:p=>!p.split('/').includes('node_modules')&&!p.split('/').includes('tests')});
 await symlink(resolve(root,'node_modules'),resolve(fixture,'node_modules'),'dir');await symlink(resolve(root,'packages'),resolve(fixture,'packages'),'dir');
 for(const name of ['score-studio','field-modelling'])await symlink(resolve(root,'apps',name),resolve(fixture,'apps',name),'dir');await symlink(resolve(root,'tool-artifacts/lissajous'),resolve(fixture,'tool-artifacts/lissajous'),'dir');await symlink(resolve(root,'tool-artifacts/scope'),resolve(fixture,'tool-artifacts/scope'),'dir');
 await writeFile(resolve(fixture,'package.json'),'{"type":"module"}');
 const sourceHashes=Object.fromEntries(productionNames.map(p=>[p,guards[resolve(root,p)]]));
 await writeFile(resolve(fixture,'ui-cost-source-hashes.json'),JSON.stringify(sourceHashes));
 await cp(resolve(root,'apps/awb-shell/test/scope-ui/baseline'),resolve(fixture,'prepolish-public'),{recursive:true});
 for(const version of ['before','after']){
 const publicFile=resolve(fixture,version==='before'?'prepolish-public/scope.js':'tool-artifacts/shared-loop/0.1.0/public/scope.js');let scope=await readFile(publicFile,'utf8');
 scope=replace(scope,"let rect=canvas.getBoundingClientRect();","canvas.style.width='620px';canvas.style.height='240px';canvas.style.display='block';let rect=canvas.getBoundingClientRect();");
 scope=replace(scope,'receivedAt=performance.now();retryMs=500;','receivedAt=performance.now();retryMs=500;uiCostPackets++;');
 scope=replace(scope,"const requestedKind=",'let uiCostPackets=0,uiCostLabels=0;const requestedKind=');
 scope+=`\nnew MutationObserver(()=>uiCostLabels++).observe($('updates'),{childList:true});
window.__uiCostScope=()=>({...painter.diagnostics(),labels:uiCostLabels,packets:uiCostPackets,connection:$('connection').textContent,sourceEnd:history.latest?.sourceEnd,renderedSourceEnd:Number(canvas.dataset.renderedSourceEnd),channels:snapshot?.channels,sourceChannels:snapshot?.sourceChannels,sampleRate:snapshot?.sampleRate,chunkFrames:snapshot?.captureFrames,displayFrames:snapshot?.frames,format:snapshot?.format,step:history.step,selected:snapshot?.channelIds?.join(','),transport:canvas.dataset.transport,width:rect.width,height:rect.height,node:typeof require,host:typeof awbHost});\n`;
 await writeFile(publicFile,scope);
 }
 const languagePort=await port(),serverPort=await port(),sessionFile=resolve(temp,'session.json'),userData=resolve(temp,'user-data'),token=randomUUID();
 const env={...process.env,UI_COST_OUTPUT:output,UI_COST_SESSION:sessionFile,AWB_HEADLESS_SERVER_PORT:String(serverPort),ELECTRON_DISABLE_SECURITY_WARNINGS:'true'};delete env.ELECTRON_RUN_AS_NODE;
 const benchPath=resolve(fixture,'apps/awb-shell/test/signal-bench/ui-cost/measure.mjs'),producer=resolve(fixture,'apps/awb-shell/test/signal-bench/ui-cost/producer.scd');
 let entry;
 if(mode==='shell'){
  const mainPath=resolve(fixture,'apps/awb-shell/shell/main.mjs');let main=await readFile(mainPath,'utf8');
  main=replace(main,"const shellInstanceID =",`app.setPath('userData',${JSON.stringify(userData)});app.commandLine.appendSwitch('force-device-scale-factor','1');\nconst shellInstanceID =`);
  main=replace(main,"if ( smokeHome ) runHomeSmoke().catch( reportFatal );",`if(process.argv.includes('--ui-cost-bench')&&!smokeRunning){smokeRunning=true;(async()=>{
await startHeadlessHost();await waitFor(()=>services.firstService(s=>s.hostSnapshot?.().scsynth.status==='ready'),30000);
const started=Date.now();while(!(await stat(process.env.UI_COST_SESSION).catch(()=>null))){if(Date.now()-started>35000)throw new Error('Mono SC producer did not become ready');await new Promise(r=>setTimeout(r,40));}
const native=await nativeHostForProfile('hosted'),session=JSON.parse(await readFile(process.env.UI_COST_SESSION,'utf8'));
const {measure}=await import(${JSON.stringify(benchPath)});
await measure({mode:'shell',host:{...native.configuration,token:shellHostToken,service:native.service,isConnected:()=>native.service.hostSnapshot().scsynth.status==='ready'},broker:signalCaptures,session,sclangPID:nativeScHost.snapshot().processID,backgroundWindows:[['home',homeWindow],['render-worker',renderExecutorWindow]],assertNoTools:()=>{if(registry.list().length||scopeWindows.size)throw new Error('Unrelated app or production scope opened');}});app.quit();
})().catch(async error=>{console.error(nativeScHost.snapshot().logTail.join('\\n'));await signalCaptures.close().catch(console.error);await nativeScHost.stop(()=>services.firstService()?.shutdownHost?.());reportFatal(error)});}
else if ( smokeHome ) runHomeSmoke().catch( reportFatal );`);
  await writeFile(mainPath,main);const supervisor=resolve(fixture,'apps/awb-shell/src/nativeScHostSupervisor.mjs');await writeFile(supervisor,(await readFile(supervisor,'utf8')).replace('appendLog( source, chunk ) {', "appendLog( source, chunk ) { console.log('UI_COST_SC',source,String(chunk));"));const bootstrap=resolve(fixture,'apps/awb-shell/sc/AWBHeadlessHost.scd');await writeFile(bootstrap,replace(await readFile(bootstrap,'utf8'),'server.boot;',`thisProcess.interpreter.executeFile(${JSON.stringify(producer)});\nserver.boot;`));entry=mainPath;
 }else{
  const library=resolve(temp,'SCClassLibrary');await cp('/Applications/SuperCollider.app/Contents/Resources/SCClassLibrary',library,{recursive:true});const platform=resolve(library,'Platform/osx/OSXPlatform.sc');await writeFile(platform,(await readFile(platform,'utf8')).replace('this.loadStartupFiles;','// benchmark skips user startup'));
  const classes=resolve(temp,'classes');await mkdir(classes);await writeFile(resolve(classes,'AWBHostControl.sc'),'AWBHostControl { classvar <default; var token; *start { |a,b,t| default=this.new.init(t); ^default } init { |t| token=t; ^this } allowedAddress { |addr| ^addr.ip == "127.0.0.1" } tokenMatches { |value| ^value.asString == token } }');
  const yaml=resolve(temp,'sclang.yaml');await writeFile(yaml,`includePaths:\n  - ${JSON.stringify(library)}\n  - ${JSON.stringify(classes)}\nexcludeDefaultPaths: true\n`);
  const scFile=resolve(temp,'server.scd');await writeFile(scFile,`(\nvar s=Server(\\uiCost,NetAddr("127.0.0.1",${serverPort}));Server.default=s;Server.program="exec " ++ (Platform.resourceDir +/+ "scsynth").shellQuote;s.options.loadDefs=false;s.options.zeroConf=false;s.options.ugenPluginsPath=Platform.resourceDir +/+ "plugins";AWBHostControl.start(\\whenNeeded,\\headless,${JSON.stringify(token)});thisProcess.interpreter.executeFile(${JSON.stringify(resolve(fixture,'apps/awb-shell/sc/AWBScBusAudio.scd'))});thisProcess.interpreter.executeFile(${JSON.stringify(producer)});s.boot;ServerQuit.add({0.exit},s);\n)`);
  entry=resolve(fixture,'minimal.mjs');await writeFile(entry,`import {app} from 'electron';import {spawn} from 'node:child_process';import {readFile} from 'node:fs/promises';import {existsSync} from 'node:fs';import {setTimeout as delay} from 'node:timers/promises';import {SignalCaptureBroker} from './apps/awb-shell/src/signalCaptureBroker.mjs';import {openScSignalSource} from './apps/awb-shell/src/scSignalSource.mjs';import {OSC} from './apps/awb-shell/src/scBusOsc.mjs';import {measure} from './apps/awb-shell/test/signal-bench/ui-cost/measure.mjs';
app.setPath('userData',${JSON.stringify(userData)});app.commandLine.appendSwitch('force-device-scale-factor','1');app.on('window-all-closed',()=>{});app.whenReady().then(async()=>{let log='';const child=spawn('/Applications/SuperCollider.app/Contents/MacOS/sclang',['-a','-D','-u','${languagePort}','-l',${JSON.stringify(yaml)},${JSON.stringify(scFile)}],{env:process.env,stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);const broker=new SignalCaptureBroker({open:openScSignalSource});let session;
try{const start=Date.now();while(!existsSync(process.env.UI_COST_SESSION)){if(child.exitCode!==null||log.includes('ERROR:')||Date.now()-start>35000)throw new Error(log);await delay(40)}session=JSON.parse(await readFile(process.env.UI_COST_SESSION,'utf8'));await measure({mode:'minimal',host:{oscHost:'127.0.0.1',oscPort:${languagePort},token:${JSON.stringify(token)},service:{},isConnected:()=>child.exitCode===null},broker,session,sclangPID:child.pid});}catch(e){console.error(e.stack,log);process.exitCode=1}finally{await broker.close().catch(console.error);{const osc=new OSC(session?.port??${serverPort});await osc.request('/quit',[],'/done',a=>a[0]==='/quit').catch(console.error);osc.close()}for(let i=0;i<30&&child.exitCode===null;i++)await delay(100);if(child.exitCode===null)child.kill('SIGTERM');app.exit(process.exitCode||0);}}).catch(e=>{console.error(e.stack);app.exit(1)});`);
 }
 child=spawn(electron,[entry,'--ui-cost-bench',`--osc-port=${languagePort}`,...process.argv.slice(2)],{cwd:resolve(fixture,'apps/awb-shell'),env,stdio:'inherit'});const timer=setTimeout(()=>child.kill('SIGTERM'),1200000);
 try{const code=await new Promise((r,j)=>{child.once('exit',r);child.once('error',j)});if(code!==0)throw new Error('UI-cost Electron exited '+code);}finally{clearTimeout(timer);}
 const mismatches=[];for(const [p,digest] of Object.entries(guards))if(hash(await readFile(p))!==digest)mismatches.push(p);if(mismatches.length)throw new Error('Protected files changed: '+mismatches.join(', '));
 const report=JSON.parse(await readFile(output,'utf8'));if(!report.complete||!report.cleanup)throw new Error('Incomplete benchmark');report.protectedFiles=guards;report.protectedCount=guardNames.length;report.fixtureOnlyInstrumentation=true;await writeFile(output,JSON.stringify(report,null,2));console.log('UI_COST_GUARDS '+guardNames.length+' unchanged');
}finally{if(child&&child.exitCode===null)child.kill('SIGTERM');await rm(temp,{recursive:true,force:true});}
