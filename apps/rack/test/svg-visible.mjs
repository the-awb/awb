import {createRequire} from 'node:module';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';
import {startRuntime} from '../runtime/shell-runtime.mjs';
const {app,BrowserWindow}=createRequire(import.meta.url)('electron');
app.setPath('userData',path.join(os.tmpdir(),`rack-svg-visible-${process.pid}`));app.on('window-all-closed',()=>{});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'rack-svg-visible-'));let runtime,win,status=0;
 const timeout=setTimeout(()=>app.exit(1),25000);
 try{
  runtime=await startRuntime({runtimeDirectory:path.join(dir,'view')});
  win=new BrowserWindow({width:1400,height:1040,show:false,webPreferences:{backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});
  const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
  await win.loadURL(runtime.url);win.showInactive();const js=s=>win.webContents.executeJavaScript(s,true);
  for(let i=0;i<100;i++){if(await js('!!(window.rackDebug&&document.querySelector(".connected"))'))break;await wait(50);}
  await js("[...document.querySelectorAll('button')].find(b=>b.textContent==='HTML / SVG').click()");await wait(150);
  win.webContents.debugger.attach('1.3');const cdp=(method,params)=>win.webContents.debugger.sendCommand(method,params);
  const first='in0/fx/splut',second='in0/fx/spark';
  await js(`rackDebug.store.set('${first}',32,'remote')`);await wait(50);
  const point=await js(`(()=>{const r=document.querySelector('[data-control="${first}"] .control-readout').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
  await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});await wait(50);
  assert.equal(await js('document.activeElement.type'),'number','browser pointer opens the native number editor');
  assert.equal(await js('document.activeElement.value'),'32','editor starts at current commanded value');
  await js('document.activeElement.select()');await cdp('Input.insertText',{text:'84'});await wait(50);
  assert.equal(await js(`rackDebug.store.get('${first}')`),84,'browser text input updates the model');
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
  await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});await wait(50);
  assert.equal(await js(`rackDebug.store.get('${first}')`),85,'native spinbutton keyboard step');
  // Tab leaves the editor and the next knob receives keyboard focus.
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await wait(50);
  assert.equal(await js('document.activeElement.closest("[data-control]")?.dataset.control'),second,'Tab advances to the next control');
  assert.equal(await js(`getComputedStyle(document.querySelector('[data-control="${first}"] .control-value')).display`),'none','editor closes on native blur');
  assert.equal(await js(`document.querySelector('[data-control="${first}"] .control-readout').textContent`),'85');
  // Same-frame changes coalesce and settle at the latest value without replacing nodes.
  const burst=await js(`(async()=>{rackDebug.reset();const r=document.querySelector('[data-control="${first}"]'),old=r.querySelector('.control-readout').firstChild;for(let v=1;v<=100;v++)rackDebug.store.set('${first}',v,'remote');await new Promise(requestAnimationFrame);return {value:r.querySelector('.control-readout').textContent,aria:r.querySelector('svg').getAttribute('aria-valuenow'),sameTextNode:r.querySelector('.control-readout').firstChild===old,updates:rackDebug.svgStats.valueUpdates,frames:rackDebug.svgStats.paintFrames,controlRenders:rackDebug.svgStats.controlRenders};})()`);
  assert.deepEqual(burst,{value:'100',aria:'100',sameTextNode:true,updates:1,frames:1,controlRenders:0});
  // Unmount with a pending paint, then remount at the latest store value.
  await js(`rackDebug.store.set('${first}',91,'remote');[...document.querySelectorAll('button')].find(b=>b.textContent==='Three.js canvas').click()`);await wait(80);
  assert.equal(await js('document.querySelectorAll("[data-control]").length'),0);
  await js("[...document.querySelectorAll('button')].find(b=>b.textContent==='HTML / SVG').click()");await wait(80);
  assert.equal(await js(`document.querySelector('[data-control="${first}"] .control-readout').textContent`),'91');
  const area=await js('(()=>{const r=document.querySelector(".svg-plane").getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),width:700,height:400};})()');
  const cell=await js(`(()=>{const p=document.querySelector('.svg-plane').getBoundingClientRect(),r=document.querySelector('[data-control="${first}"]').getBoundingClientRect();return {x:r.x-p.x,y:r.y-p.y,width:r.width,height:r.height};})()`);
  const pixelsBefore=(await win.webContents.capturePage(area)).toBitmap();
  await js(`rackDebug.store.set('${first}',62,'remote')`);await wait(60);
  assert.equal(await js(`document.querySelector('[data-control="${first}"] svg').getAttribute('aria-valuenow')`),'62');
  const pixelsAfter=(await win.webContents.capturePage(area)).toBitmap();let changedPixels=0;
  for(let y=0;y<400;y++)for(let x=0;x<700;x++){const i=(y*700+x)*4;if(!pixelsBefore.subarray(i,i+4).equals(pixelsAfter.subarray(i,i+4))){changedPixels++;assert.ok(x>=cell.x&&x<cell.x+cell.width&&y>=cell.y&&y<cell.y+cell.height,`SVG changed outside its control at ${x},${y}`);}}
  assert.ok(changedPixels>10,'SVG geometry and number readout visibly change');
  assert.deepEqual(errors,[]);
  await mkdir('apps/rack/test/artifacts',{recursive:true});
  await writeFile('apps/rack/test/artifacts/svg-visible.json',JSON.stringify({passed:true,nativeBrowserPointer:true,nativeNumberEditing:true,nativeTabAndBlur:true,burst,remount:true,changedPixels,errors},null,2));
  await writeFile('apps/rack/test/artifacts/svg-visible.png',(await win.webContents.capturePage()).toPNG());
  console.log('RACK_VISIBLE_SVG_PASS');
 }catch(e){console.error(e);status=1;}finally{clearTimeout(timeout);win?.destroy();await runtime?.stop();await rm(dir,{recursive:true,force:true});app.exit(status);}
}).catch(e=>{console.error(e);app.exit(1);});
