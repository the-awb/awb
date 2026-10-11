import assert from 'node:assert/strict';
import test from 'node:test';
import { HostControlProjection } from '../services/hostControlProjection.mjs';
import { NodeManagerProjection } from '../services/nodeManagerProjection.mjs';

test( 'host control reports independent language, engine and NodeManager state', () => {
  const sent = []; const host = new HostControlProjection( { sendOsc: ( address, args ) => sent.push( { address, args } ),
    token: 'secret', healthIntervalMs: 60000 } );
  host.connect();
  assert.equal( sent[ 0 ].address, '/awb/host/hello' );
  host.receive( { address: '/awb/host/status', args: [ host.clientID, '', 1, 'ide', 'disabled', 'whenNeeded', 'ready', 123 ] } );
  assert.deepEqual( host.snapshot(), { status: 'ready', protocolVersion: 1, mode: 'ide', nodeManager: 'disabled',
    nodeManagerPolicy: 'whenNeeded', scsynth: 'ready', processID: 123 } );
  host.close();
} );

test( 'host control correlates NodeManager commands and protects the control token', async () => {
  const sent = []; const host = new HostControlProjection( { sendOsc: ( address, args ) => sent.push( { address, args } ),
    token: 'secret', healthIntervalMs: 60000 } );
  host.receive( { address: '/awb/host/status', args: [ host.clientID, '', 1, 'headless', 'disabled', 'manual', 'ready', 456 ] } );
  const pending = host.setNodeManager( 'enable' ); const command = sent.at( -1 );
  assert.equal( command.address, '/awb/host/nodemanager' ); assert.equal( command.args.at( -1 ), 'secret' );
  host.receive( { address: '/awb/host/status', args: [ host.clientID, command.args[ 1 ], 1, 'headless', 'ready', 'manual', 'ready', 456 ] } );
  assert.equal( ( await pending ).nodeManager, 'ready' ); host.close();
} );

test( 'host control creates and closes named native ToolInstances', async () => {
  const sent = []; const host = new HostControlProjection( { sendOsc: ( address, args ) => sent.push( { address, args } ),
    token: 'secret', healthIntervalMs: 60000 } );
  host.receive( { address: '/awb/host/status', args: [ host.clientID, '', 1, 'headless', 'disabled', 'manual', 'ready', 456 ] } );
  const opened = host.openToolInstance( 'score-studio', 'scoreArranger:shell-a' ); const open = sent.at( -1 );
  assert.equal( open.address, '/awb/host/tool/open' );
  assert.deepEqual( open.args.slice( 2, -1 ), [ 'score-studio', 'scoreArranger:shell-a' ] );
  host.receive( { address: '/awb/host/tool/status', args: [ host.clientID, open.args[ 1 ], 'active', 'score-studio', 'scoreArranger:shell-a' ] } );
  assert.deepEqual( await opened, { status: 'active', toolID: 'score-studio', instanceID: 'scoreArranger:shell-a' } );
  const closed = host.closeToolInstance( 'score-studio', 'scoreArranger:shell-a' ); const close = sent.at( -1 );
  assert.equal( close.address, '/awb/host/tool/close' );
  host.receive( { address: '/awb/host/tool/status', args: [ host.clientID, close.args[ 1 ], 'closed', 'score-studio', 'scoreArranger:shell-a' ] } );
  assert.equal( ( await closed ).status, 'closed' ); host.close();
} );

test( 'host control loads score-owned SynthDefs into a named Score Studio session', async () => {
  const sent = []; const host = new HostControlProjection( { sendOsc: ( address, args ) => sent.push( { address, args } ),
    token: 'secret', healthIntervalMs: 60000 } );
  host.receive( { address: '/awb/host/status', args: [ host.clientID, '', 1, 'headless', 'ready', 'whenNeeded', 'ready', 456 ] } );
  const pending = host.loadScoreSynthDefs( 'scoreArranger:shell-a', '/tmp/piece/synths.scd' );
  const request = sent.at( -1 );
  assert.equal( request.address, '/awb/host/score/synthdefs' );
  assert.deepEqual( request.args.slice( 2, -1 ), [ 'scoreArranger:shell-a', '/tmp/piece/synths.scd', 0 ] );
  host.receive( { address: '/awb/host/score/synthdefs/status', args: [ host.clientID,
    request.args[ 1 ], 'loaded', 'scoreArranger:shell-a', 'synths.scd', '' ] } );
  assert.deepEqual( await pending, { status: 'loaded', instanceID: 'scoreArranger:shell-a',
    sourceName: 'synths.scd', previousSourcePath: '' } );
  const override = host.loadScoreSynthDefs( 'scoreArranger:shell-a', '/tmp/other/synths.scd', true );
  const overrideRequest = sent.at( -1 );
  assert.deepEqual( overrideRequest.args.slice( 2, -1 ), [
    'scoreArranger:shell-a', '/tmp/other/synths.scd', 1
  ] );
  host.receive( { address: '/awb/host/score/synthdefs/status', args: [ host.clientID,
    overrideRequest.args[ 1 ], 'loaded', 'scoreArranger:shell-a', 'synths.scd', '/tmp/piece/synths.scd' ] } );
  assert.equal( ( await override ).previousSourcePath, '/tmp/piece/synths.scd' );
  host.close();
} );

