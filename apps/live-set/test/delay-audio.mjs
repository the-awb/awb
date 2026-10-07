import {spawn} from 'node:child_process';import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';import dgram from 'node:dgram';
import {createDelayBridge} from '../runtime/delay-bridge.mjs';import {startNetwork} from '../../../tool-artifacts/buffer-views/0.1.0/network-server.mjs';import {encode,decode} from '../../awb-shell/src/scBusOsc.mjs';
const binding=JSON.parse(readFileSync(process.argv[2])),adapter=await createDelayBridge(binding),results=[];let network;
const check=(name,value)=>{assert.ok(value,name);results.push(name);console.log('PASS '+name)};
try{
 network=await startNetwork({adapter,initial:adapter.initial});check('live adapter binds four cell region pairs',adapter.initial.cells.length===4);
 for(let i=0;i<15;i++){adapter.read();await new Promise(r=>setTimeout(r,30))}const waves=adapter.read();check('native shared waveform bridge reads all eight live regions',waves.length===4&&waves.every(w=>w?.channels.length===2));
 const res=await fetch(new URL('/api/control',network.url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cell',cell:'B1',field:'feedback',value:.31})});check('actual delay UI command is accepted',res.ok);check('shared state reflects authoritative edit',(await res.json()).config.cells[0].feedback===.31);
 const client=dgram.createSocket('udp4');await new Promise(r=>client.bind(0,'127.0.0.1',r));const id='verified';
 await new Promise((ok,no)=>{const timeout=setTimeout(()=>no(Error('SC verification timed out')),3000);client.on('message',b=>{const m=decode(b);if(m.address==='/awb/test/verified'){clearTimeout(timeout);ok()}});client.send(encode('/awb/test/verify',[id]),binding.port,'127.0.0.1')});client.close();
 check('sclang confirms independent edit and retained modulation',true);
 await assert.rejects(adapter.apply({...adapter.initial,source:'tone'}),/managed by the rack/);
 check('shared-host viewer cannot inject its old private test tone',true);
 await network.stop();network=null;
 for(const payload of [{action:'cell',cell:'B1',field:'beats',value:2},{action:'cell',cell:'B1',field:'triplet',value:true},{action:'global',field:'tempo',value:100}]){
  const bridge=await createDelayBridge(binding);try{await bridge.apply((await import('../../../tool-artifacts/buffer-views/0.1.0/network-model.mjs')).command(bridge.initial,payload).config)}finally{await bridge.close()}
 }
 const borrowed=await createDelayBridge(binding);check('closing GUI leaves borrowed delay engine alive',borrowed.connected());check('reopening retains tempo and rhythmic cell settings',borrowed.initial.tempo===100&&borrowed.initial.cells[0].beats===2&&borrowed.initial.cells[0].triplet===true&&borrowed.initial.cells[0].timingMode==='beats');await new Promise(r=>setTimeout(r,2400));check('heartbeat preserves borrowed viewer without configuration polling',borrowed.connected());await borrowed.close();
 if(process.env.AWB_DELAY_GUI==='1'){await new Promise((ok,no)=>{const p=spawn('/Users/willy/awb/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',[new URL('./delay-browser.mjs',import.meta.url).pathname,process.argv[2]],{stdio:'inherit'});p.on('error',no);p.on('exit',code=>code===0?ok():no(Error('Actual composite GUI test failed')))});check('real composite GUI assertions pass',true)}
 const native=createRequire(import.meta.url)('../.build/unifiedview.node');let detached=0;
 const ownerLease=await createDelayBridge(binding,{native:{attach:id=>native.attach(id),read:r=>native.read(r),detach:r=>{detached++;native.detach(r)}}});
 const closer=dgram.createSocket('udp4');await new Promise(r=>closer.send(encode('/awb/test/close',[]),binding.port,'127.0.0.1',r));closer.close();
 for(let i=0;i<100&&ownerLease.connected();i++)await new Promise(r=>setTimeout(r,20));
 check('owner closure invalidates delay observation and releases all eight readers',!ownerLease.connected()&&detached===8);await ownerLease.close();
 writeFileSync('/private/tmp/awb-live-delay-audio/node-results.json',JSON.stringify({passed:results.length,checks:results},null,2));
}finally{await network?.stop();const socket=dgram.createSocket('udp4');await new Promise(r=>socket.send(encode('/awb/test/close',[]),binding.port,'127.0.0.1',r));socket.close();}
