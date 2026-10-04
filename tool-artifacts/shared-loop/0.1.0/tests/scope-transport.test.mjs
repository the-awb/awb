import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {EventEmitter} from 'node:events';
import WebSocket from 'ws';
import {ScopeTransport} from '../scope-transport.mjs';
import {decodeScopeFrame,SCOPE_PROTOCOL} from '../public/scope-protocol.js';
const snapshot=sequence=>({frames:3,sourceEnd:sequence*3,channels:1,sampleRate:48000,sequence,peaks:[.5],rms:[.25],samples:new Float32Array([-.5,0,.5])});
class Viewer extends EventEmitter{
 readyState=WebSocket.OPEN;bufferedAmount=0;messages=[];
 send(data,options,cb){this.messages.push(data);cb();}
 terminate(){this.readyState=WebSocket.CLOSED;this.emit('close');}
 close(){this.terminate();}
}
test('slow viewer retains only one outstanding sample block and receives latest after acknowledgement',async()=>{
 const server=http.createServer(),transport=new ScopeTransport(server,123),viewer=new Viewer();
 try{
  transport.add(viewer,'mic');transport.publish({mic:snapshot(1)},{connected:true});
  for(let sequence=2;sequence<=100;sequence++)transport.publish({mic:snapshot(sequence)},{connected:true});
  assert.equal(transport.stats.framesSent,1);assert.equal(viewer.messages.filter(Buffer.isBuffer).length,1);
  viewer.emit('message',Buffer.from('{"ack":1}'),false);
  assert.equal(transport.stats.framesSent,2);assert.equal(decodeScopeFrame(viewer.messages.at(-1)).sequence,100);
  transport.publish({mic:snapshot(101)},{connected:true});assert.equal(transport.stats.framesSent,2);
 }finally{await transport.close();}
});
test('unacknowledged frame times out and removes the viewer; malformed acknowledgement closes it',async()=>{
 let now=0;const server=http.createServer(),transport=new ScopeTransport(server,123,{now:()=>now}),viewer=new Viewer();
 try{
  transport.add(viewer,'mic');transport.publish({mic:snapshot(1)},{connected:true});now=5001;
  transport.publish({mic:snapshot(2)},{connected:true});assert.equal(transport.clients.size,0);
  const invalid=new Viewer();transport.add(invalid,'mic');invalid.emit('message',Buffer.from('{"ack":999}'),false);assert.equal(transport.clients.size,0);
 }finally{await transport.close();}
});
test('real socket sends binary floats and rejects wrong origin, kind and protocol',async()=>{
 const server=http.createServer(),transport=new ScopeTransport(server,123);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`,url=origin.replace('http:','ws:')+'/scope/socket?kind=mic';
 let viewer;
 try{
  transport.publish({mic:snapshot(1)},{connected:true});
  const received=new Promise((resolve,reject)=>{
   viewer=new WebSocket(url,SCOPE_PROTOCOL,{origin});viewer.on('error',reject);
   viewer.on('message',(data,binary)=>{if(binary){const frame=decodeScopeFrame(data,'mic',123);viewer.send(JSON.stringify({ack:frame.sequence}));resolve(frame);}});
  });
  const frame=await received;assert.deepEqual(frame.samples,snapshot(1).samples);
  for(const [target,protocol,options] of [[url,SCOPE_PROTOCOL,{origin:'https://other.example'}],[url.replace('kind=mic','kind=wrong'),SCOPE_PROTOCOL,{origin}],[url,'other.protocol',{origin}]]){
   await new Promise((resolve,reject)=>{const ws=new WebSocket(target,protocol,options);ws.on('error',error=>{assert.match(error.message,/403/);resolve();});ws.on('open',()=>{ws.terminate();reject(new Error('Invalid upgrade accepted'));});});
  }
 }finally{viewer?.terminate();await transport.close();await new Promise(resolve=>server.close(resolve));}
});

test('subscriber counts drive each kind independently and stale-kind status does not silence peers',async()=>{
 const changed=[],server=http.createServer(),transport=new ScopeTransport(server,123,{onSubscribersChanged:kind=>changed.push([kind,transport.subscribers(kind)])}),a=new Viewer(),b=new Viewer();
 try{transport.add(a,'mic');transport.add(b,'output');
  transport.publish({mic:snapshot(1)},{connected:false,kinds:{mic:{connected:true},output:{connected:false,error:'stalled'}}});
  assert.equal(a.messages.filter(Buffer.isBuffer).length,1);assert.equal(b.messages.filter(Buffer.isBuffer).length,0);
  a.terminate();assert.deepEqual(changed,[['mic',1],['output',1],['mic',0]]);
 }finally{await transport.close();}assert.deepEqual(changed.at(-1),['output',0]);
});


test('channel masks are per viewer, same-clock changes resend, and encoded variants survive status refresh',async()=>{
 const transport=new ScopeTransport(http.createServer(),123),one=new Viewer(),peer=new Viewer(),full=new Viewer();
 const s={frames:2,sourceEnd:2,channels:6,sampleRate:44100/64,audioSampleRate:44100,blockSize:64,sequence:1,peaks:[1,2,3,4,5,6],rms:[.1,.2,.3,.4,.5,.6],samples:new Float32Array([0,1,10,11,20,21,30,31,40,41,50,51])};
 const ack=(viewer,seq)=>viewer.emit('message',Buffer.from(JSON.stringify({ack:seq})),false);
 const choose=(viewer,channels)=>viewer.emit('message',Buffer.from(JSON.stringify({channels})),false);
 try{
  transport.add(one,'control',{channels:[1]});transport.add(peer,'control',{channels:[1]});transport.add(full,'control');transport.publish({control:s},{connected:true});
  assert.deepEqual(decodeScopeFrame(one.messages.at(-1)).channelIds,[1]);assert.equal(one.messages.at(-1),peer.messages.at(-1));assert.equal(transport.stats.packetsEncoded,2);
  choose(one,[2,3,4,5]);assert.equal(one.messages.filter(Buffer.isBuffer).length,1,'selection waits for outstanding ack');ack(one,1);
  assert.deepEqual(decodeScopeFrame(one.messages.at(-1)).channelIds,[2,3,4,5]);assert.equal(transport.stats.packetsEncoded,3);
  ack(one,1);ack(peer,1);ack(full,1);choose(full,[0,1,2,3,4,5]);assert.equal(transport.stats.packetsEncoded,3,'explicit full mask reuses default packet');ack(full,1);
  transport.publish({control:s},{connected:true,error:'status changed'});choose(peer,[2,3,4,5]);
  assert.equal(transport.stats.packetsEncoded,3);assert.equal(one.messages.filter(Buffer.isBuffer).at(-1),peer.messages.at(-1));
  ack(peer,1);const count=transport.stats.framesSent;choose(peer,[2,3,4,5]);assert.equal(transport.stats.framesSent,count);
  ack(full,1); // Invalid repeated ack closes only this viewer.
  assert.equal(transport.subscribers('control'),2);
  transport.publish({control:{...s,sourceEnd:4,sequence:2}},{connected:true});assert.equal(transport.stats.packetsEncoded,4);
  const bad=new Viewer();transport.add(bad,'control');choose(bad,[2,1]);assert.equal(bad.readyState,WebSocket.CLOSED);
 }finally{await transport.close();}
});
test('socket upgrade validates selected channels before accepting a connection',async()=>{
 const server=http.createServer(),transport=new ScopeTransport(server,123);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`,base=origin.replace('http:','ws:')+'/scope/socket?kind=control&channels=';
 try{for(const list of ['','2,1','1,1','6','NaN'])await new Promise((resolve,reject)=>{const ws=new WebSocket(base+list,SCOPE_PROTOCOL,{origin});ws.on('error',e=>{assert.match(e.message,/403/);resolve()});ws.on('open',()=>{ws.terminate();reject(new Error('Invalid mask accepted'))})});}
 finally{await transport.close();await new Promise(r=>server.close(r));}
});
