import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import dgram from 'node:dgram';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire( import.meta.url );
const electron = require( 'electron' );
const appRoot = fileURLToPath( new URL( '..', import.meta.url ) );
const colliderRoot = process.env.AWB_COLLIDER_ROOT
  ?? '/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider';
const scorePath = path.join( colliderRoot,
  'examples/score-projects/sonic-attunement-01/attunement-01.score.json' );
const sclang = process.env.AWB_SCLANG_PATH ?? '/Applications/SuperCollider.app/Contents/MacOS/sclang';

async function availableUdpPort() {
  const socket = dgram.createSocket( 'udp4' );
  await new Promise( ( resolve, reject ) => { socket.once( 'error', reject ); socket.bind( 0, '127.0.0.1', resolve ); } );
  const port = socket.address().port; await new Promise( ( resolve ) => socket.close( resolve ) ); return port;
}

test( 'Electron owns and cleanly stops an optional native sclang/scsynth host', {
  timeout: 50000, skip: !existsSync( sclang )
}, async () => {
  const userData = await mkdtemp( path.join( os.tmpdir(), 'awb-shell-headless-sc-' ) );
  const oscPort = await availableUdpPort(); const serverPort = await availableUdpPort();
  const env = { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true', AWB_SCLANG_PATH: sclang,
    AWB_HEADLESS_SERVER_PORT: `${ serverPort }` };
  delete env.ELECTRON_RUN_AS_NODE;
  let output = '';
  const child = spawn( electron, [ path.join( appRoot, 'shell/main.mjs' ), '--smoke-headless-sc',
    `--osc-port=${ oscPort }`, `--smoke-score=${ scorePath }`, `--user-data-dir=${ userData }` ],
  { cwd: appRoot, env, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
  child.stdout.on( 'data', ( chunk ) => { output += chunk; } );
  child.stderr.on( 'data', ( chunk ) => { output += chunk; } );
  try {
    const exitCode = await new Promise( ( resolve, reject ) => {
      child.once( 'exit', resolve ); child.once( 'error', reject );
    } );
    assert.equal( exitCode, 0, output );
    assert.match( output, /AWB_SHELL_HEADLESS_SC_READY engine=native audioProbe=sent scoreStudio=hosted scorePlayback=realized fieldScore=observed fieldAuthored=running fieldModelling=hosted toolSession=owned nodeManager=toggleable shutdown=owned/ );
  } finally {
    if ( child.exitCode === null ) child.kill( 'SIGKILL' );
    await rm( userData, { recursive: true, force: true } );
  }
} );
