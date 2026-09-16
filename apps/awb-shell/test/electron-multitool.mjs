#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const require = createRequire( import.meta.url );
const electron = require( 'electron' );
const appRoot = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const main = path.join( appRoot, 'shell/main.mjs' );
const userData = await mkdtemp( path.join( os.tmpdir(), 'awb-shell-multitool-' ) );
const env = { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn( electron, [ main, '--smoke-multitool', `--user-data-dir=${ userData }` ], {
  cwd: appRoot, env, stdio: [ 'ignore', 'pipe', 'pipe' ]
} );
let output = '';
child.stdout.on( 'data', ( chunk ) => { output += chunk; } );
child.stderr.on( 'data', ( chunk ) => { output += chunk; } );
const timeout = setTimeout( () => child.kill(), 40000 );
try {
  const code = await new Promise( ( resolve ) => child.on( 'exit', resolve ) );
  clearTimeout( timeout );
  if ( code !== 0 || !output.includes( 'AWB_SHELL_MULTITOOL_READY' )
    || !output.includes( 'AWB_SHELL_MULTITOOL_ISOLATION pass' ) ) {
    console.error( output ); process.exitCode = 1;
  } else console.log( 'electron-multitool: pass (Score Studio and Lissajous coexist and close independently)' );
} finally {
  clearTimeout( timeout );
  if ( child.exitCode === null ) child.kill( 'SIGKILL' );
  await rm( userData, { recursive: true, force: true } );
}
