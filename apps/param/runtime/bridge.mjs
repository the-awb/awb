import dgram from 'node:dgram';import crypto from 'node:crypto';
import {encode,decode} from '../../awb-shell/src/scBusOsc.mjs';
export function envBinding(env=process.env){return env.AWB_PARAM_INSTANCE_ID?{instanceID:env.AWB_PARAM_INSTANCE_ID,port:Number(env.AWB_PARAM_SC_PORT)}:null}
export async function createBridge(binding,{onDelta=()=>{},onRoutes=()=>{},onStatus=()=>{},onRevision=()=>{},timeout=2500}={}) {
  if(!/^param:[a-zA-Z0-9_-]+$/.test(binding?.instanceID)||!Number.isInteger(binding.port)||binding.port<1||binding.port>65535)throw Error('Invalid parameter binding');
  const socket=dgram.createSocket('udp4'),token=crypto.randomUUID(),pending=new Map(),snapshots=new Map(),routes=new Map(),routeCounts=new Map();let epoch=null,alive=performance.now(),closed=false,healthy=false;
  const send=(op,args=[])=>new Promise((resolve,reject)=>socket.send(encode('/awb/param/control',[binding.instanceID,op,token,...args]),binding.port,'127.0.0.1',e=>e?reject(e):resolve()));
  const settle=(id,error,value)=>{const p=pending.get(id);if(!p)return;clearTimeout(p.timer);pending.delete(id);error?p.reject(error):p.resolve(value)};
  const lost=error=>{snapshots.clear();routeCounts.clear();routes.clear();healthy=false;onStatus(false,error);for(const id of [...pending.keys()])settle(id,Error(error))};
  socket.on('error',e=>lost(e.message));
  socket.on('message',(bytes,peer)=>{
    if(peer.address!=='127.0.0.1'||peer.port!==binding.port)return;
    try {
      const {address,args:a}=decode(bytes);if(a[0]!==binding.instanceID||a[1]!==token)return;
      if(address==='/awb/param/result'){settle(a[2],a[3]==='ok'?null:Error(a[4]),a[4]);return}
      if(address==='/awb/param/closed'){lost('Parameter owner closed');return}
      if(a[2]!==epoch&&address!=='/awb/param/meta')return;
      if(address==='/awb/param/alive'){alive=performance.now();healthy=true;onStatus(true,null);onRevision(a[3]);return}
      if(address==='/awb/param/routeDelta'){onDelta({epoch:a[2],revision:a[3],id:a[4],source:a[5],field:a[6],value:a[7],origin:a[8]});return}
      if(address==='/awb/param/delta'){onDelta({epoch:a[2],revision:a[3],id:a[4],field:a[5],value:a[6],dur:a[7],curve:a[8],origin:a[9]});return}
      if(address!=='/awb/param/meta')return;
      const kind=a[3],id=a[4];
      if(kind==='begin') {
        if(!pending.has(id))return;
        snapshots.set(id,{epoch:a[2],host:{port:a[5],capacity:a[6],pid:a[7],epoch:`${binding.port}:${a[7]}`},revision:a[8],count:a[9],owner:a[10],params:[]});epoch=a[2];routes.clear();routeCounts.clear();return;
      }
      if(a[2]!==epoch)return;
      const snapshot=[...snapshots.values()].at(-1);
      if(kind==='param'||kind==='metadata') {
        const p={id,min:a[5],max:a[6],warp:a[7],base:a[8],amount:a[9],modCurve:a[10],baseCurve:a[11],amountCurve:a[12],indices:a.slice(13,16),polarity:a[16]??'unipolar',nativeSpec:a[17]===undefined?true:!!a[17],routes:[]};
        if(kind==='param')snapshot?.params.push(p);else {delete p.routes;onDelta({id,metadata:p,epoch,revision:a[18]??null})};
      }else if(kind==='routesBegin'){routes.set(id,[]);routeCounts.set(id,a[6])}
      else if(kind==='route')routes.get(id)?.push({id:a[5],kind:a[6],label:a[7],bus:a[8],producer:a[9],node:a[10],amount:a[11],curve:a[12],status:a[13],error:a[14],editable:!!a[15],controls:[],expectedControls:a[16]??0});
      else if(kind==='writerControl'){const r=routes.get(id)?.find(r=>r.id===a[5]);r?.controls.push({id:a[6],min:a[7],max:a[8],value:a[9]})}
      else if(kind==='routesEnd') {
        const rows=routes.get(id)||[];if(rows.length!==routeCounts.get(id)||rows.some(r=>r.controls.length!==r.expectedControls))throw Error('Incomplete source metadata');
        const p=snapshot?.params.find(p=>p.id===id);if(p)p.routes=routes.get(id)||[];else onRoutes(id,routes.get(id)||[],a[5]);routes.delete(id);
      }else if(kind==='end') {
        const s=snapshots.get(id);if(!s)return;snapshots.delete(id);
        if(s.params.length!==s.count||s.params.length>128||new Set(s.params.map(p=>p.id)).size!==s.params.length)throw Error('Incomplete parameter snapshot');
        for(const p of s.params)if(!Number.isFinite(p.min)||!Number.isFinite(p.max)||p.min>=p.max||!['lin','linear','exp','exponential'].includes(p.warp)||!['unipolar','bipolar'].includes(p.polarity)||p.indices.length!==3||p.indices.some(i=>!Number.isInteger(i)||i<0||i>=s.host.capacity))throw Error('Invalid parameter snapshot');
        alive=performance.now();healthy=true;settle(id,null,s);onStatus(true,null);
      }
    }catch(e){lost(e.message)}
  });
  await new Promise((resolve,reject)=>{socket.once('error',reject);socket.bind(0,'127.0.0.1',resolve)});
  const request=(op,args,requestID)=>{if(closed)return Promise.reject(Error('Bridge closed'));const id=requestID??crypto.randomUUID();return new Promise((resolve,reject)=>{
    pending.set(id,{resolve,reject,timer:setTimeout(()=>{snapshots.delete(id);settle(id,Error(`${op} timed out`))},timeout)});
    send(op,[id,...args]).catch(e=>settle(id,e));
  })};
  const timer=setInterval(()=>{if(epoch&&!closed){if(performance.now()-alive>6500)lost('Parameter heartbeat timed out');void send('alive',['heartbeat',epoch]).catch(e=>lost(e.message))}},2000);timer.unref();
  return {bind:()=>request('bind',[]),edit:(id,field,value,source='',dur=0,curve=0,requestID)=>{
    if(!healthy)return Promise.reject(Error('Binding unavailable'));
    return request('edit',[epoch,id,field,value,source,dur,curve],requestID);
  },isAlive:()=>healthy&&!closed&&performance.now()-alive<6500,
    async close(){if(closed)return;closed=true;clearInterval(timer);for(const id of [...pending.keys()])settle(id,Error('Bridge closed'));if(epoch)await send('unwatch',['close',epoch]).catch(()=>{});socket.close()}};
}
