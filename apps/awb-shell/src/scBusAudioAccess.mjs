import http from 'node:http';
import crypto from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {SignalCaptureBroker} from './signalCaptureBroker.mjs';
import {openScSignalSource} from './scSignalSource.mjs';
export function validateScBusConfiguration({bus=0,channels=2}={}) {
 if(!Number.isInteger(bus)||bus<0||bus>65535||!Number.isInteger(channels)||channels<2||channels>16||channels%2)throw new Error('Choose a nonnegative SC bus and 2–16 channels in stereo pairs.');
 return {bus,channels};
}
export function encodeScBusFrame(snapshot,{generation,sampleRate,bus},sequence){
 const buffer=Buffer.allocUnsafe(48+snapshot.samples.byteLength);
 buffer.writeUInt32LE(0x43535741,0);buffer.writeUInt16LE(1,4);buffer.writeUInt16LE(48,6);
 buffer.writeUInt32LE(generation,8);buffer.writeUInt32LE(sequence>>>0,12);
 buffer.writeDoubleLE(sampleRate,16);buffer.writeDoubleLE(snapshot.sourceEnd,24);
 buffer.writeUInt32LE(bus,32);buffer.writeUInt32LE(snapshot.channels,36);buffer.writeUInt32LE(snapshot.frames,40);buffer.writeUInt32LE(0,44);
 Buffer.from(snapshot.samples.buffer,snapshot.samples.byteOffset,snapshot.samples.byteLength).copy(buffer,48);return buffer;
}
export async function openScBusCapture({host,configuration,broker}) {
 let server,wss,lease,closed=false,sequence=0,info,stopping;
 const close=()=>stopping??=(async()=>{
  closed=true;
  for(const client of wss?.clients??[])client.terminate();
  await new Promise(resolve=>wss?wss.close(resolve):resolve());
  await new Promise(resolve=>server?server.close(resolve):resolve());
  await lease?.stop();
 })();
 try {
  const token=crypto.randomBytes(24).toString('hex');
  server=http.createServer((req,res)=>{res.writeHead(404);res.end()});wss=new WebSocketServer({noServer:true,maxPayload:1024,perMessageDeflate:false});
  server.on('upgrade',(req,socket,head)=>{if(closed||req.url!==`/${token}`){socket.destroy();return;}wss.handleUpgrade(req,socket,head,client=>{client.on('error',()=>{});client.on('message',()=>client.close(1008,'Receive-only stream'));wss.emit('connection',client,req)})});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  lease=await broker.subscribe({host,configuration,onFrame:(next,metadata)=>{
   info=metadata;const packet=encodeScBusFrame(next,info,++sequence);
   for(const client of wss.clients)if(client.readyState===WebSocket.OPEN&&client.bufferedAmount<65536)client.send(packet);
  },onError:error=>{for(const client of wss.clients)client.close(1011,error.message.slice(0,120));close().catch(()=>{})}});
  info=lease;
  const {stop,...metadata}=lease;
  return {...metadata,endpoint:`ws://127.0.0.1:${server.address().port}/${token}`,stop:close,service:host.service};
 }catch(error){await close().catch(()=>{});throw error}
}
// Serialize each view's open/close operations, including closure during allocation.
export class ScBusAudioAccess {
 #captures=new Map();#tails=new Map();#closedViews=new Set();#closing=false;
 constructor({hostContext,open=openScBusCapture,broker}){this.hostContext=hostContext;this.open=open;this.ownsBroker=!broker;this.broker=broker??new SignalCaptureBroker({open:openScSignalSource});}
 #queue(id,job){const next=(this.#tails.get(id)??Promise.resolve()).catch(()=>{}).then(job);this.#tails.set(id,next);next.finally(()=>{if(this.#tails.get(id)===next)this.#tails.delete(id)}).catch(()=>{});return next;}
 async #stop(id){const capture=this.#captures.get(id);if(!capture)return false;await capture.stop();this.#captures.delete(id);return true;}
 start(id,input){const configuration=validateScBusConfiguration(input);return this.#queue(id,async()=>{
  if(this.#closing||this.#closedViews.has(id))throw new Error('SC bus view is closed');
  await this.#stop(id);const host=await this.hostContext();const capture=await this.open({host,configuration,broker:this.broker});this.#captures.set(id,capture);
  if(this.#closing||this.#closedViews.has(id)){await this.#stop(id);throw new Error('SC bus view closed during startup')}
  const {stop,service,...publicInfo}=capture;return publicInfo;
 })}
 stop(id){return this.#queue(id,()=>this.#stop(id))}
 releaseView(id){this.#closedViews.add(id);return this.stop(id)}
 has(){return this.#captures.size>0||this.#tails.size>0}
 async close(){this.#closing=true;await Promise.allSettled([...this.#tails.values()]);await Promise.all([...this.#captures.keys()].map(id=>this.stop(id)));if(this.ownsBroker)await this.broker.close()}
}
