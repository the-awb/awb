// Isolated synthetic image-equivalence checks; actual HTTP assets, no SC/audio.
import {createRequire} from 'node:module';
import http from 'node:http';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ScopeTransport} from '../../../../../tool-artifacts/shared-loop/0.1.0/scope-transport.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../../..');
const require=createRequire(resolve(root,'package.json')),{app,BrowserWindow}=require('electron');
const dpr=process.argv.find(a=>a.startsWith('--dpr='))?.slice(6)||'1';
const stages=process.env.AWB_SCOPE_STAGES||resolve(root,'apps/awb-shell/test/signal-bench/scope-next/stages'),out='/private/tmp/awb-scope-next-fidelity'+(dpr==='1'?'':'-'+dpr);
app.setPath('userData',out+'/user-data');app.commandLine.appendSwitch('force-device-scale-factor',dpr);app.on('window-all-closed',()=>{});
let server,transport,timer,win,active='baseline';const errors=[];
async function evaluate(code){return win.webContents.executeJavaScript(code);}
async function until(code){for(let i=0;i<100;i++){if(await evaluate(code))return;await delay(20);}throw new Error('Timed out: '+code);}
async function main(){try{
 await mkdir(out,{recursive:true});await app.whenReady();
 server=http.createServer(async(req,res)=>{try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(req.method==='POST'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{}');return;}
  const parts=path.slice(1).split('/'),stage=parts.length===2?parts[0]:active,file=parts.at(-1)==='scope'?'scope.html':parts.at(-1);
  if(!['baseline','geometry','cached','ring'].includes(stage)||!['scope.html','scope.js','scope.css','style.css','scope-history.js','scope-trace.js','scope-painter.js','scope-metadata.js','scope-protocol.js'].includes(file)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(await readFile(resolve(stages,stage,file)));
 }catch(e){res.writeHead(500);res.end(String(e));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));transport=new ScopeTransport(server,1);
 const samples=new Float32Array(2048*6);
 for(let ch=0;ch<6;ch++)for(let i=0;i<2048;i++)samples[ch*2048+i]=i>=940&&i<972?NaN:ch<2?.85*Math.sin(2*Math.PI*(ch?10:1)*i/(44100/64)):((Math.floor(i/(41-ch*6))*37+ch*11)%17-8)/10;
 let sequence=0;const publish=()=>{sequence++;transport.publish({control:{frames:2048,sourceFrames:2048,sourceEnd:sequence*2048,channels:6,sourceChannels:6,sampleRate:44100/64,audioSampleRate:44100,blockSize:64,format:'samples',samples,peaks:[1,1,1,1,1,1],rms:[.5,.5,.5,.5,.5,.5],sequence}},{connected:true});};publish();timer=setInterval(publish,80);
 const results=[],reference=new Map();
 for(const stage of ['baseline','geometry','cached','ring']){
  active=stage;win=new BrowserWindow({width:720,height:640,show:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  win.webContents.on('console-message',e=>{if(e.level>=2)errors.push(e.message);});
  await win.loadURL(`http://127.0.0.1:${server.address().port}/scope?kind=control&fps=30`);
  await until(`document.querySelector('#scope').dataset.format==='samples'`);
  await evaluate(`document.querySelector('#zoom').value='-4';document.querySelector('#zoom').dispatchEvent(new Event('change'));void 0;`);
  await until(`document.querySelector('#scope').dataset.frames==='2048'`);await delay(100);
  await evaluate(`document.querySelector('#freeze').click();void 0;`);await delay(60);
  for(const selection of ['all','noise','fast'])for(const mode of ['connected','stepped']){
   await evaluate(`document.querySelector('#signals').value='${selection}';document.querySelector('#signals').dispatchEvent(new Event('change'));document.querySelector('#traceMode').value='${mode}';document.querySelector('#traceMode').dispatchEvent(new Event('change'));void 0;`);await delay(60);
   const image=await evaluate(`document.querySelector('#scope').toDataURL()`),key=selection+':'+mode;
   if(stage==='baseline')reference.set(key,image);else assert.equal(image,reference.get(key),stage+' page pixels '+key);
   results.push({stage,selection,mode,identical:true});
  }
  if(stage==='ring')await writeFile(out+'/wide.png',(await win.webContents.capturePage()).toPNG());
  const before=await evaluate(`Number(document.querySelector('#scope').dataset.backgroundBuilds||0)`);
  await evaluate(`document.querySelector('#freeze').click();void 0;`);await delay(500);
  if(['cached','ring'].includes(stage))assert.equal(await evaluate(`Number(document.querySelector('#scope').dataset.backgroundBuilds||0)`),before,'Background must not rebuild for incoming frames');
  win.destroy();win=null;await delay(80);
 }
 // Unknown sequences, clipping and true time gaps must retain identical raster pixels.
 active='ring';win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});await win.loadURL(`http://127.0.0.1:${server.address().port}/scope?kind=control`);
 const traces=await evaluate(`(async()=>{
  const old=(await import('/baseline/scope-trace.js')).paintScopeTrace,next=(await import('/geometry/scope-trace.js')).paintScopeTrace,results=[];
  const cases=[Array(128).fill(.37),Array(2048).fill(.37),Array.from({length:2048},(_,i)=>i<900?.37:i<932?NaN:-.43),Array.from({length:2048},(_,i)=>i<900?.37:i<1700?-.47:.83),Array.from({length:2048},(_,i)=>i%301<200?-.8:.7),Array.from({length:512},(_,i)=>i>120&&i<150?NaN:Math.sin(i*.17)),[.2,.2,.2,NaN,.3,.3,.3,-.6,-.6,NaN,0,1,-1]];
  for(const mode of ['connected','stepped'])for(const gain of [1,16])for(const dpr of [1,1.25,2])for(const values of cases){
   const outputs=[],pixels=[];for(const paint of [old,next]){const c=document.createElement('canvas');c.width=Math.round(620*dpr);c.height=Math.round(240*dpr);const ctx=c.getContext('2d');ctx.scale(dpr,dpr);ctx.fillStyle='#111a1e';ctx.fillRect(0,0,620,240);ctx.strokeStyle='#6ce0c1';paint(ctx,{samples:new Float32Array(values),format:'samples',frames:values.length,count:values.length,width:620,middle:120,scale:96,gain,mode,pixelRatio:dpr});outputs.push(c.toDataURL());pixels.push(ctx.getImageData(0,0,c.width,c.height).data);}
   let changedBytes=0,maxDelta=0;for(let i=0;i<pixels[0].length;i++){const delta=Math.abs(pixels[0][i]-pixels[1][i]);if(delta){changedBytes++;maxDelta=Math.max(maxDelta,delta);}}results.push({mode,gain,dpr,frames:values.length,identical:outputs[0]===outputs[1],changedBytes,maxDelta});
  }return results;
 })()`);
 assert.ok(traces.every(t=>t.identical),'Trace raster differs from baseline');assert.deepEqual(errors,[]);await writeFile(out+'/results.json',JSON.stringify({synthetic:true,pageDpr:Number(dpr),pageCases:results,traceCases:traces,errors},null,2));console.log('SCOPE_NEXT_FIDELITY '+JSON.stringify({pageCases:results.length,traceCases:traces.length,identical:traces.every(t=>t.identical),maxDelta:Math.max(...traces.map(t=>t.maxDelta))}));
}catch(e){console.error(e);process.exitCode=1;}finally{if(win&&!win.isDestroyed())win.destroy();clearInterval(timer);await transport?.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}app.exit(process.exitCode||0);}}
main().catch(e=>{console.error(e);app.exit(1)});
