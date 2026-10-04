import test from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import { WebSocket } from 'ws';
import { createOscWebSocketRelay } from '../services/oscWebSocketRelay.mjs';
import { decodeOscPacket, encodeOscMessage } from '../services/oscCodec.mjs';

const waitFor = async ( predicate, timeout = 3000 ) => {
  const started = Date.now(); while ( !predicate() ) {
    if ( Date.now() - started > timeout ) throw new Error( 'Timed out waiting for shared host integration.' );
    await new Promise( ( resolve ) => setTimeout( resolve, 5 ) );
  }
};

test( 'two views share SynthDef transfers and one NodeManager subscription', async ( context ) => {
  const osc = dgram.createSocket( 'udp4' ); const counts = { list: 0, describe: 0, subscribe: 0 };
  osc.on( 'message', ( packet, rinfo ) => decodeOscPacket( packet ).forEach( ( message ) => {
    const [ clientID, replyPort, ...rest ] = message.args;
    const reply = ( address, args ) => osc.send( encodeOscMessage( address, args ), replyPort || rinfo.port, rinfo.address );
    if ( message.address === '/awb/synthdef/hello' ) reply( '/awb/synthdef/connected', [ clientID, 1 ] );
    if ( message.address === '/awb/synthdef/list' ) {
      counts.list += 1; const requestID = message.args[ 1 ];
      setTimeout( () => {
        const target = rinfo.port;
        osc.send( encodeOscMessage( '/awb/synthdef/list/begin', [ clientID, requestID, 1 ] ), target, rinfo.address );
        osc.send( encodeOscMessage( '/awb/synthdef/list/item', [ clientID, requestID, 0, 'uncataloguedVoice' ] ), target, rinfo.address );
        osc.send( encodeOscMessage( '/awb/synthdef/list/end', [ clientID, requestID, 1 ] ), target, rinfo.address );
      }, 20 );
    }
    if ( message.address === '/awb/synthdef/describe' ) {
      counts.describe += 1; const requestID = message.args[ 1 ]; const target = rinfo.port;
      setTimeout( () => {
        osc.send( encodeOscMessage( '/awb/synthdef/description/begin', [ clientID, requestID, 'uncataloguedVoice', 4, 1, 0 ] ), target, rinfo.address );
        osc.send( encodeOscMessage( '/awb/synthdef/description/chunk', [ clientID, requestID, 0, '53436766' ] ), target, rinfo.address );
        osc.send( encodeOscMessage( '/awb/synthdef/description/end', [ clientID, requestID, 'uncataloguedVoice', 4, 1, 0 ] ), target, rinfo.address );
      }, 20 );
    }
    if ( message.address === '/awb/nm/subscribe' ) {
      counts.subscribe += 1; reply( '/awb/nm/subscribed', [ clientID, 3, 'summary', 'coalesced' ] );
    }
  } ) );
  await new Promise( ( resolve ) => osc.bind( 0, '127.0.0.1', resolve ) );
  const relay = await createOscWebSocketRelay( { oscPort: osc.address().port } );
  context.after( async () => { await relay.close(); osc.close(); } );
  await waitFor( () => counts.subscribe === 1 && relay.hostSnapshot().nodeManager.status === 'ready' );
  assert.equal( relay.hostSnapshot().nodeManager.status, 'ready', 'host connects before any tool view exists' );
  const grants = [
    relay.grant( { allowedPrefixes: [ '/awb/timeline/', '/awb/synthdef/' ],
      clientIdentityAddresses: [ '/awb/timeline/hello', '/awb/synthdef/hello' ],
      disconnectAddresses: [ '/awb/timeline/disconnect', '/awb/synthdef/disconnect' ] } ),
    relay.grant( { allowedPrefixes: [ '/awb/other-tool/', '/awb/synthdef/' ],
      clientIdentityAddresses: [ '/awb/synthdef/hello' ], disconnectAddresses: [ '/awb/synthdef/disconnect' ] } )
  ];
  const frames = [ [], [] ];
  const sockets = grants.map( ( grant ) => new WebSocket( grant.endpoint ) );
  sockets.forEach( ( socket, index ) => socket.on( 'message', ( data ) => frames[ index ].push( JSON.parse( data.toString() ) ) ) );
  await Promise.all( sockets.map( ( socket ) => new Promise( ( resolve ) => socket.once( 'open', resolve ) ) ) );
  sockets.forEach( ( socket, index ) => socket.send( JSON.stringify( { address: '/awb/synthdef/hello', args: [ `view-${ index }`, 0 ] } ) ) );
  await waitFor( () => frames.every( ( list ) => list.some( ( frame ) => frame.address === '/awb/synthdef/connected' ) ) );
  sockets.forEach( ( socket, index ) => socket.send( JSON.stringify( { address: '/awb/synthdef/list', args: [ `view-${ index }`, `list-${ index }` ] } ) ) );
  await waitFor( () => frames.every( ( list ) => list.some( ( frame ) => frame.address === '/awb/synthdef/list/end' ) ) );
  sockets.forEach( ( socket, index ) => socket.send( JSON.stringify( { address: '/awb/synthdef/describe', args: [ `view-${ index }`, `desc-${ index }`, 'uncataloguedVoice' ] } ) ) );
  await waitFor( () => frames.every( ( list ) => list.some( ( frame ) => frame.address === '/awb/synthdef/description/end' ) ) );
  assert.deepEqual( counts, { list: 1, describe: 1, subscribe: 1 } );
  assert.equal( relay.hostSnapshot().synthDefs.status, 'ready' );
  assert.equal( relay.hostSnapshot().nodeManager.status, 'ready' );
  assert.equal( relay.hostSnapshot().scsynth.status, 'unavailable' );
  sockets.forEach( ( socket ) => socket.terminate() ); grants.forEach( ( grant ) => grant.release() );
} );
