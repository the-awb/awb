import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdir,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import dgram from 'node:dgram';
import {createBridge} from '../../param/runtime/bridge.mjs';import {createBaseBridge} from '../runtime/base-bridge.mjs';import {encode} from '../../awb-shell/src/scBusOsc.mjs';
const config=process.argv[2];if(!config)throw Error('Provide the frozen sclang_conf.yaml from sc/test/run.py');
const out='/private/tmp/awb-live-language';await mkdir(out,{recursive:true});let child,param,base,socket,output='',checks=[],status=[],logs=[];
const check=(ok,label)=>{assert.ok(ok,label);checks.push(label)},sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 child=spawn('/Applications/SuperCollider.app/Contents/MacOS/sclang',['-D','-l',config,fileURLToPath(new URL('./language.scd',import.meta.url))]);
 let ready=await new Promise((ok,fail)=>{const timeout=setTimeout(()=>fail(Error('Language fixture readiness timed out')),20000);child.stdout.on('data',b=>{output+=b;const m=output.match(/AWB_LIVE_LANGUAGE_READY\|(awbBase:[\w-]+)\|(param:[\w-]+)\|(\d+)/);if(m){clearTimeout(timeout);ok({base:m[1],param:m[2],port:Number(m[3])})}});child.stderr.on('data',b=>output+=b);child.once('exit',code=>{clearTimeout(timeout);fail(Error(`Language exited ${code}`))});child.once('error',fail)});
 base=await createBaseBridge({instanceID:ready.base,port:ready.port},{onLog:l=>logs.push(l),onStatus:(ok,error)=>status.push({ok,error})});
 check(base.state().logs[0].text==='Language bridge ready','actual sclang console history binds');
 check(base.state().mappings[0].name==='deciShaper'&&base.state().mappings[0].cc===13,'actual semantic name and MIDI metadata arrive');
 param=await createBridge({instanceID:ready.param,port:ready.port});let state=await param.bind();check(state.params[0].id==='deci/deciShaper','namespaced AWParam binds across UDP');
 await param.edit('deci/deciShaper','base',.7);state=await param.bind();check(Math.abs(state.params[0].base-.7)<1e-6,'authoritative GUI edit reaches the same language AWParam');
 socket=dgram.createSocket('udp4');const send=(...args)=>new Promise((ok,fail)=>socket.send(encode('/awb/live-fixture',args),ready.port,'127.0.0.1',e=>e?fail(e):ok()));
 await send('log','A real log <with markup>');for(let i=0;i<100&&!logs.some(l=>l.text==='A real log <with markup>');i++)await sleep(20);check(logs.some(l=>l.text==='A real log <with markup>'),'actual AWBase.log arrives as a delta');
 await send('close');for(let i=0;i<100&&param.isAlive();i++)await sleep(20);check(!param.isAlive(),'root close invalidates borrowed parameter bridge');check(status.some(s=>!s.ok&&s.error==='AWBase closed'),'root close invalidates console connection');
 console.log(`AWB_LIVE_LANGUAGE_RESULT=PASS checks=${checks.length}`);
}finally{await param?.close();await base?.close();socket?.close();child?.kill('SIGTERM');await writeFile(out+'/language.log',output);await writeFile(out+'/results.json',JSON.stringify({checks,status,logs},null,2))}
