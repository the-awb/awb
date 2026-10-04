import {WebSocketServer,WebSocket} from 'ws';
import {encodeScopeFrame,selectScopeChannels,SCOPE_PROTOCOL} from './public/scope-protocol.js';
// One application frame outstanding per viewer, one latest immutable packet per kind.
export class ScopeTransport {
 constructor(server,generation,{ackTimeoutMs=5000,now=Date.now,onSubscribersChanged=()=>{}}={}){
  this.onSubscribersChanged=onSubscribersChanged;this.states={};this.server=server;this.generation=generation;this.now=now;this.ackTimeoutMs=ackTimeoutMs;
  this.clients=new Set();this.latest={};this.packets={};this.state={type:'status',connected:false,error:null,generation};
  this.stats={framesSent:0,binaryBytesSent:0,statusBytesSent:0,ackBytesReceived:0,updatesSkipped:0,packetsEncoded:0};
  this.wss=new WebSocketServer({noServer:true,perMessageDeflate:false,maxPayload:128,handleProtocols:()=>SCOPE_PROTOCOL});
  this.upgrade=(req,socket,head)=>{
   const url=new URL(req.url,'http://localhost'),authority=`127.0.0.1:${server.address()?.port}`;
   const kind=url.searchParams.get('kind');
   if(url.pathname!=='/scope/socket'||!['mic','output','control'].includes(kind)||req.headers.host!==authority||req.headers.origin&&req.headers.origin!==`http://${authority}`||!req.headers['sec-websocket-protocol']?.split(',').map(s=>s.trim()).includes(SCOPE_PROTOCOL)){
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;
   }
   let channels=null;
   if(url.searchParams.has('channels')){const list=url.searchParams.get('channels');channels=list.split(',').map(Number);if(!/^[0-9]+(?:,[0-9]+)*$/.test(list)||!this.validSelection(kind,channels)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return}}
   this.wss.handleUpgrade(req,socket,head,ws=>this.add(ws,kind,{channels}));
  };
  server.on('upgrade',this.upgrade);
 }
 validSelection(kind,ids){const maximum={mic:1,output:2,control:6}[kind];return Array.isArray(ids)&&ids.length>0&&ids.length<=maximum&&ids.every((id,i)=>Number.isInteger(id)&&id>=0&&id<maximum&&(!i||id>ids[i-1]));}
 add(ws,kind,{channels=null}={}){
  const client={ws,kind,channels,selectionRevision:0,lastRevision:-1,status:null,awaiting:null,busy:false,sentAt:0,lastSequence:null};this.clients.add(client);
  ws.on('error',()=>ws.terminate());ws.on('close',()=>{if(this.clients.delete(client))this.onSubscribersChanged(kind)});
  ws.on('message',(data,binary)=>{
   try{const ack=binary?null:JSON.parse(data.toString());
    if(ack&&Object.keys(ack).length===1&&this.validSelection(kind,ack.channels)){
     if(client.channels?.join(',')===ack.channels.join(','))return;client.channels=ack.channels;client.selectionRevision++;this.pump(client);return;
    }
    if(!ack||Object.keys(ack).length!==1||!Number.isInteger(ack.ack)||ack.ack!==client.awaiting)throw new Error('Invalid scope acknowledgement');
    this.stats.ackBytesReceived+=data.length;client.awaiting=null;this.pump(client);
   }catch{ws.close(1008,'Invalid scope acknowledgement');}
  });
  this.onSubscribersChanged(kind);this.pump(client);
 }
 subscribers(kind){return [...this.clients].filter(client=>client.kind===kind).length}
 publish(scopes,state){
  this.latest=scopes;this.states=state.kinds??{};this.state={type:'status',connected:state.connected,error:state.error??null,generation:this.generation};
  for(const kind of Object.keys(this.packets))if(this.packets[kind].snapshot!==scopes[kind])delete this.packets[kind];for(const client of this.clients)this.pump(client);
 }
 pump(client){
  const {ws}=client;if(ws.readyState!==WebSocket.OPEN)return;
  if(client.awaiting!==null||client.busy||ws.bufferedAmount){
   this.stats.updatesSkipped++;if(this.now()-client.sentAt>this.ackTimeoutMs)ws.terminate();return;
  }
  const state={...this.state,...this.states[client.kind]};const status=JSON.stringify(state);
  if(client.status!==status){client.status=status;client.busy=true;client.sentAt=this.now();this.stats.statusBytesSent+=Buffer.byteLength(status);
   ws.send(status,{compress:false},error=>{client.busy=false;if(error)ws.terminate();else this.pump(client);});return;
  }
  const snapshot=this.latest[client.kind];if(!state.connected||!snapshot||client.lastSequence===snapshot.sequence&&client.lastRevision===client.selectionRevision)return;
  const cache=this.packets[client.kind]??={snapshot,variants:new Map()},key=(client.channels??snapshot.channelIds??Array.from({length:snapshot.channels},(_,i)=>i)).join(',');
  let packet=cache.variants.get(key);
  if(!packet){const selected=client.channels?selectScopeChannels(snapshot,client.channels):snapshot;packet=Buffer.from(encodeScopeFrame(client.kind,selected,this.generation));cache.variants.set(key,packet);this.stats.packetsEncoded++;}
  client.lastSequence=snapshot.sequence;client.lastRevision=client.selectionRevision;client.awaiting=snapshot.sequence;client.sentAt=this.now();client.busy=true;
  this.stats.framesSent++;this.stats.binaryBytesSent+=packet.length;
  ws.send(packet,{binary:true,compress:false},error=>{client.busy=false;if(error)ws.terminate();else if(client.awaiting===null)this.pump(client);});
 }
 diagnostics(){return {protocol:SCOPE_PROTOCOL,clients:this.clients.size,...this.stats};}
 async close(){this.server.off('upgrade',this.upgrade);for(const client of this.clients)client.ws.terminate();await new Promise(resolve=>this.wss.close(resolve));}
}
