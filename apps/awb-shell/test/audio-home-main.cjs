const {app,BrowserWindow,ipcMain}=require('electron');
const path=require('node:path'),assert=require('node:assert/strict');
app.setPath('userData',process.env.AWB_AUDIO_GUI_USER_DATA);
const settings={inputDevice:'1248',outputDevice:'1248',sampleRate:44100,inputChannels:2,outputChannels:2};
let snapshot={host:{sclang:{status:'attached',mode:'headless'},scsynth:{status:'unavailable'},synthDefs:{status:'ready'},nodeManager:{status:'disabled'},control:{status:'ready',mode:'headless',audioLifecycle:true,audio:{state:'stopped',settings,inputDevices:['1248'],outputDevices:['1248','BlackHole 2ch']}}},audioSettings:settings,nativeScHost:{owned:true,logTail:['sclang: boot error <script>'],logStart:0,logEnd:1},tools:[],views:[],failures:[]},requests=[];
ipcMain.handle('fixture-request',async(_event,operation,payload)=>{
 requests.push({operation,payload});
 if(operation==='shell.snapshot')return snapshot;
 if(operation==='shell.audio-settings'){snapshot.audioSettings=payload;return payload;}
 return {};
});
const until=async fn=>{for(let i=0;i<150;i++){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,20));}throw Error('GUI condition timed out');};
app.whenReady().then(async()=>{
 const win=new BrowserWindow({width:1100,height:900,show:false,webPreferences:{preload:path.join(__dirname,'audio-home-preload.cjs'),contextIsolation:true,nodeIntegration:false}});
 await win.loadFile(path.join(__dirname,'../home/index.html'));
 const js=code=>win.webContents.executeJavaScript(code);
 const refresh=()=>win.webContents.send('fixture-change',{type:'shell-registry-changed'});
 let checks=0;const check=(answer)=>{assert.ok(answer);checks++;};
 await until(async()=>await js(`document.querySelector('#audio-form').elements.outputDevice.value==='1248'`));
 check(await js(`document.querySelector('#audio-form').elements.sampleRate.value==='44100'`));
 check(await js(`document.querySelector('#output-devices option').value==='1248'`));
 check(await js(`document.querySelector('#console-output').textContent.includes('<script>')&&!document.querySelector('#console-output script')`));
 check(await js(`!document.querySelector('[data-server-action=start]').disabled`));
 await js(`document.querySelector('#audio-form').elements.outputDevice.value='BlackHole 2ch'`);refresh();
 await new Promise(resolve=>setTimeout(resolve,80));check(await js(`document.querySelector('#audio-form').elements.outputDevice.value==='BlackHole 2ch'`));
 await js(`document.querySelector('#audio-form').requestSubmit()`);await until(()=>requests.some(r=>r.operation==='shell.audio-settings'));
 check(requests.find(r=>r.operation==='shell.audio-settings').payload.outputDevice==='BlackHole 2ch');
 check(requests.find(r=>r.operation==='shell.audio-settings').payload.sampleRate===44100);
 for(const action of ['start','stop','restart']){
  await until(async()=>await js(`!document.querySelector('[data-server-action=${action}]').disabled`));
  await js(`document.querySelector('[data-server-action=${action}]').click()`);
  await until(()=>requests.some(r=>r.operation==='shell.server'&&r.payload.action===action));check(true);
 }
 await until(async()=>await js(`!document.querySelector('[data-host-action=restart-headless]').disabled`));
 await js(`document.querySelector('[data-host-action=restart-headless]').click()`);await until(()=>requests.some(r=>r.operation==='shell.restart-headless-sc'));check(true);
 snapshot.host.control.audio.state='ready';refresh();await until(async()=>await js(`document.querySelector('#save-audio').disabled`));
 check(await js(`document.querySelector('[data-server-action=start]').disabled`));
 snapshot.host.control.audio.state='failed';snapshot.host.control.audio.lastError='Audio driver failed';refresh();
 await until(async()=>await js(`document.querySelector('#host-message').textContent==='Audio driver failed'`));check(true);
 check(await js(`document.querySelectorAll('.host-fact')[1].textContent.includes('failed')`));
 await js(`document.querySelector('#console-follow').click()`);snapshot.nativeScHost.logTail.push('sclang: after pause');snapshot.nativeScHost.logEnd=2;refresh();await new Promise(resolve=>setTimeout(resolve,80));
 check(await js(`!document.querySelector('#console-output').textContent.includes('after pause')`));
 await js(`document.querySelector('#console-follow').click()`);check(await js(`document.querySelector('#console-output').textContent.includes('after pause')`));
 await js(`document.querySelector('#console-clear').click()`);snapshot.nativeScHost.logTail.push('sclang: new line');snapshot.nativeScHost.logEnd=3;refresh();
 await until(async()=>await js(`document.querySelector('#console-output').textContent==='sclang: new line'`));check(true);
 snapshot.host.control.mode='ide';refresh();await until(async()=>await js(`document.querySelector('[data-server-action=restart]').disabled`));check(await js(`document.querySelector('#save-audio').disabled`));
 snapshot.host.control.status='unavailable';snapshot.host.scsynth.status='ready';refresh();
 await until(async()=>await js(`document.querySelectorAll('.host-fact')[1].textContent.includes('unavailable')`));check(true);
 check(await js(`document.querySelector('[data-server-action=start]').disabled`));
 snapshot.host.control.status='ready';snapshot.host.scsynth.status='unavailable';
 snapshot.host.control.mode='headless';snapshot.host.control.audio.state='stopped';snapshot.host.control.audio.lastError=null;refresh();
 await new Promise(resolve=>setTimeout(resolve,100));await js(`document.querySelector('#audio-setup').open=true;document.querySelector('#host-console').open=true`);
 win.showInactive();await new Promise(resolve=>setTimeout(resolve,100));
 require('node:fs').writeFileSync('/tmp/awb-audio-home.png',(await win.webContents.capturePage()).toPNG());
 console.log('AUDIO_HOME_GUI_PASS '+checks+' checks');app.quit();
}).catch(error=>{console.error(error);app.exit(1);});
