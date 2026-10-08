import test from 'node:test';import assert from 'node:assert/strict';import dgram from 'node:dgram';import {createBaseBridge} from '../runtime/base-bridge.mjs';import {encode,decode} from '../../awb-shell/src/scBusOsc.mjs';
test('base bind registers detector buses once, accepts only its epoch and closes the subscription',async()=>{
 const server=dgram.createSocket('udp4');await new Promise(r=>server.bind(0,'127.0.0.1',r));let bridge,unwatch;
 const closed=new Promise(r=>unwatch=r);
 server.on('message',(bytes,peer)=>{const {args:a}=decode(bytes);const send=(path,rest)=>server.send(encode(path,[a[0],a[2],'boot',...rest]),peer.port,'127.0.0.1');if(a[1]==='bind'){
  send('/awb/base/begin',[a[3],0]);for(let i=0;i<16;i++)send('/awb/base/meter',[`global/control-levels/c${i}`,800+i]);
  server.send(encode('/awb/base/meter',[a[0],a[2],'wrong-epoch','bad',99]),peer.port,'127.0.0.1');send('/awb/base/meter',['invalid',-1]);send('/awb/base/end',[a[3]]);
 }else if(a[1]==='unwatch')unwatch()});
 try{bridge=await createBaseBridge({instanceID:'awbBase:test',port:server.address().port});const meters=bridge.state().meters;assert.equal(meters.length,16);assert.deepEqual(meters[15],{id:'global/control-levels/c15',bus:815});await bridge.close();await closed}finally{await bridge?.close();server.close()}
});
