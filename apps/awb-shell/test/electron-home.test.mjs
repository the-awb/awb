import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire( import.meta.url );
const electron = require( 'electron' );
const appRoot = fileURLToPath( new URL( '..', import.meta.url ) );

test( 'direct Electron launch opens Toolkit Home', { timeout: 20000 }, async () => {
  const userData = await mkdtemp( path.join( os.tmpdir(), 'awb-shell-home-' ) );
  const env = { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' };
  delete env.ELECTRON_RUN_AS_NODE;
  let output = '';
  const child = spawn( electron, [ path.join( appRoot, 'shell/main.mjs' ), '--smoke-home',
    `--user-data-dir=${ userData }` ], { cwd: appRoot, env, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
  child.stdout.on( 'data', ( chunk ) => { output += chunk; } );
  child.stderr.on( 'data', ( chunk ) => { output += chunk; } );
  try {
    const exitCode = await new Promise( ( resolve, reject ) => {
      child.once( 'exit', resolve ); child.once( 'error', reject );
    } );
    assert.equal( exitCode, 0, output );
    assert.match( output, /AWB_SHELL_HOME_READY/ );
    assert.match( output, /AWB_SHELL_HOME_PROJECTIONS documents=4 hostFacts=4 hostServices=1/ );
  } finally {
    if ( child.exitCode === null ) child.kill( 'SIGKILL' );
    await rm( userData, { recursive: true, force: true } );
  }
} );
