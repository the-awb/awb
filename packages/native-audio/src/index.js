import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { WebSocketServer } from 'ws';
import { AudioFrameDecoder, decodeAudioFrameHeader } from './protocol.js';

const packageRoot = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
export const defaultHelperPath = path.join( packageRoot, 'native', '.build', 'release', 'awb-audio-helper' );

function boundedConfiguration( input ) {
  if ( !input || typeof input.deviceUID !== 'string' || !input.deviceUID || input.deviceUID.length > 1024 ) {
    throw new Error( 'A bounded Core Audio deviceUID is required.' );
  }
  const framesPerChunk = Number( input.framesPerChunk ?? 512 );
  if ( !Number.isInteger( framesPerChunk ) || framesPerChunk < 64 || framesPerChunk > 4096 ) {
    throw new Error( 'framesPerChunk must be an integer from 64 to 4096.' );
  }
  return Object.freeze( { deviceUID: input.deviceUID, framesPerChunk } );
}

function runJSON( executable, args, spawnProcess ) {
  return new Promise( ( resolve, reject ) => {
    const child = spawnProcess( executable, args, { stdio: [ 'ignore', 'pipe', 'pipe' ] } );
    const stdout = []; const stderr = [];
    child.stdout.on( 'data', ( chunk ) => stdout.push( chunk ) );
    child.stderr.on( 'data', ( chunk ) => stderr.push( chunk ) );
    child.once( 'error', reject );
    child.once( 'close', ( code, signal ) => {
      if ( code !== 0 ) {
        reject( new Error( `Native audio helper failed (${ code ?? signal }): ${ Buffer.concat( stderr ).toString( 'utf8' ).trim() }` ) );
        return;
      }
      try { resolve( JSON.parse( Buffer.concat( stdout ).toString( 'utf8' ) ) ); }
      catch ( error ) { reject( new Error( `Native audio helper returned invalid JSON: ${ error.message }` ) ); }
    } );
  } );
}

async function createStreamService( configuration, { helperPath, spawnProcess } ) {
  const token = crypto.randomBytes( 24 ).toString( 'base64url' );
  const server = new WebSocketServer( { host: '127.0.0.1', port: 0 } );
  await new Promise( ( resolve, reject ) => { server.once( 'listening', resolve ); server.once( 'error', reject ); } );
  const address = server.address();
  const clients = new Set();
  server.on( 'connection', ( socket, request ) => {
    const url = new URL( request.url, 'ws://127.0.0.1' );
    if ( url.searchParams.get( 'token' ) !== token ) { socket.close( 1008, 'unauthorised' ); return; }
    clients.add( socket ); socket.once( 'close', () => clients.delete( socket ) );
  } );
  const args = [ 'stream', '--device-uid', configuration.deviceUID, '--frames-per-chunk', String( configuration.framesPerChunk ) ];
  const child = spawnProcess( helperPath, args, { stdio: [ 'ignore', 'pipe', 'pipe' ] } );
  const decoder = new AudioFrameDecoder();
  const statuses = [];
  let closed = false; let fatalError = null; let stderrPending = '';
  child.stderr.on( 'data', ( chunk ) => {
    stderrPending += chunk.toString( 'utf8' );
    const lines = stderrPending.split( '\n' ); stderrPending = lines.pop();
    for ( const line of lines ) {
      if ( !line.trim() ) continue;
      try { statuses.push( JSON.parse( line ) ); } catch { statuses.push( { type: 'log', message: line } ); }
      if ( statuses.length > 32 ) statuses.shift();
    }
  } );
  child.stdout.on( 'data', ( chunk ) => {
    try {
      for ( const frame of decoder.push( chunk ) ) {
        // Visualization wants the present, not a replay of old movement. Keep no more than about
        // eight device blocks queued per renderer; a slow consumer drops frames at this boundary.
        for ( const socket of clients ) {
          if ( socket.readyState === 1 && socket.bufferedAmount + frame.length <= frame.length * 8 ) socket.send( frame );
        }
      }
    } catch ( error ) { fatalError = error; child.kill(); }
  } );
  child.once( 'error', ( error ) => { fatalError = error; } );
  child.once( 'close', ( code, signal ) => {
    if ( !closed && !fatalError ) fatalError = new Error( `Native audio helper stopped unexpectedly (${ code ?? signal }).` );
    for ( const socket of clients ) socket.close( 1011, fatalError?.message ?? 'capture stopped' );
  } );
  return {
    endpoint: `ws://127.0.0.1:${ address.port }/?token=${ encodeURIComponent( token ) }`,
    get status() { return Object.freeze( { running: !closed && child.exitCode === null, error: fatalError?.message ?? null, events: [ ...statuses ] } ); },
    async close() {
      if ( closed ) return; closed = true;
      if ( child.exitCode === null ) child.kill( 'SIGTERM' );
      await new Promise( ( resolve ) => { if ( child.exitCode !== null ) resolve(); else child.once( 'close', resolve ); } );
      for ( const socket of clients ) socket.close( 1001, 'capture released' );
      await new Promise( ( resolve ) => server.close( resolve ) );
    }
  };
}

export function createNativeAudioBroker( options = {} ) {
  const helperPath = options.helperPath ?? defaultHelperPath;
  const spawnProcess = options.spawnProcess ?? spawn;
  const services = new Map();
  return Object.freeze( {
    listDevices: () => runJSON( helperPath, [ 'devices', '--json' ], spawnProcess ),
    async acquire( input ) {
      const configuration = boundedConfiguration( input );
      const key = JSON.stringify( configuration );
      let record = services.get( key );
      if ( !record ) {
        record = { service: await createStreamService( configuration, { helperPath, spawnProcess } ), references: 0 };
        services.set( key, record );
      }
      record.references += 1; let released = false;
      return Object.freeze( {
        endpoint: record.service.endpoint,
        status: () => record.service.status,
        release: async () => {
          if ( released ) return; released = true; record.references -= 1;
          if ( record.references === 0 ) { services.delete( key ); await record.service.close(); }
        }
      } );
    },
    async close() {
      const active = [ ...services.values() ]; services.clear();
      await Promise.all( active.map( ( record ) => record.service.close() ) );
    }
  } );
}

export { AudioFrameDecoder, decodeAudioFrameHeader } from './protocol.js';
