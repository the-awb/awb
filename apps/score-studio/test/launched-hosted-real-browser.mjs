#!/usr/bin/env node
import { spawn } from 'node:child_process';
import dgram from 'node:dgram';
import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { encodeOscMessage } from '../server/osc-codec.mjs';

async function findPlaywright() {
  const local = path.resolve( 'node_modules/playwright/index.mjs' );
  if ( existsSync( local ) ) return local;
  const cache = path.join( os.homedir(), '.npm/_npx' );
  for ( const directory of existsSync( cache ) ? readdirSync( cache ) : [] ) {
    const candidate = path.join( cache, directory, 'node_modules/playwright/index.mjs' );
    if ( existsSync( candidate ) ) return candidate;
  }
  throw new Error( 'Playwright not found; run `npx playwright@latest install chromium` once.' );
}

const waitFor = async ( predicate, timeout = 30000 ) => {
  const started = Date.now();
  while ( !predicate() ) {
    if ( Date.now() - started > timeout ) throw new Error( 'timed out waiting for launched hosted score workflow' );
    await new Promise( ( resolve ) => setTimeout( resolve, 25 ) );
  }
  return predicate();
};

const terminateChild = async ( child, timeout = 2000 ) => {
  if ( !child || child.exitCode !== null || child.signalCode !== null ) return;
  child.kill( 'SIGTERM' );
  await Promise.race( [
    new Promise( ( resolve ) => child.once( 'exit', resolve ) ),
    new Promise( ( resolve ) => setTimeout( resolve, timeout ) )
  ] );
  if ( child.exitCode === null && child.signalCode === null ) {
    child.kill( 'SIGKILL' );
    await new Promise( ( resolve ) => child.once( 'exit', resolve ) );
  }
};

const freePort = async () => {
  const server = net.createServer();
  await new Promise( ( resolve ) => server.listen( 0, '127.0.0.1', resolve ) );
  const port = server.address().port;
  await new Promise( ( resolve ) => server.close( resolve ) );
  return port;
};

const freeUdpPort = async () => {
  const socket = dgram.createSocket( 'udp4' );
  await new Promise( ( resolve, reject ) => {
    socket.once( 'error', reject );
    socket.bind( 0, '127.0.0.1', resolve );
  } );
  const port = socket.address().port;
  await new Promise( ( resolve ) => socket.close( resolve ) );
  return port;
};

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
const launcherPath = path.join( appRoot, 'server/dev-hosted.mjs' );
const temporary = await mkdtemp( path.join( os.tmpdir(), 'awb-score-launched-' ) );
const testConfig = path.join( temporary, 'sclang_conf.yaml' );
const configText = await readFile( liveConfig, 'utf8' );
await writeFile( testConfig,
  configText.split( '\n' ).filter( ( line ) => !line.includes( wipPath ) ).join( '\n' ) );

const sclangPort = await freeUdpPort();
const sclangChild = spawn( sclang, [ '-u', `${ sclangPort }`, '-D', '-l', testConfig, fixturePath ], {
  cwd: colliderRoot, stdio: [ 'ignore', 'pipe', 'pipe' ]
} );
let scOutput = '';
sclangChild.stdout.on( 'data', ( chunk ) => { scOutput += chunk; } );
sclangChild.stderr.on( 'data', ( chunk ) => { scOutput += chunk; } );

let hostedChild;
let hostedOutput = '';
let browser;
let page;
let udp;
let passed = 0;
try {
  const ready = await waitFor( () => scOutput.match(
    /AWB_SCORE_STUDIO_BROWSER_FIXTURE_READY port=(\d+) session=([^\s]+)/
  ) );
  const oscPort = Number( ready[ 1 ] );
  const toolSessionID = ready[ 2 ];
  const vitePort = await freePort();
  passed += 1;

  hostedChild = spawn( process.execPath, [
    launcherPath, '--osc-port', `${ oscPort }`, '--score', scorePath,
    '--tool-session', toolSessionID, '--vite-port', `${ vitePort }`,
    '--owner-pid', `${ sclangChild.pid }`
  ], { cwd: appRoot, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
  hostedChild.stdout.on( 'data', ( chunk ) => { hostedOutput += chunk; } );
  hostedChild.stderr.on( 'data', ( chunk ) => { hostedOutput += chunk; } );
  await waitFor( () => hostedOutput.includes( 'Local:' ) );
  passed += 1;

  const { chromium } = await import( await findPlaywright() );
  browser = await chromium.launch();
  page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
  const errors = [];
  page.on( 'pageerror', ( error ) => errors.push( error.message ) );
  await page.goto( `http://127.0.0.1:${ vitePort }`, { waitUntil: 'domcontentloaded' } );
  await page.getByText( 'Opened attunement-01.score.json', { exact: true } ).waitFor();
  const identity = await page.locator( '.filePanel .identity dd' ).allTextContents();
  if ( identity[ 0 ] !== 'attunement-01.score.json'
    || identity[ 1 ] !== 'sonic-attunement-01'
    || identity[ 2 ] !== '1'
    || identity[ 3 ] !== '11' ) {
    throw new Error( `SC-launched browser loaded the wrong source identity: ${ identity.join( ' / ' ) }` );
  }
  passed += 1;

  await page.getByText( 'Revision 1 installed atomically.', { exact: true } ).waitFor();
  await waitFor( () => scOutput.includes( 'AWB_SCORE_STUDIO_BROWSER_CONNECTED client=' ) );
  if ( errors.length ) throw new Error( `browser errors: ${ errors.join( '; ' ) }` );
  passed += 2;

  udp = dgram.createSocket( 'udp4' );
  udp.send( encodeOscMessage( '/awb/test/score-studio/stop', [] ), oscPort, '127.0.0.1' );
  await waitFor( () => scOutput.includes( 'AWB_SCORE_STUDIO_BROWSER_FIXTURE_STOPPED' ) );
  passed += 1;

  console.log( `launched-hosted-real-browser: ${ passed }/6 pass (SC ToolSession, source score, automatic handshake and revision install)` );
} catch ( error ) {
  console.error( `launched-hosted-real-browser: FAIL after ${ passed }/6: ${ error.message }` );
  console.error( `HOSTED OUTPUT:\n${ hostedOutput }` );
  if ( page ) console.error( `BROWSER TEXT:\n${ await page.locator( 'body' ).innerText().catch( () => '' ) }` );
  console.error( scOutput );
  throw error;
} finally {
  udp?.close();
  await browser?.close();
  await terminateChild( hostedChild );
  await terminateChild( sclangChild );
  await rm( temporary, { recursive: true, force: true } );
}
