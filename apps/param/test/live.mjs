// Actual private language -> inspector protocol -> shared broker -> browser test.
import {app,BrowserWindow} from 'electron';import {spawn} from 'node:child_process';import {createInterface} from 'node:readline';import {writeFile,mkdir,readFile,rm} from 'node:fs/promises';import path from 'node:path';import dgram from 'node:dgram';import assert from 'node:assert/strict';
import {startRuntime} from '../runtime/shell-runtime.mjs';import {createBridge} from '../runtime/bridge.mjs';import {encode} from '../../awb-shell/src/scBusOsc.mjs';
const output=process.env.AWB_PARAM_TEST_OUTPUT??'/private/tmp/awb-param-live',count=Number(process.env.AWB_PARAM_COUNT??16),conf=process.env.AWB_PARAM_TEST_CONF??'/private/tmp/awb-param-classes/sclang_conf.yaml',engine=process.env.AWB_PARAM_ENGINE??'/Applications/SuperCollider.app/Contents/Resources/scsynth';
let child,runtime,window,langPort,enginePID;const log=[],errors=[],checks=[],socket=dgram.createSocket('udp4');
const wait=async(fn,ms=6000)=>{const until=Date.now()+ms;while(Date.now()<until){if(await fn())return;await new Promise(r=>setTimeout(r,30))}throw Error('Timed out waiting for condition')};
const port=async()=>{const s=dgram.createSocket('udp4');await new Promise(r=>s.bind(0,'127.0.0.1',r));const n=s.address().port;await new Promise(r=>s.close(r));return n};
const tell=op=>new Promise((resolve,reject)=>socket.send(encode('/awb/param/test',[op]),langPort,'127.0.0.1',e=>e?reject(e):resolve()));
const js=source=>window.webContents.executeJavaScript(/^const |^let /.test(source)?`(()=>{${source}})()`:source,true);
const check=(ok,label)=>{assert.ok(ok,label);checks.push(label)};
app.setPath('userData',path.join(output,'electron-profile'));
app.whenReady().then(async()=>{await mkdir(output,{recursive:true});app.on('window-all-closed',()=>{});
try{
 langPort=await port();const serverPort=await port();let binding;
 child=spawn('/Applications/SuperCollider.app/Contents/MacOS/sclang',['-D','-u',String(langPort),'-l',conf,path.resolve('apps/param/test/live-producer.scd')],{env:{...process.env,AWB_HOST_AUTOSTART:'0',AWB_PARAM_COUNT:String(count),AWB_PARAM_SERVER_PORT:String(serverPort),AWB_PARAM_ENGINE:engine},stdio:['ignore','pipe','pipe']});
 const lines=createInterface({input:child.stdout});child.stderr.on('data',b=>log.push(b.toString()));lines.on('line',line=>{log.push(line);if(line.startsWith('PARAM_READY ')){const p=line.split(' ');binding={instanceID:p[1],port:langPort};enginePID=Number(p[2]);console.log(`Private ${path.basename(engine)} ready: ${count} params, ${p[3]} Hz, block ${p[4]}`)}if(line.startsWith('ERROR:'))errors.push(line)});
 await wait(()=>binding||errors.length,25000);assert.equal(errors.length,0,errors.join('\n'));
 runtime=await startRuntime({binding});check(runtime.state().connected,'real SC binding metadata is accepted');check(runtime.state().params.length===count,'all independent parameters received');
 window=new BrowserWindow({width:980,height:800,show:true,webPreferences:{contextIsolation:true,sandbox:true}});window.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)});
 await window.loadURL(runtime.url);await wait(()=>js("document.querySelector('.status')?.textContent==='Connected'"));
 await wait(()=>js("[...document.querySelectorAll('.observed strong')].some(e=>e.textContent!=='—')"));check(true,'actual observed values reach SVG widgets');
 const before=await js("document.querySelector('[data-param=p0] .output').getAttribute('d')");await new Promise(r=>setTimeout(r,250));const after=await js("document.querySelector('[data-param=p0] .output').getAttribute('d')");check(before!==after,'output arc advances from measured control values');
 await js("const e=document.querySelector('[data-param=p0] .knob');e.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));");await wait(()=>runtime.state().params.find(p=>p.id==='p0').base>.25);check(true,'keyboard base edit reaches actual AWParam');
 const base=runtime.state().params.find(p=>p.id==='p0').base;
 await js("const e=document.querySelector('[data-param=p0] input[aria-label=\"p0 Base\"]');e.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'0.99');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));");await new Promise(r=>setTimeout(r,120));check(Math.abs(runtime.state().params.find(p=>p.id==='p0').base-base)<1e-6,'Escape does not commit numeric draft');
 await js("document.querySelector('[data-param=p0] button').click()");await wait(()=>js("document.querySelector('[data-param=p0] .sources')!==null"));check(await js("document.activeElement?.tagName==='INPUT'"),'source panel moves keyboard focus');
 const direct=await createBridge(binding);const snapshot=await direct.bind();await direct.edit('p0','sourceAmount',-.4,'lfo');await wait(()=>runtime.state().params.find(p=>p.id==='p0').routes.find(r=>r.id==='lfo').amount<0);check(true,'registered source edit changes retained SC metadata');
 await direct.edit('p2','sourceCurve',4,'lfo');await wait(()=>runtime.state().params.find(p=>p.id==='p2').routes.find(r=>r.id==='lfo').curve===4);check(true,'plain source edit uses same validated route API');
 await tell('ramps');await new Promise(r=>setTimeout(r,240));const ramp=await js("document.querySelector('[data-param=p0] .amount').getAttribute('d')");await tell('interrupt');await new Promise(r=>setTimeout(r,200));check(ramp!==await js("document.querySelector('[data-param=p0] .amount').getAttribute('d')"),'interrupted amount ramp remains observed');
 await js("document.querySelector('[data-param=p0] .sources').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));");check(await js("document.activeElement===document.querySelector('[data-param=p0] button')"),'source panel returns keyboard focus');
 await window.capturePage().then(i=>writeFile(path.join(output,'svg.png'),i.toPNG()));
 await js("const s=[...document.querySelectorAll('select')][1];s.value='canvas';s.dispatchEvent(new Event('change',{bubbles:true}));");await wait(()=>js("!!document.querySelector('.panel-canvas')"));await new Promise(r=>setTimeout(r,250));const image1=await window.capturePage();await new Promise(r=>setTimeout(r,250));const image2=await window.capturePage();check(!image1.toPNG().equals(image2.toPNG()),'Canvas rendered pixels advance');await writeFile(path.join(output,'canvas.png'),image2.toPNG());
 const other=await startRuntime({binding});check(other.state().params.length===count,'second viewer binds without altering borrowed params');await other.stop();check(runtime.state().connected,'closing second viewer leaves first attached');
 await tell('stats');await wait(()=>log.some(l=>l.startsWith('PARAM_REPLIES ')));check(log.find(l=>l.startsWith('PARAM_REPLIES '))==='PARAM_REPLIES 0','GUI enables no periodic AWParam replies');
 await tell('freeSource');await wait(()=>!runtime.state().params.find(p=>p.id==='p0').routes.some(r=>r.id==='lfo'));check(true,'producer free invalidates registered source row');await direct.close();
 await tell('freeParam');await wait(()=>js("document.querySelector('.status').textContent.includes('closed')"));await wait(()=>!runtime.diagnostics().polling);check(true,'parameter closure invalidates view and releases reader');
 check(errors.length===0,'browser and language logged no errors');
 console.log(`AWB_PARAM_LIVE_RESULT=PASS checks=${checks.length}`);
}catch(e){errors.push(e.stack);console.error(e.stack);process.exitCode=1}
finally{
 window?.destroy();await runtime?.stop();if(child){await tell('quit').catch(()=>{});await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,2500))]);if(child.exitCode===null)child.kill('SIGTERM')}
 socket.close();await writeFile(path.join(output,'live.log'),log.join('\n'));await writeFile(path.join(output,'results.json'),JSON.stringify({passed:errors.length===0,count,engine,enginePID,checks,errors},null,2));app.exit(errors.length?1:0)
}

}).catch(e=>{console.error(e);app.exit(1)});
