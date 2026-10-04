import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeBusScopeFrame,decodeBusScopeFrame} from '../public/protocol.js';
function frame(channels=16,rate='audio',format='samples'){
 const frames=32,sourceFrames=format==='minmax'?128:32;
 return {bus:32,channels,rate,format,frames,sourceFrames,sourceEnd:4096,sampleRate:rate==='control'?44100/64:44100,audioSampleRate:44100,blockSize:64,generation:3,sequence:7,peaks:Array.from({length:channels},(_,i)=>i/16),rms:Array.from({length:channels},(_,i)=>i/32),samples:Float32Array.from({length:frames*channels*(format==='minmax'?2:1)},(_,i)=>i%43===0?NaN:(i%71)/100)};
}
test('binary scope preserves 1–16 planar channels, both rates and min/max pairs',()=>{
 for(const channels of [1,2,6,16])for(const [rate,format] of [['audio','samples'],['audio','minmax'],['control','samples']]){
  const before=frame(channels,rate,format),buffer=encodeBusScopeFrame(before),after=decodeBusScopeFrame(buffer,3);
  for(const key of ['bus','channels','rate','format','frames','sourceFrames','sourceEnd','sampleRate','audioSampleRate','blockSize','generation','sequence'])assert.equal(after[key],before[key]);
  assert.deepEqual(after.samples,before.samples);assert.deepEqual(after.peaks,before.peaks);assert.deepEqual(after.rms,before.rms);
  const padded=new Uint8Array(buffer.byteLength+1);padded.set(new Uint8Array(buffer),1);assert.deepEqual(decodeBusScopeFrame(padded.subarray(1)).samples,before.samples);
 }
});
test('codec rejects corrupt dimensions, rates, identities and lengths',()=>{
 const encoded=encodeBusScopeFrame(frame());
 assert.throws(()=>decodeBusScopeFrame(encoded,4),/identity/);assert.throws(()=>decodeBusScopeFrame(encoded.slice(0,63)),/Truncated/);assert.throws(()=>decodeBusScopeFrame(encoded.slice(0,-4)),/length/);
 for(const [offset,type,value] of [[0,'Uint32',0],[4,'Uint16',2],[6,'Uint8',7],[7,'Uint8',17],[24,'Uint32',99999],[28,'Uint32',33],[48,'Uint32',65536],[52,'Uint32',0],[56,'Uint32',64],[60,'Uint32',1],[8,'Float64',48000]]){
  const bad=encoded.slice(0);new DataView(bad)['set'+type](offset,value,true);assert.throws(()=>decodeBusScopeFrame(bad),/scope/);
 }
 assert.throws(()=>encodeBusScopeFrame({...frame(1,'control'),format:'minmax',sourceFrames:128}),/dimensions/);
});
