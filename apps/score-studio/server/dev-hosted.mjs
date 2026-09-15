#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseScoreDocument } from '@awb/score';
import { createHostedBridge } from './hosted-bridge.mjs';

const appRoot = fileURLToPath( new URL( '..', import.meta.url ) );
const option = ( name, fallback = null ) => {
  const index = process.argv.indexOf( `--${ name }` );
  return index >= 0 ? process.argv[ index + 1 ] : fallback;
};
const flag = ( name ) => process.argv.includes( `--${ name }` );
const oscPort = Number( option( 'osc-port', 57120 ) );
const vitePort = Number( option( 'vite-port', 5201 ) );
const wsPort = Number( option( 'ws-port', 0 ) );
const sourcePath = option( 'score' );
const toolSessionID = option( 'tool-session', '' );
let sourceName = '';

if ( !Number.isInteger( oscPort ) || oscPort <= 0 || oscPort > 65535 ) {
  throw new Error( `Invalid --osc-port: ${ oscPort }` );
}
if ( !Number.isInteger( vitePort ) || vitePort <= 0 || vitePort > 65535 ) {
  throw new Error( `Invalid --vite-port: ${ vitePort }` );
}
if ( !Number.isInteger( wsPort ) || wsPort < 0 || wsPort > 65535 ) {
  throw new Error( `Invalid --ws-port: ${ wsPort }` );
}
if ( sourcePath ) {
  if ( !sourcePath.endsWith( '.score.json' ) ) {
    throw new Error( '--score must name a canonical .score.json document.' );
  }
  const sourceText = await readFile( sourcePath, 'utf8' );
  parseScoreDocument( sourceText );
  sourceName = path.basename( sourcePath );
}

// Each launched editor gets its own capability URL. Let the OS allocate the
// sidecar port by default so an abandoned or concurrently running session
// cannot prevent Vite (and therefore the browser launcher) from starting.
const bridge = await createHostedBridge( { oscPort, port: wsPort } );
const viteArgs = [
  fileURLToPath( new URL( '../../../node_modules/vite/bin/vite.js', import.meta.url ) ),
  '--host', '127.0.0.1', '--port', `${ vitePort }`
];
if ( flag( 'open' ) ) viteArgs.push( '--open' );
const vite = spawn( process.execPath, viteArgs, {
  cwd: appRoot,
  env: {
    ...process.env,
    VITE_HOSTED_ENDPOINT: bridge.endpoint,
    VITE_HOSTED_SCORE_URL: sourcePath ? '/__awb/hosted-score' : '',
    VITE_HOSTED_SCORE_NAME: sourceName,
    VITE_TOOL_SESSION_ID: toolSessionID,
    AWB_SCORE_STUDIO_SOURCE: sourcePath ? path.resolve( sourcePath ) : ''
  },
  stdio: 'inherit'
} );

console.log( `Hosted bridge ready: ${ bridge.endpoint }` );
console.log( `Forwarding to sclang OSC at 127.0.0.1:${ oscPort }` );
if ( sourcePath ) console.log( `Initial score: ${ path.resolve( sourcePath ) }` );
if ( toolSessionID ) console.log( `Tool session: ${ toolSessionID }` );

let stopping = false;
async function stop( signal ) {
  if ( stopping ) return;
  stopping = true;
  if ( vite.exitCode === null ) vite.kill( signal );
  await bridge.close();
}
process.once( 'SIGINT', () => stop( 'SIGINT' ) );
process.once( 'SIGTERM', () => stop( 'SIGTERM' ) );
vite.once( 'exit', async ( code ) => { await stop( 'SIGTERM' ); process.exitCode = code ?? 0; } );
