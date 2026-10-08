import test from 'node:test';import assert from 'node:assert/strict';import {WebSocket} from 'ws';import {startRuntime} from '../runtime/shell-runtime.mjs';import {ControlObservationBroker} from '../../awb-shell/src/controlObservationBroker.mjs';
const wait=async(fn)=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10))}throw Error('wait timed out')};
test('runtime uses shared leases, authenticated edits, hidden release, and borrowing teardown',async()=>{
 let tick,attached=0,detached=0,reads=0,editCalls=0,options,now=0;const values=Float32Array.of(.3,1,.4);
 const broker=new ControlObservationBroker({native:{attach:()=>{attached++;return{}},read:()=>{reads++;return values.slice()},detach:()=>detached++},timer:fn=>{tick=fn;return 1},clearTimer:()=>{tick=null},clock:()=>now});
 const state={epoch:'binding-one',host:{port:57110,capacity:64,pid:process.pid,epoch:'boot-one'},owner:'core:one',revision:0,count:1,params:[{id:'gain',min:0,max:1,warp:'lin',base:.3,amount:1,modCurve:0,indices:[1,2,3],routes:[{id:'lfo',kind:'bus',amount:1,curve:0,status:'connected',editable:true}]}]};
 const runtime=await startRuntime({binding:{instanceID:'param:one',port:57120},controlObservations:broker,bridgeFactory:async(b,o)=>{options=o;return{bind:async()=>structuredClone(state),isAlive:()=>true,edit:async(id,field,value,source,dur,curve,origin)=>{editCalls++;options.onDelta({epoch:state.epoch,revision:editCalls,id,field:field==='base'?'baseTarget':field,source:field.startsWith('source')?source:undefined,value,origin});return 1},close:async()=>{}}}});
 const first=[],second=[];let a,b;
 try{
  assert.equal((await fetch(runtime.url)).status,200,'built renderer is served');
  const {token}=await fetch(runtime.url+'api/state').then(r=>r.json()),connect=list=>{const ws=new WebSocket(runtime.url.replace('http','ws')+`ws?token=${token}`,{origin:runtime.url.slice(0,-1)});ws.on('message',(data,binary)=>list.push(binary?data:JSON.parse(data)));return ws};a=connect(first);b=connect(second);await wait(()=>first.length&&second.length);
  const send=(ws,m)=>ws.send(JSON.stringify(m));send(a,{type:'visible',visible:true,hz:15});send(b,{type:'visible',visible:true,hz:8});await wait(()=>broker.diagnostics().hosts[0]?.leases===2);assert.equal(attached,1);
  now=67;tick();await wait(()=>first.some(Buffer.isBuffer));assert.equal(reads,1);assert.equal(broker.diagnostics().hosts[0].buses,3);
  send(a,{type:'edit',epoch:'stale',id:'gain',field:'base',value:.5,request:'bad'});await wait(()=>first.some(m=>m.request==='bad'));assert.equal(editCalls,0);
  send(a,{type:'edit',epoch:state.epoch,id:'gain',field:'base',value:.5,request:'good'});await wait(()=>first.some(m=>m.request==='good'));assert.equal(editCalls,1);assert.ok(!first.some(m=>m.type==='delta'));await wait(()=>second.some(m=>m.type==='delta'));
  send(a,{type:'edit',epoch:state.epoch,id:'gain',field:'sourceAmount',source:'lfo',value:-.4,request:'source'});await wait(()=>first.some(m=>m.request==='source'));assert.equal(editCalls,2);assert.equal(runtime.state().params[0].routes[0].amount,-.4);await wait(()=>second.some(m=>m.delta?.source==='lfo'));assert.ok(!first.some(m=>m.delta?.source==='lfo'));
  for(const value of [-.1,1.1]){send(a,{type:'edit',epoch:state.epoch,id:'gain',field:'amount',value,request:'badamount'+String(value).replace(/[^0-9]/g,'')});await wait(()=>first.some(m=>m.request==='badamount'+String(value).replace(/[^0-9]/g,'')));assert.equal(editCalls,2);assert.equal(first.find(m=>m.request==='badamount'+String(value).replace(/[^0-9]/g,'')).ok,false)}
  send(a,{type:'edit',epoch:state.epoch,id:'gain',field:'polarity',value:'unknown',request:'badpolarity'});await wait(()=>first.some(m=>m.request==='badpolarity'));assert.equal(editCalls,2);assert.equal(first.find(m=>m.request==='badpolarity').ok,false);
  send(a,{type:'edit',epoch:state.epoch,id:'gain',field:'polarity',value:'bipolar',request:'polarity'});await wait(()=>first.some(m=>m.request==='polarity'));assert.equal(editCalls,3);assert.equal(first.find(m=>m.request==='polarity').ok,true);
  send(a,{type:'visible',visible:false,hz:15});await wait(()=>broker.diagnostics().hosts[0]?.leases===1);assert.equal(detached,0);b.close();await wait(()=>!broker.diagnostics().polling);assert.equal(detached,1);
 }finally{a?.terminate();b?.terminate();await runtime.stop();broker.close()}
});

