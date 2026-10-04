import {createRequire} from 'node:module';import {spawn} from 'node:child_process';import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';
import {startRuntime} from '../runtime/shell-runtime.mjs';
import dgram from 'node:dgram';import {encodeOSC} from '../runtime/sc-bridge.mjs';
const {app,BrowserWindow}=createRequire(import.meta.url)('electron');app.setPath('userData',path.join(os.tmpdir(),`rack-sc-gui-${process.pid}`));app.on('window-all-closed',()=>{});const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
  const build=process.env.AWB_RACK_SC_TEST_ROOT;if(!build)throw Error('AWB_RACK_SC_TEST_ROOT required.');
  const dir=await mkdtemp(path.join(os.tmpdir(),'rack-sc-gui-')),artifacts=path.join(build,'test/artifacts');let child,runtime,win,log='',status=0;const evidence={};
  const timeout=setTimeout(()=>{child?.kill('SIGTERM');app.exit(1);},45000);
  try {
    await rm(path.join(build,'test/bridge-ready.json'),{force:true});
    child=spawn('/Applications/SuperCollider.app/Contents/MacOS/sclang',['-l',path.join(build,'sclang_conf.yaml'),path.join(build,'test/bridge.scd')]);child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
    let binding;for(let i=0;i<100;i++){try{binding=JSON.parse(await readFile(path.join(build,'test/bridge-ready.json'),'utf8'));break;}catch{}if(child.exitCode!==null)throw Error(log);await wait(50);}assert.ok(binding,log);
    runtime=await startRuntime({runtimeDirectory:path.join(dir,'view'),scBinding:binding});
    win=new BrowserWindow({width:1600,height:1050,show:false,webPreferences:{backgroundThrottling:false,sandbox:true,contextIsolation:true,nodeIntegration:false}});const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});await win.loadURL(runtime.url);win.showInactive();const js=s=>win.webContents.executeJavaScript(s,true);
    for(let i=0;i<100;i++){if(await js('!!(window.rackDebug&&document.querySelector(".connected"))'))break;await wait(50);}
    assert.equal(await js('rackDebug.store.controls.length'),16);assert.equal(await js('document.querySelectorAll("[data-rack-scope=instrument]").length'),2);assert.equal(await js('document.querySelectorAll("canvas").length'),1);
    win.webContents.debugger.attach('1.3');const cdp=(m,p)=>win.webContents.debugger.sendCommand(m,p);
    const button=async text=>{await js(`[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(text)}).click()`);await wait(120);};
    const click=async selector=>{const point=await js(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'nearest',inline:'nearest'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});await wait(50);};
    const text=async(selector,value)=>{await click(selector);await js('document.activeElement.select()');await cdp('Input.insertText',{text:value});await wait(100);};
    const key=async key=>{await cdp('Input.dispatchKeyEvent',{type:'keyDown',key});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key});await wait(50);};
    await button('Enable output');await js("rackDebug.set('a/fx/mast',.375);rackDebug.set('b/fx/mast',.25)");await wait(100);
    await button('Snapshot all');assert.equal(Object.values(runtime.store.snapshots[0].targets).filter(Boolean).length,16);
    await button('Select snapshot');await click('[data-control="a/fx/mast"] svg');await button('Make snapshot');assert.equal(Object.values(runtime.store.snapshots[1].targets).filter(Boolean).length,1);assert.equal(runtime.store.snapshots[1].targets['b/fx/mast'],null);
    for(const view of ['HTML / SVG','Three.js canvas']){
      await button(view);await js('rackDebug.reset()');
      const value=view==='HTML / SVG'?.432:.543,socket=dgram.createSocket('udp4');
      await new Promise((resolve,reject)=>socket.send(encodeOSC({address:'/awb/rack/test',args:[binding.instanceID,'gui-external',value]}),binding.port,'127.0.0.1',e=>e?reject(e):resolve()));socket.close();
      for(let i=0;i<60;i++){if(Math.abs(await js('rackDebug.store.get("a/fx/mast")')-value)<1e-6)break;await wait(20);}await wait(80);
      assert.ok(Math.abs(await js('rackDebug.store.get("a/fx/mast")')-value)<1e-6);
      const feedback=await js('({app:rackDebug.appStats.renders,svg:rackDebug.svgStats.rackRenders,canvas:rackDebug.canvasStats.hostRenders,paints:rackDebug.svgStats.valueUpdates,frames:rackDebug.canvasStats.frames})');
      assert.equal(feedback.app,0);assert.equal(feedback.svg,0);assert.equal(feedback.canvas,0);
      if(view==='HTML / SVG'){assert.ok(feedback.paints>0);assert.equal(Number(await js(`document.querySelector('[data-control="a/fx/mast"] svg').getAttribute("aria-valuenow")`)),value);}else assert.ok(feedback.frames>0);
      evidence[view+' SC feedback']={value,feedback};
      await button('Edit mix');
      await text('[data-mix-control="a/fx/mast"] [data-mix-field="amount"]','.55');assert.ok(Math.abs(runtime.store.get('a/fx/mast')-.55)<1e-6);
      await key('ArrowDown');assert.equal(await js('document.activeElement.closest("[data-mix-control]").dataset.mixControl'),'a/fx/fx1');
      await key('ArrowUp');await key('Tab');assert.equal(await js('document.activeElement.dataset.mixField'),'time');await key('Tab');assert.equal(await js('document.activeElement.dataset.mixField'),'alignment');
      await js('rackDebug.reset()');await text('[data-mix-control="a/fx/mast"] [data-mix-field="amount"]','.6');
      const counters=await js('({app:rackDebug.appStats.renders,svg:rackDebug.svgStats.rackRenders,canvas:rackDebug.canvasStats.hostRenders})');assert.deepEqual(counters,{app:0,svg:0,canvas:0});
      await button('Save edits');await button('Done');await runtime.command({type:'sync-sc'});assert.ok(Math.abs(runtime.store.get('a/fx/mast')-.6)<1e-6);evidence[view]={liveSCEdit:true,keyboard:true,counters};
    }
    await button('Side by side');await js('document.querySelector(".native-rack").open=true');await wait(100);
    const slot=await js('[...document.querySelectorAll(".native-slot")].find(e=>e.querySelector("strong").textContent==="FX 1").outerHTML');assert.ok(slot.includes('Empty'));
    await js('[...document.querySelectorAll(".native-slot")].find(e=>e.querySelector("strong").textContent==="FX 1").querySelector("button").click()');await wait(200);assert.equal(runtime.state().sc.slots.find(s=>s.id==='fx1').active,1);
    await js("rackDebug.reset();rackDebug.set('a/fx/mast',.75)");await wait(120);assert.equal(await js('rackDebug.appStats.renders'),0);assert.equal(await js('rackDebug.svgStats.rackRenders'),0);assert.equal(await js('rackDebug.canvasStats.hostRenders'),0);
    await button('Sync from SC');assert.ok(Math.abs(runtime.store.get('a/fx/mast')-.75)<1e-6);assert.equal(runtime.store.snapshots[1].targets['a/fx/mast'].value,.6);assert.deepEqual(errors,[]);
    await mkdir(artifacts,{recursive:true});await writeFile(path.join(artifacts,'sc-rack.png'),(await win.webContents.capturePage()).toPNG());evidence.passed=true;evidence.errors=errors;evidence.controls=16;await writeFile(path.join(artifacts,'sc-electron.json'),JSON.stringify(evidence,null,2));console.log('AWB_RACK_SC_GUI_RESULT=PASS');
  }catch(e){console.error(e);status=1;await mkdir(artifacts,{recursive:true});if(win)await writeFile(path.join(artifacts,'sc-failure.png'),(await win.webContents.capturePage()).toPNG());}
  finally{clearTimeout(timeout);win?.destroy();await runtime?.stop();if(child&&child.exitCode===null)child.kill('SIGTERM');await rm(dir,{recursive:true,force:true});app.exit(status);}
}).catch(e=>{console.error(e);app.exit(1);});
