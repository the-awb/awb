#!/usr/bin/env node
import { spawn } from 'node:child_process';
import dgram from 'node:dgram';
import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createScoreDocument, serializeScoreDocument } from '@awb/score';
import { createHostedBridge } from '../server/hosted-bridge.mjs';
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

async function freePort() {
  const server = net.createServer();
  await new Promise( ( resolve ) => server.listen( 0, '127.0.0.1', resolve ) );
  const port = server.address().port;
  await new Promise( ( resolve ) => server.close( resolve ) );
  return port;
}

const colliderRoot = process.env.AWB_COLLIDER_ROOT
  ?? '/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider';
const sclang = process.env.SCLANG
  ?? '/Applications/SuperCollider.app/Contents/MacOS/sclang';
const liveConfig = process.env.SC_LANG_CONFIG
  ?? path.join( os.homedir(), 'Library/Application Support/SuperCollider/sclang_conf.yaml' );
const wipPath = path.join( colliderRoot, 'classes WIP' );
const fixturePath = path.join( colliderRoot, 'test/recovery/wip_score_timeline_osc_bridge_fixture.scd' );
const scorePath = path.join( colliderRoot, 'examples/score-projects/sonic-attunement-01/attunement-01.score.json' );
const appRoot = fileURLToPath( new URL( '..', import.meta.url ) );
const temporary = await mkdtemp( path.join( os.tmpdir(), 'awb-score-browser-' ) );
const testConfig = path.join( temporary, 'sclang_conf.yaml' );
const configText = await readFile( liveConfig, 'utf8' );
await writeFile( testConfig, configText.split( '\n' ).filter( ( line ) => !line.includes( wipPath ) ).join( '\n' ) );

const rawScore = JSON.parse( await readFile( scorePath, 'utf8' ) );
const documentText = serializeScoreDocument( createScoreDocument( {
  ...rawScore,
  meta: { title: 'Sonic Attunement 01', description: 'Real hosted browser fixture.', tags: [ 'integration-fixture' ] }
} ) );
const child = spawn( sclang, [ '-D', '-l', testConfig, fixturePath ], {
  cwd: colliderRoot, stdio: [ 'ignore', 'pipe', 'pipe' ]
} );
let scOutput = '';
child.stdout.on( 'data', ( chunk ) => { scOutput += chunk; } );
child.stderr.on( 'data', ( chunk ) => { scOutput += chunk; } );

const waitFor = async ( predicate, timeout = 20000 ) => {
  const started = Date.now();
  while ( !predicate() ) {
    if ( Date.now() - started > timeout ) throw new Error( 'timed out waiting for real hosted browser pipeline' );
    await new Promise( ( resolve ) => setTimeout( resolve, 25 ) );
  }
  return predicate();
};

