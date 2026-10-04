import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeScopeFrame,decodeScopeFrame,SCOPE_HEADER_BYTES} from '../public/scope-protocol.js';
const snapshot={frames:3,sourceEnd:3,channels:2,sampleRate:44100,sequence:17,peaks:[.5,.75],rms:[.25,.375],samples:new Float32Array([-.5,0,.5,-.75,0,.75])};
test('scope packet preserves planar float samples, metrics, actual rate and identity',()=>{
 const packet=encodeScopeFrame('output',snapshot,123),decoded=decodeScopeFrame(packet,'output',123);
 assert.equal(packet.byteLength,SCOPE_HEADER_BYTES+24);assert.deepEqual(decoded.samples,snapshot.samples);
 for(const key of ['frames','channels','sampleRate','sequence','peaks','rms'])assert.deepEqual(decoded[key],snapshot[key]);
 assert.equal(decoded.samples.buffer,packet,'browser views received bytes without sample conversion');
});
test('scope packet rejects truncation, layout/version, kind and generation mismatches',()=>{
 const packet=encodeScopeFrame('output',snapshot,123);
 assert.throws(()=>decodeScopeFrame(packet.slice(0,20)),/Truncated/);
 assert.throws(()=>decodeScopeFrame(packet.slice(0,-4)),/dimensions/);
 assert.throws(()=>decodeScopeFrame(packet,'mic'),/identity/);assert.throws(()=>decodeScopeFrame(packet,'output',124),/identity/);
 for(const [offset,method,value] of [[4,'setUint16',6],[7,'setUint8',1],[8,'setUint32',2049],[16,'setFloat64',NaN],[76,'setUint32',1],[80,'setUint32',8],[84,'setUint32',0],[96,'setFloat64',NaN]]){
  const copy=packet.slice(0);new DataView(copy)[method](offset,value,true);assert.throws(()=>decodeScopeFrame(copy));
 }
});
test('scope packet decodes an unaligned byte view and handles uint32 sequence wrap',()=>{
 const packet=encodeScopeFrame('output',{...snapshot,sequence:4294967296},123),bytes=new Uint8Array(packet.byteLength+1);bytes.set(new Uint8Array(packet),1);
 const decoded=decodeScopeFrame(bytes.subarray(1));assert.equal(decoded.sequence,0);assert.deepEqual(decoded.samples,snapshot.samples);
});

test('wide audio packet preserves minmax buckets and original time span',()=>{
 const s={...snapshot,format:'minmax',sourceFrames:48,sourceEnd:48,samples:new Float32Array([-.5,.1,-.2,.2,-.1,.5,-.75,.2,-.2,.3,-.1,.75])};
 const decoded=decodeScopeFrame(encodeScopeFrame('output',s,123),'output',123);
 assert.equal(decoded.sourceFrames,48);assert.equal(decoded.frames,3);assert.equal(decoded.format,'minmax');assert.deepEqual(decoded.samples,s.samples);
 assert.equal(decoded.sourceFrames/decoded.sampleRate,48/44100);
});
test('control bus packet carries control rate and actual audio rate independently',()=>{
 const s={frames:3,sourceFrames:3,sourceEnd:3,channels:6,sampleRate:750,audioSampleRate:48000,blockSize:64,sequence:1,peaks:[1,.5,.25,.125,.0625,.03125],rms:[.5,.25,.125,.0625,.03125,.015625],samples:new Float32Array([0,.5,1,0,.25,.5,0,.125,.25,0,.0625,.125,0,.03125,.0625,0,.015625,.03125])};
 const packet=encodeScopeFrame('control',s,123),decoded=decodeScopeFrame(packet,'control',123);
 assert.deepEqual(decoded.samples,s.samples);assert.deepEqual(decoded.peaks,s.peaks);assert.deepEqual(decoded.rms,s.rms);assert.equal(decoded.channels,6);
 assert.equal(decoded.sampleRate,750);assert.equal(decoded.audioSampleRate,48000);assert.equal(decoded.blockSize,64);
 const invalid=packet.slice(0);new DataView(invalid).setUint32(84,32,true);assert.throws(()=>decodeScopeFrame(invalid),/sample rate/);
});


test('selected channels retain physical identity, planar data and selected metrics at both resolutions',async()=>{
 const {selectScopeChannels}=await import('../public/scope-protocol.js');
 for(const format of ['samples','minmax']){
  const stride=format==='samples'?3:6;
  const full={frames:3,sourceFrames:format==='samples'?3:48,sourceEnd:48,channels:6,sampleRate:44100/64,audioSampleRate:44100,blockSize:64,sequence:9,format,peaks:[1,2,3,4,5,6],rms:[.1,.2,.3,.4,.5,.6],samples:Float32Array.from({length:stride*6},(_,i)=>i)};
  assert.equal(selectScopeChannels(full,[0,1,2,3,4,5]),full);
  for(const ids of [[1],[2,3,4,5]]){
   const selected=selectScopeChannels(full,ids),packet=encodeScopeFrame('control',selected,77),f=decodeScopeFrame(packet,'control',77);
   assert.equal(packet.byteLength,SCOPE_HEADER_BYTES+stride*ids.length*4);assert.deepEqual(f.channelIds,ids);assert.equal(f.sourceChannels,6);
   assert.deepEqual([...f.samples],ids.flatMap(ch=>[...full.samples.subarray(ch*stride,(ch+1)*stride)]));assert.deepEqual(f.peaks,ids.map(ch=>full.peaks[ch]));
   assert.equal(f.samples.buffer,packet);assert.equal(f.sourceEnd,48);assert.equal(f.audioSampleRate,44100);
  }
  for(const ids of [[],[1,1],[3,2],[6],[-1]])assert.throws(()=>selectScopeChannels(full,ids),/selection/);
 }
});
test('v4 full-channel packets still decode and v5 rejects invalid masks and reserved bytes',()=>{
 const v5=encodeScopeFrame('output',snapshot,123),legacy=new Uint8Array(104+snapshot.samples.byteLength);
 legacy.set(new Uint8Array(v5,0,104));legacy.set(new Uint8Array(v5,SCOPE_HEADER_BYTES),104);new DataView(legacy.buffer).setUint16(4,4,true);
 const decoded=decodeScopeFrame(legacy);assert.equal(decoded.version,4);assert.deepEqual(decoded.channelIds,[0,1]);assert.deepEqual(decoded.samples,snapshot.samples);
 for(const [offset,value] of [[104,0],[104,1],[104,7],[108,6],[109,1],[110,1]]){
  const bad=v5.slice(0);const view=new DataView(bad);if(offset===104)view.setUint32(offset,value,true);else view.setUint8(offset,value);assert.throws(()=>decodeScopeFrame(bad),/dimensions/);
 }
});
