import crypto from 'node:crypto';
import dgram from 'node:dgram';
import { WebSocket, WebSocketServer } from 'ws';
import { decodeOscPacket, encodeOscMessage } from './oscCodec.mjs';
import { createOscOutput } from './oscOutput.mjs';
import { SynthDefContextBroker } from './synthDefContextBroker.mjs';
import { NodeManagerProjection } from './nodeManagerProjection.mjs';
import { HostControlProjection } from './hostControlProjection.mjs';

const MAX_FRAME_BYTES = 64 * 1024;
export async function createOscWebSocketRelay( { host = '127.0.0.1', port = 0,
  oscHost = '127.0.0.1', oscPort, allowedPrefixes = null, clientIdentityAddress = null,
  disconnectAddress = null, clientIdentityAddresses = [], disconnectAddresses = [], hostToken = '' } ) {
  if ( !Number.isInteger( oscPort ) || oscPort < 1 || oscPort > 65535 ) throw new Error( 'Invalid relay OSC port.' );
  const clients = new Set(); const closingClients = new Set(); const grants = new Map();
  const server = new WebSocketServer( { host, port, maxPayload: MAX_FRAME_BYTES } );
  const send = ( browser, address, args = [] ) => { if ( browser.readyState === WebSocket.OPEN ) browser.send( JSON.stringify( { address, args } ) ); };
  const sharedUdp = dgram.createSocket( 'udp4' );
  const outputFor = socket => createOscOutput({
    encodeMessage: ({address, args}) => encodeOscMessage(address, args),
    sendPacket: bytes => new Promise((resolve, reject) => socket.send(bytes, oscPort, oscHost, error => error ? reject(error) : resolve()))
  });
  const sharedOutput = outputFor(sharedUdp);
  const sendShared = (address, args) => sharedOutput.send({address, args}).catch(error => {
    synthDefs.markUnavailable(error.message); nodeManager.markUnavailable(error.message);
  });
  const browsers = new Map();
  const hostListeners = new Set();
  const hostChanged = () => { for ( const listener of hostListeners ) listener(); };
  const synthDefs = new SynthDefContextBroker( {
    sendOsc: ( address, args ) => sendShared(address, address === '/awb/synthdef/hello' ? [ args[ 0 ], sharedUdp.address().port ] : args),
    sendClient: ( clientKey, address, args ) => { const browser = browsers.get( clientKey ); if ( browser ) send( browser, address, args ); },
    onChange: hostChanged
  } );
  const nodeManager = new NodeManagerProjection( {
    sendOsc: ( address, args ) => sendShared(address, address === '/awb/nm/subscribe' ? [ args[ 0 ], sharedUdp.address().port, ...args.slice( 1 ) ] : args),
    onChange: hostChanged
  } );
  const hostControl = new HostControlProjection( {
    token: hostToken,
    sendOsc: ( address, args ) => sendShared(address, [ args[ 0 ], sharedUdp.address().port, ...args.slice( 1 ) ]),
    onChange: ( snapshot ) => { nodeManager.setHostStatus( snapshot.nodeManager ); hostChanged(); }
  } );
  const closeClient = ( client, notify = true ) => {
    if ( client.closing ) return; client.closing = true; clients.delete( client );
    const finish = () => { try { client.udp.close(); } catch {} };
    const clientDisconnects = client.policy.disconnects.filter( ( address ) => !address.startsWith( '/awb/synthdef/' ) );
    if (notify && client.clientID) {
      for (const address of clientDisconnects) client.output.send({address, args: [client.clientID]}).catch(() => {});
    }
    client.finished = client.output.close().finally(finish);
    closingClients.add(client.finished); client.finished.finally(() => closingClients.delete(client.finished));

  };
  server.on( 'connection', ( browser, request ) => {
    const token = new URL( request.url, `http://${ host }` ).searchParams.get( 'token' ); const policy = grants.get( token );
    if ( !policy ) { browser.close( 1008, 'invalid relay token' ); return; }
    const allowed = ( address ) => policy.allowedAddresses.has( address )
      || policy.allowedPrefixes.some( ( prefix ) => address.startsWith( prefix ) );
    const udp = dgram.createSocket( 'udp4' ); const clientKey = crypto.randomUUID();
    const output = outputFor(udp);
    const client = { udp, output, clientID: null, clientKey, token, policy, closing: false, browser }; clients.add( client ); browsers.set( clientKey, browser );
    udp.on( 'message', ( packet ) => {
      try { decodeOscPacket( packet ).filter( ( message ) => allowed( message.address ) || message.address.startsWith( '/awb/bridge/' ) ).forEach( ( message ) => send( browser, message.address, message.args ) ); }
      catch ( error ) { send( browser, '/awb/bridge/error', [ 'invalidOsc', error.message ] ); }
    } );
    udp.on( 'error', ( error ) => send( browser, '/awb/bridge/error', [ 'udpError', error.message ] ) );
    udp.bind( 0, host, () => send( browser, '/awb/bridge/ready', [ udp.address().port ] ) );
    browser.on( 'message', ( data ) => {
      if (client.closing) return;
      try {
        if ( data.length > MAX_FRAME_BYTES ) throw new Error( 'frameTooLarge' );
        const frame = JSON.parse( data.toString() );
        if ( typeof frame.address !== 'string' || !allowed( frame.address ) ) throw new Error( 'addressNotAllowed' );
        if ( synthDefs.handleFrame( clientKey, frame ) ) return;
        if ( frame.address.startsWith( '/awb/nm/' ) ) throw new Error( 'hostOwnedProtocol' );
        if ( !Array.isArray( frame.args ) || frame.args.some( ( value ) => !( typeof value === 'string' || typeof value === 'number' && Number.isFinite( value ) ) ) ) throw new Error( 'invalidArguments' );
        if ( policy.identities.has( frame.address ) && typeof frame.args[ 0 ] === 'string' ) client.clientID = frame.args[ 0 ];
        output.send({address: frame.address, args: frame.args}).catch(error => send(browser, '/awb/bridge/error', ['udpError', error.message]));
      } catch ( error ) { send( browser, '/awb/bridge/error', [ error.message, 'Frame was not forwarded.' ] ); }
    } );
    browser.on( 'close', () => { synthDefs.detach( clientKey ); browsers.delete( clientKey ); closeClient( client ); } );
  } );
  sharedUdp.on( 'message', ( packet ) => {
    try { decodeOscPacket( packet ).forEach( ( message ) => { hostControl.receive( message ); synthDefs.receive( message ); nodeManager.receive( message ); } ); }
    catch ( error ) { synthDefs.markUnavailable( error.message ); nodeManager.markUnavailable( error.message ); }
  } );
  sharedUdp.on( 'error', ( error ) => { synthDefs.markUnavailable( error.message ); nodeManager.markUnavailable( error.message ); } );
  await Promise.all( [
    new Promise( ( resolve, reject ) => { server.once( 'listening', resolve ); server.once( 'error', reject ); } ),
    new Promise( ( resolve, reject ) => { sharedUdp.once( 'listening', resolve ); sharedUdp.once( 'error', reject ); sharedUdp.bind( 0, host ); } )
  ] );
  hostControl.connect(); synthDefs.connect(); nodeManager.connect();
  const address = server.address();
  const grant = ( rawPolicy ) => {
    if ( !rawPolicy || !Array.isArray( rawPolicy.allowedPrefixes ) || !Array.isArray( rawPolicy.allowedAddresses ?? [] )
      || !( rawPolicy.allowedPrefixes.length || rawPolicy.allowedAddresses?.length )
      || [ ...rawPolicy.allowedPrefixes, ...( rawPolicy.allowedAddresses ?? [] ) ]
        .some( ( address ) => typeof address !== 'string' || !address.startsWith( '/' ) ) ) {
      throw new Error( 'Relay grant needs bounded OSC address prefixes or exact addresses.' );
    }
    const grantToken = `awb-${ crypto.randomUUID() }`; let released = false;
    grants.set( grantToken, Object.freeze( { allowedPrefixes: Object.freeze( [ ...rawPolicy.allowedPrefixes ] ),
      allowedAddresses: new Set( rawPolicy.allowedAddresses ?? [] ),
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
    hostSnapshot: () => { const control = hostControl.snapshot(); return ( {
      sclang: { status: control.status === 'ready' || synthDefs.connected || nodeManager.status === 'ready' ? 'attached' : 'unavailable',
        mode: control.mode, processID: control.processID },
      scsynth: { status: control.scsynth }, synthDefs: synthDefs.snapshot(), nodeManager: nodeManager.snapshot(), control
    } ); },
    setNodeManager: ( action ) => hostControl.setNodeManager( action ),
    openToolInstance: ( toolID, instanceID ) => hostControl.openToolInstance( toolID, instanceID ),
    closeToolInstance: ( toolID, instanceID ) => hostControl.closeToolInstance( toolID, instanceID ),
    loadScoreSynthDefs: ( instanceID, sourcePath, allowOverride = false ) => (
      hostControl.loadScoreSynthDefs( instanceID, sourcePath, allowOverride )
    ),
    audioProbe: ( options ) => hostControl.audioProbe( options ),
    shutdownHost: () => hostControl.shutdown(),
    nodeManagerView: ( binding ) => nodeManager.viewForBinding( binding ),
    subscribeHost: ( listener ) => { hostListeners.add( listener ); return () => hostListeners.delete( listener ); },
    close: async () => {
      legacyPolicy?.release(); hostControl.close(); synthDefs.close(); nodeManager.close(); grants.clear(); for ( const browser of server.clients ) browser.terminate();
      for ( const client of [ ...clients ] ) closeClient( client );
      await Promise.all([...closingClients]);
      await sharedOutput.close();
      try { sharedUdp.close(); } catch {}
      await new Promise( ( resolve ) => {
        const timer = setTimeout( resolve, 500 );
        server.close( () => { clearTimeout( timer ); resolve(); } );
      } );
    } };
}
