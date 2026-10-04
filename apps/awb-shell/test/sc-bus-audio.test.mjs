import test from 'node:test';
import assert from 'node:assert/strict';
import {ScBusAudioAccess,encodeScBusFrame,validateScBusConfiguration} from '../src/scBusAudioAccess.mjs';

test('raw paired PCM and actual 44.1 kHz rate survive the binary boundary',()=>{
 const samples=new Float32Array(512*4);for(let ch=0;ch<4;ch++)samples.fill(ch+.25,ch*512,(ch+1)*512);
 const b=encodeScBusFrame({sourceEnd:1024,channels:4,frames:512,samples},{generation:17,sampleRate:44100,bus:32},3);
 assert.equal(b.readDoubleLE(16),44100);assert.equal(b.readUInt32LE(32),32);assert.equal(b.readDoubleLE(24),1024);assert.equal(b.readFloatLE(48+(3*512+511)*4),3.25);
});
test('bus range and stereo channel count are bounded',()=>{
 assert.deepEqual(validateScBusConfiguration({bus:32,channels:6}),{bus:32,channels:6});
 for(const configuration of [{bus:-1},{bus:1.5},{channels:3},{channels:18}])assert.throws(()=>validateScBusConfiguration(configuration));
});
test('restart frees the previous capture; closing a view during open cleans the late capture',async()=>{
 const closed=[];let count=0;let resolveOpen;const host={};
 const access=new ScBusAudioAccess({hostContext:async()=>host,open:async()=>{const n=++count;if(n===3)await new Promise(resolve=>resolveOpen=resolve);return {endpoint:'ws://test',generation:n,sampleRate:44100,stop:async()=>closed.push(n)}}});
 await access.start('one',{bus:0,channels:2});await access.start('one',{bus:8,channels:4});assert.deepEqual(closed,[1]);
 await access.stop('one');assert.deepEqual(closed,[1,2]);
 const opening=access.start('two',{bus:0,channels:2});await new Promise(resolve=>setImmediate(resolve));
 const stopping=access.releaseView('two');resolveOpen();await assert.rejects(opening,/closed during startup/);await stopping;
 assert.deepEqual(closed,[1,2,3]);assert.equal(access.has(),false);await assert.rejects(access.start('two',{}),/closed/);await access.close();
});