test( 'host control requests a bounded audible server probe', async () => {
  const sent = []; const host = new HostControlProjection( { token: 'secret',
    sendOsc: ( address, args ) => sent.push( { address, args } ) } );
  host.receive( { address: '/awb/host/status', args: [ host.clientID, '', 1,
    'headless', 'ready', 'whenNeeded', 'ready', 123 ] } );
  const pending = host.audioProbe( { frequency: 440, duration: 0.35, amplitude: 0.08 } );
  const request = sent.findLast( ( message ) => message.address === '/awb/host/audio/probe' );
  assert.deepEqual( request.args.slice( 2 ), [ 440, 0.35, 0.08, 'secret' ] );
  host.receive( { address: '/awb/host/audio/probe/status', args: [ host.clientID,
    request.args[ 1 ], 'played', 440, 0.35, 0.08, 'awbHeadless' ] } );
  assert.deepEqual( await pending, { status: 'played', frequency: 440,
    duration: 0.35, amplitude: 0.08, server: 'awbHeadless' } );
  host.close();
} );

test( 'NodeManager projection stops retrying while the host reports it disabled', () => {
  const sent = []; const projection = new NodeManagerProjection( { sendOsc: ( address, args ) => sent.push( { address, args } ) } );
  projection.connect(); projection.setHostStatus( 'disabled' );
  assert.equal( projection.snapshot().status, 'disabled' ); const count = sent.length;
  projection.connect(); assert.equal( sent.length, count );
  projection.setHostStatus( 'ready' ); assert.equal( sent.at( -1 ).address, '/awb/nm/subscribe' ); projection.close();
} );

test('audio control correlates configuration, failure, and recovery status',async()=>{
 const sent=[];const host=new HostControlProjection({token:'secret',sendOsc:(address,args)=>sent.push({address,args})});
 host.receive({address:'/awb/host/status',args:[host.clientID,'',1,'headless','disabled','manual','unavailable',456]});
 const configured=host.serverAction('configure',{outputDevice:'1248',sampleRate:44100});let request=sent.at(-1);
 assert.equal(request.address,'/awb/host/server');assert.equal(request.args.at(-1),'secret');
 assert.deepEqual(JSON.parse(request.args[3]),{outputDevice:'1248',sampleRate:44100});
 host.receive({address:'/awb/host/server/status',args:[host.clientID,request.args[1],JSON.stringify({state:'stopped',settings:{outputDevice:'1248'}})]});
 assert.equal((await configured).settings.outputDevice,'1248');
 const failed=host.serverAction('start');request=sent.at(-1);const rejection=assert.rejects(failed,/driver failed/);
 host.receive({address:'/awb/host/server/status',args:[host.clientID,request.args[1],JSON.stringify({state:'failed',error:'driver failed'})]});await rejection;
 const status=host.serverAction('status');request=sent.at(-1);
 host.receive({address:'/awb/host/server/status',args:[host.clientID,request.args[1],JSON.stringify({state:'failed',lastError:'driver failed',error:null})]});
 assert.equal((await status).state,'failed');assert.equal(host.snapshot().audio.lastError,'driver failed');
 await assert.rejects(host.serverAction('eval'),/Unknown/);host.close();
});


test('shutdown acknowledgment invalidates every cached live-host fact',async()=>{
 const host=new HostControlProjection({sendOsc:()=>{}});
 host.receive({address:'/awb/host/status',args:[host.clientID,'',1,'headless','ready','whenNeeded','ready',456,'qt-station','audio-lifecycle']});
 host.receive({address:'/awb/host/server/status',args:[host.clientID,'',JSON.stringify({state:'ready'})]});
 const request=host.shutdown();const id=[...host.pending.keys()][0];
 host.receive({address:'/awb/host/shutting-down',args:[host.clientID,id]});await request;
 assert.equal(host.snapshot().status,'unavailable');assert.equal(host.snapshot().scsynth,'unavailable');
 assert.equal(host.snapshot().audio,undefined);assert.equal(host.snapshot().processID,null);host.close();
});
test('lost heartbeat clears engine readiness and audio details',async()=>{
 const host=new HostControlProjection({sendOsc:()=>{},healthIntervalMs:10,healthTimeoutMs:20});host.connect();
 host.receive({address:'/awb/host/status',args:[host.clientID,'',1,'headless','ready','always','ready',456]});
 host.receive({address:'/awb/host/server/status',args:[host.clientID,'',JSON.stringify({state:'ready'})]});
 await new Promise(resolve=>setTimeout(resolve,65));
 assert.equal(host.snapshot().status,'unavailable');assert.equal(host.snapshot().scsynth,'unavailable');assert.equal(host.snapshot().audio,undefined);host.close();
});
test('renderer readiness cannot override a stopped or unresponsive native host',async()=>{
 const {shellEngineStatus}=await import('../src/shellEngineStatus.mjs');
 assert.equal(shellEngineStatus({control:{status:'unavailable'},scsynth:{status:'ready'}},['ready']),'unavailable');
 assert.equal(shellEngineStatus({control:{status:'ready',audio:{state:'stopped'}},scsynth:{status:'ready'}},['ready']),'stopped');
 assert.equal(shellEngineStatus({control:{status:'ready'},scsynth:{status:'ready'}},[]),'ready');
 assert.equal(shellEngineStatus({scsynth:{status:'unavailable'}},['ready']),'ready');
});
