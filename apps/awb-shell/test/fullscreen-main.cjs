const {app,BrowserWindow,ipcMain}=require('electron');
const assert=require('node:assert/strict');
const {installWindowControls}=require('../shell/window-controls.cjs');
app.setPath('userData',process.env.AWB_FULLSCREEN_USER_DATA);
installWindowControls({app,BrowserWindow,ipcMain});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){const end=Date.now()+5000;while(!await fn()){if(Date.now()>end)throw Error('Fullscreen transition timed out');await sleep(25);}}
let windows=[];
app.whenReady().then(async()=>{
 for(let i=0;i<2;i++){
  const win=new BrowserWindow({show:false,width:700,height:500,webPreferences:{preload:require('node:path').resolve(__dirname,'../shell/preload.cjs'),contextIsolation:true,sandbox:true}});windows.push(win);
  await win.loadURL('data:text/html,<body>Isolated app '+i+'<iframe src="about:blank"></iframe></body>');
 }
 const [a,b]=windows,js=code=>a.webContents.executeJavaScript(code,true);
 assert.equal(await js(`document.querySelectorAll('#awb-window-controls').length`),1);
 assert.equal(await js(`Boolean(document.querySelector('iframe').contentDocument.querySelector('#awb-window-controls'))`),false);
 assert.equal(await b.webContents.executeJavaScript(`Boolean(document.querySelector('#awb-window-controls'))`),true);
 await js(`document.getElementById('awb-window-controls').shadowRoot.getElementById('fullscreen').click()`);
 await until(()=>a.isFullScreen());await until(async()=>await js(`document.getElementById('awb-window-controls').shadowRoot.getElementById('fullscreen').getAttribute('aria-pressed')`)==='true');
 assert.equal(b.isFullScreen(),false);
 a.webContents.sendInputEvent({type:'keyDown',keyCode:'F11'});a.webContents.sendInputEvent({type:'keyUp',keyCode:'F11'});
 await until(()=>!a.isFullScreen());await until(async()=>await js(`document.getElementById('awb-window-controls').shadowRoot.getElementById('fullscreen').getAttribute('aria-pressed')`)==='false');
 console.log('FULLSCREEN PASS: shared button in two apps; no iframe duplicate; native enter/exit; F11; sender window isolation');
}).then(()=>{windows.forEach(w=>w.destroy());app.exit(0)}).catch(e=>{console.error(e);windows.forEach(w=>w.destroy());app.exit(1)});
