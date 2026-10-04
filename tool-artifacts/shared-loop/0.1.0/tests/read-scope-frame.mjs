import WebSocket from 'ws';
import {decodeScopeFrame,SCOPE_PROTOCOL} from '../public/scope-protocol.js';
export function readScopeFrame(url,kind){return new Promise((resolve,reject)=>{
 const address=new URL('/scope/socket',url);address.protocol='ws:';address.searchParams.set('kind',kind);
 const socket=new WebSocket(address,SCOPE_PROTOCOL),timeout=setTimeout(()=>{socket.terminate();reject(new Error('Binary scope timed out'));},4000);
 socket.on('error',error=>{clearTimeout(timeout);reject(error);});
 socket.on('message',(data,binary)=>{if(!binary)return;try{const snapshot=decodeScopeFrame(data,kind);socket.send(JSON.stringify({ack:snapshot.sequence}));clearTimeout(timeout);socket.close();resolve(snapshot);}catch(error){clearTimeout(timeout);socket.terminate();reject(error);}});
});}
