import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire( import.meta.url );
const electron = require( 'electron' );
const appRoot = fileURLToPath( new URL( '..', import.meta.url ) );

test( 'hidden Chromium executor renders an analytic field job to guarded MP4 output',
  { timeout: 45000 }, async () => {
    const root = await mkdtemp( path.join( os.tmpdir(), 'awb-shell-render-' ) );
    const userData = path.join( root, 'user-data' );
    const outputPath = path.join( root, 'field-smoke.mp4' );
    const env = { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' };
    delete env.ELECTRON_RUN_AS_NODE;
    let output = '';
    const child = spawn( electron, [ path.join( appRoot, 'shell/main.mjs' ), '--smoke-render',
      `--smoke-render-output=${ outputPath }`, `--user-data-dir=${ userData }` ],
    { cwd: appRoot, env, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
    child.stdout.on( 'data', ( chunk ) => { output += chunk; } );
    child.stderr.on( 'data', ( chunk ) => { output += chunk; } );
    try {
      const exitCode = await new Promise( ( resolve, reject ) => {
        child.once( 'exit', resolve ); child.once( 'error', reject );
      } );
      assert.equal( exitCode, 0, output );
      assert.match( output, /AWB_SHELL_HEADLESS_RENDER frames=2 bytes=\d+ producer=field repeatPixels=stable landmarks=distinct liveParity=exact/ );
      const bytes = await readFile( outputPath );
      assert.equal( bytes.subarray( 4, 8 ).toString(), 'ftyp' );
    } finally {
      if ( child.exitCode === null ) child.kill( 'SIGKILL' );
      await rm( root, { recursive: true, force: true } );
    }
  } );
