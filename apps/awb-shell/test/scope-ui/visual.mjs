// Synthetic visual/cadence fixture only; no SC host, microphone or audio output.
import {createRequire} from 'node:module';
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {ScopeTransport} from '../../../../tool-artifacts/shared-loop/0.1.0/scope-transport.mjs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../..');
const require=createRequire(resolve(root,'package.json')),{app,BrowserWindow}=require('electron');
const base=resolve(root,'tool-artifacts/shared-loop/0.1.0/public'),out=process.env.AWB_SCOPE_UI_OUTPUT||'/private/tmp/awb-scope-ui-visual';
app.commandLine.appendSwitch('force-device-scale-factor','1');app.setPath('userData',out+'/user-data');app.on('window-all-closed',()=>{});
let server,transport,timer,win;
async function run(){try{
 await mkdir(out,{recursive:true});await app.whenReady();
 server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(req.method==='POST'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{}');return;}
 const before=u.pathname.startsWith('/before/'),name=u.pathname.split('/').at(-1),file=name==='scope'?'scope.html':name;
 if(!['scope.html','scope.js','scope-history.js','scope-painter.js','scope-metadata.js','scope-trace.js','scope-protocol.js','scope.css','style.css'].includes(file)){res.writeHead(404);res.end();return;}
 let bytes=await readFile(before&&['scope.js','scope-painter.js','scope.html','scope.css'].includes(file)?resolve(here,'baseline',file):base+'/'+file);
 if(file==='scope.html'&&before)bytes=Buffer.from(bytes.toString().replace('src="/scope.js"','src="/before/scope.js"'));
 res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(bytes);
 }catch(e){res.writeHead(500);res.end(String(e));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));transport=new ScopeTransport(server,1);
 const frames=1024,sourceFrames=16384,rate=44100,samples=new Float32Array(frames*2);
 for(let i=0;i<frames;i++){let lo=Infinity,hi=-Infinity;for(let k=0;k<16;k++){const x=(i*16+k)/sourceFrames,v=.58*Math.sin(x*Math.PI*2*13)+.08*Math.sin(x*Math.PI*2*91);lo=Math.min(lo,v);hi=Math.max(hi,v);}samples[i*2]=lo;samples[i*2+1]=hi;if(i>=340&&i<360)samples[i*2]=samples[i*2+1]=NaN;}
 let sequence=0;const publish=()=>{sequence++;transport.publish({mic:{frames,sourceFrames,sourceEnd:sequence*sourceFrames,format:'minmax',channels:1,sourceChannels:1,channelIds:[0],sampleRate:rate,sequence,samples,peaks:[.66],rms:[.42]}},{connected:true});};publish();timer=setInterval(publish,20);
 const results=[];
 for(const variant of ['before','after']){
  win=new BrowserWindow({width:920,height:580,show:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  win.webContents.on('console-message',e=>{if(e.level>=2)console.error(e.message);});
  await win.loadURL(`http://127.0.0.1:${server.address().port}/${variant==='before'?'before/':''}scope?kind=mic&fps=30`);
  await win.webContents.executeJavaScript(`document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(0.0625):0.0625);document.querySelector('#zoom').dispatchEvent(new Event('change'));document.querySelector('#source').textContent='Synthetic visual fixture · no audio';void 0;`);
  await delay(500);
  const activity=await win.webContents.executeJavaScript(`(async()=>{const c=document.querySelector('#scope'),label=document.querySelector('#updates');let changes=0;const obs=new MutationObserver(()=>changes++);obs.observe(label,{childList:true,characterData:true,subtree:true});const paints=Number(c.dataset.paints),end=Number(c.dataset.sourceEnd),at=performance.now(),image=c.toDataURL();await new Promise(r=>setTimeout(r,1500));obs.disconnect();const seconds=(performance.now()-at)/1000;return {metadataHz:changes/seconds,paintHz:(Number(c.dataset.paints)-paints)/seconds,pixelsChanged:image!==c.toDataURL(),sourceAdvanced:Number(c.dataset.sourceEnd)>end,format:c.dataset.format,missing:Number(c.dataset.missingSourceFrames)};})()`);
  if(activity.paintHz<25||!activity.sourceAdvanced||activity.format!=='minmax'||activity.missing!==320)throw new Error(JSON.stringify(activity));
  // The fixture deliberately repeats identical samples, so screenshots can be compared directly.
  if(variant==='after'&&(activity.metadataHz<6||activity.metadataHz>9))throw new Error('Metadata cadence '+JSON.stringify(activity));
  await win.webContents.executeJavaScript(`document.querySelector('#freeze').click();void 0;`);await delay(80);
  await writeFile(out+'/'+variant+'.png',(await win.webContents.capturePage()).toPNG());
  const frozen=await win.webContents.executeJavaScript(`(async()=>{const label=document.querySelector('#updates').textContent,paints=document.querySelector('#scope').dataset.paints;await new Promise(r=>setTimeout(r,200));return label===document.querySelector('#updates').textContent&&paints===document.querySelector('#scope').dataset.paints;})()`);
  if(!frozen)throw new Error('Freeze changed '+variant);results.push({variant,...activity,frozen});win.destroy();win=null;await delay(100);
 }
 await writeFile(out+'/activity.json',JSON.stringify({synthetic:true,rate,results},null,2));console.log(JSON.stringify(results));
}catch(e){console.error(e);process.exitCode=1;}finally{if(win&&!win.isDestroyed())win.destroy();clearInterval(timer);await transport?.close();if(server)await new Promise(r=>server.close(r));app.exit(process.exitCode||0);}

}
run().catch(e=>{console.error(e);app.exit(1)});
