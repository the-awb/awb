// Instrumented actual shell in a disposable tree. No tool windows or SC boot.
import {mkdtemp,cp,symlink,readFile,writeFile,rm,mkdir,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import dgram from 'node:dgram';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..'),electron=createRequire(import.meta.url)('electron'),temp=await mkdtemp('/private/tmp/awb-startup-'),fixture=resolve(temp,'awb'),output='/private/tmp/awb-startup-cost.json';
const hash=b=>createHash('sha256').update(b).digest('hex'),env={...process.env,ELECTRON_DISABLE_SECURITY_WARNINGS:'true'};delete env.ELECTRON_RUN_AS_NODE;
function replace(s,a,b){if(!s.includes(a))throw new Error('Startup fixture drift: '+a);return s.replace(a,b)}
async function freePort(){const s=dgram.createSocket('udp4');await new Promise(r=>s.bind(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function run(cmd,args,cwd,onChunk=()=>{}){const t=performance.now();const child=spawn(cmd,args,{cwd,env,stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',b=>{log+=b;onChunk(String(b),performance.now()-t)});child.stderr.on('data',b=>{log+=b;onChunk(String(b),performance.now()-t)});const timer=setTimeout(()=>child.kill('SIGTERM'),180000);try{const code=await new Promise((r,j)=>{child.once('exit',r);child.once('error',j)});if(code!==0)throw new Error(cmd+' exited '+code+'\n'+log.slice(-6000));return {ms:performance.now()-t,log};}finally{clearTimeout(timer)}}
const evidence=JSON.parse(await readFile(resolve(root,'apps/awb-shell/test/signal-bench/results/one-line-shell-2026-10-02.json'),'utf8'));
const expectedTools=JSON.parse(await readFile(resolve(root,'apps/awb-shell/tools.json'),'utf8')).artifacts.length;
const guardNames=[...new Set([...Object.keys(evidence.protectedFiles),resolve(root,'apps/awb-shell/package.json'),resolve(root,'apps/awb-shell/home/home.js')])];
const guards=Object.fromEntries(await Promise.all(guardNames.map(async p=>[p,hash(await readFile(p))]))),launches=[],builds=[];
try{
 for(const name of ['src','sc','.build','shell','home','render-worker','services','dist'])await cp(resolve(root,'apps/awb-shell',name),resolve(fixture,'apps/awb-shell',name),{recursive:true});
 for(const name of ['tools.json','package.json'])await cp(resolve(root,'apps/awb-shell',name),resolve(fixture,'apps/awb-shell',name));
 await cp(resolve(root,'tool-artifacts/shared-loop/0.1.0'),resolve(fixture,'tool-artifacts/shared-loop/0.1.0'),{recursive:true,filter:p=>!p.split('/').includes('node_modules')&&!p.split('/').includes('tests')});
 await symlink(resolve(root,'node_modules'),resolve(fixture,'node_modules'),'dir');await symlink(resolve(root,'packages'),resolve(fixture,'packages'),'dir');
 for(const name of ['score-studio','field-modelling'])await symlink(resolve(root,'apps',name),resolve(fixture,'apps',name),'dir');await symlink(resolve(root,'tool-artifacts/lissajous'),resolve(fixture,'tool-artifacts/lissajous'),'dir');await symlink(resolve(root,'tool-artifacts/scope'),resolve(fixture,'tool-artifacts/scope'),'dir');
 await writeFile(resolve(fixture,'package.json'),'{}');
 const mainPath=resolve(fixture,'apps/awb-shell/shell/main.mjs'),original=await readFile(mainPath,'utf8'),homePath=resolve(fixture,'apps/awb-shell/home/home.js'),home=await readFile(homePath,'utf8');
 const last=home.lastIndexOf('render();');await writeFile(homePath,home.slice(0,last)+"render().then(()=>host.reportReady({surface:'startup-catalogue'}));"+home.slice(last+9));
 for(let repeat=1;repeat<=4;repeat++)for(const variant of repeat%2?['current','defer-worker']:['defer-worker','current']){
 const marksFile=resolve(temp,`marks-${variant}-${repeat}.json`),spawnAt=Date.now(),port=await freePort();let main=original;
 main=replace(main,'const shellInstanceID =',`const startupMarks={moduleBody:Date.now()};const startupMark=name=>startupMarks[name]=Date.now();app.setPath('userData',${JSON.stringify(resolve(temp,`data-${variant}-${repeat}`))});\nconst shellInstanceID =`);
 main=replace(main,'app.whenReady().then( async () => {',"app.whenReady().then( async () => {startupMark('electronReady');");
 main=replace(main,'    await loadTools();',"    startupMark('catalogueStart');await loadTools();startupMark('catalogueEnd');");
 main=replace(main,'    await recentStore.load();',"    startupMark('recentsStart');await recentStore.load();startupMark('recentsEnd');");
 main=replace(main,'    await ensureHost( hostConfigurationFromRequest( initialRequest )',"    startupMark('hostStart');await ensureHost( hostConfigurationFromRequest( initialRequest )");
 main=replace(main,'    await createRenderExecutorWindow();\n    await createHomeWindow();',variant==='current'?"    startupMark('hostEnd');startupMark('workerStart');await createRenderExecutorWindow();startupMark('workerEnd');startupMark('homeStart');await createHomeWindow();startupMark('homeLoaded');":"    startupMark('hostEnd');startupMark('homeStart');await createHomeWindow();startupMark('homeLoaded');setTimeout(()=>createRenderExecutorWindow().catch(reportFatal),5000);");
 main=replace(main,"window.once( 'ready-to-show', () => window.show() );","window.once( 'ready-to-show', () => {startupMark('homeShown');window.show();} );");
 main=replace(main,"      homeReadyCount += 1;",`      if(state.surface==='startup-catalogue'){startupMark('cataloguePaintable');setTimeout(async()=>{await writeFile(${JSON.stringify(marksFile)},JSON.stringify({marks:startupMarks,tools:tools.size,failures:manifestFailures.length,views:registry.list().length,scState:nativeScHost.snapshot().state,sources:signalCaptures.diagnostics().sources.length}));app.quit();},150);return;}startupMark('homeReportedReady');\n      homeReadyCount += 1;`);
 await writeFile(mainPath,main);const result=await run(electron,[mainPath,`--osc-port=${port}`],resolve(fixture,'apps/awb-shell'));
 const record=JSON.parse(await readFile(marksFile,'utf8'));if(record.tools!==expectedTools||record.failures||record.views||record.sources||record.scState!=='stopped')throw new Error('Unexpected startup side effects '+JSON.stringify(record));
 launches.push({variant,repeat,spawnAt,processLifetimeMs:result.ms,...record});console.log('STARTUP_LAUNCH '+JSON.stringify(launches.at(-1)));await writeFile(output,JSON.stringify({complete:false,launches},null,2));
 }
 // Native rebuild timings also stay in the disposable tree. No other workspace is built here.
 await cp(resolve(root,'apps/awb-shell/native'),resolve(fixture,'apps/awb-shell/native'),{recursive:true});await cp(resolve(root,'apps/awb-shell/scripts'),resolve(fixture,'apps/awb-shell/scripts'),{recursive:true});
 for(let repeat=1;repeat<=2;repeat++){const result=await run(process.execPath,['scripts/build-sc-bus.mjs'],resolve(fixture,'apps/awb-shell'));builds.push({name:'sc-bus-addon',repeat,ms:result.ms});}
 const mismatches=[];for(const [p,h] of Object.entries(guards))if(hash(await readFile(p))!==h)mismatches.push(p);if(mismatches.length)throw new Error('Protected files changed: '+mismatches.join(','));
 await writeFile(output,JSON.stringify({complete:true,launches,builds,protectedFiles:guards,protectedCount:guardNames.length,fixtureOnly:true,notes:['Launch durations exclude npm prestart.','defer-worker is a fixture-only experiment, not a production startup change.','Fresh userData on each launch; no OS cache flush.','Home readiness additionally waits for its first catalogue snapshot to render.']},null,2));console.log('STARTUP_COMPLETE '+output);
}finally{await rm(temp,{recursive:true,force:true})}
