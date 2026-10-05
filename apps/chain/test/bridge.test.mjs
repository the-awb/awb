import{test}from'node:test';import assert from'node:assert/strict';import{spawn}from'node:child_process';import{readFile,writeFile,rm}from'node:fs/promises';import path from'node:path';import dgram from'node:dgram';import{createBridge}from'../runtime/bridge.mjs';import{startRuntime}from'../runtime/shell-runtime.mjs';import{encodeOSC}from'../../rack/runtime/sc-bridge.mjs';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('real sclang: native sync, batched writes, no own echo, language feedback and closure',async t=>{
 const root=process.env.AWB_CHAIN_TEST_ROOT;if(!root){t.skip('Run npm run test:sc for the private real-SC fixture.');return;}
 const ready=path.join(root,'test/bridge-ready.json');await rm(ready,{force:true});let log='';const child=spawn('/Applications/SuperCollider.app/Contents/MacOS/sclang',['-l',path.join(root,'sclang_conf.yaml'),path.join(root,'test/bridge.scd')]);child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);let bridge,other,runtime;const aux=dgram.createSocket('udp4');
 try{
  let binding;for(let i=0;i<120;i++){try{binding=JSON.parse(await readFile(ready,'utf8'));break;}catch{}if(child.exitCode!==null)throw Error(log);await wait(50);}assert.ok(binding,log);
  const own=[],foreign=[],statuses=[];bridge=await createBridge(binding,{onValue:v=>own.push(v),onStatus:(ok,error)=>statuses.push({ok,error})});other=await createBridge(binding,{onValue:v=>foreign.push(v)});
  const initial=await bridge.sync();assert.equal(initial.controls.length,2);assert.equal(initial.controls[1].curve,'log');assert.equal(initial.name,'Chain bridge fixture');
  await bridge.setMany({gain:.25,freq:2500});const changed=await bridge.sync();assert.equal(changed.controls[0].value,.25);assert.equal(changed.controls[1].value,2500);await wait(65);assert.equal(own.length,0,'own GUI writes have no SC echo');assert.equal(foreign.length,2,'other view receives changes');assert.ok(bridge.stats().bundles>=1,'both edits use one OSC bundle');
  const fixture=(...args)=>new Promise((resolve,reject)=>aux.send(encodeOSC({address:'/chain-fixture',args}),binding.port,'127.0.0.1',e=>e?reject(e):resolve()));
  await fixture('set','gain',.75);await wait(70);assert.equal(own.at(-1).value,.75,'SC-origin edit returns to GUI');
  runtime=await startRuntime({binding});assert.equal(runtime.state().controls[0].value,.75);for(let i=0;i<30;i++)await runtime.command({type:'set',values:{gain:i/32}});await runtime.command({type:'set',values:{freq:4000}});await runtime.flush();await runtime.command({type:'sync'});assert.equal(runtime.state().controls[0].value,29/32);assert.equal(runtime.state().controls[1].value,4000);assert.ok(runtime.stats().messages<12,'coalescing avoids 30 transport edits');
  await assert.rejects(runtime.command({type:'set',values:{gain:.1,freq:0}}));assert.equal(runtime.state().controls[0].value,29/32);
  await runtime.command({type:'set',values:{gain:1.75}});await runtime.flush();await wait(100);assert.equal(runtime.state().connected,true,'setter rejection reconciles authoritative SC state');assert.equal(runtime.state().controls[0].value,29/32,'rejected edit rolls GUI state back');
  const response=await fetch(runtime.url+'api/state');assert.equal((await response.json()).state.instanceID,binding.instanceID);
  await fixture('close');await wait(80);assert.equal(runtime.state().connected,false);assert.ok(statuses.some(s=>s.error==='Chain closed.'));await assert.rejects(runtime.command({type:'set',values:{gain:0}}));
  await writeFile(path.join(root,'bridge-results.json'),JSON.stringify({passed:true,stats:runtime.stats(),noOwnEcho:true,externalFeedback:true},null,2));
 }finally{await runtime?.stop();await bridge?.close();await other?.close();aux.close();child.kill('SIGTERM');await writeFile(path.join(root,'bridge-sclang.log'),log);}
});
test('unbound toolkit view explains how to open a native Chain',async()=>{const runtime=await startRuntime({binding:null});try{assert.equal((await fetch(runtime.url)).status,200);assert.equal(runtime.state().connected,false);assert.match(runtime.state().error,/sclang/);await assert.rejects(runtime.command({type:'set',values:{gain:1}}));}finally{await runtime.stop();}});
