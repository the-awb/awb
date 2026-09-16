#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScoreDocument } from '@awb/score';

const require = createRequire( import.meta.url );
const electron = require( 'electron' );
const appRoot = fileURLToPath( new URL( '..', import.meta.url ) );
const main = path.join( appRoot, 'shell/main.mjs' );
const source = path.join( appRoot, 'public/examples/sonic-attunement-01.score.json' );
const temporary = await mkdtemp( path.join( os.tmpdir(), 'awb-shell-smoke-' ) );
const saved = path.join( temporary, 'native-save.score.json' );
const env = { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' };
delete env.ELECTRON_RUN_AS_NODE;
const waitFor = async ( predicate, timeout = 20000 ) => {
  const started = Date.now();
  while ( !predicate() ) {
    if ( Date.now() - started > timeout ) throw new Error( 'Timed out waiting for Electron shell smoke test.' );
    await new Promise( ( resolve ) => setTimeout( resolve, 25 ) );
  }
  return predicate();
};
const stop = async ( child ) => {
  if ( !child || child.exitCode !== null || child.signalCode !== null ) return;
  child.kill( 'SIGTERM' );
  await Promise.race( [
    new Promise( ( resolve ) => child.once( 'exit', resolve ) ),
    new Promise( ( resolve ) => setTimeout( resolve, 2000 ) )
  ] );
  if ( child.exitCode === null && child.signalCode === null ) child.kill( 'SIGKILL' );
};

let primary;
let secondary;
let output = '';
try {
  primary = spawn( electron, [ main, '--score', source, '--smoke-save', saved,
    '--smoke-close-after-focus' ], { cwd: appRoot, env, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
  primary.stdout.on( 'data', ( chunk ) => { output += chunk; } );
  primary.stderr.on( 'data', ( chunk ) => { output += chunk; } );
  await waitFor( () => {
    if ( primary.exitCode !== null ) throw new Error( `Electron shell exited before ready.\n${ output }` );
    return output.includes( 'SCORE_STUDIO_SHELL_READY' );
  } );
  assert.match( output, /SCORE_STUDIO_SHELL_SMOKE_SAVED/ );
  assert.equal( parseScoreDocument( await readFile( saved, 'utf8' ) ).scoreID, 'sonic-attunement-01' );

  secondary = spawn( electron, [ main, '--focus-existing' ], {
    cwd: appRoot, env, stdio: [ 'ignore', 'pipe', 'pipe' ]
  } );
  await waitFor( () => output.includes( 'SCORE_STUDIO_SHELL_FOCUSED' ) );
  await waitFor( () => output.includes( 'SCORE_STUDIO_SHELL_CLOSED' ) );
  await new Promise( ( resolve ) => primary.once( 'exit', resolve ) );
  assert.equal( primary.exitCode, 0, output );
  console.log( 'shell-smoke: pass (launch, source score, native save, single-instance focus, close)' );
} catch ( error ) {
  console.error( output );
  throw error;
} finally {
  await stop( secondary );
  await stop( primary );
  await rm( temporary, { recursive: true, force: true } );
}
