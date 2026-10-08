// Real host fixture: no simulated parameters, waveforms or rack transport.
import {app,BrowserWindow} from 'electron';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {startRuntime} from '../runtime/shell-runtime.mjs';
const binding=JSON.parse(readFileSync(process.argv[2]));
const out='/private/tmp/awb-live-delay-audio/browser';
app.setPath('userData',out+'/profile');app.on('window-all-closed',()=>{});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
await mkdir(out,{recursive:true});
let runtime,window;const checks=[],errors=[];
const check=(condition,label)=>{assert.ok(condition,label);checks.push(label);console.log('PASS '+label)};
const wait=async(fn)=>{for(let i=0;i<200;i++){if(await fn())return;await sleep(30)}throw Error('Browser condition timed out')};
try{
 runtime=await startRuntime({runtimeDirectory:out+'/runtime',binding:{instanceID:binding.paramInstanceID,port:binding.port},baseBinding:binding,delayBinding:true,rackBinding:{instanceID:binding.rackInstanceID,libraryID:binding.rackLibraryID,port:binding.port}});
 window=new BrowserWindow({width:1700,height:1040,show:true,webPreferences:{sandbox:true,contextIsolation:true}});
 window.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message)});
 const js=s=>window.webContents.executeJavaScript(s,true);
 await window.loadURL(runtime.url);
 await wait(()=>js("document.querySelector('.connection')?.title==='SC controls connected'"));
 check(runtime.state().connected,'composite inspector binds actual AWParams');
 await wait(()=>window.webContents.mainFrame.frames.filter(f=>f.url.includes('view=tape')).length===4);
 const frames=window.webContents.mainFrame.frames.filter(f=>f.url.includes('view=tape'));
 for(const frame of frames){await wait(()=>frame.executeJavaScript("document.querySelector('#tape-wave')?.dataset.channels==='2'"));}
 check(frames.length===4,'all four native stereo waveform views render');
 let rackFrame;await wait(()=>{rackFrame=window.webContents.mainFrame.frames.find(f=>f.url.includes('embed=1')&&!f.url.includes('view='));return rackFrame});
 await wait(()=>rackFrame.executeJavaScript("document.querySelectorAll('.renderer-pane').length===1"));
 await wait(()=>rackFrame.executeJavaScript("window.rackDebug?.getDocument().config.output.mode==='sc'"));
 check(await rackFrame.executeJavaScript("document.body.textContent.includes('Delay Bus')&&document.body.textContent.includes('SC1')&&document.body.textContent.includes('SC2')"),'native rack exposes Delay Bus and both SC inputs');
 const b1=frames.find(f=>f.url.includes('tape%3AB1'));
 for(const frame of frames)await wait(()=>frame.executeJavaScript("document.querySelectorAll('.knob-card[data-param]').length===8"));
 check(true,'all 32 tape knobs are real AWParam GUI widgets');
 const prior=runtime.state().params.find(p=>p.id==='b1/fbOf');
 check(prior.routes.length>0,'real modulation source appears in feedback inspector');
 await b1.executeJavaScript("document.querySelector('[data-param=\"b1/fbOf\"] .knob').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}))");
 await wait(()=>runtime.state().params.find(p=>p.id==='b1/fbOf').base>prior.base);
 check(runtime.state().params.find(p=>p.id==='b1/fbOf').routes.length===prior.routes.length,'AWParam GUI edit preserves registered source');
 await wait(()=>b1.executeJavaScript("Number(document.querySelector('[data-param=\"b1/fbOf\"] .knob')?.getAttribute('aria-valuenow'))>.31"));
 check(true,'SC-origin AWParam edit reconciles the native delay view');
 await js("[...document.querySelectorAll('button')].find(b=>b.textContent==='Console').click()");
 await wait(()=>js("document.querySelector('.console').textContent.includes('Four delays connected')"));
 check(true,'console displays actual AWBase log');
 await sleep(250);await writeFile(out+'/composite.png',(await window.capturePage()).toPNG());
 check(errors.length===0,'no browser errors');
 window.destroy();window=null;await runtime.stop();runtime=null;
 console.log('AWB_DELAY_BROWSER=PASS checks='+checks.length);
}catch(error){errors.push(error.stack);console.error(error.stack);if(window)await writeFile(out+'/failure.png',(await window.capturePage()).toPNG()).catch(()=>{});}
finally{window?.destroy();await runtime?.stop();await writeFile(out+'/results.json',JSON.stringify({passed:errors.length===0,checks,errors},null,2));app.exit(errors.length?1:0)}
});
