// Synthetic Electron UI fixture. No SC server, microphone, audio output or other tools.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ScopeTransport} from '../../../../tool-artifacts/shared-loop/0.1.0/scope-transport.mjs';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../..');
const require=createRequire(resolve(root,'package.json')),{app,BrowserWindow}=require('electron');
const base=resolve(root,'tool-artifacts/shared-loop/0.1.0/public');
const out=process.env.AWB_SCOPE_UI_OUTPUT||'/private/tmp/awb-scope-trace-modes';
app.commandLine.appendSwitch('force-device-scale-factor','1');app.setPath('userData',out+'/user-data');app.on('window-all-closed',()=>{});
let server,transport,timer,win;const errors=[],requests=[];
async function evaluate(code){return win.webContents.executeJavaScript(code);}
async function until(code){for(let i=0;i<100;i++){if(await evaluate(code))return;await delay(30);}throw new Error('Timed out: '+code);}
async function inspect(){return evaluate(`(()=>{const c=document.querySelector('#scope');return {mode:c.dataset.traceMode,disabled:document.querySelector('#traceMode').disabled,format:c.dataset.format,sourceEnd:c.dataset.renderedSourceEnd,missing:c.dataset.missingSourceFrames,frames:c.dataset.visibleFrames,level:document.querySelector('#level').textContent,image:c.toDataURL()};})()`);}
async function change(mode){await evaluate(`document.querySelector('#traceMode').value=${JSON.stringify(mode)};document.querySelector('#traceMode').dispatchEvent(new Event('change'));void 0;`);await delay(80);return inspect();}
async function screenshot(name){await writeFile(out+'/'+name+'.png',(await win.webContents.capturePage()).toPNG());}
async function run(){try{
 await mkdir(out,{recursive:true});await app.whenReady();
 server=http.createServer(async(req,res)=>{try{
  const file=new URL(req.url,'http://localhost').pathname.slice(1);
  if(req.method==='POST'){requests.push(JSON.parse(await new Promise(r=>{let body='';req.on('data',b=>body+=b);req.on('end',()=>r(body));})));res.writeHead(200,{'Content-Type':'application/json'});res.end('{}');return;}
  if(!['scope.html','scope.js','scope-history.js','scope-painter.js','scope-metadata.js','scope-trace.js','scope-protocol.js','scope.css','style.css'].includes(file)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(await readFile(base+'/'+file));
 }catch(e){res.writeHead(500);res.end(String(e));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));transport=new ScopeTransport(server,1);
 let sequence=0,micReduced=false;
 const audioRate=44100,controlRate=audioRate/64;
 const control=new Float32Array(128*6);
 for(let ch=0;ch<6;ch++)for(let i=0;i<128;i++)control[ch*128+i]=i>=60&&i<64?NaN:ch<2?.8*Math.sin(2*Math.PI*(ch?10:1)*i/controlRate):((Math.floor(i/(20-ch*3))*37+ch*11)%17-8)/10;
 const raw=new Float32Array(1024);for(let i=0;i<raw.length;i++)raw[i]=i>=480&&i<496?NaN:.7*Math.sin(i*.071);
 const bounds=new Float32Array(256*2);for(let i=0;i<256;i++){const values=raw.subarray(i*4,i*4+4);bounds[i*2]=Math.min(...values);bounds[i*2+1]=Math.max(...values);}
 const publish=()=>{sequence++;transport.publish({
  control:{frames:128,sourceFrames:128,sourceEnd:sequence*128,format:'samples',channels:6,sourceChannels:6,sampleRate:controlRate,audioSampleRate:audioRate,blockSize:64,sequence,samples:control,peaks:[1,1,1,1,1,1],rms:[.5,.5,.5,.5,.5,.5]},
  mic:{frames:micReduced?256:1024,sourceFrames:1024,sourceEnd:sequence*1024,format:micReduced?'minmax':'samples',channels:1,sourceChannels:1,sampleRate:audioRate,sequence,samples:micReduced?bounds:raw,peaks:[.7],rms:[.5]}
 },{connected:true});};publish();timer=setInterval(publish,33);
 const results=[];
 for(const kind of ['control','mic']){
  win=new BrowserWindow({width:720,height:kind==='control'?640:520,show:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  win.webContents.on('console-message',e=>{if(e.level>=2)errors.push(e.message);});
  await win.loadURL(`http://127.0.0.1:${server.address().port}/scope.html?kind=${kind}&fps=30`);
  await until(`document.querySelector('#scope').dataset.format==='samples'&&Number(document.querySelector('#scope').dataset.missingSourceFrames)===${kind==='control'?4:16}`);
  if(kind==='control'){await evaluate(`document.querySelector('#signals').value='fast';document.querySelector('#signals').dispatchEvent(new Event('change'));void 0;`);await delay(180);}
  await evaluate(`document.querySelector('#freeze').click();void 0;`);await delay(100);
  const connected=await inspect();assert.equal(connected.mode,'connected');assert.equal(connected.disabled,false);await screenshot(kind+'-connected');
  const requestCount=requests.length,stepped=await change('stepped');assert.equal(stepped.mode,'stepped');assert.notEqual(connected.image,stepped.image);await screenshot(kind+'-stepped');
  const restored=await change('connected');assert.equal(restored.image,connected.image);
  for(const state of [stepped,restored])for(const field of ['sourceEnd','missing','frames','level'])assert.equal(state[field],connected[field],kind+' '+field);
  assert.equal(requests.length,requestCount,'Mode selection must not change capture');
  await evaluate(`document.querySelector('#zoom').value='1';document.querySelector('#zoom').dispatchEvent(new Event('change'));document.querySelector('#pan').value='50';document.querySelector('#pan').dispatchEvent(new Event('input'));void 0;`);
  await delay(100);const cropped=await inspect();assert.equal(cropped.sourceEnd,connected.sourceEnd);assert.equal(Number(cropped.frames),Number(connected.frames)/2);
  const croppedStep=await change('stepped');assert.notEqual(cropped.image,croppedStep.image);assert.equal(croppedStep.sourceEnd,cropped.sourceEnd);
  assert.equal(await evaluate(`document.querySelector('footer').getBoundingClientRect().bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight`),true,'Selector must fit viewport');
  if(kind==='mic'){
   await evaluate(`document.querySelector('#freeze').click();document.querySelector('#zoom').value='-2';document.querySelector('#zoom').dispatchEvent(new Event('change'));void 0;`);micReduced=true;
   await until(`document.querySelector('#scope').dataset.format==='minmax'&&document.querySelector('#traceMode').disabled`);
   assert.match(await evaluate(`document.querySelector('#traceMode').title`),/Min\/max envelope/);
   micReduced=false;await evaluate(`document.querySelector('#zoom').value='0';document.querySelector('#zoom').dispatchEvent(new Event('change'));void 0;`);await until(`document.querySelector('#scope').dataset.format==='samples'&&!document.querySelector('#traceMode').disabled`);
   assert.equal((await inspect()).mode,'stepped','Raw mode survives reduced audio');
  }
  const strip=({image,...state})=>state;results.push({kind,connected:strip(connected),stepped:strip(stepped),restoredPixels:true,frozenZoomPan:true,modeCaptureRequests:0});
  win.destroy();win=null;await delay(80);
 }
 assert.deepEqual(errors,[]);await delay(100);assert.equal(transport.clients.size,0);
 await writeFile(out+'/results.json',JSON.stringify({synthetic:true,audioRate,blockSize:64,controlRate,results,errors,unrelatedTools:0},null,2));console.log('AWB_SCOPE_TRACE_MODES_READY '+JSON.stringify(results));
}catch(e){console.error(e);process.exitCode=1;}finally{if(win&&!win.isDestroyed())win.destroy();clearInterval(timer);await transport?.close();if(server)await new Promise(r=>server.close(r));app.exit(process.exitCode||0);}}
run().catch(e=>{console.error(e);app.exit(1)});
