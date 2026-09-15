#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createHostedBridge } from './hosted-bridge.mjs';

const appRoot = fileURLToPath( new URL( '..', import.meta.url ) );
const oscPortIndex = process.argv.indexOf( '--osc-port' );
const oscPort = Number( oscPortIndex >= 0 ? process.argv[ oscPortIndex + 1 ] : 57120 );
const bridge = await createHostedBridge( { oscPort } );
const vite = spawn( fileURLToPath( new URL( '../../../node_modules/.bin/vite', import.meta.url ) ), [], {
  cwd: appRoot,
  env: { ...process.env, VITE_HOSTED_ENDPOINT: bridge.endpoint },
  stdio: 'inherit'
} );

console.log( `Hosted bridge ready: ${ bridge.endpoint }` );
console.log( `Forwarding to sclang OSC at 127.0.0.1:${ oscPort }` );

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
