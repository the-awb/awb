import dgram from 'node:dgram';import crypto from 'node:crypto';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {encode,decode} from '../../awb-shell/src/scBusOsc.mjs';import {validate} from '../../../tool-artifacts/buffer-views/0.1.0/network-model.mjs';
export function changedFields(before,after){
 const edits=[];for(const field of ['globalInput','master','tempo'])if(before[field]!==after[field])edits.push([field==='tempo'?'meta':'global','',field,after[field]]);
 for(const [id,value]of Object.entries(after.routes))if(before.routes[id]!==value)edits.push(['route',id,'',value]);
 for(const cell of after.cells){const prior=before.cells.find(c=>c.id===cell.id);for(const f of ['seconds','inputGain','feedback','effectLevel','dryLevel','running','fadeGate','fadeIn','fadeOut'])if(cell[f]!==prior[f])edits.push(['cell',cell.id,f,typeof cell[f]==='boolean'?+cell[f]:cell[f]]);
  for(const f of ['timingMode','beats','divisor','triplet','preset'])if(cell[f]!==prior[f])edits.push(['meta',cell.id,f,typeof cell[f]==='boolean'?+cell[f]:cell[f]]);
  for(const head of cell.heads){const h=prior.heads.find(h=>h.id===head.id);for(const f of ['value','amount','enabled','unit','left','right'])if(head[f]!==h[f])edits.push(['head',cell.id,`${head.id}/${f}`,f==='unit'?+(head[f]==='fraction'):typeof head[f]==='boolean'?+head[f]:head[f]]);for(const [to,value]of Object.entries(head.sends))if(h.sends[to]!==value)edits.push(['head',cell.id,`${head.id}/send/${to}`,value]);}
 }return edits;
}
export function applyDelta(config,id,value){if(id==='globalInput'||id==='master'||id==='tempo')config[id]=value;else if(id in config.routes)config.routes[id]=value;else{const [cell,field]=id.split('/'),target=config.cells.find(c=>c.id===cell);if(target)target[field]=['running','fadeGate','triplet'].includes(field)?value>=.5:value;}return config;}
export async function createDelayBridge(binding,{native,timeout=3000}={}){
 if(!/^awbBase:[a-zA-Z0-9_-]+$/.test(binding?.instanceID)||!Number.isInteger(binding.port)||binding.port<1||binding.port>65535)throw Error('Invalid delay root binding');
 const socket=dgram.createSocket('udp4'),token=crypto.randomUUID(),pending=new Map();let config,epoch,revision=0,regions,closed=false,connected=true,readers=[],waves=[],onConfig=()=>{},heartbeat,applying=false,seen=performance.now();
 const detachReaders=()=>{const owned=readers;readers=[];for(const r of owned)native.detach(r);};
 const disconnect=e=>{connected=false;clearInterval(heartbeat);detachReaders();for(const p of pending.values()){clearTimeout(p.timer);p.no(e)}pending.clear();};
 const send=(op,args)=>new Promise((ok,no)=>socket.send(encode('/awb/delay/control',[binding.instanceID,op,token,...args]),binding.port,'127.0.0.1',e=>e?no(e):ok()));
 const request=(op,args=[])=>new Promise((ok,no)=>{const id=crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(id);no(Error('Delay command timed out'))},timeout);pending.set(id,{ok,no,timer});void send(op,[id,...args]).catch(e=>{clearTimeout(timer);pending.delete(id);no(e)});});
 socket.on('error',disconnect);
 socket.on('message',(bytes,peer)=>{if(peer.address!=='127.0.0.1'||peer.port!==binding.port)return;try{const {address,args:a}=decode(bytes);if(a[0]!==binding.instanceID||a[1]!==token)return;
  if(address==='/awb/delay/error'){const p=pending.get(a[3]);if(p){clearTimeout(p.timer);pending.delete(a[3]);p.no(Error(a[4]))}return}
  if(address==='/awb/delay/state'){epoch=a[2];revision=a[4];config=validate(JSON.parse(a[5]),{resolveTiming:false});regions=JSON.parse(a[6]);}
  else if(a[2]!==epoch)return;
  else if(address==='/awb/delay/closed'){disconnect(Error('Delay owner closed'));return}
  else if(address==='/awb/delay/alive'){seen=performance.now();return}
  else if(address==='/awb/delay/delta'){revision=a[3];applyDelta(config,a[4],a[5]);if(!applying)onConfig(structuredClone(config));return}
  else if(address==='/awb/delay/headDelta'){revision=a[3];const [head,field,to]=a[5].split('/'),h=config.cells.find(c=>c.id===a[4])?.heads.find(h=>h.id===head);if(h){if(field==='send')h.sends[to]=a[6];else h[field]=field==='unit'?(a[6]===1?'fraction':'seconds'):field==='enabled'?!!a[6]:a[6];if(!applying)onConfig(structuredClone(config));}return}
  const p=pending.get(a[3]);if(p){clearTimeout(p.timer);pending.delete(a[3]);p.ok({config,regions,revision});}
 }catch(e){disconnect(e);}});
 await new Promise((ok,no)=>{socket.once('error',no);socket.bind(0,'127.0.0.1',ok)});
 try{await request('bind');native??=createRequire(import.meta.url)(fileURLToPath(new URL('../.build/unifiedview.node',import.meta.url)));for(const id of regions.flat())readers.push(native.attach(id));
  heartbeat=setInterval(()=>{if(performance.now()-seen>6500){disconnect(Error('Delay heartbeat timed out'));return}void send('alive',['heartbeat',epoch]).catch(disconnect)},2000);heartbeat.unref();}
 catch(e){detachReaders();await send('unwatch',['close',epoch]).catch(()=>{});socket.close();throw e}
 return {kind:'audio',initial:structuredClone(config),set onConfig(fn){onConfig=fn},connected:()=>connected&&!closed,
  read(){if(!connected||closed)throw Error('Delay owner disconnected');readers.forEach((r,i)=>{const w=native.read(r);if(w)waves[i]={...w,envelope:Array.from(w.envelope)};});let offset=0;return regions.map(group=>{const channels=waves.slice(offset,offset+group.length);offset+=group.length;return channels[0]?{...channels[0],channels}:null;});},
  async apply(candidate){if(closed||!connected)throw Error('Delay owner disconnected');const next=validate(candidate);for(const f of ['source','inputChannel','frequency','toneLevel'])if(next[f]!==config[f])throw Error('Shared-host input is managed by the rack');const edits=changedFields(config,next);applying=true;try{for(const e of edits)await request('edit',[epoch,...e]);config=next;}catch(error){if(connected)await request('state',[epoch]).catch(()=>{});throw error;}finally{applying=false;onConfig(structuredClone(config));}},
  async clear(id){await request('edit',[epoch,'clear',id,'',0]);},
  async close(){if(closed)return;closed=true;connected=false;clearInterval(heartbeat);await send('unwatch',['close',epoch]).catch(()=>{});for(const p of pending.values()){clearTimeout(p.timer);p.no(Error('Delay viewer closed'))}pending.clear();try{detachReaders()}finally{socket.close()}}
 };
}
