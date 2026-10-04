import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {setTimeout as delay} from 'node:timers/promises';
import {startScopeRuntime} from '../server.mjs';
import {BUS_SCOPE_PROTOCOL,decodeBusScopeFrame} from '../public/protocol.js';
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await delay(10);}throw new Error('Timeout');}
test('local scope HTTP/WS enforce origin, bounded latest-frame ACKs and viewer cleanup',async()=>{
 let callback,opened=0,stopped=0;const broker={subscribeDerived:async input=>{callback=input.onFrame;opened++;return {stop:async()=>stopped++};}};
 const runtime=await startScopeRuntime({broker,getHost:async()=>({isConnected:()=>true})}),origin=runtime.url.slice(0,-1),url=origin.replace('http:','ws:')+'/socket';
 const post=(body,path='listen',from=origin)=>fetch(origin+'/api/'+path,{method:'POST',headers:{Origin:from,'Content-Type':'application/json'},body:JSON.stringify(body)});
 let ws;
 try{
  assert.equal((await post({bus:0,channels:2})).status,409);
  await assert.rejects(new Promise((resolve,reject)=>{const wrong=new WebSocket(url,BUS_SCOPE_PROTOCOL,{origin:'http://bad.test'});wrong.on('open',()=>{wrong.close();resolve()});wrong.on('error',reject);}),/403/);
  ws=new WebSocket(url,BUS_SCOPE_PROTOCOL,{origin});const packets=[],statuses=[];ws.on('message',(data,binary)=>{if(binary)packets.push(decodeBusScopeFrame(data));else statuses.push(JSON.parse(data.toString()));});await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j)});
  assert.equal((await post({bus:32,channels:16,rate:'control'},'listen','http://bad.test')).status,403);assert.equal(opened,0);
  assert.equal((await post({bus:32,channels:16,rate:'control'})).status,200);await until(()=>statuses.some(s=>s.connected));
  const publish=end=>callback({frames:32,sourceFrames:32,sourceEnd:end,channels:16,format:'samples',samples:new Float32Array(512).fill(.25),peaks:Array(16).fill(.25),rms:Array(16).fill(.25),sampleRate:44100/64,audioSampleRate:44100,blockSize:64},{});
  publish(32);await until(()=>packets.length===1);publish(64);publish(96);await delay(30);assert.equal(packets.length,1);ws.send(JSON.stringify({ack:packets[0].sequence}));await until(()=>packets.length===2);assert.equal(packets[1].sourceEnd,96);assert.equal(packets[1].channels,16);
  assert.equal((await post({bus:32,channels:17})).status,400);assert.equal(opened,1);
  ws.send(JSON.stringify({ack:123456}));await new Promise(r=>ws.once('close',r));await until(()=>stopped===1);
  assert.equal((await (await fetch(origin+'/api/state')).json()).connected,false);
  assert.equal((await fetch(origin+'/../../capture.mjs')).status,404);
 }finally{ws?.terminate();await runtime.stop();}
});

test('runtime closes its HTTP socket even if native lease cleanup fails',async()=>{
 const runtime=await startScopeRuntime({getHost:async()=>({isConnected:()=>true}),broker:{subscribeDerived:async()=>({stop:async()=>{throw new Error('Native close failed')}})}}),origin=runtime.url.slice(0,-1);
 const ws=new WebSocket(origin.replace('http:','ws:')+'/socket',BUS_SCOPE_PROTOCOL,{origin});await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j)});
 const response=await fetch(origin+'/api/listen',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({bus:0,channels:1})});assert.equal(response.status,200);
 await assert.rejects(runtime.stop(),/cleanup failed/);await assert.rejects(fetch(origin+'/api/state'));ws.terminate();
});
