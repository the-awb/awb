import test from 'node:test';import assert from 'node:assert/strict';import dgram from 'node:dgram';
import {createBridge} from '../runtime/bridge.mjs';import {encode,decode} from '../../awb-shell/src/scBusOsc.mjs';
test('OSC binding retains polarity and native-spec ownership; mode edits deliver authoritative range metadata',async()=>{
 const peer=dgram.createSocket('udp4');await new Promise(r=>peer.bind(0,'127.0.0.1',r));let bridge;const deltas=[],epoch='fixture-epoch';
 peer.on('message',(bytes,remote)=>{
  const {args:a}=decode(bytes),[instance,op,token,request]=a,send=(address,args)=>peer.send(encode(address,[instance,token,...args]),remote.port,'127.0.0.1');
  const param=(kind,polarity,min,base,revision)=>send('/awb/param/meta',[epoch,kind,'gain',min,1,'lin',base,.2,0,0,0,1,2,3,polarity,0,revision,'warning','idle']);
  if(op==='bind'){
   send('/awb/param/meta',[epoch,'begin',request,57110,64,process.pid,0,1,'core:one']);param('param','unipolar',0,.3,0);
   send('/awb/param/meta',[epoch,'routesBegin','gain',0,0]);send('/awb/param/meta',[epoch,'routesEnd','gain',0]);send('/awb/param/meta',[epoch,'end',request,0]);
  }else if(op==='edit'){
   assert.equal(a[6],'polarity');assert.equal(a[7],'bipolar');param('metadata','bipolar',-1,-.5,1);send('/awb/param/result',[request,'ok',1]);
  }
 });
 try{
  bridge=await createBridge({instanceID:'param:fixture',port:peer.address().port},{onDelta:d=>deltas.push(d)});
  const state=await bridge.bind();assert.equal(state.params[0].pickupBase,'warning');assert.equal(state.params[0].pickupAmount,'idle');assert.equal(state.params[0].polarity,'unipolar');assert.equal(state.params[0].nativeSpec,false);assert.deepEqual(state.params[0].indices,[1,2,3]);
  assert.equal(await bridge.edit('gain','polarity','bipolar'),1);assert.equal(deltas.length,1);assert.equal(deltas[0].revision,1);assert.equal(deltas[0].metadata.polarity,'bipolar');assert.equal(deltas[0].metadata.min,-1);assert.equal(deltas[0].metadata.base,-.5);assert.ok(!('routes' in deltas[0].metadata));
 }finally{await bridge?.close();await new Promise(r=>peer.close(r))}
});
