import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdir,writeFile,readFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import dgram from 'node:dgram';
import {createBridge} from '../../param/runtime/bridge.mjs';import {createBaseBridge} from '../runtime/base-bridge.mjs';import {encode} from '../../awb-shell/src/scBusOsc.mjs';
const config=process.argv[2];if(!config)throw Error('Provide the frozen sclang_conf.yaml from sc/test/run.py');
const launch=await readFile(new URL('../LiveSet/BaseLaunch with efKR.scd',import.meta.url),'utf8');
const sceneNotes=JSON.parse(launch.match(/~awbSceneNotes\s*=\s*(\[[0-9,\s]+\])/)[1]);
assert.deepEqual(sceneNotes,[90,81,82,83,84,85,86,87,88,89]);assert.match(launch,/~awbSceneChannel\s*=\s*nil/);
const out='/private/tmp/awb-live-language';await mkdir(out,{recursive:true});let child,param,base,socket,output='',termination=null,checks=[],status=[],logs=[],deltas=[];
const check=(ok,label)=>{assert.ok(!termination,`sclang exited: ${JSON.stringify(termination)}`);assert.ok(ok,label);checks.push(label)},sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 child=spawn('/Applications/SuperCollider.app/Contents/MacOS/sclang',['-D','-l',config,fileURLToPath(new URL('./language.scd',import.meta.url))],{env:{...process.env,AWB_SCENE_TEST_NOTES:sceneNotes.join(',')}});
 child.once('exit',(code,signal)=>{termination={code,signal}});
 let ready=await new Promise((ok,fail)=>{const timeout=setTimeout(()=>fail(Error('Language fixture readiness timed out')),20000);child.stdout.on('data',b=>{output+=b;const m=output.match(/AWB_LIVE_LANGUAGE_READY\|(awbBase:[\w-]+)\|(param:[\w-]+)\|(\d+)/);if(m&&output.includes('AWB_SCENE_SOURCE_REQUIRED=PASS')){clearTimeout(timeout);ok({base:m[1],param:m[2],port:Number(m[3])})}});child.stderr.on('data',b=>output+=b);child.once('exit',code=>{clearTimeout(timeout);fail(Error(`Language exited ${code}`))});child.once('error',fail)});
 check(output.includes('AWB_SCENE_SOURCE_REQUIRED=PASS'),'SC refuses an unbound source UID without replacing the existing FCB binding');
 base=await createBaseBridge({instanceID:ready.base,port:ready.port},{onLog:l=>logs.push(l),onStatus:(ok,error)=>status.push({ok,error})});
 check(base.state().logs[0].text==='Language bridge ready','actual sclang console history binds');
 check(base.state().mappings[0].name==='deciShaper'&&base.state().mappings[0].cc===13,'actual semantic name and MIDI metadata arrive');
 param=await createBridge({instanceID:ready.param,port:ready.port},{onDelta:delta=>deltas.push(delta)});let state=await param.bind();check(state.params.length===160,'actual SC and Node bind a registry larger than 128');check(state.params[0].id==='deci/deciShaper','namespaced AWParam binds across UDP');
 await param.edit('deci/deciShaper','base',.7);state=await param.bind();check(Math.abs(state.params[0].base-.7)<1e-6,'authoritative GUI edit reaches the same language AWParam');
 for(let i=0;i<100&&!output.includes('AWB_LIVE_BASE_LAG=0.5|dur=0');i++)await sleep(10);
 check(deltas.some(d=>d.id==='deci/deciShaper'&&d.field==='baseTarget'&&d.dur===0)&&output.includes('AWB_LIVE_BASE_LAG=0.5|dur=0'),'omitted GUI duration activates the AWParam half-second lag');
 await param.edit('deci/deciShaper','base',.6,'',0);check(deltas.some(d=>d.field==='baseTarget'&&d.value>.59&&d.value<.61&&d.dur===0),'explicit GUI zero duration changes the ramp target');
 await param.edit('deci/deciShaper','base',.7,'',2);check(deltas.some(d=>d.field==='baseTarget'&&d.value>.69&&d.value<.71&&d.dur===2),'explicit GUI transition duration remains on the ramp');
 for(let i=0;i<100&&!output.includes('AWB_LIVE_BASE_LAG=0.5|dur=2');i++)await sleep(10);check(output.includes('AWB_LIVE_BASE_LAG=0.5|dur=2'),'timed GUI changes retain downstream base lag');
 socket=dgram.createSocket('udp4');const send=(...args)=>new Promise((ok,fail)=>socket.send(encode('/awb/live-fixture',args),ready.port,'127.0.0.1',e=>e?fail(e):ok()));
 await send('log','A real log <with markup>');for(let i=0;i<100&&!logs.some(l=>l.text==='A real log <with markup>');i++)await sleep(20);check(logs.some(l=>l.text==='A real log <with markup>'),'actual AWBase.log arrives as a delta');
 for(const field of ['pickupBase','pickupAmount']){for(const phase of ['warning','ramping','idle']){await send('pickup',field,phase);for(let i=0;i<100&&!deltas.some(d=>d.field===field&&d.value===phase);i++)await sleep(10);check(deltas.some(d=>d.id==='deci/deciShaper'&&d.field===field&&d.value===phase&&!d.source),`actual ${field} ${phase} publishes a parameter delta`);}}
 check(base.state().scenes.length===10,'silent scene registry binds without launching original scenes');
 await base.launchScene(0,.25);check(base.state().scene.transitioning,'Shell launch receives authoritative transition lock');
 await assert.rejects(base.launchScene(1),/in progress/);checks.push('Shell rejects another launch during transition');
 await send('note',81);await sleep(80);check(!logs.some(l=>l.text==='Silent B start')&&logs.some(l=>l.text.includes('already in progress')),'real MIDI note handler rejects overlap with Shell launch');
 await sleep(260);check(!base.state().scene.transitioning,'lock releases after action and transition duration');
 await send('note',81);for(let i=0;i<100&&!logs.some(l=>l.text==='Silent B start');i++)await sleep(10);check(logs.some(l=>l.text==='Silent B start'),'real MIDI note handler launches after lock releases');
 await base.launchScene(0,0);await sleep(20);await assert.rejects(base.launchScene(1),/in progress/);checks.push('zero-duration launch stays locked while its action runs');await sleep(170);
 await assert.rejects(base.launchScene(99),/Unknown scene/);checks.push('SC rejection is acknowledged without changing current scene');
 const waitFor=async predicate=>{for(let i=0;i<200&&!predicate();i++)await sleep(10);assert.ok(predicate(),'Timed out waiting for scene state')};
 const launches=()=>logs.filter(l=>/^Scene \d+:/.test(l.text)).length;
 for(const channel of [0,15]){
  for(const [id,note] of sceneNotes.entries()){
   await waitFor(()=>!base.state().scene.transitioning);const before=launches();
   await send('note',note,channel,100,12345);
   await waitFor(()=>launches()>before&&base.state().scene.current===id);
   check(logs.filter(l=>/^Scene \d+:/.test(l.text)).at(-1).text.startsWith(`Scene ${id}:`),`FCB note ${note} maps to scene ${id} on channel ${channel}`);
  }
 }
 await waitFor(()=>!base.state().scene.transitioning);
 const before=launches();
 await send('note',90,0,100,54321);await sleep(80);check(launches()===before,'scene notes from another MIDI source UID are ignored');
 await send('note',90,0,0,12345);await sleep(80);check(launches()===before,'zero-velocity FCB note is ignored');
 await send('note',80,0,100,12345);await sleep(80);check(launches()===before,'unmapped FCB note is ignored');
 await send('add-scene');await waitFor(()=>base.state().scenes.some(s=>s.id===42));
 check(base.state().scenes.length===11,'scene registry updates when a page defines scenes after shell connection');
 check(new Set(base.state().scenes.map(s=>s.id)).size===11,'scene registry refresh replaces entries without duplicating existing scenes');
 await send('close');for(let i=0;i<100&&param.isAlive();i++)await sleep(20);check(!param.isAlive(),'root close invalidates borrowed parameter bridge');check(status.some(s=>!s.ok&&s.error==='AWBase closed'),'root close invalidates console connection');
 console.log(`AWB_LIVE_LANGUAGE_RESULT=PASS checks=${checks.length}`);
}finally{await param?.close();await base?.close();socket?.close();child?.kill('SIGTERM');await writeFile(out+'/language.log',output);await writeFile(out+'/results.json',JSON.stringify({checks,status,logs,termination},null,2))}
