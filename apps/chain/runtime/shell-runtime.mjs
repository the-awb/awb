import http from 'node:http';import crypto from 'node:crypto';import path from 'node:path';import {readFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {WebSocketServer} from 'ws';
import {topologyPlan} from '../src/model.mjs';
import {createBridge,envBinding,validateMatrix} from './bridge.mjs';
const root=path.resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
export async function startRuntime({binding=envBinding()}={}){
  const token=crypto.randomUUID(),clients=new Set();let bridge,state={controls:[],connected:false,error:'Open a Chain from sclang to bind its controls.'},pending=new Map(),flushTimer,tail=Promise.resolve(),stopped=false,syncing=false,deferred=[],syncTask=null,editBusy=false;
  const broadcast=message=>{for(const c of clients)if(c.readyState===1)c.send(JSON.stringify(message));};
  const status=(connected,error)=>{if(state.connected===connected&&state.error===error)return;state={...state,connected,error};broadcast({type:'status',connected,error});};
  const incoming=update=>{if(syncing){deferred.push(update);return;}const c=state.controls.find(c=>c.id===update.id);if(!c||update.value<c.min||update.value>c.max)return;c.value=update.value;state.revision=Math.max(state.revision,update.revision);broadcast({type:'values',values:{[update.id]:update.value}});};
  const flush=()=>{clearTimeout(flushTimer);flushTimer=null;const values=Object.fromEntries(pending);pending.clear();if(Object.keys(values).length)tail=tail.then(()=>bridge.setMany(values)).catch(e=>status(false,e.message));return tail;};
  const sync=()=>syncTask??=(async()=>{await flush();syncing=true;deferred=[];try{const snapshot=await bridge.sync();state={...snapshot,connected:true,error:null};syncing=false;for(const value of deferred)if(value.revision>snapshot.revision)incoming(value);broadcast({type:'state',state});return state;}finally{syncing=false;deferred=[];}})().finally(()=>syncTask=null);
  if(binding){try{bridge=await createBridge(binding,{onValue:incoming,onTopology:()=>{if(!editBusy)void sync().catch(e=>status(false,e.message));},onStatus:(connected,error,reason)=>{status(connected,error);if(reason==='edit-rejected'&&bridge&&!syncing)queueMicrotask(()=>{void sync().catch(e=>status(false,e.message));});}});await sync();}catch(e){status(false,e.message);}}
  const command=async(message,origin)=>{
    if(!bridge||!state.connected)throw Error(state.error||'Chain is unavailable.');
    if(message.type==='sync')return sync();
    if(message.type==='topology'){
      if(editBusy||!state.managed)throw Error('Chain topology is unavailable or busy.');
      const {op,id,factory,index,matrix}=message;let args;
      const patches=message.routes??{};if(!patches||Array.isArray(patches)||typeof patches!=='object')throw Error('Invalid route map.');
      const patchWire=JSON.stringify(Object.fromEntries(Object.entries(patches).map(([k,v])=>[k,v===null?'direct':v])));
      const stage=state.stages.find(s=>s.id===id),template=state.factories.find(s=>s.id===factory);
      if(op==='insert'){if(!template||typeof id!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(id)||id==='output'||stage||!Number.isInteger(index)||index<0||index>state.stages.length)throw Error('Invalid insertion.');args=[id,factory,index,patchWire];}
      else if(op==='remove'){if(!stage)throw Error('Unknown stage.');args=[id,patchWire];}
      else if(op==='move'){if(!stage||!Number.isInteger(index)||index<0||index>=state.stages.length)throw Error('Invalid stage move.');args=[id,index,patchWire];}
      else if(op==='replace'){if(!stage||!template)throw Error('Invalid replacement.');args=[id,factory,patchWire];}
      else if(op==='route'){const target=state.stages.findIndex(s=>s.id===id);if(target<0&&id!=='output')throw Error('Unknown route target.');const sourceWidth=id==='output'?(state.stages.at(-1)?.outputWidth??state.width):(state.stages[target-1]?.outputWidth??state.width);validateMatrix(matrix,sourceWidth,id==='output'?state.width:state.stages[target].inputWidth);args=[id,JSON.stringify(matrix??null)];}
      else throw Error('Unknown topology command.');
      if(op!=='route'){
        const plan=topologyPlan(state,message);if(plan.conversions.length)throw Error('Supply explicit matrices for the changed channel widths.');
        const allowed=new Set([...plan.stages.map(s=>s.id),'output']);let width=state.width;
        for(const key of Object.keys(patches))if(!allowed.has(key))throw Error('Unknown routing target.');
        for(const s of [...plan.stages,{id:'output',inputWidth:state.width}]){const current=s.id==='output'?state.outputMatrix:state.stages.find(old=>old.id===s.id)?.matrix;const value=Object.hasOwn(patches,s.id)?patches[s.id]:current;validateMatrix(value,width,s.inputWidth);width=s.outputWidth;}
      }
      editBusy=true;broadcast({type:'busy',busy:true});await flush();try{await bridge.edit(op,args);return await sync();}finally{editBusy=false;broadcast({type:'busy',busy:false});}
    }
    if(editBusy)throw Error('Topology edit is pending.');
    if(message.type!=='set')throw Error('Unknown Chain command.');
    if(!message.values||typeof message.values!=='object'||Array.isArray(message.values)||Object.keys(message.values).length>128)throw Error('Invalid Chain edit.');
    const entries=Object.entries(message.values);for(const [id,value] of entries){const c=state.controls.find(c=>c.id===id);if(!c||!Number.isFinite(value)||value<c.min||value>c.max)throw Error('Chain value outside its range.');}
    for(const [id,value] of entries){const c=state.controls.find(c=>c.id===id);if(c.value!==value){c.value=value;pending.set(id,value);}}
    if(pending.size&&!flushTimer)flushTimer=setTimeout(flush,16);
    for(const client of clients)if(client!==origin&&client.readyState===1)client.send(JSON.stringify({type:'values',values:message.values}));
    return state;
  };
  const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/api/state'){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({state,token}));return;}
    const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname),file=path.resolve(root,'.'+relative);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const data=await readFile(file);res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self' ws://127.0.0.1:*; object-src 'none'; frame-ancestors 'none'");res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(data);
  }catch{res.writeHead(404);res.end();}});
  const wss=new WebSocketServer({noServer:true,maxPayload:32768});
  server.on('upgrade',(req,socket,head)=>{const url=new URL(req.url,'http://127.0.0.1');const expected=`http://127.0.0.1:${server.address().port}`;if(url.pathname!=='/ws'||url.searchParams.get('token')!==token||(req.headers.origin&&req.headers.origin!==expected)){socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
  wss.on('connection',client=>{clients.add(client);client.send(JSON.stringify({type:'state',state}));client.on('close',()=>clients.delete(client));client.on('error',()=>{});client.on('message',bytes=>{Promise.resolve().then(()=>command(JSON.parse(bytes),client)).catch(e=>{if(client.readyState===1)client.send(JSON.stringify({type:'error',error:e.message}));void sync().catch(()=>{});});});});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {url:`http://127.0.0.1:${server.address().port}/`,state:()=>structuredClone(state),command,flush,stats:()=>bridge?.stats(),async stop(){if(stopped)return;stopped=true;await flush();for(const c of clients)c.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));await bridge?.close();}};
}
