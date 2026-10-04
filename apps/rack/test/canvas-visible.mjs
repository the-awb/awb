import {createRequire} from 'node:module';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';
import {startRuntime} from '../runtime/shell-runtime.mjs';
const {app,BrowserWindow}=createRequire(import.meta.url)('electron');
app.setPath('userData',path.join(os.tmpdir(),`rack-visible-${process.pid}`));app.on('window-all-closed',()=>{});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'rack-visible-'));let runtime,win,result=0;
 const timeout=setTimeout(()=>app.exit(1),20000);
 try{
  runtime=await startRuntime({runtimeDirectory:path.join(dir,'view')});
  win=new BrowserWindow({width:1700,height:1040,show:false,webPreferences:{backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});
  await win.loadURL(runtime.url);win.showInactive();const js=s=>win.webContents.executeJavaScript(s,true);
  for(let i=0;i<100;i++){if(await js("!!(window.rackDebug&&document.querySelector('.connected')&&document.querySelector('canvas'))"))break;await wait(50);}
  await wait(300);
  const cell=await js("(()=>{const p=document.querySelector('.svg-plane').getBoundingClientRect(),c=document.querySelector('[data-control=\"in0/fx/splut\"]').getBoundingClientRect();return {x:c.x-p.x,y:c.y-p.y,width:c.width,height:c.height};})()");
  const area=await js("(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),width:700,height:400};})()");
  const before=(await win.webContents.capturePage(area)).toBitmap();
  await js("rackDebug.set('in0/fx/splut',64)");await wait(250);
  const first=(await win.webContents.capturePage(area)).toBitmap();let changed=0;
  for(let y=0;y<area.height;y++)for(let x=0;x<area.width;x++){
   const p=(y*area.width+x)*4;
   if(!before.subarray(p,p+4).equals(first.subarray(p,p+4))){changed++;assert.ok(x>=cell.x&&x<cell.x+cell.width&&y>=cell.y&&y<cell.y+cell.height,`Unchanged controls disappeared or changed at ${x},${y}`);}
  }
  assert.ok(changed>10,'control update is painted');
  await js("rackDebug.set('in1/fx/spark',93)");await wait(250);
  const second=(await win.webContents.capturePage(area)).toBitmap();
  for(let y=cell.y;y<cell.y+cell.height;y++)for(let x=cell.x;x<cell.x+cell.width;x++){const p=(y*area.width+x)*4;assert.ok(first.subarray(p,p+4).equals(second.subarray(p,p+4)),'previous control survives a later update');}
  await wait(250);assert.ok(second.equals((await win.webContents.capturePage(area)).toBitmap()),'complete canvas survives idle presentation');
  await mkdir('apps/rack/test/artifacts',{recursive:true});
  await writeFile('apps/rack/test/artifacts/canvas-visible.png',(await win.webContents.capturePage()).toPNG());
  await writeFile('apps/rack/test/artifacts/canvas-visible.json',JSON.stringify({passed:true,onscreen:true,changedPixels:changed,unchangedControlsPreserved:true,idlePreserved:true},null,2));
  console.log('RACK_VISIBLE_CANVAS_PASS');
 }catch(e){console.error(e);result=1;}finally{clearTimeout(timeout);win?.destroy();await runtime?.stop();await rm(dir,{recursive:true,force:true});app.exit(result);}
}).catch(e=>{console.error(e);app.exit(1);});
