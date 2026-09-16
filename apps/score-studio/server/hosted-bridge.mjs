#!/usr/bin/env node
import crypto from 'node:crypto';
import dgram from 'node:dgram';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { decodeOscPacket, encodeOscMessage } from './osc-codec.mjs';

const ALLOWED_PREFIXES = [ '/awb/timeline/', '/awb/synthdef/' ];
const MAX_FRAME_BYTES = 64 * 1024;

function sendFrame( socket, address, args = [] ) {
  if ( socket.readyState === WebSocket.OPEN ) socket.send( JSON.stringify( { address, args } ) );
}

function parseFrame( data ) {
  if ( data.length > MAX_FRAME_BYTES ) throw new Error( 'frameTooLarge' );
  const frame = JSON.parse( data.toString() );
  if ( typeof frame.address !== 'string'
    || !ALLOWED_PREFIXES.some( ( prefix ) => frame.address.startsWith( prefix ) ) ) {
    throw new Error( 'addressNotAllowed' );
  }
  if ( !Array.isArray( frame.args ) || frame.args.some( ( value ) => (
    !( typeof value === 'string' || ( typeof value === 'number' && Number.isFinite( value ) ) )
  ) ) ) throw new Error( 'invalidArguments' );
  return frame;
}

export async function createHostedBridge( {
  host = '127.0.0.1', port = 57131, token = `awb-${ crypto.randomUUID() }`,
  oscHost = '127.0.0.1', oscPort = 57120
} = {} ) {
  const clients = new Set();
  const server = new WebSocketServer( { host, port, maxPayload: MAX_FRAME_BYTES } );

  const closeClient = ( client, notify = true ) => {
    if ( client.closing ) return;
    client.closing = true;
    clients.delete( client );
    const finish = () => {
      try { client.udp.close(); } catch {}
    };
    if ( notify && client.clientID ) {
      let remaining = 2;
      const sent = () => { remaining -= 1; if ( remaining === 0 ) finish(); };
      client.udp.send( encodeOscMessage( '/awb/timeline/disconnect', [ client.clientID ] ),
        oscPort, oscHost, sent );
      client.udp.send( encodeOscMessage( '/awb/synthdef/disconnect', [ client.clientID ] ),
        oscPort, oscHost, sent );
    } else finish();
  };

  server.on( 'connection', ( browser, request ) => {
    const supplied = new URL( request.url, `http://${ host }` ).searchParams.get( 'token' );
    if ( supplied !== token ) {
      browser.close( 1008, 'invalid bridge token' );
      return;
    }

    const udp = dgram.createSocket( 'udp4' );
    const client = { udp, clientID: null, closing: false };
    clients.add( client );
    udp.on( 'message', ( packet ) => {
      try {
        decodeOscPacket( packet ).forEach( ( message ) => sendFrame( browser, message.address, message.args ) );
      } catch ( error ) {
        sendFrame( browser, '/awb/bridge/error', [ 'invalidOsc', error.message ] );
      }
    } );
    udp.on( 'error', ( error ) => sendFrame( browser, '/awb/bridge/error', [ 'udpError', error.message ] ) );
    udp.bind( 0, host, () => sendFrame( browser, '/awb/bridge/ready', [ udp.address().port ] ) );

    browser.on( 'message', ( data ) => {
      try {
        const frame = parseFrame( data );
        if ( [ '/awb/timeline/hello', '/awb/synthdef/hello' ].includes( frame.address )
          && typeof frame.args[ 0 ] === 'string' ) client.clientID = frame.args[ 0 ];
        udp.send( encodeOscMessage( frame.address, frame.args ), oscPort, oscHost );
      } catch ( error ) {
        sendFrame( browser, '/awb/bridge/error', [ error.message, 'Frame was not forwarded.' ] );
      }
    } );
    browser.on( 'close', () => {
      closeClient( client );
    } );
  } );

  await new Promise( ( resolve, reject ) => {
    server.once( 'listening', resolve );
    server.once( 'error', reject );
  } );
  const address = server.address();
  const endpoint = `ws://${ host }:${ address.port }/?token=${ encodeURIComponent( token ) }`;
  return {
    endpoint,
    port: address.port,
    token,
    close: async () => {
      for ( const browser of server.clients ) browser.terminate();
      for ( const client of [ ...clients ] ) closeClient( client );
      await new Promise( ( resolve ) => server.close( resolve ) );
    }
  };
}

function option( name, fallback ) {
  const index = process.argv.indexOf( `--${ name }` );
  return index >= 0 ? process.argv[ index + 1 ] : fallback;
}

if ( process.argv[ 1 ] && import.meta.url === pathToFileURL( process.argv[ 1 ] ).href ) {
  const bridge = await createHostedBridge( {
    port: Number( option( 'ws-port', process.env.SCORE_STUDIO_WS_PORT ?? 57131 ) ),
    oscPort: Number( option( 'osc-port', process.env.SCORE_TIMELINE_OSC_PORT ?? 57120 ) ),
    token: option( 'token', process.env.SCORE_STUDIO_BRIDGE_TOKEN )
  } );
  console.log( `AWB Score hosted bridge: ${ bridge.endpoint }` );
  console.log( `Forwarding to sclang OSC at 127.0.0.1:${ option( 'osc-port', process.env.SCORE_TIMELINE_OSC_PORT ?? 57120 ) }` );
  const stop = async () => { await bridge.close(); process.exit( 0 ); };
  process.once( 'SIGINT', stop );
  process.once( 'SIGTERM', stop );
}
