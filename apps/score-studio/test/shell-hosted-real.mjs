#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import dgram from 'node:dgram';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeOscMessage } from '../server/osc-codec.mjs';

const require = createRequire( import.meta.url );
const electron = require( 'electron' );
const colliderRoot = process.env.AWB_COLLIDER_ROOT
  ?? '/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider';
const sclang = process.env.SCLANG
  ?? '/Applications/SuperCollider.app/Contents/MacOS/sclang';
const liveConfig = process.env.SC_LANG_CONFIG
  ?? path.join( os.homedir(), 'Library/Application Support/SuperCollider/sclang_conf.yaml' );
const wipPath = path.join( colliderRoot, 'classes WIP' );
const fixturePath = path.join( colliderRoot, 'test/recovery/wip_score_studio_browser_fixture.scd' );
const scorePath = path.join( colliderRoot,
  'examples/score-projects/sonic-attunement-01/attunement-01.score.json' );
const appRoot = fileURLToPath( new URL( '..', import.meta.url ) );
const main = path.join( appRoot, 'shell/main.mjs' );
const temporary = await mkdtemp( path.join( os.tmpdir(), 'awb-shell-hosted-' ) );
const testConfig = path.join( temporary, 'sclang_conf.yaml' );
const configText = await readFile( liveConfig, 'utf8' );
await writeFile( testConfig,
  configText.split( '\n' ).filter( ( line ) => !line.includes( wipPath ) ).join( '\n' ) );

const waitFor = async ( predicate, timeout = 30000 ) => {
  const started = Date.now();
  while ( !predicate() ) {
    if ( Date.now() - started > timeout ) throw new Error( 'Timed out waiting for hosted Electron shell.' );
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

const sclangChild = spawn( sclang, [ '-D', '-l', testConfig, fixturePath ], {
  cwd: colliderRoot, stdio: [ 'ignore', 'pipe', 'pipe' ]
} );
let scOutput = '';
let shellOutput = '';
sclangChild.stdout.on( 'data', ( chunk ) => { scOutput += chunk; } );
sclangChild.stderr.on( 'data', ( chunk ) => { scOutput += chunk; } );
let shellChild;
let udp;
try {
  const ready = await waitFor( () => scOutput.match(
    /AWB_SCORE_STUDIO_BROWSER_FIXTURE_READY port=(\d+) instance=([^\s]+)/
  ) );
  const env = { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' };
  delete env.ELECTRON_RUN_AS_NODE;
  shellChild = spawn( electron, [
    main,
    '--osc-port', ready[ 1 ],
    '--score', scorePath,
    '--tool-instance', ready[ 2 ],
    '--owner-pid', `${ sclangChild.pid }`,
    '--smoke-hosted',
    `--user-data-dir=${ path.join( temporary, 'electron-profile' ) }`
  ], { cwd: appRoot, env, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
  shellChild.stdout.on( 'data', ( chunk ) => { shellOutput += chunk; } );
  shellChild.stderr.on( 'data', ( chunk ) => { shellOutput += chunk; } );
  await waitFor( () => {
    if ( shellChild.exitCode !== null && !shellOutput.includes( 'SCORE_STUDIO_SHELL_HOSTED_INSTALLED' ) ) {
      throw new Error( `Electron shell exited before installing the hosted revision.\n${ shellOutput }` );
    }
    return shellOutput.includes( 'SCORE_STUDIO_SHELL_HOSTED_INSTALLED' )
      && scOutput.includes( 'AWB_SCORE_STUDIO_BROWSER_CONNECTED client=' );
  } );
  await waitFor( () => shellChild.exitCode !== null );
  if ( shellChild.exitCode !== 0 ) throw new Error( `Electron shell failed.\n${ shellOutput }` );

  udp = dgram.createSocket( 'udp4' );
  udp.send( encodeOscMessage( '/awb/test/score-studio/stop', [] ), Number( ready[ 1 ] ), '127.0.0.1' );
  await waitFor( () => scOutput.includes( 'AWB_SCORE_STUDIO_BROWSER_FIXTURE_STOPPED' ) );
  console.log( 'shell-hosted-real: pass (ToolInstance hello, named score, automatic revision install)' );
} catch ( error ) {
  console.error( `SHELL OUTPUT:\n${ shellOutput }` );
  console.error( `SCLANG OUTPUT:\n${ scOutput.slice( -8000 ) }` );
  throw error;
} finally {
  udp?.close();
  await stop( shellChild );
  await stop( sclangChild );
  await rm( temporary, { recursive: true, force: true } );
}
