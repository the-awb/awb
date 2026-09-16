import crypto from 'node:crypto';
import dgram from 'node:dgram';
import { WebSocket, WebSocketServer } from 'ws';
import { decodeOscPacket, encodeOscMessage } from './oscCodec.mjs';
import { SynthDefContextBroker } from './synthDefContextBroker.mjs';
import { NodeManagerProjection } from './nodeManagerProjection.mjs';

const MAX_FRAME_BYTES = 64 * 1024;
export async function createOscWebSocketRelay( { host = '127.0.0.1', port = 0,
  oscHost = '127.0.0.1', oscPort, allowedPrefixes, clientIdentityAddress = null,
  disconnectAddress = null, clientIdentityAddresses = [], disconnectAddresses = [] } ) {
  if ( !Number.isInteger( oscPort ) || oscPort < 1 || oscPort > 65535 ) throw new Error( 'Invalid relay OSC port.' );
  if ( !Array.isArray( allowedPrefixes ) || !allowedPrefixes.length
    || allowedPrefixes.some( ( prefix ) => typeof prefix !== 'string' || !prefix.startsWith( '/' ) ) ) throw new Error( 'Relay needs bounded OSC address prefixes.' );
  const token = `awb-${ crypto.randomUUID() }`; const clients = new Set();
  const identities = new Set( [ ...clientIdentityAddresses, clientIdentityAddress ].filter( Boolean ) );
  const disconnects = [ ...new Set( [ ...disconnectAddresses, disconnectAddress ].filter( Boolean ) ) ];
  const server = new WebSocketServer( { host, port, maxPayload: MAX_FRAME_BYTES } );
  const allowed = ( address ) => allowedPrefixes.some( ( prefix ) => address.startsWith( prefix ) );
  const send = ( browser, address, args = [] ) => { if ( browser.readyState === WebSocket.OPEN ) browser.send( JSON.stringify( { address, args } ) ); };
  const sharedUdp = dgram.createSocket( 'udp4' );
  const browsers = new Map();
  const hostListeners = new Set();
  const hostChanged = () => { for ( const listener of hostListeners ) listener(); };
  const synthDefs = allowedPrefixes.some( ( prefix ) => '/awb/synthdef/'.startsWith( prefix ) || prefix.startsWith( '/awb/synthdef/' ) )
    ? new SynthDefContextBroker( {
      sendOsc: ( address, args ) => sharedUdp.send( encodeOscMessage( address,
        address === '/awb/synthdef/hello' ? [ args[ 0 ], sharedUdp.address().port ] : args ), oscPort, oscHost ),
      sendClient: ( clientKey, address, args ) => { const browser = browsers.get( clientKey ); if ( browser ) send( browser, address, args ); },
      onChange: hostChanged
    } ) : null;
  const nodeManager = allowedPrefixes.some( ( prefix ) => '/awb/nm/'.startsWith( prefix ) || prefix.startsWith( '/awb/nm/' ) )
    ? new NodeManagerProjection( {
      sendOsc: ( address, args ) => sharedUdp.send( encodeOscMessage( address,
        address === '/awb/nm/subscribe' ? [ args[ 0 ], sharedUdp.address().port, ...args.slice( 1 ) ] : args ), oscPort, oscHost ),
      onChange: hostChanged
    } ) : null;
  const closeClient = ( client, notify = true ) => {
    if ( client.closing ) return; client.closing = true; clients.delete( client );
    const finish = () => { try { client.udp.close(); } catch {} };
    const clientDisconnects = synthDefs ? disconnects.filter( ( address ) => !address.startsWith( '/awb/synthdef/' ) ) : disconnects;
    if ( notify && clientDisconnects.length && client.clientID ) {
      let remaining = clientDisconnects.length;
      const sent = () => { remaining -= 1; if ( remaining === 0 ) finish(); };
      clientDisconnects.forEach( ( address ) => client.udp.send(
        encodeOscMessage( address, [ client.clientID ] ), oscPort, oscHost, sent
      ) );
    }
    else finish();
  };
  server.on( 'connection', ( browser, request ) => {
    if ( new URL( request.url, `http://${ host }` ).searchParams.get( 'token' ) !== token ) { browser.close( 1008, 'invalid relay token' ); return; }
    const udp = dgram.createSocket( 'udp4' ); const clientKey = crypto.randomUUID();
    const client = { udp, clientID: null, clientKey, closing: false }; clients.add( client ); browsers.set( clientKey, browser );
    udp.on( 'message', ( packet ) => {
      try { decodeOscPacket( packet ).filter( ( message ) => allowed( message.address ) || message.address.startsWith( '/awb/bridge/' ) ).forEach( ( message ) => send( browser, message.address, message.args ) ); }
      catch ( error ) { send( browser, '/awb/bridge/error', [ 'invalidOsc', error.message ] ); }
    } );
    udp.on( 'error', ( error ) => send( browser, '/awb/bridge/error', [ 'udpError', error.message ] ) );
    udp.bind( 0, host, () => send( browser, '/awb/bridge/ready', [ udp.address().port ] ) );
    browser.on( 'message', ( data ) => {
      try {
        if ( data.length > MAX_FRAME_BYTES ) throw new Error( 'frameTooLarge' );
        const frame = JSON.parse( data.toString() );
        if ( synthDefs?.handleFrame( clientKey, frame ) ) return;
        if ( nodeManager && frame.address?.startsWith( '/awb/nm/' ) ) throw new Error( 'hostOwnedProtocol' );
        if ( typeof frame.address !== 'string' || !allowed( frame.address ) ) throw new Error( 'addressNotAllowed' );
        if ( !Array.isArray( frame.args ) || frame.args.some( ( value ) => !( typeof value === 'string' || typeof value === 'number' && Number.isFinite( value ) ) ) ) throw new Error( 'invalidArguments' );
        if ( identities.has( frame.address ) && typeof frame.args[ 0 ] === 'string' ) client.clientID = frame.args[ 0 ];
        udp.send( encodeOscMessage( frame.address, frame.args ), oscPort, oscHost );
      } catch ( error ) { send( browser, '/awb/bridge/error', [ error.message, 'Frame was not forwarded.' ] ); }
    } );
    browser.on( 'close', () => { synthDefs?.detach( clientKey ); browsers.delete( clientKey ); closeClient( client ); } );
  } );
  sharedUdp.on( 'message', ( packet ) => {
    try { decodeOscPacket( packet ).forEach( ( message ) => { synthDefs?.receive( message ); nodeManager?.receive( message ); } ); }
    catch ( error ) { synthDefs?.markUnavailable( error.message ); }
  } );
  sharedUdp.on( 'error', ( error ) => synthDefs?.markUnavailable( error.message ) );
  await Promise.all( [
    new Promise( ( resolve, reject ) => { server.once( 'listening', resolve ); server.once( 'error', reject ); } ),
    new Promise( ( resolve, reject ) => { sharedUdp.once( 'listening', resolve ); sharedUdp.once( 'error', reject ); sharedUdp.bind( 0, host ); } )
  ] );
  nodeManager?.connect();
  const address = server.address();
  return { endpoint: `ws://${ host }:${ address.port }/?token=${ encodeURIComponent( token ) }`, port: address.port,
    hostSnapshot: () => ( { sclang: { status: synthDefs?.connected || nodeManager?.status === 'ready' ? 'attached' : 'unavailable' },
      scsynth: { status: 'unavailable' }, synthDefs: synthDefs?.snapshot() ?? { status: 'unavailable' },
      nodeManager: nodeManager?.snapshot() ?? { status: 'unavailable' } } ),
    nodeManagerView: ( binding ) => nodeManager?.viewForBinding( binding ) ?? { containers: [], entries: [] },
    subscribeHost: ( listener ) => { hostListeners.add( listener ); return () => hostListeners.delete( listener ); },
    close: async () => {
      synthDefs?.close(); nodeManager?.close(); for ( const browser of server.clients ) browser.terminate();
      for ( const client of [ ...clients ] ) closeClient( client );
      await new Promise( ( resolve ) => setImmediate( resolve ) );
      try { sharedUdp.close(); } catch {}
      await new Promise( ( resolve ) => {
        const timer = setTimeout( resolve, 500 );
        server.close( () => { clearTimeout( timer ); resolve(); } );
      } );
    } };
}
