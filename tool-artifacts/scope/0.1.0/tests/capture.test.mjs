import test from 'node:test';
import assert from 'node:assert/strict';
import {ScopeCapture,validateScopeConfiguration} from '../capture.mjs';
import {SignalCaptureBroker} from '../../../../apps/awb-shell/src/signalCaptureBroker.mjs';
const host={oscHost:'127.0.0.1',oscPort:57120,service:{},isConnected:()=>true};
test('range validation rejects coercion/extra fields and keeps controls raw',()=>{
 assert.deepEqual(validateScopeConfiguration({bus:32,channels:16,rate:'control',zoom:.0625}),{bus:32,channels:16,rate:'control',zoom:1});
 for(const input of [null,[],{bus:'32'},{bus:-1},{bus:1.2},{bus:65536},{channels:0},{channels:17},{rate:'hardware'},{zoom:.5},{token:'forged'}])assert.throws(()=>validateScopeConfiguration(input));
});
test('two scopes and a raw peer share physical capture; zoom does not mutate the raw route',async()=>{
 let opens=0,stops=0,end=0,current;
 const broker=new SignalCaptureBroker({setTimer:()=>1,clearTimer:()=>{},open:async({configuration})=>{opens++;return {info:{...configuration,generation:77,sampleRate:44100,audioSampleRate:44100,blockSize:64},read:()=>current,stop:async()=>{stops++}};}});
 const one=new ScopeCapture({broker,getHost:async()=>host}),two=new ScopeCapture({broker,getHost:async()=>host});
 await one.listen({bus:32,channels:2});await two.listen({bus:32,channels:2});
 let raw;const peer=await broker.subscribe({host,configuration:{bus:32,channels:2},onFrame:frame=>raw=frame});assert.equal(opens,1);
 for(let i=0;i<2;i++){end+=512;current={sourceEnd:end,frames:512,channels:2,samples:new Float32Array(1024).fill(.25)};broker.poll();}
 assert.equal(one.latest.frames,1024);assert.equal(two.latest.frames,1024);assert.equal(raw.frames,512);const kept=raw.samples.slice();
 await one.listen({bus:32,channels:2,zoom:.25});assert.equal(opens,1);assert.equal(broker.diagnostics().derived.length,2);
 for(let i=0;i<2;i++){end+=512;current={sourceEnd:end,frames:512,channels:2,samples:new Float32Array(1024).fill(.5)};broker.poll();}
 assert.equal(one.latest.format,'minmax');assert.equal(two.latest.format,'samples');assert.deepEqual(kept,new Float32Array(1024).fill(.25));
 await one.close();assert.equal(stops,0);await two.close();assert.equal(stops,0);assert.equal(broker.diagnostics().sources.length,1);
 await peer.stop();assert.equal(stops,1);assert.equal(broker.diagnostics().sources.length,0);await broker.close();
});
test('failed replacement preserves the old lease, and close fences pending allocation',async()=>{
 let stops=0,release,entered;
 const broker={subscribeDerived:async({configuration})=>{if(configuration.bus===99)throw new Error('Invalid SC signal bus range');if(configuration.bus===64){entered?.();await new Promise(r=>release=r);}return {stop:async()=>{stops++}};}};
 const scope=new ScopeCapture({broker,getHost:async()=>host});await scope.listen({bus:32,channels:1});
 await assert.rejects(scope.listen({bus:99,channels:1}),/range/);assert.equal(scope.state().configuration.bus,32);assert.equal(stops,0);
 const waiting=new Promise(r=>entered=r),pending=scope.listen({bus:64,channels:1});await waiting;const closing=scope.close();release();
 await assert.rejects(pending,/closed during allocation/);await closing;assert.equal(stops,2);assert.equal(scope.active,null);
});
test('capture errors retire the lease and leave a recoverable disconnected state',async()=>{
 let fault,stops=0;const scope=new ScopeCapture({getHost:async()=>host,broker:{subscribeDerived:async input=>{fault=input.onError;return {stop:async()=>stops++};}}});
 await scope.listen({bus:0,channels:1});fault(new Error('SC host disconnected'));await scope.tail;assert.equal(scope.active,null);assert.equal(scope.state().error,'SC host disconnected');assert.equal(stops,1);
 await scope.listen({bus:0,channels:1});assert.equal(scope.state().connected,true);assert.equal(scope.state().error,null);await scope.close();assert.equal(stops,2);
});
