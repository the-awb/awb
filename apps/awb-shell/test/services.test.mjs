import test from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import { WebSocket } from 'ws';
import { createOscWebSocketRelay } from '../services/oscWebSocketRelay.mjs';
import { decodeOscPacket } from '../services/oscCodec.mjs';
import { ServiceRegistry } from '../src/serviceRegistry.mjs';
import { NativeAudioAccess } from '../src/nativeAudioAccess.mjs';

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

test( 'native audio capture is view-scoped while its broker can share devices', async () => {
  const released = []; let closed = 0;
  const broker = {
    listDevices: async () => [ { uid: 'motu', inputChannels: 14 } ],
    acquire: async ( configuration ) => ( {
      endpoint: `ws://capture/${ configuration.deviceUID }`,
      status: () => ( { running: true, error: null, events: [] } ),
      release: async () => released.push( configuration.deviceUID )
    } ),
    close: async () => { closed += 1; }
  };
  const access = new NativeAudioAccess( broker );
  assert.deepEqual( await access.listDevices(), [ { uid: 'motu', inputChannels: 14 } ] );
  assert.equal( ( await access.start( 'view-a', { deviceUID: 'motu' } ) ).endpoint, 'ws://capture/motu' );
  assert.equal( access.status( 'view-a' ).running, true );
  assert.equal( await access.stop( 'view-b' ), false );
  assert.equal( await access.releaseView( 'view-a' ), true );
  assert.deepEqual( released, [ 'motu' ] );
  await access.close(); assert.equal( closed, 1 );
} );

test( 'starting a replacement capture releases the view previous source', async () => {
  const released = [];
  const access = new NativeAudioAccess( {
    listDevices: async () => [],
    acquire: async ( { deviceUID } ) => ( { endpoint: deviceUID, status: () => ( {} ),
      release: async () => released.push( deviceUID ) } ),
    close: async () => {}
  } );
  await access.start( 'view-a', { deviceUID: 'first' } );
  await access.start( 'view-a', { deviceUID: 'second' } );
  assert.deepEqual( released, [ 'first' ] );
} );
