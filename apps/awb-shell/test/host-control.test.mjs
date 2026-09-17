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

test( 'host control creates and closes named native tool sessions', async () => {
  const sent = []; const host = new HostControlProjection( { sendOsc: ( address, args ) => sent.push( { address, args } ),
    token: 'secret', healthIntervalMs: 60000 } );
  host.receive( { address: '/awb/host/status', args: [ host.clientID, '', 1, 'headless', 'disabled', 'manual', 'ready', 456 ] } );
  const opened = host.openToolSession( 'score-studio', 'scoreArranger:shell-a' ); const open = sent.at( -1 );
  assert.equal( open.address, '/awb/host/tool/open' );
  assert.deepEqual( open.args.slice( 2, -1 ), [ 'score-studio', 'scoreArranger:shell-a' ] );
  host.receive( { address: '/awb/host/tool/status', args: [ host.clientID, open.args[ 1 ], 'active', 'score-studio', 'scoreArranger:shell-a' ] } );
  assert.deepEqual( await opened, { status: 'active', toolID: 'score-studio', sessionID: 'scoreArranger:shell-a' } );
  const closed = host.closeToolSession( 'score-studio', 'scoreArranger:shell-a' ); const close = sent.at( -1 );
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
  assert.deepEqual( request.args.slice( 2, -1 ), [ 'scoreArranger:shell-a', '/tmp/piece/synths.scd' ] );
  host.receive( { address: '/awb/host/score/synthdefs/status', args: [ host.clientID,
    request.args[ 1 ], 'loaded', 'scoreArranger:shell-a', 'synths.scd' ] } );
  assert.deepEqual( await pending, { status: 'loaded', sessionID: 'scoreArranger:shell-a', sourceName: 'synths.scd' } );
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
