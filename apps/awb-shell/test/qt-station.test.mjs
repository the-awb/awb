import test from 'node:test';
import assert from 'node:assert/strict';
import { HostControlProjection } from '../services/hostControlProjection.mjs';
test('Qt station uses bounded authenticated command and correlated focus response', async () => {
  const sent=[]; const host=new HostControlProjection({token:'test-token',sendOsc:(address,args)=>sent.push({address,args})});
  host.receive({address:'/awb/host/status',args:[host.clientID,'',1,'ide','disabled','manual','unavailable',123,'qt-station']});
  assert.equal(host.snapshot().qtStation,true);
  const pending=host.openQtToolStation(); const request=sent.at(-1);
  assert.equal(request.address,'/awb/host/qt-station/open');
  assert.deepEqual(request.args.slice(2),['test-token']);
  assert.equal(host.receive({address:'/awb/host/qt-station/status',args:['another-client',request.args[1],'opened']}),false);
  host.receive({address:'/awb/host/qt-station/status',args:[host.clientID,request.args[1],'focused']});
  assert.deepEqual(await pending,{status:'focused'});assert.equal(host.pending.size,0);host.close();
});
test('legacy host reports missing station update without sending unsupported commands', async () => {
  const sent=[]; const host=new HostControlProjection({sendOsc:(address,args)=>sent.push({address,args})});
  host.receive({address:'/awb/host/status',args:[host.clientID,'',1,'ide','disabled','manual','unavailable',123]});
  await assert.rejects(host.openQtToolStation(),/Recompile its class library first/);
  assert.equal(sent.length,0);host.close();
});
test('Qt launch errors reject pending request and permit retry', async () => {
  const sent=[]; const host=new HostControlProjection({sendOsc:(address,args)=>sent.push({address,args})});
  host.receive({address:'/awb/host/status',args:[host.clientID,'',1,'headless','disabled','manual','unavailable',123,'qt-station']});
  const first=host.openQtToolStation();
  host.receive({address:'/awb/host/error',args:[host.clientID,sent.at(-1).args[1],'Qt unavailable']});
  await assert.rejects(first,/Qt unavailable/);
  const second=host.openQtToolStation();
  host.receive({address:'/awb/host/qt-station/status',args:[host.clientID,sent.at(-1).args[1],'opened']});
  assert.deepEqual(await second,{status:'opened'});host.close();
});
