import test from 'node:test';
import assert from 'node:assert/strict';
import {createOscOutput} from '../services/oscOutput.mjs';
import {encodeOscMessage, decodeOscPacket} from '../services/oscCodec.mjs';
const encodeMessage=({address,args})=>encodeOscMessage(address,args);
const message=n=>({address:'/control',args:[n,.125]});

test('default output bundles a burst with immediate timetag and preserves every command',async()=>{
 const packets=[];const q=createOscOutput({encodeMessage,sendPacket:async b=>packets.push(b)});
 await Promise.all([1,2,3].map(n=>q.send(message(n))));await q.close();
 assert.equal(packets.length,1);assert.equal(packets[0].subarray(0,8).toString(),'#bundle\0');
 assert.equal(packets[0].readBigUInt64BE(8),1n);
 assert.deepEqual(decodeOscPacket(packets[0]),[1,2,3].map(message));
 assert.equal(q.snapshot().pendingMessages,0);
});

test('byte bounded bundles split a dense rack without losing or reordering values',async()=>{
 const packets=[];const q=createOscOutput({encodeMessage,maxPacketBytes:1200,sendPacket:async b=>packets.push(b)});
 const messages=Array.from({length:296},(_,i)=>({address:'/awb/rack/control',args:['sendRack:test','send',`channel${i%8}`,`fx${i%32}`,i/296,0]}));
 await q.sendMany(messages.map(message=>({message})));await q.close();
 assert.ok(packets.length<30);assert.ok(packets.every(b=>b.length<=1200));
 const decoded=packets.flatMap(decodeOscPacket);assert.equal(decoded.length,296);
 for(let i=0;i<296;i++)assert.deepEqual(decoded[i],{...messages[i],args:messages[i].args.map(v=>typeof v==='number'&&!Number.isInteger(v)?Math.fround(v):v)});
});

test('a valid large single message stays intact and cannot absorb following commands',async()=>{
 const packets=[];const q=createOscOutput({encodeMessage,maxPacketBytes:80,sendPacket:async b=>packets.push(b)});
 const large={address:'/load',args:['x'.repeat(400)]};
 await q.sendMany([message(1),large,message(2)].map(message=>({message})));await q.close();
 assert.equal(packets.length,3);assert.deepEqual(packets.flatMap(decodeOscPacket),[message(1),large,message(2)]);
});

test('queue capacity includes in-flight work and rejects the entire new batch',async()=>{
 let release;const q=createOscOutput({encodeMessage,maxPendingMessages:2,sendPacket:()=>new Promise(r=>release=r)});
 const sent=q.sendMany([message(1),message(2)].map(message=>({message})));const flush=q.flush();
 await new Promise(setImmediate);await assert.rejects(q.send(message(3)),/capacity/);
 assert.equal(q.snapshot().pendingMessages,2);release();await sent;await flush;await q.close();
});

test('validation is atomic and rejection does not send the earlier valid element',async()=>{
 const packets=[];const q=createOscOutput({encodeMessage:m=>{if(m.args[0]===2)throw Error('invalid value');return encodeMessage(m);},sendPacket:async b=>packets.push(b)});
 await assert.rejects(q.sendMany([message(1),message(2)].map(message=>({message}))),/invalid value/);
 await q.close();assert.equal(packets.length,0);assert.equal(q.snapshot().pendingMessages,0);
});

test('send failure reaches callers and subsequent traffic still works',async()=>{
 let fail=true;const packets=[];const q=createOscOutput({encodeMessage,sendPacket:async b=>{if(fail)throw Error('socket failed');packets.push(b);}});
 await assert.rejects(q.send(message(1)),/socket failed/);fail=false;await q.send(message(2));await q.close();
 assert.equal(q.snapshot().failures,1);assert.deepEqual(packets.flatMap(decodeOscPacket),[message(2)]);
});

test('close drains commands before disconnect, rejects later writes, and cancellation releases pending promises',async()=>{
 const packets=[];const q=createOscOutput({encodeMessage,flushMs:100,sendPacket:async b=>packets.push(b)});
 const a=q.send(message(1)),b=q.send({address:'/disconnect',args:[]});await q.close();await Promise.all([a,b]);
 assert.deepEqual(packets.flatMap(decodeOscPacket),[message(1),{address:'/disconnect',args:[]}]);
 await assert.rejects(q.send(message(2)),/closed/);
 const cancelled=createOscOutput({encodeMessage,flushMs:100,sendPacket:async()=>assert.fail('cancelled packet sent')});
 const check=assert.rejects(cancelled.send(message(1)),/closed before transmission/);await cancelled.close({drain:false});await check;
});
