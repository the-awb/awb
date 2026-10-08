import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createOscWebSocketRelay} from '/Users/willy/awb/apps/awb-shell/services/oscWebSocketRelay.mjs';
import {decodeOscPacket} from '/Users/willy/awb/apps/awb-shell/services/oscCodec.mjs';
import {OSC} from '/Users/willy/awb/apps/awb-shell/src/scBusOsc.mjs';
import {SignalCaptureBroker} from '/Users/willy/awb/apps/awb-shell/src/signalCaptureBroker.mjs';
import {openScSignalSource} from '/Users/willy/awb/apps/awb-shell/src/scSignalSource.mjs';
import {NodeManagerProjection} from '/Users/willy/awb/apps/awb-shell/services/nodeManagerProjection.mjs';
const require=createRequire('/Users/willy/awb/apps/awb-shell/package.json');
const {WebSocket}=require('ws');
const root='/private/tmp/awb-supernova-awb-functional-20261007-v1',backend=process.argv[2],run=root+'/'+backend;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn,label,timeout=18000){const start=Date.now();while(!fn()){if(Date.now()-start>timeout)throw Error('Timed out: '+label);await sleep(20)}}
await wait(()=>fs.existsSync(run+'/session.json'),'SC setup',100000);
const session=JSON.parse(fs.readFileSync(run+'/session.json')),token='functional-'+backend,checks=[],errors=[];
function check(ok,label,detail){checks.push({ok:!!ok,label,detail});console.log(ok?'PASS':'FAIL',label);if(!ok)errors.push(label)}
const osc=new OSC(session.langPort),host={oscHost:'127.0.0.1',oscPort:session.langPort,token,isConnected:()=>true,service:{}};
const native=require(root+'/sc-bus-reader.node');let relay,broker,leases=[],sockets=[],projection,projOsc;
const action=op=>osc.request('/awb/functional/action',[token,op],'/awb/functional/done',a=>a[0]===op);
try{
 relay=await createOscWebSocketRelay({oscPort:session.langPort,hostToken:token});
 await wait(()=>relay.hostSnapshot().nodeManager.status==='ready','real NodeManager projection');
 check(relay.hostSnapshot().scsynth.status==='ready','F3 relay sees running engine',relay.hostSnapshot());
 const grant=relay.grant({allowedPrefixes:['/awb/synthdef/'],clientIdentityAddresses:['/awb/synthdef/hello'],disconnectAddresses:['/awb/synthdef/bye']});
 async function connect(i){const w=new WebSocket(grant.endpoint);sockets.push(w);let ready=false,context=false;w.on('message',bytes=>{const m=JSON.parse(bytes);if(m.address==='/awb/bridge/ready')ready=true;if(m.address==='/awb/synthdef/context/end')context=true});await wait(()=>ready,'WebSocket ready');w.send(JSON.stringify({address:'/awb/synthdef/hello',args:['functional-browser-'+i]}));await sleep(30);return w}
 const a=await connect('a'),b=await connect('b');check(a.readyState===1&&b.readyState===1&&relay.hostSnapshot().nodeManager.status==='ready','F3 two real WebSocket clients share shell host');
 for(let i=0;i<20;i++){const w=await connect(i);w.close();await wait(()=>w.readyState===3,'client close')}
 check(relay.hostSnapshot().nodeManager.status==='ready','F3 twenty connect/disconnect cycles preserve projection');
 await relay.setNodeManager('manual');await relay.setNodeManager('disable');await wait(()=>relay.hostSnapshot().nodeManager.status==='disabled','disabled projection');check(true,'F3 actual host disable clears projection');
 await relay.setNodeManager('enable');await wait(()=>relay.hostSnapshot().nodeManager.status==='ready','enable projection');check(true,'F3 actual host enable resnapshots');
 // Use a second actual projection, alter one sequence in a genuine received batch to exercise gap repair.
 projOsc=new OSC(session.langPort);await new Promise(resolve=>projOsc.socket.bind(0,'127.0.0.1',resolve));let inject=false,gapInjected=false,resnapshots=0;
 projection=new NodeManagerProjection({sendOsc:(address,args)=>{if(address==='/awb/nm/snapshot')resnapshots++;projOsc.send(address,...(address==='/awb/nm/subscribe'?[args[0],projOsc.socket.address().port,...args.slice(1)]:args))},healthIntervalMs:500});
 projOsc.socket.on('message',packet=>{for(let m of decodeOscPacket(packet)){if(inject&&!gapInjected&&m.address==='/awb/nm/batch/begin'){m={...m,args:[...m.args]};m.args[1]+=100;gapInjected=true}projection.receive(m)}});
 projection.connect();await wait(()=>projection.status==='ready'&&projection.highWater>0,'second projection snapshot');
 inject=true;await osc.request('/awb/functional/action',[token,'entry',1],'/awb/functional/done',a=>a[0]==='entry');await wait(()=>gapInjected&&resnapshots>0&&projection.status==='ready'&&!projection.staging,'sequence gap recovery');
 check(true,'F3 real sequence-gap resnapshot',{resnapshots,highWater:projection.highWater});projection.close();projOsc.close();projection=null;projOsc=null;
 await action('restartBridge');await sleep(7000);await wait(()=>relay.hostSnapshot().nodeManager.status==='ready','bridge restart');check(true,'F3 NodeManager bridge restart recovery');
 broker=new SignalCaptureBroker({open:input=>openScSignalSource({...input,native})});
 const audioFrames=[],audio2=[],controlFrames=[],scopeErrors=[];
 leases.push(await broker.subscribe({host,configuration:{bus:session.audioBus,channels:2},onFrame:f=>audioFrames.push(f),onError:e=>scopeErrors.push(e.message)}));
 leases.push(await broker.subscribe({host,configuration:{bus:session.audioBus,channels:2},onFrame:f=>audio2.push(f),onError:e=>scopeErrors.push(e.message)}));
 leases.push(await broker.subscribe({host,configuration:{bus:session.controlBus,channels:2,rate:'control'},onFrame:f=>controlFrames.push(f),onError:e=>scopeErrors.push(e.message)}));
 await wait(()=>audioFrames.length>=10&&controlFrames.length>=10,'advancing audio/control ScopeOut2',14000);
 const diag=broker.diagnostics();check(diag.sources.length===2&&diag.sources.find(s=>s.rate==='audio').subscribers===2,'F8 two viewers share one audio tap',diag);
 const valid=frames=>frames.every(f=>f.frames>0&&f.samples.length===f.frames*2&&Array.from(f.samples).every(Number.isFinite));
 check(valid(audioFrames)&&valid(controlFrames),'F8 native audio/control frames are finite and sized');
 check(audioFrames.some(f=>f.samples.some(x=>Math.abs(x)>0.015))&&audioFrames.every(f=>f.samples.every(x=>Math.abs(x)<0.021)),'F8 audio tap carries expected private-bus signal');
 check(controlFrames.some(f=>f.samples.some(x=>Math.abs(x)>0.1))&&controlFrames.every(f=>f.samples.every(x=>Math.abs(x)<=0.501)),'F8 control tap carries expected modulation signal');
 await leases[0].stop();const n=audio2.length;await sleep(200);check(audio2.length>n&&broker.diagnostics().sources.find(s=>s.rate==='audio').subscribers===1,'F8 one viewer closing preserves other tap');
 for(const lease of leases)await lease.stop();leases=[];await broker.close();check(broker.diagnostics().sources.length===0&&!broker.diagnostics().polling,'F8 final lease retires taps');
}catch(error){errors.push(error.stack);console.error(error)}finally{
 projection?.close();projOsc?.close();for(const w of sockets)w.terminate();for(const lease of leases)await lease.stop().catch(e=>errors.push(e.stack));await broker?.close().catch(e=>errors.push(e.stack));await relay?.close().catch(e=>errors.push(e.stack));
 fs.writeFileSync(run+'/shell-results.json',JSON.stringify({backend,session,checks,errors,passed:!errors.length},null,2));osc.send('/awb/functional/finish',token);await sleep(150);osc.close();
}
process.exitCode=errors.length?1:0;