let bridge;
let vite;
let browser;
let passed = 0;
try {
  const oscPort = await waitFor( () => {
    const match = scOutput.match( /AWB_SCORE_TIMELINE_OSC_FIXTURE_READY port=(\d+)/ );
    return match && Number( match[ 1 ] );
  } );
  passed += 1;
  bridge = await createHostedBridge( { port: 0, oscPort } );
  const vitePort = await freePort();
  vite = spawn( fileURLToPath( new URL( '../../../node_modules/.bin/vite', import.meta.url ) ), [
    '--host', '127.0.0.1', '--port', `${ vitePort }`
  ], {
    cwd: appRoot,
    env: { ...process.env, VITE_HOSTED_ENDPOINT: bridge.endpoint },
    stdio: [ 'ignore', 'pipe', 'pipe' ]
  } );
  let viteOutput = '';
  vite.stdout.on( 'data', ( chunk ) => { viteOutput += chunk; } );
  vite.stderr.on( 'data', ( chunk ) => { viteOutput += chunk; } );
  await waitFor( () => viteOutput.includes( 'Local:' ) );
  passed += 1;

  const { chromium } = await import( await findPlaywright() );
  browser = await chromium.launch();
  const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
  await page.addInitScript( () => {
    Object.defineProperty( window, 'showSaveFilePicker', { value: undefined, configurable: true } );
  } );
  const errors = [];
  const downloads = [];
  page.on( 'pageerror', ( error ) => errors.push( error.message ) );
  page.on( 'download', ( download ) => downloads.push( download.suggestedFilename() ) );
  await page.goto( `http://127.0.0.1:${ vitePort }`, { waitUntil: 'domcontentloaded' } );
  await page.getByText( 'AWB', { exact: true } ).waitFor();
  passed += 1;

  await page.locator( 'input[type=file]' ).setInputFiles( {
    name: 'attunement-01.score.json', mimeType: 'application/json', buffer: Buffer.from( documentText )
  } );
  await page.getByText( 'Opened attunement-01.score.json', { exact: true } ).waitFor();
  if ( await page.locator( '.synthLane' ).count() !== 11 ) throw new Error( 'browser did not load all eleven synth lifecycles' );
  passed += 1;

  await page.getByRole( 'button', { name: 'Connect', exact: true } ).click();
  await page.getByText( 'Connected to desktop sclang.', { exact: true } ).waitFor();
  passed += 1;
  const openScDocument = page.getByRole( 'button', { name: 'Open SC document', exact: true } );
  if ( await openScDocument.isDisabled() ) throw new Error( 'Open SC document stayed disabled after hosted connection' );
  passed += 1;
  await page.getByRole( 'button', { name: 'Generate SC document', exact: true } ).click();
  await page.getByText( 'Generated sonic-attunement-01 r1 SC document.', { exact: true } ).waitFor();
  await page.getByText( 'AWB GENERATED SCORE PROJECTION', { exact: false } ).waitFor();
  passed += 2;
  await page.getByText( 'generated; not saved', { exact: true } ).waitFor();
  passed += 1;
  await page.getByRole( 'button', { name: 'Score', exact: true } ).click();

  await page.getByRole( 'button', { name: 'Save', exact: true } ).click();
  await page.getByText( 'Canonical JSON and generated SC projection saved.', { exact: true } ).waitFor();
  await waitFor( () => downloads.length === 2, 5000 );
  if ( !downloads.some( ( name ) => name.endsWith( '.score.json' ) )
    || !downloads.some( ( name ) => name.endsWith( '.score.scd' ) ) ) {
    throw new Error( `paired save produced wrong downloads: ${ downloads.join( ', ' ) }` );
  }
  passed += 2;

  await page.getByRole( 'button', { name: 'Disconnect', exact: true } ).click();
  const reconnect = page.getByRole( 'button', { name: 'Connect', exact: true } );
  await reconnect.waitFor();
  await reconnect.click();
  await page.getByRole( 'button', { name: 'Disconnect', exact: true } ).waitFor();
  passed += 1;
  await page.getByRole( 'button', { name: 'Load revision', exact: true } ).click();
  await page.getByText( 'Revision 1 installed atomically.', { exact: true } ).waitFor();
  passed += 1;

  await page.locator( '.synthBar' ).last().evaluate( ( finalBar ) => {
    const lane = finalBar.closest( '.synthLane' );
    const rect = finalBar.getBoundingClientRect();
    lane.dispatchEvent( new MouseEvent( 'dblclick', {
      bubbles: true, clientX: rect.left, clientY: rect.bottom + 2
    } ) );
  } );
  await page.getByText( '773.000 s', { exact: true } ).waitFor();
  await page.locator( '.transportStrip p' ).filter( { hasText: 'stopped' } ).waitFor();
  passed += 2;
  if ( errors.length ) throw new Error( `browser errors: ${ errors.join( '; ' ) }` );
  passed += 1;

  console.log( `hosted-real-browser: ${ passed }/16 pass (11 events, reconnect reconciliation, explicit SC generation, paired JSON/SC save, final onset 773s, no playback)` );
} catch ( error ) {
  console.error( `hosted-real-browser: FAIL after ${ passed }/16: ${ error.message }` );
  console.error( scOutput.slice( -8000 ) );
  process.exitCode = 1;
} finally {
  await browser?.close();
  if ( vite?.exitCode === null ) vite.kill( 'SIGTERM' );
  if ( child.exitCode === null ) {
    const socket = dgram.createSocket( 'udp4' );
    const portMatch = scOutput.match( /AWB_SCORE_TIMELINE_OSC_FIXTURE_READY port=(\d+)/ );
    if ( portMatch ) await new Promise( ( resolve ) => socket.send(
      encodeOscMessage( '/awb/timeline/test/finish', [] ), Number( portMatch[ 1 ] ), '127.0.0.1', resolve
    ) );
    socket.close();
    await Promise.race( [
      new Promise( ( resolve ) => child.once( 'exit', resolve ) ),
      new Promise( ( resolve ) => setTimeout( resolve, 1000 ) )
    ] );
    if ( child.exitCode === null ) child.kill( 'SIGTERM' );
  }
  await bridge?.close();
  await rm( temporary, { recursive: true, force: true } );
}
