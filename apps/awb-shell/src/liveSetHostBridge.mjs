import crypto from 'node:crypto';
import dgram from 'node:dgram';
import path from 'node:path';
import {encodeOSC,decodeOSC} from '../../rack/runtime/sc-bridge.mjs';

// A dedicated command for the installed opener; never arbitrary SC code.
export async function createLiveSetHostBridge({port,token,libraryRoot,timeoutMs=180000}) {
  if(!Number.isInteger(port)||port<1||port>65535||!token)throw Error('Live set needs a shell-owned language host');
  const socket=dgram.createSocket('udp4'),pending=new Map(),sessionID=crypto.randomUUID();let closed=false;
  await new Promise((resolve,reject)=>{socket.once('error',reject);socket.bind(0,'127.0.0.1',()=>{socket.removeListener('error',reject);resolve()})});
  socket.on('message',(bytes,remote)=>{
    if(remote.address!=='127.0.0.1'||remote.port!==port)return;
    let m;try{m=decodeOSC(bytes)}catch{return}
    if(!['/awb/live-set/host/result','/awb/live-set/host/error'].includes(m.address)||m.args[0]!==token)return;
    const p=pending.get(m.args[1]);if(!p)return;clearTimeout(p.timer);pending.delete(m.args[1]);
    if(m.address.endsWith('/error'))p.reject(Error(String(m.args[2])));else p.resolve(m.args.slice(2));
  });
  socket.on('error',error=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(error)}pending.clear()});
  const request=(operation,timeout)=>new Promise((resolve,reject)=>{
    if(closed){reject(Error('Live set host bridge is closed'));return}
    const id=crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(id);reject(Error(`Live set ${operation} timed out`))},timeout);
    pending.set(id,{resolve,reject,timer});
    socket.send(encodeOSC({address:'/awb/live-set/host',args:[token,id,operation,sessionID]}),port,'127.0.0.1',error=>{if(error){clearTimeout(timer);pending.delete(id);reject(error)}});
  });
  const dispose=()=>{if(closed)return;closed=true;for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Live set host bridge closed'))}pending.clear();socket.close()};
  return {sessionID,async open(){
    const [status,id,pid,languagePort,baseID,paramID,rackID,libraryID]=await request('open',timeoutMs);
    if(status!=='ready'||id!==sessionID||!Number.isInteger(pid)||pid<1||languagePort!==port||![baseID,paramID,rackID,libraryID].every(v=>typeof v==='string'&&v.length>0&&v.length<=256))throw Error('Invalid live set host binding');
    return {instanceID:baseID,processID:pid,context:{binding:{instanceID:paramID,port},baseBinding:{instanceID:baseID,port},rackBinding:{instanceID:rackID,port,libraryID,libraryRoot:path.resolve(libraryRoot)},delayBinding:true}};
  },async close(){if(closed)return;try{const [status,id]=await request('close',10000);if(status!=='closed'||id!==sessionID)throw Error('Invalid live set close reply')}finally{dispose()}},dispose};
}