test('pickup phase deltas persist for late viewers without telemetry or edits; loss clears phases',async()=>{
 let callbacks,bindings=0,edits=0;const state={epoch:'pickup',revision:0,host:{pid:process.pid,port:57110,capacity:8},params:[{id:'one',min:0,max:1,base:.5,amount:.2,warp:'lin',indices:[0,1,2],routes:[]}]};
 const r=await startRuntime({binding:{},controlObservations:{close:()=>{},subscribe:()=>assert.fail('Phase notifications must not start telemetry')},bridgeFactory:async(b,o)=>{callbacks=o;return {bind:async()=>{bindings++;return structuredClone(state)},isAlive:()=>true,edit:async()=>edits++,close:async()=>{}}}});
 let ws;const messages=[];
 try{
  callbacks.onDelta({epoch:'pickup',revision:1,id:'one',field:'pickupBase',value:'warning',dur:0,curve:0,origin:''});assert.equal(r.state().params[0].pickupBase,'warning');assert.equal(bindings,1);
  const {token}=await fetch(r.url+'api/state').then(r=>r.json());ws=new WebSocket(r.url.replace('http','ws')+'ws?token='+token,{origin:r.url.slice(0,-1)});ws.on('message',m=>messages.push(JSON.parse(m)));await wait(()=>messages.length);assert.equal(messages[0].state.params[0].pickupBase,'warning');
  callbacks.onDelta({epoch:'pickup',revision:2,id:'one',field:'pickupAmount',value:'ramping',dur:0,curve:0,origin:''});await wait(()=>messages.some(m=>m.delta?.field==='pickupAmount'));assert.equal(r.state().params[0].pickupBase,'warning');assert.equal(r.state().params[0].pickupAmount,'ramping');assert.equal(edits,0);assert.equal(bindings,1);
  callbacks.onStatus(false,'Owner closed');assert.equal(r.state().params[0].pickupBase,'idle');assert.equal(r.state().params[0].pickupAmount,'idle');
 }finally{ws?.terminate();await r.stop()}
});


test('base target edits keep their declared ramp durations; downstream lag stays SC-owned',async()=>{
 const state={epoch:'lag-fixture',host:{port:57110,capacity:64,pid:process.pid,epoch:'boot'},owner:'core:lag',revision:0,count:1,params:[{id:'gain',min:0,max:1,warp:'lin',base:.2,amount:0,modCurve:0,indices:[1,2,3],routes:[]}]};
 const calls=[],messages=[];let ws;
 const runtime=await startRuntime({binding:{instanceID:'param:lag',port:57120},bridgeFactory:async()=>({bind:async()=>structuredClone(state),isAlive:()=>true,edit:async(...args)=>{calls.push(args);return calls.length},close:async()=>{}})});
 try{
  const {token}=await fetch(runtime.url+'api/state').then(r=>r.json());ws=new WebSocket(runtime.url.replace('http','ws')+'ws?token='+token,{origin:runtime.url.slice(0,-1)});ws.on('message',m=>messages.push(JSON.parse(m)));await wait(()=>messages.length);
  for(const [request,field,dur] of [['default','base',undefined],['instant','base',0],['scene','base',2],['amount','amount',undefined]]){
   ws.send(JSON.stringify({type:'edit',epoch:state.epoch,id:'gain',field,value:.5,request,dur}));await wait(()=>messages.some(m=>m.request===request));assert.ok(messages.find(m=>m.request===request).ok);
  }
  assert.deepEqual(calls.map(c=>c[4]),[0,0,2,0]);
  ws.send(JSON.stringify({type:'edit',epoch:state.epoch,id:'gain',field:'base',value:.5,request:'invalid',dur:-1}));await wait(()=>messages.some(m=>m.request==='invalid'));assert.equal(messages.find(m=>m.request==='invalid').ok,false);assert.equal(calls.length,4);
 }finally{ws?.terminate();await runtime.stop()}
});
