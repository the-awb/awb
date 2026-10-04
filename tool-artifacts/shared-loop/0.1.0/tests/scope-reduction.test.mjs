import test from 'node:test';
import assert from 'node:assert/strict';
import {ScopeReduction} from '../scope-reduction.mjs';
const info={sampleRate:44100,audioSampleRate:44100,blockSize:64};
const frame=(end,values)=>({frames:4,sourceEnd:end,channels:2,samples:new Float32Array(values)});
test('display reduction preserves raw paired PCM, extrema and actual source rate',()=>{
 const scope=new ScopeReduction('output');const first=frame(4,[-1,0,1,0,.1,.2,.3,.4]),second=frame(8,[0,0,.5,0,.5,.6,.7,.8]);
 const original=second.samples.slice();assert.equal(scope.append(first,info,4),null);const display=scope.append(second,info,4);
 assert.equal(display.sampleRate,44100);assert.equal(display.sourceFrames,8);assert.equal(display.frames,2);assert.equal(display.format,'minmax');assert.equal(display.peaks[0],1);assert.deepEqual([...display.samples].slice(0,4),[-1,1,0,.5]);assert.deepEqual(second.samples,original);
});
test('missing chunks are not joined into fabricated continuous audio',()=>{
 const scope=new ScopeReduction('mic');assert.equal(scope.append(frame(4,[0,0,0,0,0,0,0,0]),info),null);
 assert.equal(scope.append(frame(12,[0,0,0,0,0,0,0,0]),info),null);const next=scope.append(frame(16,[0,0,0,0,0,0,0,0]),info);assert.equal(next.sourceEnd,16);assert.equal(next.sourceFrames,8);
});
test('control rate bypasses audio chunk combining',()=>{
 const scope=new ScopeReduction('control'),next=scope.append(frame(4,[0,1,0,1,0,0,0,0]),{...info,sampleRate:44100/64},4);
 assert.equal(next.frames,1);assert.equal(next.sourceFrames,4);assert.equal(next.sampleRate,44100/64);
});
