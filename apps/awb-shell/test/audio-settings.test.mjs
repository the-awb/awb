import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {validateAudioSettings,saveAudioSettings,loadAudioSettings,defaultAudioSettings} from '../src/scAudioSettings.mjs';
import {NativeScHostSupervisor} from '../src/nativeScHostSupervisor.mjs';

test('audio settings preserve numeric-looking device names and atomic rejection',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'awb-audio-settings-')),file=path.join(dir,'sc-audio.json');
 try{
  assert.deepEqual(await loadAudioSettings(file),defaultAudioSettings);
  const settings={inputDevice:'1248',outputDevice:'1248',sampleRate:44100,inputChannels:2,outputChannels:2};
  await saveAudioSettings(file,settings);assert.deepEqual(await loadAudioSettings(file),settings);
  const original=await readFile(file,'utf8');
  for(const patch of [{sampleRate:12345},{inputDevice:1248},{inputDevice:null},{outputChannels:0},{inputChannels:1.5},{mode:'emergent'},JSON.parse('{"__proto__":1}')]){
   await assert.rejects(saveAudioSettings(file,{...settings,...patch}));assert.equal(await readFile(file,'utf8'),original);
  }
  assert.deepEqual(await readdir(dir),['sc-audio.json']);
  assert.throws(()=>validateAudioSettings([]));assert.throws(()=>validateAudioSettings(null));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('managed console bounds text and identifies line positions after trimming',async()=>{
 let notifications=0;const host=new NativeScHostSupervisor({bootstrapPath:import.meta.filename,onChange:()=>notifications++});
 host.appendLog('sclang',Array.from({length:500},(_,i)=>'line '+i).join('\n'));
 assert.equal(host.snapshot().logTail.length,400);assert.equal(host.snapshot().logStart,100);assert.equal(host.snapshot().logEnd,500);
 host.appendLog('error','x'.repeat(3000));assert.equal(host.snapshot().logTail.at(-1).length,1000);
 await new Promise(resolve=>setTimeout(resolve,250));assert.equal(notifications,1);
 assert.equal(host.snapshot().owned,false);
});
