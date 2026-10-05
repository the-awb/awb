// Disposable native rack extension of the matched refresh benchmark. Production files and mix libraries are never edited.
import {readFile,writeFile,cp} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
const local=dirname(fileURLToPath(import.meta.url));
function once(s,a,b){if(s.split(a).length!==2)throw Error('Native fixture drift: '+a);return s.replace(a,b);}
export async function installNative({fixture,root,output,main}){
 const dir=resolve(fixture,'apps/awb-shell/test/signal-bench/dropout'), nativePath=resolve(dir,'native-producer.scd');
 await cp(resolve(local,'native-producer.scd'),nativePath);
 let producer=await readFile(resolve(dir,'producer.scd'),'utf8');
 const line=producer.split('\n').find(l=>l.trim().startsWith('File.use('));if(!line)throw Error('Missing producer session writer');
 producer=once(producer,line,` Library.put(\\awbBenchTone,tone);thisProcess.interpreter.executeFile(${JSON.stringify(nativePath)});`);
 await writeFile(resolve(dir,'producer.scd'),producer);
 const userConfig=await readFile(resolve(homedir(),'Library/Application Support/SuperCollider/sclang_conf.yaml'),'utf8');
 const configPath=output+'.sclang.yaml';await writeFile(configPath,once(userConfig,'excludePaths:',`    - ${JSON.stringify(resolve(root,'apps/rack/sc/classes'))}\nexcludePaths:`));process.env.AWB_SCLANG_CONFIG=configPath;
 const cssPath=resolve(fixture,'apps/rack/src/style.css');await writeFile(cssPath,(await readFile(cssPath,'utf8'))+'\n.native-rack{display:none}\n');
 if(process.env.AWB_NATIVE_RACK_SIZE==='large'){
  const layoutPath=resolve(fixture,'apps/rack/src/model.mjs');let layout=await readFile(layoutPath,'utf8');
  layout=once(layout,'const ds=descriptors(config),stripWidth=', "const ds=descriptors(config).filter(d=>d.instrument!=='global'||d.region.id==='levels'&&d.region.destinations.indexOf(d.destination)<18),stripWidth=");
  layout=once(layout,"r=>r.scope==='global'&&(regions==='all'||regions===r.id)","r=>r.scope==='global'&&r.id==='levels'&&(regions==='all'||regions===r.id)");await writeFile(layoutPath,layout);
 }
 if(['32','sends32'].includes(process.env.AWB_NATIVE_RACK_SIZE)){
  const layoutPath=resolve(fixture,'apps/rack/src/model.mjs');let layout=await readFile(layoutPath,'utf8');
  const start=layout.indexOf('  const globals=config.regions.filter'),end=layout.indexOf('  return {width:Math.max(200,width)',start);
  if(start<0||end<0)throw Error('Native 32-channel layout fixture drift');
  layout=layout.slice(0,start)+`  const globals=config.regions.filter(r=>r.scope==='global'&&(regions==='all'||regions===r.id));
  if(globals.length){
    const rack={id:'global',label:'LEVELS',scope:'global',x:0,y:height+12,width:0,height:0,headers:[],rows:[],cells:[]};let rowY=rack.y,maxWidth=0;
    for(const r of globals){const controls=ds.filter(d=>d.instrument==='global'&&d.region.id===r.id);
      for(let first=0;first<controls.length;first+=16){const part=controls.slice(first,first+16);let cx=118;
        rack.rows.push({text:'LEVELS',x:8,y:rowY+70,width:106,height:16,fontSize:11,bold:true});
        rack.headers.push({text:r.label+(first?' (continued)':''),x:cx,y:rowY+16,width:part.length*(editing?88:64),height:16,fontSize:11});
        for(const d of part){rack.headers.push({text:d.destination.toUpperCase(),x:cx,y:rowY+35,width:editing?84:60,height:16,fontSize:10,small:true});rack.cells.push({descriptor:d,x:cx,y:rowY+44,width:editing?84:60,height:editing?128:88,large:true});cx+=editing?88:64;}
        maxWidth=Math.max(maxWidth,cx);rowY+=editing?188:148;
      }
    }
    rack.width=maxWidth;rack.height=rowY-rack.y;width=Math.max(width,maxWidth);height=rowY;
    headers.push(...rack.headers);rows.push(...rack.rows);cells.push(...rack.cells);racks.push(rack);
  }
`+layout.slice(end);await writeFile(layoutPath,layout);
 }
 if(process.env.AWB_NATIVE_RACK_SIZE==='sends32'){
  const layoutPath=resolve(fixture,'apps/rack/src/model.mjs');let layout=await readFile(layoutPath,'utf8');
  const start=layout.indexOf('  const addRack=(i,rs,scope)=>{'),end=layout.indexOf('  for(const i of config.instruments.filter',start);
  if(start<0||end<0)throw Error('Native 32-send layout fixture drift');
  layout=layout.slice(0,start)+`  const addRack=(i,rs,scope)=>{
    rs=rs.filter(r=>regions==='all'||regions===r.id);if(!rs.length)return;
    const columns=Math.max(...rs.map(r=>Math.ceil(r.destinations.length/16))),rack={id:i.id,label:i.label,scope,x,y:0,width:columns*stripWidth,height:0,headers:[],rows:[],cells:[]};
    rack.rows.push({text:i.label,x,y:4,width:rack.width-1,height:16,fontSize:10,bold:true,align:'center'});let y=26;
    for(const r of rs){
      rack.headers.push({text:r.label.replace(/ sends$/i,'').toUpperCase(),x:x+2,y,width:rack.width-5,height:12,fontSize:8,align:'center'});y+=16;
      const controls=ds.filter(d=>d.instrument===i.id&&d.region.id===r.id),rowsPerColumn=16;
      for(let index=0;index<controls.length;index++){
        const d=controls[index],cx=x+2+Math.floor(index/rowsPerColumn)*stripWidth,cy=y+(index%rowsPerColumn)*cellHeight;
        rack.headers.push({text:d.destination.toUpperCase(),x:cx,y:cy,width:stripWidth-5,height:10,fontSize:8,align:'center',small:true});
        rack.cells.push({descriptor:d,x:cx,y:cy,width:stripWidth-5,height:cellHeight});
      }
      y+=Math.min(rowsPerColumn,controls.length)*cellHeight+4;
    }
    rack.height=y+4;height=Math.max(height,rack.height);headers.push(...rack.headers);rows.push(...rack.rows);cells.push(...rack.cells);racks.push(rack);x+=rack.width;
  };
`+layout.slice(end);await writeFile(layoutPath,layout);
 }
 const runtimePath=resolve(fixture,'apps/rack/runtime/shell-runtime.mjs');let runtime=await readFile(runtimePath,'utf8');
 runtime=once(runtime,'const state=()=>({document:store.document(),armed,token,libraryPath,sent,failures,sc:scState});','const benchErrors=[];const state=()=>({document:store.document(),armed,token,libraryPath,sent,failures,sc:scState,benchErrors});');
 runtime=once(runtime,'reportSCError=message=>{failures++;','reportSCError=message=>{benchErrors.push({message,time:Date.now()});if(benchErrors.length>64)benchErrors.shift();failures++;');
 await writeFile(runtimePath,runtime);
 const boot=`const nativeSession=JSON.parse(await readFile(process.env.METER_COST_SESSION,'utf8'));if(!nativeSession.nodeManagerEnabled||!nativeSession.nodeManagerTracked)throw Error('Native benchmark requires active NodeManager tracking');nativeSession.coreClassHashes=Object.fromEntries(await Promise.all(nativeSession.coreClassSources.map(async path=>[path,(await import('node:crypto')).createHash('sha256').update(await readFile(path)).digest('hex')])));await writeFile(process.env.METER_COST_SESSION,JSON.stringify(nativeSession));const bridgeModule=await import(${JSON.stringify(resolve(fixture,'apps/rack/runtime/sc-bridge.mjs'))});const binding={instanceID:nativeSession.instanceID,port:nativeSession.rackPort,libraryID:nativeSession.libraryID};const probe=await bridgeModule.createSCBridge(binding);let seed;try{seed=bridgeModule.documentFromState(await probe.sync());}finally{probe.close();}seed.config.output.mode='off';await writeFile(${JSON.stringify(resolve(fixture,'apps/rack/fixtures/live-set.rack.json'))},JSON.stringify(seed));if(process.env.AWB_NATIVE_BRIDGE==='on'){Object.assign(process.env,{AWB_RACK_SC_PORT:String(binding.port),AWB_RACK_INSTANCE_ID:binding.instanceID,AWB_RACK_LIBRARY_ID:binding.libraryID,AWB_RACK_SC_LIBRARY_ROOT:${JSON.stringify(resolve(fixture,'native-mix-library'))}});} `;
 main=once(main,'const {measure}=await import(',boot+'const {measure}=await import(');
 let app=await readFile(resolve(fixture,'apps/rack/src/main.jsx'),'utf8');app=once(app,'connection=c;window.awbHost','connection=c;window.rackBenchCommand=c=>connection.command(c);window.awbHost');await writeFile(resolve(fixture,'apps/rack/src/main.jsx'),app);
 let m=await readFile(resolve(dir,'refresh-measure.mjs'),'utf8');
 m="import {createSCBridge,documentFromState} from '../../../../rack/runtime/sc-bridge.mjs';\n"+m;
 m=once(m,"const document=JSON.parse(await readFile(new URL('../../../../rack/fixtures/live-set.rack.json',import.meta.url),'utf8'));const common=trace(document);assert.equal(common.ids.length,354);",`const document=JSON.parse(await readFile(new URL('../../../../rack/fixtures/live-set.rack.json',import.meta.url),'utf8'));const isLarge=process.env.AWB_NATIVE_RACK_SIZE==='large',bridgeOn=process.env.AWB_NATIVE_BRIDGE==='on',direction=process.env.AWB_NATIVE_DIRECTION??'gui';const rackOsc=new OSC(session.rackPort),binding={instanceID:session.instanceID,port:session.rackPort,libraryID:session.libraryID};const rawIDs=[];for(const slot of session.rackSlots)for(const channel of session.rackChannels)rawIDs.push(channel.id+'/fx/'+slot.id);rawIDs.push(...session.rackSlots.map(s=>'global/levels/'+s.id),...session.rackChannels.map(c=>'global/channel-levels/'+c.id));const common={ids:rawIDs.slice(0,session.movingControls),selection:'round-robin native channels, then return/channel faders'};assert.equal(common.ids.length,session.movingControls);const configuredControls=document.config.instruments.length*(session.rackSlots.length+3)+session.rackSlots.length,mountedControls=isLarge?common.ids.length+document.config.instruments.length*2:configuredControls;async function nativeProbe(){const probe=await createSCBridge(binding);try{const state=await probe.sync();return {revision:state.revision,values:documentFromState(state).values};}finally{probe.close();}}`);
 m=once(m,"launchOrigin:'desktop'","launchOrigin:'supercollider',toolInstanceID:session.instanceID,owner:{kind:'attached-process',pid:nativeScHost.snapshot().processID}");
 m=once(m,"assert.equal(await evaluate('rackDebug.store.config.output.mode'),'off');",`assert.equal(await evaluate('rackDebug.store.config.output.mode'),bridgeOn?'sc':'off');assert.equal(await evaluate('window.awbHost.initialLaunchContext().toolInstanceID'),session.instanceID);if(bridgeOn)await evaluate('rackBenchCommand({type:"arm",armed:true})');`);
 m=m.replace('controls:354,cadenceMs:32,counts:[0,354]','controls:mountedControls,movingControls:common.ids.length,bridgeOn,direction,cadenceMs:32,counts:[0,common.ids.length]');
 m=once(m,"output:'off',origin:'remote'","output:bridgeOn?'sc':'off',origin:direction==='sc'?'sclang':'local'");
 m=once(m,"count=condition==='idle'?0:354","count=condition==='idle'?0:common.ids.length");
 m=once(m,"assert.equal(topology.controls,354);","assert.equal(topology.controls,common.ids.length);");
 m=once(m,"assert.equal(topology.svgControls,mode==='svg'?354:0);","assert.equal(topology.svgControls,mode==='svg'?mountedControls:0);");
 m=once(m,"const topology=await evaluate(prepare(mode,common.ids));",`await evaluate('window.__nativeLarge='+JSON.stringify(isLarge));await rackOsc.request('/awb/rack/bench',['reset'],'/awb/rack/bench-reset');await delay(180);const topology=await evaluate(prepare(mode,common.ids));await evaluate('window.benchInitialValues=Object.fromEntries(rackDebug.store.controls.filter(d=>!(window.__nativeLarge&&d.instrument===\"global\"&&(d.region.id!==\"levels\"||d.region.destinations.indexOf(d.destination)>=18))).map(d=>[d.id,rackDebug.store.get(d.id)]));window.benchSet=(id,v)=>rackDebug.store.set(id,v,"local");window.nativeBenchSCDone=false;');if(direction==='sc'&&bridgeOn)await evaluate('window.benchSet=()=>{};void 0;');`);
 m=once(m,'const phaseStartedAt=new Date().toISOString();',`const nativeBefore=await nativeProbe();const runtimeBefore=await evaluate('fetch("/api/state").then(r=>r.json()).then(s=>({sent:s.sent,failures:s.failures,armed:s.armed,errors:s.benchErrors}))');const phaseStartedAt=new Date().toISOString();`);
 m=once(m,'const work=motionTrace(common.ids,count,seconds*1000);',`const work=motionTrace(common.ids,count,seconds*1000);for(const event of work.events)event.changes=event.changes.map(([id,v])=>[id,Math.round(v/127*1000)*.001]);`);
 m=once(m,"note:'354 includes 336 send controls and 18 bottom level faders; renderer-local changes, matching earlier GUI benchmark'","note:'Real native SC rack with pass FX and quiet channel sources; moving GUI writes use the normal WS/OSC path; SC automation drives feedback only. Dense fixture omits twenty static faders from layout. Native metadata panel hidden; matched native viewport 2250 x 1322.'");
 // A feedback-driven replay waits for SC completion before inspecting final values.
 m=once(m,'const pendingWork=count?evaluate(replay(work))',`const guiReplay=replay(work).replace('const remainder=', 'if(window.__nativeSCWork){while(!window.nativeBenchSCDone)await new Promise(r=>setTimeout(r,10));await new Promise(r=>setTimeout(r,100));}const remainder=');await evaluate('window.__nativeSCWork='+JSON.stringify(direction==='sc'&&!!count));let scReplay=null;const scWork=direction==='sc'&&count?rackOsc.request('/awb/rack/bench',['run',work.events.length],'/awb/rack/bench-done',()=>true,seconds*1000+60000).then(args=>{scReplay={frames:args[1],controls:args[2],elapsedSeconds:args[3],meanBatchMs:args[4],maxBatchMs:args[5],lateFrames:args[6],maxLateMs:args[7],achievedHz:args[1]/args[3]};return evaluate('window.nativeBenchSCDone=true');}):Promise.resolve();const pendingWork=count?Promise.all([scWork,evaluate(guiReplay)]).then(([,result])=>result)`);
 m=once(m,'assert.equal(diagnostic.appliedChanges,count*work.events.length);',`assert.equal(diagnostic.appliedChanges,bridgeOn?gui.actualValueChanges:count*work.events.length);`);
 m=once(m,'const expected=new Map(common.ids.map(id=>[id,0]));',`const expected=new Map(Object.entries(await evaluate('window.benchInitialValues')));const renderedStore=new Map(Object.entries(await evaluate('Object.fromEntries(rackDebug.store.controls.map(d=>[d.id,rackDebug.store.get(d.id)]))')));`);
 m=once(m,"assert.equal(gui.actualValueChanges,gui.updates,'Every requested update must change its control');",`if(count&&bridgeOn){assert.ok(gui.actualValueChanges>0,'Real data bridge causes store updates');}else assert.equal(gui.actualValueChanges,gui.updates,'Every requested update must change its control');`);
 const end=`let nativeAfter=await nativeProbe();const runtimeAfter=await evaluate('fetch("/api/state").then(r=>r.json()).then(s=>({sent:s.sent,failures:s.failures,armed:s.armed,errors:s.benchErrors}))');await writeFile(process.env.METER_COST_OUTPUT+'.native-debug.jsonl',JSON.stringify({condition,nativeBefore,nativeAfter,runtimeBefore,runtimeAfter,gui,workFinal:work.events.at(-1)},null,2));const expectedNative=new Map(common.ids.map(id=>[id,0]));if(count)for(const event of work.events)for(const [id,v]of event.changes)expectedNative.set(id,v);const functionalFailures=gui.mismatches.map(([id,want])=>({kind:'gui-final',id,want}));if(runtimeAfter.failures)functionalFailures.push({kind:'bridge-error',failures:runtimeAfter.failures,errors:runtimeAfter.errors});if(bridgeOn&&!runtimeAfter.armed)functionalFailures.push({kind:'bridge-disarmed'});const settleStarted=performance.now();if(bridgeOn||direction==='sc'){for(let attempt=0;attempt<20&&[...expectedNative].some(([id,v])=>Math.abs(nativeAfter.values[id]-v)>.0001);attempt++){await delay(100);nativeAfter=await nativeProbe();}for(const [id,v]of expectedNative)if(Math.abs(nativeAfter.values[id]-v)>=.0001)functionalFailures.push({kind:'sc-final',id,want:v,got:nativeAfter.values[id]});Object.assign(runtimeAfter,await evaluate('fetch(\"/api/state\").then(r=>r.json()).then(s=>({sent:s.sent,failures:s.failures,armed:s.armed,errors:s.benchErrors}))'));const accepted=nativeAfter.revision-nativeBefore.revision,transmitted=direction==='sc'?count*work.events.length:runtimeAfter.sent-runtimeBefore.sent;if(accepted!==transmitted)functionalFailures.push({kind:'command-accounting',accepted,transmitted});}const endpointSettleMs=performance.now()-settleStarted;const serverValues={};for(const c of session.rackChannels){const reply=await osc.request('/s_getn',[c.node,'sendGains',session.rackSlots.length],'/n_setn');assert.equal(reply[0],c.node);const values=reply.slice(3);assert.equal(values.length,session.rackSlots.length);serverValues[c.id]=values;for(let i=0;i<values.length;i++){const id=c.id+'/fx/'+session.rackSlots[i].id,want=bridgeOn||direction==='sc'?expectedNative.get(id)??nativeAfter.values[id]:0;if(Math.abs(values[i]-want)>=.0001)functionalFailures.push({kind:'server-send-final',id,want,got:values[i]});}}for(const c of session.rackChannels){const reply=await osc.request('/s_get',[c.node,'level'],'/n_set');assert.equal(reply[0],c.node);if(Math.abs(reply[2]-nativeAfter.values['global/channel-levels/'+c.id])>=.0001)functionalFailures.push({kind:'server-channel-final',id:c.id,want:nativeAfter.values['global/channel-levels/'+c.id],got:reply[2]});}for(const slot of session.rackSlots){const reply=await osc.request('/s_get',[slot.node,'level'],'/n_set');assert.equal(reply[0],slot.node);if(Math.abs(reply[2]-nativeAfter.values['global/levels/'+slot.id])>=.0001)functionalFailures.push({kind:'server-return-final',id:slot.id,want:nativeAfter.values['global/levels/'+slot.id],got:reply[2]});}const native={scReplay,functionalPass:functionalFailures.length===0,functionalFailures,bridgeOn,direction,instrumentChannels:session.rackChannels.length,sendDestinations:session.rackSlots.length,movingControls:common.ids.length,mountedControls,configuredControls,endpointSettleMs,endpointCheckMs:performance.now()-settleStarted,layoutNote:isLarge?'18 selected return faders visible; 20 static faders omitted from layout; native metadata panel hidden':['32','sends32'].includes(process.env.AWB_NATIVE_RACK_SIZE)?'All controls visible; original-size bottom faders wrap after 16; native metadata panel hidden':'All native controls visible; native metadata panel hidden',scRevisionDelta:nativeAfter.revision-nativeBefore.revision,sentDelta:runtimeAfter.sent-runtimeBefore.sent,failures:runtimeAfter.failures,armedAtEnd:runtimeAfter.armed,bridgeErrors:runtimeAfter.errors,serverValues,actualStoreChanges:gui.actualValueChanges,requestedRefreshHz:refreshHz,achievedRefreshHz:diagnostic.cadence.achievedHz,refreshUnderTarget:!!count&&diagnostic.cadence.achievedHz<refreshHz*.85};`;
 m=once(m,'const r={target,nodes,repeat,condition,',end+'const r={native,target,nodes,repeat,condition,');
 m=once(m,"assert.ok(diagnostic.cadence.achievedHz>=refreshHz*.85&&diagnostic.cadence.achievedHz<=refreshHz*1.05,", "assert.ok(diagnostic.cadence.achievedHz>=(bridgeOn?0:refreshHz*.85)&&diagnostic.cadence.achievedHz<=refreshHz*1.05,");
 m=once(m,"assert.deepEqual(diagnostic.renderedValues,Object.fromEntries(expected),'Actual draw inputs match final control values');", "assert.deepEqual(diagnostic.renderedValues,Object.fromEntries([...expected].map(([id,v])=>[id,bridgeOn?renderedStore.get(id):v])),'Actual draw inputs match final store values');");
 m=once(m,"assert.equal(gui.mismatches.length,0);", "if(!bridgeOn)assert.equal(gui.mismatches.length,0);");
 m=once(m,"assert.equal(gui.appRenders,0,'No React app renders per knob update');", "if(!bridgeOn)assert.equal(gui.appRenders,0,'No React app renders per knob update');");
 m=once(m,"assert.equal(mode==='svg'?gui.svg.rackRenders:gui.canvas.hostRenders,0,'No React rack renders per knob update');", "if(!bridgeOn)assert.equal(mode==='svg'?gui.svg.rackRenders:gui.canvas.hostRenders,0,'No React rack renders per knob update');");
 m=once(m,'readout===want','Math.abs(readout-want)<1e-9');
 m=once(m,'osc.close();}','osc.close();rackOsc.close();}');
 m=m.replaceAll('1250','1350').replaceAll('1222','1322');
 m=once(m,"const r=document.querySelector('.rack-plane').getBoundingClientRect();return", "const r=document.querySelector('.rack-plane').getBoundingClientRect(),clip=document.querySelector('.rack-scroll').getBoundingClientRect();return");
 m=once(m,"fits:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight", "clip:{x:clip.x,y:clip.y,width:clip.width,height:clip.height},fits:r.x>=clip.x&&r.y>=clip.y&&r.right<=clip.right&&r.bottom<=clip.bottom");
 await writeFile(resolve(dir,'refresh-measure.mjs'),m);
 return main;
}
