import crypto from 'node:crypto';
import dgram from 'node:dgram';
import { WebSocket, WebSocketServer } from 'ws';
import { decodeOscPacket, encodeOscMessage } from './oscCodec.mjs';
import { SynthDefContextBroker } from './synthDefContextBroker.mjs';
import { NodeManagerProjection } from './nodeManagerProjection.mjs';

const MAX_FRAME_BYTES = 64 * 1024;
export async function createOscWebSocketRelay( { host = '127.0.0.1', port = 0,
  oscHost = '127.0.0.1', oscPort, allowedPrefixes = null, clientIdentityAddress = null,
  disconnectAddress = null, clientIdentityAddresses = [], disconnectAddresses = [] } ) {
  if ( !Number.isInteger( oscPort ) || oscPort < 1 || oscPort > 65535 ) throw new Error( 'Invalid relay OSC port.' );
  const clients = new Set(); const grants = new Map();
  const server = new WebSocketServer( { host, port, maxPayload: MAX_FRAME_BYTES } );
  const send = ( browser, address, args = [] ) => { if ( browser.readyState === WebSocket.OPEN ) browser.send( JSON.stringify( { address, args } ) ); };
  const sharedUdp = dgram.createSocket( 'udp4' );
  const browsers = new Map();
  const hostListeners = new Set();
  const hostChanged = () => { for ( const listener of hostListeners ) listener(); };
  const synthDefs = new SynthDefContextBroker( {
    sendOsc: ( address, args ) => sharedUdp.send( encodeOscMessage( address,
      address === '/awb/synthdef/hello' ? [ args[ 0 ], sharedUdp.address().port ] : args ), oscPort, oscHost ),
    sendClient: ( clientKey, address, args ) => { const browser = browsers.get( clientKey ); if ( browser ) send( browser, address, args ); },
    onChange: hostChanged
  } );
  const nodeManager = new NodeManagerProjection( {
    sendOsc: ( address, args ) => sharedUdp.send( encodeOscMessage( address,
      address === '/awb/nm/subscribe' ? [ args[ 0 ], sharedUdp.address().port, ...args.slice( 1 ) ] : args ), oscPort, oscHost ),
    onChange: hostChanged
  } );
  const closeClient = ( client, notify = true ) => {
    if ( client.closing ) return; client.closing = true; clients.delete( client );
    const finish = () => { try { client.udp.close(); } catch {} };
    const clientDisconnects = client.policy.disconnects.filter( ( address ) => !address.startsWith( '/awb/synthdef/' ) );
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
    const token = new URL( request.url, `http://${ host }` ).searchParams.get( 'token' ); const policy = grants.get( token );
    if ( !policy ) { browser.close( 1008, 'invalid relay token' ); return; }
    const allowed = ( address ) => policy.allowedPrefixes.some( ( prefix ) => address.startsWith( prefix ) );
    const udp = dgram.createSocket( 'udp4' ); const clientKey = crypto.randomUUID();
    const client = { udp, clientID: null, clientKey, token, policy, closing: false, browser }; clients.add( client ); browsers.set( clientKey, browser );
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
        if ( typeof frame.address !== 'string' || !allowed( frame.address ) ) throw new Error( 'addressNotAllowed' );
        if ( synthDefs.handleFrame( clientKey, frame ) ) return;
        if ( frame.address.startsWith( '/awb/nm/' ) ) throw new Error( 'hostOwnedProtocol' );
        if ( !Array.isArray( frame.args ) || frame.args.some( ( value ) => !( typeof value === 'string' || typeof value === 'number' && Number.isFinite( value ) ) ) ) throw new Error( 'invalidArguments' );
        if ( policy.identities.has( frame.address ) && typeof frame.args[ 0 ] === 'string' ) client.clientID = frame.args[ 0 ];
        udp.send( encodeOscMessage( frame.address, frame.args ), oscPort, oscHost );
      } catch ( error ) { send( browser, '/awb/bridge/error', [ error.message, 'Frame was not forwarded.' ] ); }
    } );
    browser.on( 'close', () => { synthDefs.detach( clientKey ); browsers.delete( clientKey ); closeClient( client ); } );
  } );
  sharedUdp.on( 'message', ( packet ) => {
    try { decodeOscPacket( packet ).forEach( ( message ) => { synthDefs.receive( message ); nodeManager.receive( message ); } ); }
    catch ( error ) { synthDefs.markUnavailable( error.message ); nodeManager.markUnavailable( error.message ); }
  } );
  sharedUdp.on( 'error', ( error ) => { synthDefs.markUnavailable( error.message ); nodeManager.markUnavailable( error.message ); } );
  await Promise.all( [
    new Promise( ( resolve, reject ) => { server.once( 'listening', resolve ); server.once( 'error', reject ); } ),
    new Promise( ( resolve, reject ) => { sharedUdp.once( 'listening', resolve ); sharedUdp.once( 'error', reject ); sharedUdp.bind( 0, host ); } )
  ] );
  synthDefs.connect(); nodeManager.connect();
  const address = server.address();
  const grant = ( rawPolicy ) => {
    if ( !rawPolicy || !Array.isArray( rawPolicy.allowedPrefixes ) || !rawPolicy.allowedPrefixes.length
      || rawPolicy.allowedPrefixes.some( ( prefix ) => typeof prefix !== 'string' || !prefix.startsWith( '/' ) ) ) {
      throw new Error( 'Relay grant needs bounded OSC address prefixes.' );
    }
    const grantToken = `awb-${ crypto.randomUUID() }`; let released = false;
    grants.set( grantToken, Object.freeze( { allowedPrefixes: Object.freeze( [ ...rawPolicy.allowedPrefixes ] ),
      identities: new Set( rawPolicy.clientIdentityAddresses ?? [] ),
      disconnects: Object.freeze( [ ...new Set( rawPolicy.disconnectAddresses ?? [] ) ] ) } ) );
    return { endpoint: `ws://${ host }:${ address.port }/?token=${ encodeURIComponent( grantToken ) }`, release: () => {
      if ( released ) return; released = true; grants.delete( grantToken );
      for ( const client of clients ) if ( client.token === grantToken ) client.browser.close( 1008, 'relay grant released' );
    } };
  };
  const legacyPolicy = allowedPrefixes ? grant( { allowedPrefixes,
    clientIdentityAddresses: [ ...clientIdentityAddresses, clientIdentityAddress ].filter( Boolean ),
    disconnectAddresses: [ ...disconnectAddresses, disconnectAddress ].filter( Boolean ) } ) : null;
  return { endpoint: legacyPolicy?.endpoint ?? null, grant, port: address.port,
    hostSnapshot: () => ( { sclang: { status: synthDefs.connected || nodeManager.status === 'ready' ? 'attached' : 'unavailable' },
      scsynth: { status: 'unavailable' }, synthDefs: synthDefs.snapshot(), nodeManager: nodeManager.snapshot() } ),
    nodeManagerView: ( binding ) => nodeManager.viewForBinding( binding ),
    subscribeHost: ( listener ) => { hostListeners.add( listener ); return () => hostListeners.delete( listener ); },
    close: async () => {
      legacyPolicy?.release(); synthDefs.close(); nodeManager.close(); grants.clear(); for ( const browser of server.clients ) browser.terminate();
      for ( const client of [ ...clients ] ) closeClient( client );
      await new Promise( ( resolve ) => setImmediate( resolve ) );
      try { sharedUdp.close(); } catch {}
      await new Promise( ( resolve ) => {
        const timer = setTimeout( resolve, 500 );
        server.close( () => { clearTimeout( timer ); resolve(); } );
      } );
    } };
}
