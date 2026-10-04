#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire( import.meta.url ); const electron = require( 'electron' );
const appRoot = fileURLToPath( new URL( '..', import.meta.url ) ); const main = path.join( appRoot, 'shell/main.mjs' );
const score = path.resolve( appRoot, '../score-studio/public/examples/sonic-attunement-01.score.json' );
const userData = await mkdtemp( path.join( os.tmpdir(), 'awb-shell-router-' ) );
const env = { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' }; delete env.ELECTRON_RUN_AS_NODE;
const common = [ `--user-data-dir=${ userData }` ]; let output = '';
const primary = spawn( electron, [ main, '--smoke-external-router', ...common ], { cwd: appRoot, env, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
primary.stdout.on( 'data', ( chunk ) => { output += chunk; } ); primary.stderr.on( 'data', ( chunk ) => { output += chunk; } );
const waitFor = async ( predicate, timeout = 20000 ) => { const started = Date.now(); while ( !predicate() ) { if ( Date.now() - started > timeout ) throw new Error( `Timed out.\n${ output }` ); await new Promise( ( resolve ) => setTimeout( resolve, 25 ) ); } };
const launch = async ( instance ) => {
  const child = spawn( electron, [ main, '--tool', 'score-studio', '--tool-instance', instance, '--score', score, ...common ], { cwd: appRoot, env, stdio: 'ignore' } );
  await new Promise( ( resolve, reject ) => { child.once( 'exit', resolve ); child.once( 'error', reject ); } );
};
try {
  await waitFor( () => output.includes( 'AWB_SHELL_HOME_READY' ) );
  await launch( 'external-a' ); await launch( 'external-a' ); await launch( 'external-b' );
  const exitCode = await new Promise( ( resolve, reject ) => { primary.once( 'exit', resolve ); primary.once( 'error', reject ); } );
  assert.equal( exitCode, 0, output ); assert.match( output, /AWB_SHELL_EXTERNAL_ROUTER views=2 repeated=focused-existing/ );
  console.log( 'electron-external-router: pass (second-instance SC-style launch routes into one registry)' );
} finally { if ( primary.exitCode === null ) primary.kill( 'SIGKILL' ); await rm( userData, { recursive: true, force: true } ); }
