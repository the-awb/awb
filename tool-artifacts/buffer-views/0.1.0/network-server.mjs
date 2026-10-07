import http from 'node:http';import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import {resolve,dirname} from 'node:path';
import {waveformView} from './waveform-view.mjs';
import {defaults,validate,command,timeline} from './network-model.mjs';
const root=dirname(fileURLToPath(import.meta.url));
export function rehearsal(){
  let config=defaults(),last=Date.now();const positions=[0,0,0,0],material=[false,false,false,false];
  return {kind:'rehearsal',connected:()=>true,async apply(c){config=validate(c);},async clear(id){material[config.cells.findIndex(c=>c.id===id)]=false;},async close(){},
    read(){const now=Date.now(),elapsed=(now-last)/1000;last=now;return config.cells.map((c,i)=>{
      if(c.running){positions[i]=(positions[i]+elapsed*44100)%(32*44100);if(config.globalInput*config.routes[`clean:${c.id}`]*c.inputGain>0||config.cells.slice(0,i).some((src,j)=>material[j]&&config.routes[`${src.id}:${c.id}`]*c.inputGain>0))material[i]=true;}
      return {frames:32*44100,position:Math.floor(positions[i]),recorded:Math.round(c.seconds*44100),sampleRate:44100,flags:c.running?2:0,
        envelope:Array.from({length:1024},(_,j)=>material[i]?(j%2?1:-1)*(.04+.18*Math.abs(Math.sin(Math.floor(j/2)*.17+i))):0),
        channels:[0,1].map(ch=>({frames:32*44100,position:Math.floor(positions[i]),recorded:Math.round(c.seconds*44100),sampleRate:44100,flags:c.running?2:0,envelope:Array.from({length:1024},(_,j)=>material[i]?(j%2?1:-1)*(.04+.18*Math.abs(Math.sin(Math.floor(j/2)*.17+i+ch*.3))):0)}))};
    });}};
}
export async function startNetwork({adapter=rehearsal(),port=0,initial=defaults(),onStop=null}={}){
  let config=validate(initial),revision=0,publishedRevision=-1,waveforms=[],error=null,closing=false,tail=Promise.resolve(),stopPromise;
  const clients=new Map();
  await adapter.apply(config);
  adapter.onConfig=next=>{config=validate(next,{resolveTiming:false});revision++;};
  const state=()=>({backend:adapter.kind,connected:!closing&&adapter.connected(),config,revision,waveforms,error});
  const control=p=>{const job=tail.catch(()=>{}).then(async()=>{if(closing||!adapter.connected())throw new Error('Disconnected');const next=command(config,p);if(next.clear)await adapter.clear(next.clear);else await adapter.apply(next.config);config=next.config;revision++;return state();});tail=job;return job;};
  const timer=setInterval(()=>{try{waveforms=adapter.read().map((w,i)=>waveformView(w,timeline(config.cells[i],w).horizon));error=null;}catch(e){error=e.message;}const observation=state();if(publishedRevision===revision)delete observation.config;else publishedRevision=revision;const data=`data: ${JSON.stringify(observation)}\n\n`;for(const [res,busy] of clients)if(!busy&&!res.destroyed&&!res.write(data)){clients.set(res,true);res.once('drain',()=>{if(clients.has(res))clients.set(res,false);});}},50);
  const files={'/':'instrument/index.html','/app.js':'instrument/app.js','/style.css':'instrument/style.css','/network-model.mjs':'network-model.mjs'};
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    if(req.method==='GET'&&url.pathname==='/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});res.write(`data: ${JSON.stringify(state())}\n\n`);clients.set(res,false);req.on('close',()=>clients.delete(res));return;}
    if(req.method==='GET'&&url.pathname==='/api/state'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(state()));return;}
    if(req.method==='POST'&&url.pathname==='/api/stop'&&onStop){
      if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);res.end();return;}
      res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({stopping:true}));setImmediate(onStop);return;
    }
    if(req.method==='POST'&&url.pathname==='/api/control'){
      if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);res.end();return;}
      try{let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw new Error('Request too large');}const next=await control(JSON.parse(body));res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(next));}
      catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}return;
    }
    if(req.method!=='GET'||!files[url.pathname]){res.writeHead(404);res.end();return;}
    const path=files[url.pathname];res.writeHead(200,{'Content-Type':path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':'text/javascript'});res.end(readFileSync(resolve(root,path)));
  });
  const stop=()=>stopPromise??=(async()=>{closing=true;clearInterval(timer);for(const res of clients.keys())res.end();clients.clear();await tail.catch(()=>{});try{await adapter.close();}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}})();
  try{await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok);});}catch(e){await stop();throw e;}
  return {url:`http://127.0.0.1:${server.address().port}`,state,control,stop,viewConnectionCount:()=>clients.size};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  let bridge,stopping=false,requested=false;
  const stop=async()=>{requested=true;if(!bridge||stopping)return;stopping=true;await bridge.stop();};for(const signal of ['SIGINT','SIGTERM'])process.once(signal,stop);
  const adapter=process.argv.includes('--audio')?await(await import('./network-audio.mjs')).startNetworkAudio():rehearsal();
  if(requested){await adapter.close();process.exit(0);}bridge=await startNetwork({adapter,port:Number(process.env.PORT??8798)});console.log(`${adapter.kind}: ${bridge.url}`);if(requested)await stop();
}
