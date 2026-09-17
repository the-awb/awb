import test from 'node:test';
import assert from 'node:assert/strict';
import { HostedFieldClient } from '../src/engine/HostedFieldClient.js';

class FakeSocket {
  static OPEN = 1;
  constructor() { this.readyState = 1; this.listeners = new Map(); this.sent = []; }
  addEventListener( type, listener ) { this.listeners.set( type, listener ); }
  send( text ) { this.sent.push( JSON.parse( text ) ); }
  emit( address, args ) { this.listeners.get( 'message' )?.( { data: JSON.stringify( { address, args } ) } ); }
  emitClose() { this.readyState = 3; this.listeners.get( 'close' )?.(); }
  close() { this.readyState = 3; }
}

test( 'observes one exact score run and rejects cross-run runtime frames', () => {
  const client = new HostedFieldClient( { WebSocketImpl: FakeSocket, heartbeatMs: 100000 } );
  client.connect( 'ws://fixture', { scoreID: 'score-a', revision: 4, runID: 'run-a' } );
  const socket = client.socket;
  socket.emit( '/awb/bridge/ready', [ 60001 ] );
  assert.deepEqual( socket.sent[ 0 ].address, '/awb/timeline/hello' );
  socket.emit( '/awb/timeline/connected', [ client.clientID, 1 ] );
  assert.equal( socket.sent[ 1 ].address, '/awb/timeline/observe' );
  socket.emit( '/awb/timeline/result', [ client.clientID, client.observeID, 1, 'observe', 'score-a', 4, 'observing', 'run-a' ] );
  socket.emit( '/awb/timeline/realization', [ client.clientID, 'score-a', 4, 'run-old', 'entry-a', 'old', 'started', 0, 0, 1, 1000 ] );
  socket.emit( '/awb/timeline/realization', [ client.clientID, 'score-a', 4, 'run-a', 'entry-a', 'current', 'started', 0, 0, 1, 1001 ] );
  assert.equal( client.getState().status, 'observing' );
  assert.equal( client.getState().discarded, 1 );
  assert.deepEqual( client.getState().realizations.map( ( item ) => item.realizationID ), [ 'current' ] );
  socket.emitClose();
  assert.equal( client.getState().status, 'disconnected' );
  assert.equal( client.socket, null );
  client.disconnect();
} );

test( 'score attachment follows authoritative transport across successive runs', () => {
  const client = new HostedFieldClient( { WebSocketImpl: FakeSocket, heartbeatMs: 100000 } );
  client.connect( 'ws://fixture', { scoreID: 'score-a', revision: 4, followRuns: true } );
  const socket = client.socket;
  socket.emit( '/awb/bridge/ready', [ 60001 ] );
  socket.emit( '/awb/timeline/connected', [ client.clientID, 1 ] );
  socket.emit( '/awb/timeline/result', [ client.clientID, client.observeID,
    1, 'observe', 'score-a', 4, 'observing', 'run-a' ] );
  socket.emit( '/awb/timeline/transport', [ client.clientID,
    'score-a', 4, 'run-a', 'playing', 0, 10, 1, 0 ] );
  socket.emit( '/awb/timeline/realization', [ client.clientID,
    'score-a', 4, 'run-a', 'entry-a', 'first', 'started', 0, 0, 1, 1001 ] );
  assert.deepEqual( client.getState().realizations.map( ( item ) => item.realizationID ), [ 'first' ] );
  socket.emit( '/awb/timeline/transport', [ client.clientID,
    'score-a', 4, 'run-b', 'playing', 0, 20, 1, 0 ] );
  assert.deepEqual( client.getState().realizations, [], 'a new run clears stale realizations' );
  socket.emit( '/awb/timeline/realization', [ client.clientID,
    'score-a', 4, 'run-a', 'entry-a', 'late', 'started', 0, 0, 1, 1002 ] );
  socket.emit( '/awb/timeline/realization', [ client.clientID,
    'score-a', 4, 'run-b', 'entry-a', 'second', 'started', 0, 0, 1, 1003 ] );
  assert.deepEqual( client.getState().realizations.map( ( item ) => item.realizationID ), [ 'second' ] );
  assert.equal( client.getState().discarded, 1 );
  client.disconnect();
} );

