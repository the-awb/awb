// Run the actual shell in a disposable checkout; instrument only copied renderer files.
import {mkdtemp,cp,symlink,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import dgram from 'node:dgram';
import {installDiagnostics} from './diagnostic-renderers.mjs';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../../..'),electron=createRequire(import.meta.url)('electron'),smoke=process.argv.includes('--smoke'),output=process.argv.find(a=>a.startsWith('--output='))?.slice(9)||`/private/tmp/awb-meter-cost${smoke?'-smoke':''}.json`,temp=await mkdtemp('/private/tmp/awb-meter-cost-'),fixture=resolve(temp,'awb');
const hash=b=>createHash('sha256').update(b).digest('hex');
const protectedNames=['apps/awb-shell/shell/main.mjs','apps/awb-shell/sc/AWBHeadlessHost.scd','apps/awb-shell/sc/AWBScBusAudio.scd','apps/awb-shell/src/signalCaptureBroker.mjs','apps/awb-shell/src/scSignalSource.mjs','apps/awb-shell/.build/sc-bus-reader.node','tool-artifacts/scope/0.1.0/server.mjs',...['scope.js','index.html','scope.css','scope-opacity.js','protocol.js'].map(n=>'tool-artifacts/scope/0.1.0/public/'+n),...['scope-history.js','scope-metadata.js','scope-painter.js','scope-trace.js'].map(n=>'tool-artifacts/shared-loop/0.1.0/public/'+n)];
const rackNames=['src/main.jsx','src/SvgRack.jsx','src/CanvasRack.jsx','src/canvasRenderer.mjs','src/style.css','src/model.mjs','runtime/shell-runtime.mjs','test/benchmark-react-workload.mjs','fixtures/live-set.rack.json','tool-manifest.json'];
const rackGuards=Object.fromEntries(await Promise.all(rackNames.map(async p=>['apps/rack/'+p,hash(await readFile(resolve(root,'apps/rack',p)))])));
const guards=Object.fromEntries(await Promise.all(protectedNames.map(async p=>[p,hash(await readFile(resolve(root,p)))])));
function replace(s,a,b){if(!s.includes(a))throw new Error('Meter fixture drift: '+a);return s.replace(a,b);}
async function port(){const s=dgram.createSocket('udp4');await new Promise(r=>s.bind(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
let child;
try{
 for(const name of ['src','sc','.build','shell','home','render-worker','services','dist','package.json','tools.json'])await cp(resolve(root,'apps/awb-shell',name),resolve(fixture,'apps/awb-shell',name),{recursive:true});
 await cp(resolve(here,'../meters'),resolve(fixture,'apps/awb-shell/test/signal-bench/meters'),{recursive:true,filter:p=>!p.split('/').includes('results')});
 if(process.argv.includes('--dropout-bench'))await cp(resolve(here,'../dropout'),resolve(fixture,'apps/awb-shell/test/signal-bench/dropout'),{recursive:true,filter:p=>!p.split('/').includes('results')});
 if(process.argv.includes('--opacity-bench')||process.argv.includes('--opacity-scaling'))await cp(resolve(here,'../opacity'),resolve(fixture,'apps/awb-shell/test/signal-bench/opacity'),{recursive:true,filter:p=>!p.split('/').includes('results')});
 for(const tool of ['shared-loop','scope'])await cp(resolve(root,'tool-artifacts',tool),resolve(fixture,'tool-artifacts',tool),{recursive:true,filter:p=>!p.split('/').some(n=>['node_modules','tests','build','results'].includes(n))});
 await symlink(resolve(root,'node_modules'),resolve(fixture,'node_modules'),'dir');await symlink(resolve(root,'packages'),resolve(fixture,'packages'),'dir');
 for(const tool of ['score-studio','field-modelling'])await symlink(resolve(root,'apps',tool),resolve(fixture,'apps',tool),'dir');await symlink(resolve(root,'tool-artifacts/lissajous'),resolve(fixture,'tool-artifacts/lissajous'),'dir');await writeFile(resolve(fixture,'package.json'),'{"type":"module"}');
 await cp(resolve(root,'apps/rack'),resolve(fixture,'apps/rack'),{recursive:true,filter:p=>!p.split('/').some(n=>['node_modules','artifacts','experiments','.rack-sc-libraries'].includes(n))});
 const rackSeed=resolve(fixture,'apps/rack/fixtures/live-set.rack.json');const rackDocument=JSON.parse(await readFile(rackSeed,'utf8'));rackDocument.config.output.mode='off';rackDocument.values={};await writeFile(rackSeed,JSON.stringify(rackDocument));
 await installDiagnostics(fixture);
 execFileSync(process.execPath,[resolve(root,'node_modules/vite/bin/vite.js'),'build','--configLoader','native'],{cwd:resolve(fixture,'apps/rack'),env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},stdio:'pipe'});
 const publicFile=resolve(fixture,'tool-artifacts/scope/0.1.0/public/scope.js');let scope=await readFile(publicFile,'utf8');
 scope=replace(scope,'history.append(packet);','meterCostPackets++;meterCostGapFrames+=meterCostLastEnd===null?0:Math.max(0,packet.sourceEnd-packet.sourceFrames-meterCostLastEnd);meterCostLastEnd=packet.sourceEnd;history.append(packet);');
 if(process.argv.includes('--opacity-scaling')||process.argv.includes('--dropout-bench')){
  scope=replace(scope,"import {OpacityBusWidgets} from './scope-opacity.js';","import {OpacityBusWidgets,OpacityValues} from './scope-opacity.js';");
  scope+=`\nwindow.__opacityWidgetCount=16;
const scalingConfigure=opacityWidgets.configure.bind(opacityWidgets);
opacityWidgets.configure=config=>{
 if(!config){scalingConfigure(null);return;}
 const count=window.__opacityWidgetCount;
 if(![16,32,64,128,512].includes(count))throw new Error('Invalid fixture widget count');
 scalingConfigure({...config,channels:count});
 opacityWidgets.values=new OpacityValues(config.channels,config.rate);
 for(let i=0;i<opacityWidgets.widgets.length;i++){
  const widget=opacityWidgets.widgets[i];widget.ch=i%config.channels;widget.face.dataset.bus=String(config.bus+widget.ch);widget.face.setAttribute('aria-label','Widget '+(i+1)+' observing bus '+(config.bus+widget.ch));
 }
};
\n`;
  const cssFile=resolve(fixture,'tool-artifacts/scope/0.1.0/public/scope.css');
  await writeFile(cssFile,(await readFile(cssFile,'utf8'))+'\nmain{max-width:none}#opacityWidgets{grid-template-columns:repeat(16,minmax(0,1fr));gap:5px}.opacity-card{padding:2px}.opacity-bus,.opacity-size{display:none}.opacity-examples{gap:0;justify-content:center}\n');
 }
 const schedule=process.argv.find(a=>a.startsWith('--meter-schedule='))?.slice(17)||'aligned15';
 if(!['legacy8','aligned15'].includes(schedule))throw new Error('Unknown meter schedule '+schedule);
 if(schedule==='legacy8'){
  scope=replace(scope,"const painter=new ScopePainter({...frameOptions,paint:draw}),meterPainter=new ScopePainter({...frameOptions,fps:15,paint:()=>{if(meterVisible())meters.render();}}),metadata=new ScopeMetadata({hz:8,update:updateMetadata});","const painter=new ScopePainter({paint:draw}),meterPainter={invalidate(){},close(){}},metadata=new ScopeMetadata({hz:8,update:updateMetadata});");
  scope=replace(scope,'function updateMetadata(){','function updateMetadata(){\n if(meterVisible())meters.render();');
 }
 scope+=`\nlet meterCostPackets=0,meterCostGapFrames=0,meterCostLastEnd=null,meterCostAppendMs=0,meterCostDrawMs=0,meterCostWaveMs=0,meterCostLabels=0;const meterCostWaveTimes=[],meterCostMeterTimes=[];let opacityAppendMs=0,opacityDrawMs=0;const opacityTimes=[];
const appendOpacity=opacityWidgets.append.bind(opacityWidgets);opacityWidgets.append=packet=>{const t=performance.now();appendOpacity(packet);opacityAppendMs+=performance.now()-t;};
const drawOpacity=opacityWidgets.render.bind(opacityWidgets);opacityWidgets.render=()=>{const t=performance.now();drawOpacity();opacityDrawMs+=performance.now()-t;opacityTimes.push({at:performance.now(),frame:frameClock.timestamp});if(opacityTimes.length>1024)opacityTimes.shift();};
const appendMeter=meters.append.bind(meters);meters.append=packet=>{const t=performance.now();appendMeter(packet);meterCostAppendMs+=performance.now()-t;};
const drawMeter=meters.render.bind(meters);meters.render=()=>{const t=performance.now();drawMeter();meterCostDrawMs+=performance.now()-t;meterCostMeterTimes.push({at:performance.now(),frame:frameClock.timestamp});if(meterCostMeterTimes.length>1024)meterCostMeterTimes.shift();};
const drawWave=painter.paint;painter.paint=()=>{const t=performance.now();drawWave();meterCostWaveMs+=performance.now()-t;meterCostWaveTimes.push({at:performance.now(),frame:frameClock.timestamp});if(meterCostWaveTimes.length>1024)meterCostWaveTimes.shift();};const labelUpdate=metadata.update;metadata.update=()=>{meterCostLabels++;labelUpdate();};
canvas.style.width='620px';canvas.style.height='240px';canvas.style.flex='none';canvas.style.minHeight='240px';document.querySelector('.scope-display').style.flex='none';rect=canvas.getBoundingClientRect();$('meters').style.gridTemplateColumns='repeat(8,88px)';
window.__meterCost=()=>({now:performance.now(),schedule:${JSON.stringify(schedule)},opacityUpdates:opacityWidgets.updates,opacityWrites:opacityWidgets.writes,opacityAppendMs,opacityDrawMs,opacityTimes,faces:opacityWidgets.widgets.map(w=>({bus:Number(w.face.dataset.bus),size:Number(w.face.dataset.size),value:Number(w.face.style.opacity),rect:{x:w.face.getBoundingClientRect().x,y:w.face.getBoundingClientRect().y,width:w.face.getBoundingClientRect().width,height:w.face.getBoundingClientRect().height}})),meterTimes:meterCostMeterTimes,waveTimes:meterCostWaveTimes,packets:meterCostPackets,gapFrames:meterCostGapFrames,sourceEnd:history.latest?.sourceEnd||0,channels:history.latest?.channels,rate:history.latest?.rate,connection:$('connection').textContent,error:$('error').hidden?null:$('error').textContent,view:$('displayMode').value,wavePaints:Number(canvas.dataset.paints||0),meterUpdates:meters.updates,widgetPaints:meters.paints,labels:meterCostLabels,meterAppendMs:meterCostAppendMs,meterDrawMs:meterCostDrawMs,waveMs:meterCostWaveMs,waveWidth:rect.width,waveHeight:rect.height,canvasBytes:meters.widgets.reduce((n,w)=>n+w.canvas.width*w.canvas.height*4,0),node:typeof require});\n`;
 if(process.argv.includes('--dropout-bench')){
  await cp(resolve(here,'../dropout/graphics-renderer.mjs'),resolve(fixture,'tool-artifacts/scope/0.1.0/public/dropout-graphics.js'));
  const runtimeFile=resolve(fixture,'tool-artifacts/scope/0.1.0/server.mjs');await writeFile(runtimeFile,replace(await readFile(runtimeFile,'utf8'),"const assets=new Map(['index.html'","const assets=new Map(['dropout-graphics.js','index.html'"));
  scope="import {installGraphicsLoad} from './dropout-graphics.js';\n"+scope;
  scope=replace(scope,'history.append(packet);','history.append(packet);dropoutGraphics.invalidate();');
  scope+=`\nconst graphicsContainer=document.createElement('section');graphicsContainer.id='dropoutGraphics';graphicsContainer.hidden=true;document.querySelector('footer').before(graphicsContainer);let dropoutSamples;
const dropoutGraphics=installGraphicsLoad({container:graphicsContainer,frameOptions,getSnapshot:()=>{if(!history.latest)return null;const s=history.view(1024,{reuse:dropoutSamples});dropoutSamples=s.samples;return s;}});
window.__dropoutGraphics=dropoutGraphics;const baseMeterCost=window.__meterCost;window.__meterCost=()=>({...baseMeterCost(),graphics:dropoutGraphics.diagnostics(),viewport:{width:innerWidth,height:innerHeight}});window.addEventListener('pagehide',()=>dropoutGraphics.close());\n`;
 }
 await writeFile(publicFile,scope);
 const userData=resolve(temp,'user-data'),session=resolve(temp,'session.json'),mainFile=resolve(fixture,'apps/awb-shell/shell/main.mjs'),producer=resolve(fixture,process.argv.includes('--dropout-bench')?'apps/awb-shell/test/signal-bench/dropout/producer.scd':'apps/awb-shell/test/signal-bench/meters/producer.scd'),measure=resolve(fixture,process.argv.includes('--dropout-bench')?'apps/awb-shell/test/signal-bench/dropout/diagnostic-measure.mjs':process.argv.includes('--opacity-scaling')?'apps/awb-shell/test/signal-bench/opacity/scaling.mjs':process.argv.includes('--opacity-bench')?'apps/awb-shell/test/signal-bench/opacity/measure.mjs':'apps/awb-shell/test/signal-bench/meters/measure.mjs');let main=await readFile(mainFile,'utf8');
 main=replace(main,'const shellInstanceID =',`app.setPath('userData',${JSON.stringify(userData)});app.commandLine.appendSwitch('force-device-scale-factor','1');\nconst shellInstanceID =`);
 main=replace(main,'if ( smokeHome ) runHomeSmoke().catch( reportFatal );',`if(process.argv.includes('--meter-cost-bench')&&!smokeRunning){smokeRunning=true;(async()=>{await startHeadlessHost();await waitFor(()=>services.firstService(s=>s.hostSnapshot?.().scsynth.status==='ready'),30000);const t=Date.now();while(!(await stat(process.env.METER_COST_SESSION).catch(()=>null))){if(Date.now()-t>35000)throw new Error('Meter producer timeout');await new Promise(r=>setTimeout(r,40));}const {measure}=await import(${JSON.stringify(measure)});await measure({launchFromHome,closeToolView,windows,registry,signalCaptures,services,nativeScHost,homeWindow,renderExecutorWindow,session:JSON.parse(await readFile(process.env.METER_COST_SESSION,'utf8'))});app.quit();})().catch(error=>{console.error(nativeScHost.snapshot().logTail.join("\\n"));reportFatal(error)});}else if ( smokeHome ) runHomeSmoke().catch( reportFatal );`);
 await writeFile(mainFile,main);const bootstrap=resolve(fixture,'apps/awb-shell/sc/AWBHeadlessHost.scd');await writeFile(bootstrap,replace(await readFile(bootstrap,'utf8'),'server.boot;',`${process.argv.includes('--dropout-bench')?'Server.program = \"exec /private/tmp/awb-audit-launch\";\noptions.ugenPluginsPath = [\"/Applications/SuperCollider.app/Contents/Resources/plugins\"];\n':''}thisProcess.interpreter.executeFile(${JSON.stringify(producer)});\nserver.boot;`));
 await cp(resolve(fixture,'apps/rack/src'),output+'.renderers',{recursive:true});
 if(process.argv.includes('--prepare-only')){
  for(const file of [publicFile,mainFile,measure,resolve(fixture,'tool-artifacts/scope/0.1.0/public/dropout-graphics.js')])execFileSync(process.execPath,['--check',file]);
  for(const [p,digest] of Object.entries(guards))if(hash(await readFile(resolve(root,p)))!==digest)throw new Error('Protected source changed: '+p);
  await writeFile(output,JSON.stringify({prepared:true,liveValidated:false,protectedCount:protectedNames.length,sourceHashes:guards,fixtureOnlyInstrumentation:true},null,2));console.log('DROPOUT_FIXTURE_PREPARED: no Electron or SC launched; '+protectedNames.length+' production hashes unchanged');
 }else{
 const env={...process.env,METER_COST_OUTPUT:output,METER_COST_SESSION:session,AWB_HEADLESS_SERVER_PORT:String(await port()),ELECTRON_DISABLE_SECURITY_WARNINGS:'true'};delete env.ELECTRON_RUN_AS_NODE;
 child=spawn(electron,[mainFile,'--meter-cost-bench',`--osc-port=${await port()}`,...process.argv.slice(2)],{cwd:resolve(fixture,'apps/awb-shell'),env,stdio:'inherit'});const timeout=setTimeout(()=>child.kill('SIGTERM'),1200000);
 try{const code=await new Promise((r,j)=>{child.once('exit',r);child.once('error',j)});if(code!==0)throw new Error('Meter benchmark exited '+code);}finally{clearTimeout(timeout);}
 for(const [p,digest] of Object.entries(guards))if(hash(await readFile(resolve(root,p)))!==digest)throw new Error('Protected source changed: '+p);
 const report=JSON.parse(await readFile(output,'utf8'));if(!report.complete||!report.cleanup)throw new Error('Incomplete meter benchmark');for(const [p,digest] of Object.entries(rackGuards))if(hash(await readFile(resolve(root,p)))!==digest)throw new Error('Rack source changed: '+p);report.rackSourceHashes=rackGuards;report.sourceHashes=guards;report.protectedCount=protectedNames.length;report.fixtureOnlyInstrumentation=true;await writeFile(output,JSON.stringify(report,null,2));console.log('METER_COST_GUARDS '+protectedNames.length+' unchanged');
 }
}finally{if(child&&child.exitCode===null)child.kill('SIGTERM');const inventory=execFileSync('/bin/ps',['-axo','pid=,ppid=,command='],{encoding:'utf8'}).trim().split('\n').map(line=>{const [pid,parent,...command]=line.trim().split(/\s+/);return {pid:Number(pid),parent:Number(parent),command:command.join(' ')};});const owned=inventory.filter(p=>p.command.startsWith('/Applications/SuperCollider.app/Contents/MacOS/sclang ')&&p.command.includes(resolve(fixture,'apps/awb-shell/sc/AWBHeadlessHost.scd')));const ownedIDs=new Set(owned.map(p=>p.pid));for(const p of inventory)if(ownedIDs.has(p.parent))ownedIDs.add(p.pid);if(process.env.AWB_LOOPBACK_RECORD)for(const p of inventory)if(p.command.startsWith('/private/tmp/awb-input-record record ')&&p.command.endsWith(' '+process.env.AWB_LOOPBACK_RECORD))ownedIDs.add(p.pid);for(const pid of ownedIDs)try{process.kill(pid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}await rm(temp,{recursive:true,force:true});}
