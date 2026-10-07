import http from 'node:http';import crypto from 'node:crypto';import {readFile} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {WebSocketServer} from 'ws';
import {ControlObservationBroker} from '../../awb-shell/src/controlObservationBroker.mjs';
import {envBinding,createBridge} from './bridge.mjs';import {wireBatch} from '../src/model.mjs';
const root=path.resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
export async function startRuntime({binding=envBinding(),controlObservations,bridgeFactory=createBridge}={}) {
  const ownBroker=!controlObservations,broker=controlObservations??new ControlObservationBroker(),clients=new Set(),token=crypto.randomUUID();
  let bridge,state={params:[],connected:false,error:'Open AWParam.gui or Core.paramGUI from sclang to bind parameters.'},stopped=false,syncing=false,queued=[],resyncTask;
  const send=(c,m)=>{if(c.readyState===1)c.send(JSON.stringify(m))};
  const broadcast=m=>{for(const c of clients)send(c,m)};
  const release=c=>{c.lease?.close();c.lease=null};
  const acquire=c=>{
    release(c);if(!state.connected||!c.visible||!state.params.length)return;
    c.sequence=0;
    const offsets=state.params.flatMap((p,i)=>!c.ids||c.ids.includes(p.id)?[i*3,i*3+1,i*3+2]:[]);if(!offsets.length)return;
    const host={...state.host,isAlive:()=>{try{process.kill(state.host.pid,0);return bridge.isAlive()}catch{return false}}};
    try{c.lease=broker.subscribe(host,offsets.map(i=>state.params[Math.floor(i/3)].indices[i%3]),{hz:c.hz,onValues:batch=>{
      if(c.readyState!==1)return;if(c.bufferedAmount>131072){c.close(1013,'Observation consumer too slow');return}
      const values=new Float32Array(state.params.length*3);for(const i of batch.changed)values[offsets[i]]=batch.values[i];
      c.send(wireBatch(batch.generation,++c.sequence,values,batch.changed.map(i=>offsets[i])));
    },onError:e=>{release(c);send(c,{type:'status',connected:false,error:e.message})}});send(c,{type:'generation',generation:c.lease.generation})}catch(e){send(c,{type:'status',connected:false,error:e.message})}
  };
  const delta=d=>{
    if(syncing){queued.push(['delta',d]);return}
    if(d.epoch!==state.epoch)return;
    if(d.revision!==null&&d.revision>state.revision+1){void sync().catch(()=>{});return}
    const p=state.params.find(p=>p.id===d.id);if(!p)return;
    if(d.source){const r=p.routes.find(r=>r.id===d.source);if(!r)return;if(d.field.startsWith('writer:')){const c=r.controls.find(c=>c.id===d.field.slice(7));if(!c)return;c.value=d.value}else r[d.field==='sourceAmount'?'amount':'curve']=d.value}
    else if(d.metadata)Object.assign(p,d.metadata);else {const field={baseTarget:'base',amountTarget:'amount',modCurve:'modCurve'}[d.field];if(!field)return;p[field]=d.value}
    state.revision=Math.max(state.revision,d.revision??0);
    for(const c of clients)if(!c.requests.has(d.origin))send(c,{type:'delta',delta:d});
  };
  const routes=(id,rows,revision)=>{if(syncing){queued.push(['routes',[id,rows,revision]]);return}const p=state.params.find(p=>p.id===id);if(p){p.routes=rows;state.revision=Math.max(state.revision,revision??0);broadcast({type:'routes',id,routes:rows})}};
  const status=(connected,error)=>{
    if(stopped)return;
    if(!connected){state.connected=false;state.error=error;for(const c of clients)release(c);broadcast({type:'status',connected,error})}
    else if(!state.connected&&state.epoch&&!syncing)void sync().catch(()=>{});
  };
  const sync=()=>resyncTask??=(async()=>{
    syncing=true;queued=[];for(const c of clients)release(c);
    try{const snapshot=await bridge.bind();state={...snapshot,connected:true,error:null};syncing=false;
      for(const [kind,d] of queued)if(kind==='delta'){if(d.revision>state.revision)delta(d)}else routes(...d);
      queued=[];broadcast({type:'state',state});for(const c of clients)acquire(c);return state;
    }finally{syncing=false}
  })().finally(()=>resyncTask=null);
  if(binding)try{bridge=await bridgeFactory(binding,{onDelta:delta,onRoutes:routes,onStatus:status,onRevision:r=>{if(state.connected&&r>state.revision&&!syncing)void sync().catch(()=>{})}});await sync()}catch(e){state.error=e.message;await bridge?.close();bridge=null}
  const command=async(c,m)=>{
    if(!m||typeof m!=='object')throw Error('Invalid command');
    if(m.type==='visible'){if(typeof m.visible!=='boolean'||![8,15].includes(m.hz))throw Error('Invalid observation preference');if(m.ids!==undefined&&(!Array.isArray(m.ids)||m.ids.length>128||m.ids.some(id=>!state.params.some(p=>p.id===id))))throw Error('Invalid visible parameter IDs');c.ids=m.ids;c.visible=m.visible;c.hz=m.hz;acquire(c);return}
    if(m.type==='sync'){if(!bridge)throw Error('No parameter binding');return sync()}
    if(m.type!=='edit'||!state.connected||m.epoch!==state.epoch)throw Error('Stale or unavailable binding');
    if(typeof m.request!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(m.request)||c.requests.size>=128)throw Error('Invalid/full edit queue');
    const p=state.params.find(p=>p.id===m.id);if(!p||(m.field==='polarity'?!['unipolar','bipolar'].includes(m.value):!Number.isFinite(m.value)))throw Error('Unknown parameter or invalid value');
    let bounds={base:[p.min,p.max],amount:[-8,8],modCurve:[-16,16],sourceAmount:[-8,8],sourceCurve:[-16,16]}[m.field];
    if(m.field.startsWith('writer:')){const field=p.routes.find(r=>r.id===m.source&&r.kind==='custom')?.controls?.find(c=>c.id===m.field.slice(7));if(field)bounds=[field.min,field.max]}
    if(m.field!=='polarity'&&(!bounds||m.value<bounds[0]||m.value>bounds[1]))throw Error('Value outside parameter range');
    if(m.field.startsWith('source')&&!p.routes.some(r=>r.id===m.source&&r.status==='connected'&&r.editable))throw Error('Source removed, pending or custom');
    const dur=m.dur??0,curve=m.curve??0;if(!Number.isFinite(dur)||dur<0||dur>86400||!Number.isFinite(curve)||Math.abs(curve)>16)throw Error('Invalid transition');
    c.requests.add(m.request);try{
      const revision=await bridge.edit(m.id,m.field,m.value,m.source??'',dur,curve,m.request);
      // Reconcile own-origin metadata, without sending another command.
      const field={base:'base',amount:'amount',modCurve:'modCurve'}[m.field];if(field)p[field]=m.value;
      send(c,{type:'result',request:m.request,ok:true,revision});
    }finally{c.requests.delete(m.request)}
  };
  const server=http.createServer(async(req,res)=>{try{
    const u=new URL(req.url,'http://127.0.0.1');res.setHeader('Cache-Control','no-store');
    if(u.pathname==='/api/state'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({token,state}));return}
    const file=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
    const body=await readFile(file);res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self' ws://127.0.0.1:*; object-src 'none'; frame-ancestors 'none'");res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(file)]??'application/octet-stream');res.end(body)
  }catch{res.writeHead(404);res.end()}});
  const wss=new WebSocketServer({noServer:true,maxPayload:8192});
  server.on('upgrade',(req,socket,head)=>{const u=new URL(req.url,'http://127.0.0.1'),origin=`http://127.0.0.1:${server.address().port}`;if(u.pathname!=='/ws'||u.searchParams.get('token')!==token||req.headers.origin!==origin){socket.destroy();return}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws))});
  wss.on('connection',c=>{c.visible=false;c.hz=15;c.requests=new Set();clients.add(c);send(c,{type:'state',state});c.on('close',()=>{release(c);clients.delete(c)});c.on('error',()=>{});c.on('message',bytes=>{let m;Promise.resolve().then(()=>{m=JSON.parse(bytes);return command(c,m)}).catch(e=>send(c,{type:'result',request:m?.request,ok:false,error:e.message}))})});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  return {url:`http://127.0.0.1:${server.address().port}/`,state:()=>structuredClone(state),diagnostics:()=>broker.diagnostics(),async stop(){if(stopped)return;stopped=true;for(const c of clients){release(c);c.terminate()}await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));await bridge?.close();if(ownBroker)broker.close()}};
}
