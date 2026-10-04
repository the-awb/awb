import {createRequire} from 'node:module';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{app,BrowserWindow,dialog}=require('electron');
const dir=await mkdtemp(path.join(os.tmpdir(),'rack-shell-'));
app.setPath('userData',dir);
process.argv.push('--tool=rack','--profile=standalone','--origin=desktop','--osc-port=0');
await import('../../awb-shell/shell/main.mjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{console.error('Rack shell verification timed out.');app.exit(1);},20000);
  try{
    let win;
    for(let i=0;i<100;i++){
      win=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('http://127.0.0.1:'));
      if(win&&await win.webContents.executeJavaScript('Boolean(window.rackDebug && window.awbHost && document.querySelector(".connected"))').catch(()=>false))break;
      await wait(100);
    }
    assert.ok(win,'rack window opened through shell runtime registry');
    const result=await win.webContents.executeJavaScript(`({host:!!window.awbHost,controls:rackDebug.store.controls.length,channelRacks:document.querySelectorAll('[data-rack-scope=instrument]').length,canvases:document.querySelectorAll('.canvas-plane canvas').length,connected:!!document.querySelector('.connected'),context:window.awbHost.initialLaunchContext()})`);
    assert.equal(result.host,true);assert.equal(result.connected,true);assert.equal(result.controls,354);assert.equal(result.channelRacks,14);assert.equal(result.canvases,1);
    // Exercise the real shell file grants and save/read IPC, with dialog responses
    // supplied by the test rather than opening a chooser on the user's desktop.
    const exported=path.join(dir,'exported.rack.json');
    dialog.showSaveDialog=async()=>({canceled:false,filePath:exported});
    await win.webContents.executeJavaScript("[...document.querySelectorAll('button')].find(b=>b.textContent==='Export').click()");
    let saved;for(let i=0;i<50;i++){try{saved=JSON.parse(await readFile(exported,'utf8'));break;}catch{}await wait(30);}
    assert.equal(saved.schema,'awb.rack-library/1');assert.equal(Object.keys(saved.values).length,354);
    saved.config.instruments=saved.config.instruments.slice(0,1);saved.config.regions[0].destinations=saved.config.regions[0].destinations.slice(0,4);
    const imported=path.join(dir,'imported.rack.json');await writeFile(imported,JSON.stringify(saved));
    dialog.showOpenDialog=async()=>({canceled:false,filePaths:[imported]});
    await win.webContents.executeJavaScript("[...document.querySelectorAll('button')].find(b=>b.textContent==='Import').click()");
    for(let i=0;i<50;i++){if(await win.webContents.executeJavaScript('rackDebug.store.config.instruments.length===1'))break;await wait(30);}
    assert.equal(await win.webContents.executeJavaScript('rackDebug.store.controls.length'),40);
    result.nativeImportExport=true;
    await writeFile('apps/rack/test/artifacts/shell-verification.json',JSON.stringify({passed:true,...result},null,2));
    await writeFile('apps/rack/test/artifacts/shell-rack.png',(await win.webContents.capturePage()).toPNG());
    console.log('RACK_SHELL_PASS '+JSON.stringify(result));
    clearTimeout(timeout);app.quit();
  }catch(e){console.error(e);app.exit(1);}
}).catch(e=>{console.error(e);app.exit(1);});
app.on('will-quit',()=>{void rm(dir,{recursive:true,force:true});});
