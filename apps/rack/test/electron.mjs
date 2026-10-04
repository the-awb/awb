import {createRequire} from 'node:module';
import {mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import {startRuntime} from '../runtime/shell-runtime.mjs';
const require=createRequire(import.meta.url),{app,BrowserWindow}=require('electron');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const artifacts=path.resolve('apps/rack/test/artifacts');
app.on('window-all-closed',()=>{});
app.setPath('userData',path.join(os.tmpdir(),`rack-electron-${process.pid}`));
app.whenReady().then(async()=>{
const dir=await mkdtemp(path.join(os.tmpdir(),'rack-gui-'));let runtime,win,result=0;
const receiver=dgram.createSocket('udp4'),packets=[];
try{
  await mkdir(artifacts,{recursive:true});
  await new Promise(r=>receiver.bind(0,'127.0.0.1',r));receiver.on('message',b=>packets.push(b));
  runtime=await startRuntime({runtimeDirectory:path.join(dir,'view')});
  win=new BrowserWindow({width:1700,height:1040,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});
  const errors=[];win.webContents.on('console-message',e=>{console.log('RENDERER',e.message);if(e.level==='error'||/error|unhandled|THREE.WebGLProgram/i.test(e.message))errors.push(e.message);});
  await win.loadURL(runtime.url);win.webContents.focus();
  const js=s=>win.webContents.executeJavaScript(s,true);
  for(let i=0;i<100;i++){if(await js("Boolean(window.rackDebug && document.querySelector('canvas') && document.querySelector('.connected'))"))break;await wait(100);}
  assert.equal(await js("Boolean(document.querySelector('canvas'))"),true,'WebGL canvas mounted');
  await wait(250);
  await writeFile(path.join(artifacts,'rack-comparison.png'),(await win.webContents.capturePage()).toPNG());
  assert.equal(await js('rackDebug.store.controls.length'),354);
  assert.equal(await js('rackDebug.store.snapshots.length'),11);
  assert.equal(await js("document.querySelectorAll('[data-rack-scope=instrument]').length"),14,'all channel racks visible by default');
  assert.equal(await js("document.querySelector('[aria-label=\"Instrument view\"]').value"),'all');
  // Exercise real pointer/keyboard events on both surfaces.
  const svg=await js("(()=>{const r=document.querySelector('[data-control=\"in0/fx/splut\"] svg').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};})()");
  win.webContents.sendInputEvent({type:'mouseDown',...svg,button:'left',clickCount:1});await wait(30);
  win.webContents.sendInputEvent({type:'mouseMove',button:'left',modifiers:['leftButtonDown'],x:svg.x,y:svg.y-30});await wait(30);
  win.webContents.sendInputEvent({type:'mouseUp',x:svg.x,y:svg.y-30,button:'left',clickCount:1});
  await wait(60);assert.ok(await js("rackDebug.store.get('in0/fx/splut')>0"),'SVG drag changes value');
  await js("document.querySelector('[data-control=\"in0/fx/splut\"] svg').focus()");
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'End'});await wait(30);
  assert.equal(await js("rackDebug.store.get('in0/fx/splut')"),127);
  const canvas=await js("(()=>{const r=document.querySelector('canvas').getBoundingClientRect();const c=rackDebug.layout.cells.find(c=>c.descriptor.id==='in0/fx/splut');return {x:Math.round(r.x+c.x+14),y:Math.round(r.y+c.y+20)};})()");
  win.webContents.sendInputEvent({type:'mouseDown',...canvas,button:'left',clickCount:1});await wait(30);
  win.webContents.sendInputEvent({type:'mouseMove',button:'left',modifiers:['leftButtonDown'],x:canvas.x,y:canvas.y+30});await wait(30);
  win.webContents.sendInputEvent({type:'mouseUp',x:canvas.x,y:canvas.y+30,button:'left',clickCount:1});
  await wait(60);assert.ok(await js("rackDebug.store.get('in0/fx/splut')<127"),'Canvas drag changes same value');
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Home'});await wait(30);
  assert.equal(await js("rackDebug.store.get('in0/fx/splut')"),0);
  // Text readouts open a native number editor; keyboard editing and blank drafts survive.
  await js("document.querySelector('[data-control=\"in0/fx/splut\"] .control-readout').click()");await wait(40);
  assert.equal(await js("document.activeElement.type"),'number');
  await win.webContents.insertText('49');await wait(50);
  assert.equal(await js("rackDebug.store.get('in0/fx/splut')"),49,'native numeric edit updates the model');
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Up'});await wait(50);
  assert.equal(await js("rackDebug.store.get('in0/fx/splut')"),50,'native numeric arrow step preserved');
  await js("document.activeElement.select()");win.webContents.sendInputEvent({type:'keyDown',keyCode:'Backspace'});await wait(30);
  assert.equal(await js("rackDebug.store.get('in0/fx/splut')"),50,'empty editor draft preserves the model');
  await js("document.activeElement.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));document.querySelector('[data-control=\"in0/fx/splut\"] svg').focus()");await wait(40);
  assert.equal(await js("document.querySelector('[data-control=\"in0/fx/splut\"] .control-readout').textContent"),'50');
  await js("rackDebug.store.set('in0/fx/splut',32,'remote')");await wait(50);
  assert.equal(await js("document.querySelector('[data-control=\"in0/fx/splut\"] svg').getAttribute('aria-valuenow')"),'32');
  await js("document.querySelector('[data-control=\"in0/fx/splut\"] .control-readout').click()");await wait(40);
  assert.equal(await js("document.activeElement.value"),'32','editor opens with the latest remote value');
  await win.webContents.insertText('999');await wait(50);
  assert.equal(await js("rackDebug.store.get('in0/fx/splut')"),127,'native editor still clamps to the region');
  await js("document.activeElement.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));document.querySelector('[data-control=\"in0/fx/splut\"] svg').focus()");await wait(40);
  // A tile update must change pixels only inside the affected canvas control.
  const rect=await js("(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),width:700,height:400};})()");
  const tile=await js("(()=>{const c=rackDebug.layout.cells.find(c=>c.descriptor.id==='in0/fx/splut');return {x:c.x,y:c.y,width:c.width,height:c.height};})()");
  const before=(await win.webContents.capturePage(rect)).toBitmap();
  await js("rackDebug.set('in0/fx/splut',64)");await wait(70);
  const after=(await win.webContents.capturePage(rect)).toBitmap();let changedPixels=0;
  for(let y=0;y<400;y++)for(let x=0;x<700;x++){const p=(y*700+x)*4;if(!before.subarray(p,p+4).equals(after.subarray(p,p+4))){changedPixels++;assert.ok(x>=tile.x&&x<tile.x+tile.width&&y>=tile.y&&y<tile.y+tile.height,`Canvas changed outside its tile at ${x},${y}`);}}
  assert.ok(changedPixels>10,'canvas paints changed control');
  // Populate all rows, then change exactly one value per animation frame.
  await js("(()=>{const s=document.querySelector('[aria-label=\"Instrument view\"]');s.value='all';s.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await wait(200);
  assert.equal(await js("document.querySelectorAll('[data-control]').length"),354);
  assert.equal(await js("document.querySelectorAll('.canvas-plane canvas').length"),1);
  const measured=await js(`(async()=>{rackDebug.reset();let unrelated=0,structure=0;const observer=new MutationObserver(records=>{for(const m of records){const el=m.target.nodeType===1?m.target:m.target.parentElement;const control=el.closest('[data-control]');if(control&&control.dataset.control!=='in0/fx/splut')unrelated++;if(m.type==='childList'&&el.closest('.rack-plane'))structure++;}});observer.observe(document.querySelector('.comparison'),{subtree:true,childList:true,attributes:true,characterData:true});const times=[];let last=performance.now();for(let i=0;i<100;i++){await new Promise(requestAnimationFrame);const t=performance.now();times.push(t-last);last=t;rackDebug.set('in0/fx/splut',i+1);}await new Promise(requestAnimationFrame);observer.disconnect();return {svg:{...rackDebug.svgStats},canvas:{...rackDebug.canvasStats},app:{...rackDebug.appStats},unrelatedDOMMutations:unrelated,structuralDOMMutations:structure,frameMedian:times.sort((a,b)=>a-b)[50],frameP95:times[95]};})()`);
  assert.equal(measured.app.renders,0);assert.equal(measured.svg.rackRenders,0);assert.equal(measured.canvas.hostRenders,0);
  assert.equal(measured.svg.controlRenders,0);assert.deepEqual(measured.svg.perControl,{});assert.equal(measured.svg.valueUpdates,100);assert.deepEqual(Object.keys(measured.svg.perControlUpdates),['in0/fx/splut']);
  assert.equal(measured.canvas.fullFrames,0);assert.equal(measured.canvas.attributeUpdates,100);assert.ok(measured.canvas.tiles>0);
  assert.equal(measured.unrelatedDOMMutations,0);assert.equal(measured.structuralDOMMutations,0);
  await wait(200);assert.equal(runtime.store.get('in0/fx/splut'),100,'rapid changes settle without stale echo');
  await js("document.querySelectorAll('.rack-scroll').forEach(el=>el.scrollTop=el.scrollHeight)");await wait(60);
  assert.equal(await js("document.querySelector('[data-control=\"global/levels/c1\"] svg').getAttribute('height')"),'68','restored large level fader');
  assert.equal(await js("document.querySelector('[data-control=\"global/levels/c1\"] .control-readout').getBoundingClientRect().height"),20,'restored large numeric field');
  await js("rackDebug.set('global/levels/c1',64)");await wait(80);
  await writeFile(path.join(artifacts,'rack-levels-bottom.png'),(await win.webContents.capturePage()).toPNG());
  // Route to a real isolated UDP receiver through the runtime's output adapter.
  const document=runtime.store.document();document.config.output={mode:'legacy',host:'127.0.0.1',port:receiver.address().port};
  await runtime.command({type:'document',document});await wait(80);
  await js("[...document.querySelectorAll('button')].find(b=>b.textContent==='Enable output').click()");await wait(50);
  await js("rackDebug.set('in0/fx/splut',77)");await wait(120);
  assert.equal(packets.length,1);assert.ok(packets[0].includes(Buffer.from('/SET')));assert.ok(packets[0].includes(Buffer.from('/sends/in0/fx/0')));assert.equal(packets[0].readInt32BE(packets[0].length-4),77);
  await js("[...document.querySelectorAll('button')].find(b=>b.textContent==='Snapshot all').click()");await wait(100);
  assert.equal(runtime.store.snapshots.length,12);assert.equal(runtime.store.snapshots.at(-1).targets['in0/fx/splut'].value,77);
  await js("[...document.querySelectorAll('.mix-buttons button')].find(b=>b.textContent.includes('New mix')).click()");await wait(40);
  await js("rackDebug.set('in0/fx/splut',35)");await wait(60);
  await js("[...document.querySelectorAll('button')].find(b=>b.textContent==='Edit mix').click()");await wait(60);
  await js("[...document.querySelectorAll('button')].find(b=>b.textContent==='Recall immediately').click()");await wait(100);
  for(let i=0;i<40;i++){if(await js("rackDebug.store.get('in0/fx/splut')===77"))break;await wait(25);}
  assert.equal(await js("rackDebug.store.get('in0/fx/splut')"),77,'UI snapshot recall restores the captured setting');
  await js("[...document.querySelectorAll('button')].find(b=>b.title==='Define').click()");await wait(30);
  await js("(()=>{const input=[...document.querySelectorAll('label')].find(l=>l.textContent==='Send count').querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'3');input.dispatchEvent(new Event('input',{bubbles:true}));})()");await wait(40);
  await js("[...document.querySelectorAll('button')].find(b=>b.textContent==='Apply & save').click()");await wait(150);
  assert.equal(runtime.store.config.instruments[0].regions[0].destinations.length,3,'UI edits the selected channel send count');assert.equal(runtime.store.config.regions[0].destinations.length,6,'shared defaults unchanged');assert.equal(runtime.store.controls.filter(d=>d.instrument==='in1'&&d.region.id==='fx').length,6,'other channel sends unchanged');assert.equal(runtime.store.controls.length,351);assert.equal(runtime.state().armed,false,'configuration change disarms output');
  assert.deepEqual(errors,[],'renderer has no shader or runtime errors');
  await writeFile(path.join(artifacts,'verification.json'),JSON.stringify({passed:true,channelRacks:14,controls:354,snapshots:12,canvasCount:1,independentChannelEditing:true,changedPixels,measured,oscPackets:packets.length,errors},null,2));
  console.log('RACK_ELECTRON_PASS '+JSON.stringify({controls:354,measured,oscPackets:packets.length}));
}catch(e){console.error(e);result=1;}finally{win?.destroy();receiver.close();await runtime?.stop();await rm(dir,{recursive:true,force:true});app.exit(result);}

}).catch(e=>{console.error(e);app.exit(1);});
