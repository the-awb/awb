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

test( 'NodeManager projection stops retrying while the host reports it disabled', () => {
  const sent = []; const projection = new NodeManagerProjection( { sendOsc: ( address, args ) => sent.push( { address, args } ) } );
  projection.connect(); projection.setHostStatus( 'disabled' );
  assert.equal( projection.snapshot().status, 'disabled' ); const count = sent.length;
  projection.connect(); assert.equal( sent.length, count );
  projection.setHostStatus( 'ready' ); assert.equal( sent.at( -1 ).address, '/awb/nm/subscribe' ); projection.close();
} );
