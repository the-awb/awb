import test from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import { WebSocket } from 'ws';
import { createOscWebSocketRelay } from '../services/oscWebSocketRelay.mjs';
import { decodeOscPacket } from '../services/oscCodec.mjs';
import { ServiceRegistry } from '../src/serviceRegistry.mjs';

test( 'a shared service closes only after its final view releases it', async () => {
  let created = 0; let closed = 0;
  const registry = new ServiceRegistry( async () => ( { port: ++created, close: async () => { closed += 1; } } ) );
  const first = await registry.acquire( { oscPort: 57120, allowedPrefixes: [ '/tool/' ] } );
  const second = await registry.acquire( { oscPort: 57120, allowedPrefixes: [ '/tool/' ] } );
  assert.equal( created, 1 ); assert.equal( registry.snapshot()[ 0 ].references, 2 );
  await first.release(); assert.equal( closed, 0 ); await second.release(); assert.equal( closed, 1 );
} );

test( 'the shell relay carries and closes every declared context protocol', async () => {
  const osc = dgram.createSocket( 'udp4' );
  const received = [];
  osc.on( 'message', ( packet ) => received.push( ...decodeOscPacket( packet ) ) );
  await new Promise( ( resolve ) => osc.bind( 0, '127.0.0.1', resolve ) );
  const relay = await createOscWebSocketRelay( {
    oscPort: osc.address().port,
    allowedPrefixes: [ '/awb/timeline/', '/awb/synthdef/' ],
    clientIdentityAddresses: [ '/awb/timeline/hello', '/awb/synthdef/hello' ],
    disconnectAddresses: [ '/awb/timeline/disconnect', '/awb/synthdef/disconnect' ]
  } );
  const socket = new WebSocket( relay.endpoint );
  await new Promise( ( resolve ) => socket.once( 'open', resolve ) );
  socket.send( JSON.stringify( { address: '/awb/synthdef/hello', args: [ 'tool-context', 57121 ] } ) );
  while ( !received.some( ( message ) => message.address === '/awb/synthdef/hello' ) ) {
    await new Promise( ( resolve ) => setTimeout( resolve, 5 ) );
  }
  socket.close();
  while ( ![ '/awb/timeline/disconnect', '/awb/synthdef/disconnect' ].every( ( address ) => (
    received.some( ( message ) => message.address === address )
  ) ) ) await new Promise( ( resolve ) => setTimeout( resolve, 5 ) );
  await relay.close();
  osc.close();
  assert.equal( received.find( ( message ) => message.address === '/awb/synthdef/disconnect' ).args[ 0 ], 'tool-context' );
} );
