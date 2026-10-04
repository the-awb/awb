import http from 'node:http';
import dgram from 'node:dgram';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {WebSocketServer} from 'ws';
import {RackStore,defaultConfig,wireMessage,createRecall} from '../src/model.mjs';

const pad=b=>Buffer.concat([b,Buffer.alloc((4-b.length%4)%4)]);
const str=s=>pad(Buffer.from(`${s}\0`));
export function encodeOSC({address,args}){const types=','+args.map(v=>typeof v==='string'?'s':Number.isInteger(v)?'i':'f').join('');return Buffer.concat([str(address),str(types),...args.map(v=>{if(typeof v==='string')return str(v);const b=Buffer.alloc(4);if(Number.isInteger(v))b.writeInt32BE(v);else b.writeFloatBE(v);return b;})]);}
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.map':'application/json','.svg':'image/svg+xml'};
export async function startRuntime({runtimeDirectory,httpPort=0,seedDocument,sendPacket}={}){
  await mkdir(runtimeDirectory,{recursive:true});
  const libraryPath=path.join(path.dirname(runtimeDirectory),'rack-library.json');
  let document=seedDocument;
  if(!document){try{document=JSON.parse(await readFile(libraryPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;try{document=JSON.parse(await readFile(new URL('../fixtures/live-set.rack.json',import.meta.url),'utf8'));}catch{document={config:defaultConfig(),values:{},snapshots:[]};}}}
  const store=new RackStore(document),token=crypto.randomUUID(),udp=dgram.createSocket('udp4'),peers=new Set();
  const root=path.resolve(fileURLToPath(new URL('../dist/',import.meta.url)));let armed=false,recall=null,saveTimer,flushTimer,closed=false,writeQueue=Promise.resolve();const pending=new Map();let sent=0,failures=0;
  const state=()=>({document:store.document(),armed,token,libraryPath,sent,failures});
  const broadcast=message=>{const text=JSON.stringify(message);for(const ws of peers)if(ws.readyState===1)ws.send(text);};
  const save=()=>{const text=JSON.stringify(store.document(),null,2)+'\n';writeQueue=writeQueue.catch(()=>{}).then(async()=>{await writeFile(libraryPath+'.tmp',text);await rename(libraryPath+'.tmp',libraryPath);}).catch(e=>{broadcast({type:'error',message:`Save failed: ${e.message}`});throw e;});return writeQueue;};
  const queueSave=()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>save().catch(()=>{}),300);};
  const transmit=async(id,value)=>{try{const d=store.byID.get(id),message=wireMessage(d,value,store.config);if(!message)return;const packet={id,value,message,endpoint:store.config.output,armed};broadcast({type:'wire',...packet});if(armed){const bytes=encodeOSC(message);if(sendPacket)await sendPacket(bytes,packet);else await new Promise((resolve,reject)=>udp.send(bytes,store.config.output.port,store.config.output.host,e=>e?reject(e):resolve()));sent++;}}catch(e){failures++;broadcast({type:'error',message:`${id}: ${e.message}`});}};
  const flush=()=>{flushTimer=null;const changes=[...pending].map(([id,change])=>({id,...change}));pending.clear();if(changes.length)broadcast({type:'patch',changes});for(const {id,value}of changes)void transmit(id,value);};
  const unsub=store.subscribeAll(event=>{if(event.kind==='value'){pending.set(event.id,{value:event.value,origin:event.origin});if(!flushTimer)flushTimer=setTimeout(flush,16);}else broadcast({type:'document',document:store.document()});queueSave();});
  const command=async (c,origin='local')=>{
    if(!c||typeof c.type!=='string')throw Error('Invalid Rack command.');
    if(c.type==='batch'){if(!Array.isArray(c.changes)||c.changes.length>4096)throw Error('Invalid control batch.');for(const x of c.changes){if(!store.byID.has(x.id)||!Number.isFinite(x.value))throw Error('Unknown control or value.');}for(const x of c.changes){recall?.override(x.id);store.set(x.id,x.value,origin);}return;}
    if(c.type==='arm'){armed=c.armed===true;broadcast({type:'armed',armed});return;}
    if(c.type==='stop'){recall?.stop();recall=null;broadcast({type:'recall',active:false});return;}
    if(c.type==='document'){const next=new RackStore(c.document);recall?.stop();recall=null;armed=false;pending.clear();store.replace(next.document());broadcast({type:'armed',armed});await save();return;}
    if(c.type==='capture'){const snapshot=store.capture(c.label,c.sceneID??null,c.ids,{duration:c.duration??1000,targetDuration:c.targetDuration??c.duration??1000,alignment:c.alignment??'L'});await save();return {snapshotID:snapshot.id};}
    if(c.type==='snapshot'){store.updateSnapshot(c.snapshot);await save();return;}
    if(c.type==='delete-snapshot'){store.snapshots=store.snapshots.filter(s=>s.id!==c.id);store.notifyMeta();await save();return;}
    if(c.type==='recall'){const s=store.snapshots.find(s=>s.id===c.id);if(!s)throw Error('Unknown snapshot.');recall?.stop();broadcast({type:'recall',active:true,id:s.id});let finished=false;const next=createRecall(store,{...s,duration:c.direct?0:s.duration},{onFinish:()=>{finished=true;recall=null;broadcast({type:'recall',active:false});}});recall=finished?null:next;return;}
    if(c.type==='send-all'){for(const d of store.controls)await transmit(d.id,store.get(d.id));return;}
    if(c.type==='save'){await save();return;}
    throw Error('Unknown Rack command.');
  };
  const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://127.0.0.1');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    if(req.method==='GET'&&url.pathname==='/api/state'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(state()));return;}
    if(req.method==='POST'&&url.pathname==='/api/command'){
      if(req.headers['x-rack-token']!==token)throw Error('Rack token missing.');let text='';for await(const b of req){text+=b;if(text.length>4*1024*1024)throw Error('Rack document is too large.');}const result=await command(JSON.parse(text));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,...result}));return;
    }
    if(req.method!=='GET'){res.writeHead(405);res.end();return;}
    const relative=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const bytes=await readFile(file);res.setHeader('Content-Type',MIME[path.extname(file)]??'application/octet-stream');res.end(bytes);
  }catch(e){res.writeHead(e.code==='ENOENT'?404:400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}});
  const wss=new WebSocketServer({noServer:true});
  server.on('upgrade',(req,socket,head)=>{const u=new URL(req.url,'http://127.0.0.1');if(u.pathname!=='/ws'||u.searchParams.get('token')!==token){socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
  wss.on('connection',ws=>{peers.add(ws);const clientID=crypto.randomUUID();let sequence=Promise.resolve();ws.send(JSON.stringify({type:'state',clientID,...state()}));ws.on('close',()=>{peers.delete(ws);if(!peers.size){armed=false;recall?.stop();recall=null;}});ws.on('message',data=>{if(data.length>4*1024*1024){ws.close(1009);return;}sequence=sequence.then(async()=>{let c;try{c=JSON.parse(data);const result=await command(c,clientID);if(c.requestID&&ws.readyState===1)ws.send(JSON.stringify({type:'ack',requestID:c.requestID,result}));}catch(e){if(ws.readyState===1)ws.send(JSON.stringify({type:'error',requestID:c?.requestID,message:e.message}));}});});});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(httpPort,'127.0.0.1',resolve);});
  return {url:`http://127.0.0.1:${server.address().port}/`,libraryPath,store,command,state,
    async stop(){if(closed)return;closed=true;recall?.stop();clearTimeout(saveTimer);clearTimeout(flushTimer);pending.clear();unsub();await save();for(const ws of peers)ws.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));try{udp.close();}catch{};}};
}
