import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeManagerProjection } from '../services/nodeManagerProjection.mjs';

const delay = ( milliseconds ) => new Promise( ( resolve ) => setTimeout( resolve, milliseconds ) );
const waitFor = async ( predicate, timeout = 500 ) => {
  const started = Date.now(); while ( !predicate() ) {
    if ( Date.now() - started > timeout ) throw new Error( 'Timed out waiting for NodeManager recovery.' );
    await delay( 5 );
  }
};

test( 'NodeManager projection replaces snapshots, scopes explicit bindings and recovers gaps', () => {
  const sent = []; const projection = new NodeManagerProjection( { sendOsc: ( address, args ) => sent.push( { address, args } ) } );
  projection.connect();
  assert.equal( sent[ 0 ].address, '/awb/nm/subscribe' );
  projection.receive( { address: '/awb/nm/subscribed', args: [ projection.clientID, 3, 'summary', 'coalesced' ] } );
  projection.receive( { address: '/awb/nm/snapshot/begin', args: [ projection.clientID, 10 ] } );
  projection.receive( { address: '/awb/nm/container/upsert', args: [ projection.clientID, 10, 100,
    'toolInstance_scoreArranger_scoreArranger:1001', 'Score A', 1 ] } );
  projection.receive( { address: '/awb/nm/entry/upsert', args: [ projection.clientID, 10, 101, 'synth', 'Synth', 'voice', 1, 'localhost', 'scoreArranger', '', 'uncataloguedVoice' ] } );
  projection.receive( { address: '/awb/nm/membership/upsert', args: [ projection.clientID, 10, 101, 100,
    'toolInstance_scoreArranger_scoreArranger:1001' ] } );
  projection.receive( { address: '/awb/nm/snapshot/end', args: [ projection.clientID, 10 ] } );
  const scoped = projection.viewForBinding( { toolSource: 'scoreArranger', toolInstance: 'scoreArranger:1001' } );
  assert.equal( scoped.containers.length, 1 ); assert.equal( scoped.entries.length, 1 );
  assert.equal( scoped.entries[ 0 ].synthDefName, 'uncataloguedVoice' );
  assert.equal( projection.viewForBinding( { toolSource: 'scoreArranger', toolInstance: 'other' } ).entries.length, 0 );
  projection.receive( { address: '/awb/nm/batch/begin', args: [ projection.clientID, 11, 12 ] } );
  projection.receive( { address: '/awb/nm/entry/remove', args: [ projection.clientID, 11, 100 ] } );
  projection.receive( { address: '/awb/nm/batch/end', args: [ projection.clientID, 11, 11 ] } );
  assert.equal( projection.snapshot().containers.length, 1, 'malformed batch must not leak staged changes' );
  projection.receive( { address: '/awb/nm/batch/begin', args: [ projection.clientID, 11, 11 ] } );
  projection.receive( { address: '/awb/nm/entry/remove', args: [ projection.clientID, 11, 100 ] } );
  assert.equal( projection.snapshot().containers.length, 1, 'batch changes must remain staged before completion' );
  projection.receive( { address: '/awb/nm/batch/end', args: [ projection.clientID, 11, 11 ] } );
  assert.equal( projection.snapshot().containers.length, 0 );
  assert.equal( projection.viewForBinding( { toolSource: 'scoreArranger', toolInstance: 'scoreArranger:1001' } ).entries.length, 0 );
  projection.receive( { address: '/awb/nm/entry/upsert', args: [ projection.clientID, 13, 102, 'synth', 'Synth', 'gap', 1, '', '', '', 'default' ] } );
  assert.equal( projection.snapshot().status, 'reconnecting' );
  assert.equal( sent.at( -1 ).address, '/awb/nm/snapshot' );
  projection.receive( { address: '/awb/nm/snapshot/begin', args: [ projection.clientID, 20 ] } );
  projection.receive( { address: '/awb/nm/snapshot/end', args: [ projection.clientID, 20 ] } );
  assert.equal( projection.snapshot().containers.length, 0 );
  projection.close();
} );

test( 'NodeManager reconnects after late startup and failed health checks', async () => {
  const sent = []; const projection = new NodeManagerProjection( {
    sendOsc: ( address, args ) => sent.push( { address, args } ), connectTimeoutMs: 15,
    healthIntervalMs: 10, healthTimeoutMs: 25, reconnectBaseMs: 5, reconnectMaxMs: 10
  } );
  projection.connect();
  await waitFor( () => sent.filter( ( message ) => message.address === '/awb/nm/subscribe' ).length >= 2 );
  projection.receive( { address: '/awb/nm/subscribed', args: [ projection.clientID, 3, 'summary', 'coalesced' ] } );
  assert.equal( projection.snapshot().status, 'ready' );
  await delay( 15 );
  const ping = sent.findLast( ( message ) => message.address === '/awb/nm/ping' ); assert.ok( ping );
  projection.receive( { address: '/awb/nm/pong', args: [ projection.clientID, ping.args[ 1 ], 0 ] } );
  await waitFor( () => projection.snapshot().status !== 'ready'
    && sent.filter( ( message ) => message.address === '/awb/nm/subscribe' ).length >= 3 );
  assert.notEqual( projection.snapshot().status, 'ready' );
  assert.ok( sent.filter( ( message ) => message.address === '/awb/nm/subscribe' ).length >= 3 );
  projection.close();
} );
