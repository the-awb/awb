#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( import.meta.url );
const electron = require( 'electron' );
const appRoot = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const main = path.join( appRoot, 'shell/main.mjs' );
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn( electron, [ main, '--smoke-multitool' ], {
  cwd: appRoot, env, stdio: [ 'ignore', 'pipe', 'pipe' ]
} );
let output = '';
child.stdout.on( 'data', ( chunk ) => { output += chunk; } );
child.stderr.on( 'data', ( chunk ) => { output += chunk; } );
const timeout = setTimeout( () => child.kill(), 40000 );
const code = await new Promise( ( resolve ) => child.on( 'exit', resolve ) );
clearTimeout( timeout );
if ( code !== 0 || !output.includes( 'AWB_SHELL_MULTITOOL_READY' )
  || !output.includes( 'AWB_SHELL_MULTITOOL_ISOLATION pass' ) ) {
  console.error( output ); process.exit( 1 );
}
console.log( 'electron-multitool: pass (Score Studio and Lissajous coexist and close independently)' );
