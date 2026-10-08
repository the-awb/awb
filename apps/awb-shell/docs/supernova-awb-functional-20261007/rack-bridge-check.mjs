import fs from 'node:fs';import {createRequire} from 'node:module';
import {startRuntime} from '/Users/willy/awb/apps/rack/runtime/shell-runtime.mjs';
import {SignalCaptureBroker} from '/Users/willy/awb/apps/awb-shell/src/signalCaptureBroker.mjs';
import {openScSignalSource} from '/Users/willy/awb/apps/awb-shell/src/scSignalSource.mjs';
import {OSC} from '/Users/willy/awb/apps/awb-shell/src/scBusOsc.mjs';
const require=createRequire('/Users/willy/awb/apps/awb-shell/package.json'),{WebSocket}=require('ws');
const root='/private/tmp/awb-supernova-awb-functional-20261007-v1',backend=process.argv[2],size=Number(process.argv[3]),run=root+'/'+backend+(process.argv[4]==='native'?'-rack-native':'-plugins')+size;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));async function wait(fn,label,ms=180000){const begin=Date.now();while(!fn()){if(Date.now()-begin>ms)throw Error('Timed out '+label);await sleep(20)}}
await wait(()=>fs.existsSync(run+'/rack-binding.json'),'rack plugin preparation');
const binding=JSON.parse(fs.readFileSync(run+'/rack-binding.json')),checks=[],errors=[],osc=new OSC(binding.port);let runtime,ws,broker,leases=[];
const check=(ok,label,detail)=>{checks.push({ok:!!ok,label,detail});console.log(ok?'PASS':'FAIL',label);if(!ok)errors.push(label)};
try{
 runtime=await startRuntime({runtimeDirectory:run+'/rack-runtime',scBinding:{...binding,libraryRoot:run+'/mix-library'}});
 let audioFrames=0,controlFrames=0,scopeFaults=[],nonfinite=0;
 const host={oscHost:'127.0.0.1',oscPort:binding.port,token:'functional-'+backend,isConnected:()=>true,service:{}};
 if(binding.masterBus!==undefined){broker=new SignalCaptureBroker({open:input=>openScSignalSource({...input,native:require(root+'/sc-bus-reader.node')})});
 leases.push(await broker.subscribe({host,configuration:{bus:binding.masterBus,channels:2},onFrame:f=>{audioFrames++;nonfinite+=f.samples.filter(x=>!Number.isFinite(x)).length},onError:e=>scopeFaults.push(e.message)}));
 leases.push(await broker.subscribe({host,configuration:{bus:binding.controlBus,channels:1,rate:'control'},onFrame:f=>{controlFrames++;nonfinite+=f.samples.filter(x=>!Number.isFinite(x)).length},onError:e=>scopeFaults.push(e.message)}));}
 await new Promise((resolve,reject)=>require('node:child_process').execFile(process.execPath,[root+'/login-probe.mjs',run.split('/').at(-1)],{timeout:20000},(error,stdout)=>{console.log('LOGIN_PROBE',stdout.trim());error?reject(error):resolve()}));
 const state=runtime.state(),destinations=state.sc.slots,channels=state.sc.channels;
 check(channels.length===8&&destinations.length===size,'F4 actual rack topology',{channels:channels.length,destinations:destinations.length,followers:destinations.reduce((n,s)=>n+s.consumerCount,0)});
 check(destinations.filter(s=>s.detectorActive).length===16&&destinations.reduce((n,s)=>n+s.consumerCount,0)===25,'F4 sixteen detectors and twenty-five follower consumers');
 let browserReady=false,sequence=0;const requests=new Map();ws=new WebSocket(runtime.url.replace('http','ws')+'ws?token='+state.token);
 ws.on('message',bytes=>{const m=JSON.parse(bytes);if(m.type==='state')browserReady=true;if(m.requestID&&requests.has(m.requestID)){const r=requests.get(m.requestID);requests.delete(m.requestID);clearTimeout(r.timer);m.type==='error'?r.reject(Error(m.message)):r.resolve(m.result)}});
 await wait(()=>browserReady,'rack WebSocket',5000);
 const cmd=body=>new Promise((resolve,reject)=>{const id=++sequence;requests.set(id,{resolve,reject,timer:setTimeout(()=>{requests.delete(id);reject(Error('WS command timed out'))},12000)});ws.send(JSON.stringify({...body,requestID:id}))});
 await cmd({type:'arm',armed:true});
 const observed=[];const unsub=runtime.store.subscribeAll(e=>{if(e.kind==='value'&&e.origin.startsWith('sc-'))observed.push(e)});
 let final=[];
 for(let burst=0;burst<100;burst++){
  final=channels.flatMap((c,ci)=>destinations.map((s,si)=>({id:`${c.id}/${s.kind==='fx'?'fx':'followers'}/${s.id}`,value:((burst*7+ci*11+si*3)%900+1)/1000})));
  await cmd({type:'batch',changes:final});await sleep(33);
 }
 await sleep(100);if(broker)check(audioFrames>10&&controlFrames>10&&nonfinite===0&&scopeFaults.length===0,'F8 real rack audio/control scopes remain active through matrix traffic',{audioFrames,controlFrames,nonfinite,scopeFaults});check(observed.length===0,'F7 GUI changes generate no SC value echo',{observed:observed.length});unsub();
 await cmd({type:'sync-sc'});
 const actualEngine=await osc.request('/awb/functional/verify',['functional-'+backend],'/awb/functional/verified',a=>a[0]==='functional-'+backend,12000);
 check(actualEngine[1]===0&&actualEngine[2]===size*8,'F7 independent engine sendGains readback matches every channel',{badChannels:actualEngine[1],controls:actualEngine[2]});
 const matches=final.filter(x=>Math.abs(runtime.store.get(x.id)-x.value)<1.1e-6).length;
 check(matches===final.length,'F7 one hundred full-matrix bursts converge in actual SC',{matches,expected:final.length,logicalEdits:100*final.length});
 check(runtime.state().failures===0&&runtime.state().armed,'F7 transport remains armed without protocol errors',runtime.state().oscOutput);
 check(runtime.state().oscOutput.bundles>0,'F7 shell transport actually emitted OSC bundles',runtime.state().oscOutput);
 const before=runtime.state().sent;await osc.request('/awb/functional/external',['functional-'+backend],'/awb/functional/done',a=>a[0]==='external');await wait(()=>runtime.store.get('vc/fx/mast')===.625,'SC-origin edit arrives',5000);await sleep(80);
 check(runtime.state().sent===before,'F7 SC-origin update reaches GUI store without resend');
 const other=final.find(x=>x.id!=='vc/fx/mast'),unchanged=runtime.store.get(other.id);
 const capture=await cmd({type:'capture',label:'functional sparse',ids:['vc/fx/mast'],duration:180,targetDuration:100,alignment:'R'});
 await cmd({type:'batch',changes:[{id:'vc/fx/mast',value:0}]});await cmd({type:'recall',id:capture.snapshotID});await sleep(300);await cmd({type:'sync-sc'});
 check(Math.abs(runtime.store.get('vc/fx/mast')-.625)<1e-6&&Math.abs(runtime.store.get(other.id)-unchanged)<1e-6,'F7 sparse recall changes selected control and preserves null target');
}catch(e){errors.push(e.stack);console.error(e)}finally{
 ws?.terminate();for(const lease of leases)await lease.stop().catch(e=>errors.push(e.stack));await broker?.close().catch(e=>errors.push(e.stack));await runtime?.stop().catch(e=>errors.push(e.stack));fs.writeFileSync(run+'/rack-bridge-results.json',JSON.stringify({backend,destinations:size,checks,errors,passed:!errors.length},null,2));osc.send('/awb/functional/finish','functional-'+backend);await sleep(150);osc.close();
}
process.exitCode=errors.length?1:0;
