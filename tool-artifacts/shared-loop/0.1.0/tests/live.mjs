import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {startDemo} from '../server.mjs';
let checks=0;
function check(condition,message){assert.ok(condition,message);console.log('PASS',message);checks++;}
async function until(fn,timeout=5000){const end=Date.now()+timeout;while(Date.now()<end){const v=fn();if(v)return v;await delay(40);}throw new Error('Timed out waiting for live condition');}
for(let run=0;run<2;run++){
 const d=await startDemo({port:57985,httpPort:0,seconds:.5});
 try {
  await until(()=>d.status().snapshot);
  check(d.status().connected,'native shared reader attached');
  const empty=d.status().snapshot;check(empty.envelope.every(x=>x===0),'initial waveform empty');
  check((await fetch(d.url)).status===200,'GUI served by Node');
  assert.throws(()=>d.native.attach(d.session.sharedId),/already has a reader/);checks++;console.log('PASS duplicate reader rejected');
  await d.control('outputGain',0); // Validation is silent.
  await d.control('toneLevel',.2);await d.control('record');
  await until(()=>d.status().snapshot.flags&16);
  const recorded=d.status().snapshot;check(Math.max(...recorded.envelope)>.19,'recording reaches shared waveform');
  await d.control('frequency',330);await d.control('overdub',true);await delay(650);await d.control('overdub',false);
  const layered=await until(()=>Math.max(...d.status().snapshot.envelope)>.3&&d.status().snapshot);
  check(Math.max(...layered.envelope)>.3,'overdub changes accumulated waveform');
  const binWidth=Math.ceil(layered.frames/512);
  const stored=await d.osc.request('/b_getn',[d.session.bufnum,0,binWidth],'/b_setn');
  const values=stored.slice(3);
  check(Math.abs(Math.min(...values)-layered.envelope[0])<1e-6&&Math.abs(Math.max(...values)-layered.envelope[1])<1e-6,'shared min/max agrees with actual overdubbed Buffer');
  await d.control('toneLevel',0);await d.control('feedback',0);await d.control('overdub',true);
  await until(()=>d.status().snapshot.envelope.every(x=>Math.abs(x)<1e-6));
  check(d.status().snapshot.envelope.every(x=>Math.abs(x)<1e-6),'feedback erasure reduces previous peaks');
  await d.control('overdub',false);await d.control('toneLevel',.2);await d.control('record');await until(()=>d.status().snapshot.flags&1);await until(()=>d.status().snapshot.flags&16);
  const beforeStop=d.status().snapshot.sequence;await d.control('play',false);await until(()=>d.status().snapshot.sequence>beforeStop&&!(d.status().snapshot.flags&2));
  const pos=d.status().snapshot.position;await delay(150);check(d.status().snapshot.position===pos,'stop freezes loop position');
  d.reattach();await until(()=>d.native.read(d.reader));check(d.status().connected,'reader detach and reattach');
  await d.control('clear');await until(()=>!(d.status().snapshot.flags&24));
  check(d.status().snapshot.envelope.every(x=>x===0),'clear resets waveform and ready state');
  // Read the actual SC buffer only for validation; GUI samples never use OSC.
  const samples=await d.osc.request('/b_getn',[d.session.bufnum,0,128],'/b_setn');
  check(samples.slice(3).every(x=>x===0),'clear also zeros actual SC Buffer');
  const old=d.reader;await d.stop();assert.throws(()=>d.native.read(old),/detached/);checks++;console.log('PASS stopped reader rejects access');
  assert.throws(()=>d.native.attach(d.session.sharedId),/unavailable/);checks++;console.log('PASS shared region unlinked');
 } finally {await d.stop();}
}
console.log(`${checks} live checks passed; two server generations on the same port.`);