test( 'requests and atomically commits a scheduled relative-phase snapshot', () => {
  const client = new HostedFieldClient( { WebSocketImpl: FakeSocket,
    heartbeatMs: 100000, observationMs: 100000 } );
  client.connect( 'ws://fixture', { scoreID: 'score-a', revision: 4, runID: 'run-a' } );
  const socket = client.socket;
  socket.emit( '/awb/bridge/ready', [ 60001 ] );
  socket.emit( '/awb/timeline/connected', [ client.clientID, 1 ] );
  const ping = socket.sent.find( ( frame ) => frame.address === '/awb/timeline/ping' );
  socket.emit( '/awb/timeline/pong', [ client.clientID, ping.args[ 1 ], performance.now() / 1000 ] );
  socket.emit( '/awb/timeline/result', [ client.clientID, client.observeID,
    1, 'observe', 'score-a', 4, 'observing', 'run-a' ] );
  client.setObservedNodeIDs( [ 1001 ] );
  client.requestPhaseSnapshot();
  const request = socket.sent.findLast( ( frame ) => frame.address === '/awb/field/observe' );
  assert.deepEqual( request.args.slice( 2 ), [ 'score-a', 4, 'run-a', 1, 1001 ] );
  const requestID = request.args[ 1 ];
  socket.emit( '/awb/field/result', [ client.clientID, requestID, 1,
    'scheduled', '17', 12.5, 2 ] );
  socket.emit( '/awb/field/snapshot/begin', [ client.clientID, requestID,
    'score-a', 4, 'run-a', 12.5, 1001, 0, 60, 2 ] );
  socket.emit( '/awb/field/snapshot/component', [ client.clientID, requestID,
    1001, 0, 60, 0, 0.1, 1 ] );
  assert.equal( client.getState().phaseSnapshot, null, 'partial snapshots must remain invisible' );
  socket.emit( '/awb/field/snapshot/component', [ client.clientID, requestID,
    1001, 1, 61, 1.25, 0.1, 1 ] );
  socket.emit( '/awb/field/snapshot/end', [ client.clientID, requestID, 2 ] );
  assert.equal( client.getState().phaseStatus, 'locked' );
  assert.equal( client.getState().phaseSnapshot.components.length, 2 );
  assert.equal( client.getState().phaseSnapshot.components[ 1 ].relativePhase, 1.25 );
  client.disconnect();
} );

test( 'connects a Field ToolSession and controls its owned instruments without a score', async () => {
  const client = new HostedFieldClient( { WebSocketImpl: FakeSocket, heartbeatMs: 100000 } );
  client.connect( 'ws://fixture', { toolSessionID: 'fieldModelling:fixture' } );
  const socket = client.socket;
  socket.emit( '/awb/bridge/ready', [ 60001 ] );
  assert.deepEqual( socket.sent[ 0 ], { address: '/awb/timeline/hello',
    args: [ client.clientID, 60001, 'fieldModelling:fixture' ] } );
  socket.emit( '/awb/timeline/connected', [ client.clientID, 1 ] );
  assert.equal( client.getState().status, 'connected' );
  assert.equal( socket.sent.some( ( frame ) => frame.address === '/awb/timeline/observe' ), false );

  const started = client.instrumentCommand( 'start', 'inst-1', 'substrate', { freqA: 36, active: true } );
  const command = socket.sent.findLast( ( frame ) => frame.address === '/awb/timeline/instrument' );
  assert.deepEqual( command.args.slice( 2 ), [ 'start', 'inst-1', 'substrate', 'freqA', 36, 'active', 1 ] );
  socket.emit( '/awb/timeline/instrument/state', [ client.clientID, 'inst-1', 'running', 1201 ] );
  socket.emit( '/awb/timeline/result', [ client.clientID, command.args[ 1 ], 1,
    'start', 'inst-1', 0, 'applied', '' ] );
  await started;
  assert.deepEqual( client.getState().liveInstruments[ 'inst-1' ], {
    instrumentID: 'inst-1', state: 'running', nodeID: 1201
  } );
  client.disconnect();
} );
