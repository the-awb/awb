import {createRequire} from 'node:module';import {spawn} from 'node:child_process';import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';
const {app,BrowserWindow,dialog}=createRequire(import.meta.url)('electron');
const build=process.env.AWB_RACK_SC_TEST_ROOT;if(!build)throw Error('SC test evidence root is required.');
const dir=await mkdtemp(path.join(os.tmpdir(),'rack-sc-shell-'));app.setPath('userData',dir);const wait=ms=>new Promise(r=>setTimeout(r,ms));let log='',lastScript='';
app.on('web-contents-created',(_,contents)=>contents.on('console-message',e=>{if(e.level==='error')console.error('RENDERER',contents.getURL(),e.message);}));
await rm(path.join(build,'test/bridge-ready.json'),{force:true});
const child=spawn('/Applications/SuperCollider.app/Contents/MacOS/sclang',['-l',path.join(build,'sclang_conf.yaml'),path.join(build,'test/bridge.scd')]);child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
let binding;for(let i=0;i<100;i++){try{binding=JSON.parse(await readFile(path.join(build,'test/bridge-ready.json'),'utf8'));break;}catch{}if(child.exitCode!==null)throw Error(log);await wait(50);}assert.ok(binding,log);
Object.assign(process.env,{AWB_RACK_SC_PORT:String(binding.port),AWB_RACK_INSTANCE_ID:binding.instanceID,AWB_RACK_LIBRARY_ID:binding.libraryID,AWB_RACK_SC_LIBRARY_ROOT:path.join(dir,'mixes')});
process.argv.push('--tool=rack','--profile=standalone','--origin=supercollider',`--tool-instance=${binding.instanceID}`,`--owner-pid=${child.pid}`,'--osc-port=0');
await import('../../awb-shell/shell/main.mjs');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{child.kill('SIGTERM');console.error('SC Shell verification timed out.');app.exit(1);},25000);
  try {
    let win;for(let i=0;i<100;i++){
      for(const candidate of BrowserWindow.getAllWindows()){
        if(candidate.webContents.getURL().startsWith('http://127.0.0.1:')&&await candidate.webContents.executeJavaScript('!!(window.rackDebug&&window.awbHost&&document.querySelector(".connected"))').catch(()=>false)){win=candidate;break;}
      }
      if(win)break;await wait(100);
    }
    assert.ok(win,'SC rack opened through the normal Shell runtime registry');
    const js=async s=>{lastScript=s;return await win.webContents.executeJavaScript(s,true);};
    const result=await js('({host:!!window.awbHost,controls:rackDebug.store.controls.length,channelRacks:document.querySelectorAll("[data-rack-scope=instrument]").length,canvases:document.querySelectorAll(".canvas-plane canvas").length,connected:!!document.querySelector(".connected"),context:window.awbHost.initialLaunchContext(),mode:rackDebug.store.config.output.mode,instanceID:rackDebug.store.config.output.instanceID})');
    assert.equal(result.host,true);assert.equal(result.controls,18);assert.equal(result.channelRacks,2);assert.equal(result.canvases,1);assert.equal(result.connected,true);assert.equal(result.mode,'sc');assert.equal(result.instanceID,binding.instanceID);assert.equal(result.context.toolInstanceID,binding.instanceID);assert.equal(result.context.owner.pid,child.pid);assert.equal(result.context.launchOrigin,'supercollider');
    const exported=path.join(dir,'sc-export.rack.json');dialog.showSaveDialog=async()=>({canceled:false,filePath:exported});await js('[...document.querySelectorAll("button")].find(b=>b.textContent==="Export").click()');let saved;for(let i=0;i<50;i++){try{saved=JSON.parse(await readFile(exported,'utf8'));break;}catch{}await wait(30);}assert.equal(saved.config.output.mode,'sc');assert.equal(Object.keys(saved.values).length,18);
    saved.snapshots=[{id:'shell-sparse',label:'Shell native import',sceneID:'opening',duration:0,targets:{'a/fx/mast':{value:.375,fraction:0,alignment:'L'},'b/fx/mast':null}}];const imported=path.join(dir,'sc-import.rack.json');await writeFile(imported,JSON.stringify(saved));dialog.showOpenDialog=async()=>({canceled:false,filePaths:[imported]});await js('[...document.querySelectorAll("button")].find(b=>b.textContent==="Import").click()');for(let i=0;i<50;i++){if(await js('rackDebug.store.snapshots.length===1'))break;await wait(30);}assert.equal(await js('rackDebug.store.snapshots[0].targets["b/fx/mast"]'),null);
    await js('[...document.querySelectorAll("button")].find(b=>b.textContent==="Enable output").click()');await wait(50);await js('document.querySelector("[data-mix=shell-sparse]").click()');await wait(100);
    await js('document.querySelector(".native-rack").open=true;[...document.querySelectorAll("button")].find(b=>b.textContent==="Sync from SC").click()');await wait(120);assert.equal(await js('rackDebug.store.get("a/fx/mast")'),.375);
    const artifacts=path.join(build,'test/artifacts');await mkdir(artifacts,{recursive:true});await writeFile(path.join(artifacts,'sc-shell.json'),JSON.stringify({passed:true,nativeImportExport:true,liveSCRecall:true,...result},null,2));await writeFile(path.join(artifacts,'sc-shell.png'),(await win.webContents.capturePage()).toPNG());console.log('AWB_RACK_SC_SHELL_RESULT=PASS');clearTimeout(timeout);child.kill('SIGTERM');app.quit();
  }catch(e){clearTimeout(timeout);console.error(e);console.error("FAILED SCRIPT",lastScript);console.error(BrowserWindow.getAllWindows().map(w=>w.webContents.getURL()));child.kill('SIGTERM');process.exitCode=1;app.quit();}
}).catch(e=>{console.error(e);child.kill('SIGTERM');app.exit(1);});
app.on('will-quit',()=>{void rm(dir,{recursive:true,force:true});});
