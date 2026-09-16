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
