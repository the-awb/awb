import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeManagerProjection } from '../services/nodeManagerProjection.mjs';

test( 'NodeManager projection replaces snapshots, scopes explicit bindings and recovers gaps', () => {
  const sent = []; const projection = new NodeManagerProjection( { sendOsc: ( address, args ) => sent.push( { address, args } ) } );
  projection.connect();
  assert.equal( sent[ 0 ].address, '/awb/nm/subscribe' );
  projection.receive( { address: '/awb/nm/subscribed', args: [ projection.clientID, 3, 'summary', 'coalesced' ] } );
  projection.receive( { address: '/awb/nm/snapshot/begin', args: [ projection.clientID, 10 ] } );
  projection.receive( { address: '/awb/nm/container/upsert', args: [ projection.clientID, 10, 100, 'tool:scoreArranger:session-a', 'Score A', 1 ] } );
  projection.receive( { address: '/awb/nm/entry/upsert', args: [ projection.clientID, 10, 101, 'synth', 'Synth', 'voice', 1, 'localhost', 'scoreArranger', '', 'uncataloguedVoice' ] } );
  projection.receive( { address: '/awb/nm/membership/upsert', args: [ projection.clientID, 10, 101, 100, 'tool:scoreArranger:session-a' ] } );
  projection.receive( { address: '/awb/nm/snapshot/end', args: [ projection.clientID, 10 ] } );
  const scoped = projection.viewForBinding( { toolSource: 'scoreArranger', toolInstance: 'session-a' } );
  assert.equal( scoped.containers.length, 1 ); assert.equal( scoped.entries.length, 1 );
  assert.equal( scoped.entries[ 0 ].synthDefName, 'uncataloguedVoice' );
  assert.equal( projection.viewForBinding( { toolSource: 'scoreArranger', toolInstance: 'other' } ).entries.length, 0 );
  projection.receive( { address: '/awb/nm/entry/remove', args: [ projection.clientID, 11, 100 ] } );
  assert.equal( projection.snapshot().containers.length, 0 );
  assert.equal( projection.viewForBinding( { toolSource: 'scoreArranger', toolInstance: 'session-a' } ).entries.length, 0 );
  projection.receive( { address: '/awb/nm/entry/upsert', args: [ projection.clientID, 13, 102, 'synth', 'Synth', 'gap', 1, '', '', '', 'default' ] } );
  assert.equal( projection.snapshot().status, 'reconnecting' );
  assert.equal( sent.at( -1 ).address, '/awb/nm/snapshot' );
  projection.receive( { address: '/awb/nm/snapshot/begin', args: [ projection.clientID, 20 ] } );
  projection.receive( { address: '/awb/nm/snapshot/end', args: [ projection.clientID, 20 ] } );
  assert.equal( projection.snapshot().containers.length, 0 );
  projection.close();
} );
