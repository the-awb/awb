import test from 'node:test';import assert from 'node:assert/strict';import dgram from 'node:dgram';
import {startRuntime} from '../runtime/shell-runtime.mjs';import {encodeOscMessage,decodeOscPacket} from '../../awb-shell/services/oscCodec.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('real UDP observers are shared, only send /status, release after final view, and serve bounded deltas',async()=>{
 const server=dgram.createSocket('udp4');await new Promise(r=>server.bind(0,'127.0.0.1',r));let polls=0,senderPorts=new Set();server.on('message',(packet,remote)=>{const messages=decodeOscPacket(packet);assert.deepEqual(messages.map(m=>m.address),['/status']);assert.deepEqual(messages[0].args,[]);polls++;senderPorts.add(remote.port);server.send(encodeOscMessage('/status.reply',[1,123,7,4,280,35.2,122.5,44100,44100]),remote.port,'127.0.0.1');});
 let a,b;try{
 a=await startRuntime({serverPort:server.address().port});b=await startRuntime({serverPort:server.address().port});await delay(600);
 const first=await fetch(a.url+'api/history').then(r=>r.json());assert.equal(first.latest.average,35.20000076293945);assert.equal(first.maximum.peak,122.5);assert.equal(senderPorts.size,1);assert.ok(first.rows.length>=2);const delta=await fetch(b.url+`api/history?after=${first.cursor}&epoch=${first.epoch}`).then(r=>r.json());assert.equal(delta.reset,false);assert.ok(delta.rows.length<=1);
 assert.equal((await fetch(a.url+'api/clear',{method:'POST'})).status,403);assert.equal((await fetch(a.url+'api/server',{method:'POST',headers:{'x-awb-token':first.token},body:'{"port":0}'})).status,400);
 assert.equal((await fetch(a.url+'api/clear',{method:'POST',headers:{'x-awb-token':first.token}})).status,200);
 assert.equal((await fetch(a.url+'../README.md')).status,404);const html=await fetch(a.url);assert.equal(html.status,200);assert.match(html.headers.get('content-security-policy'),/default-src 'self'/);
 await a.stop();a=null;const before=polls;await delay(350);assert.ok(polls>before);await b.stop();b=null;const final=polls;await delay(350);assert.equal(polls,final);
 }finally{await a?.stop();await b?.stop();server.close();}
});
