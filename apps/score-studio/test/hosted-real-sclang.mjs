#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import { createScoreDocument, hashScoreDocument } from '@awb/score';
import { createHostedBridge } from '../server/hosted-bridge.mjs';
import { HostedScoreClient } from '../src/engine/HostedScoreClient.js';

const colliderRoot = process.env.AWB_COLLIDER_ROOT
  ?? '/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider';
const sclang = process.env.SCLANG
  ?? '/Applications/SuperCollider.app/Contents/MacOS/sclang';
const liveConfig = process.env.SC_LANG_CONFIG
  ?? path.join( os.homedir(), 'Library/Application Support/SuperCollider/sclang_conf.yaml' );
const wipPath = path.join( colliderRoot, 'classes WIP' );
const fixturePath = path.join( colliderRoot, 'test/recovery/wip_score_timeline_osc_bridge_fixture.scd' );
const scorePath = path.join(
  colliderRoot, 'examples/score-projects/sonic-attunement-01/attunement-01.score.json'
);

const temporary = await mkdtemp( path.join( os.tmpdir(), 'awb-score-hosted-' ) );
const testConfig = path.join( temporary, 'sclang_conf.yaml' );
const configText = await readFile( liveConfig, 'utf8' );
await writeFile( testConfig, configText.split( '\n' ).filter( ( line ) => !line.includes( wipPath ) ).join( '\n' ) );

const rawScore = JSON.parse( await readFile( scorePath, 'utf8' ) );
const document = createScoreDocument( {
  ...rawScore,
  meta: {
    title: 'Sonic Attunement 01',
    description: 'Browser-hosted integration projection of the real desktop score.',
    tags: [ 'integration-fixture' ]
  }
} );
const child = spawn( sclang, [ '-D', '-l', testConfig, fixturePath ], {
  cwd: colliderRoot,
  stdio: [ 'ignore', 'pipe', 'pipe' ]
} );
let output = '';
child.stdout.on( 'data', ( chunk ) => { output += chunk; } );
child.stderr.on( 'data', ( chunk ) => { output += chunk; } );

const waitFor = async ( predicate, timeout = 20000 ) => {
  const started = Date.now();
  while ( !predicate() ) {
    if ( Date.now() - started > timeout ) throw new Error( 'timed out waiting for real hosted pipeline' );
    await new Promise( ( resolve ) => setTimeout( resolve, 20 ) );
  }
  return predicate();
};

let bridge;
let client;
let passed = 0;
try {
  const oscPort = await waitFor( () => {
    const match = output.match( /AWB_SCORE_TIMELINE_OSC_FIXTURE_READY port=(\d+)/ );
    return match && Number( match[ 1 ] );
  } );
  passed += 1;
  bridge = await createHostedBridge( { port: 0, oscPort } );
  client = new HostedScoreClient( {
    clientID: 'score-browser-real', WebSocketImpl: WebSocket, requestTimeoutMs: 1200
  } );
  await client.connect( bridge.endpoint );
  if ( client.getState().protocolVersion !== 1 ) throw new Error( 'desktop did not negotiate protocol v1' );
  passed += 1;

  await client.loadDocument( document, { maxChunkBytes: 512 } );
  if ( client.getState().scoreID !== rawScore.scoreID
    || client.getState().remoteRevision !== rawScore.revision ) {
    throw new Error( 'desktop installed the wrong score identity' );
  }
  passed += 2;

  const projection = await client.requestProjection( {
    scoreID: document.scoreID,
    revision: document.revision,
    contentHash: await hashScoreDocument( document ),
    kind: 'timeline'
  } );
  if ( !projection.text.includes( 'AWB GENERATED SCORE PROJECTION' ) ) {
    throw new Error( 'desktop returned text without the generated-projection marker' );
  }
  if ( !projection.text.includes( 'PTimelineOSCBridge.connectedPlayer' ) ) {
    throw new Error( 'desktop timeline projection does not resolve the bridge-owned PScoreTimelinePlayer' );
  }
  passed += 3;

  await client.command( document, 'seek', 773 );
  await waitFor( () => {
    const transport = client.getState().transport;
    return transport?.scoreID === rawScore.scoreID
      && transport.state === 'stopped'
      && Math.abs( transport.scorePosition - 773 ) < 0.0001;
  }, 5000 );
  passed += 2;

  if ( client.getState().transport.revision !== rawScore.revision ) {
    throw new Error( 'desktop transport returned the wrong revision' );
  }
  passed += 1;

  client.send( '/awb/timeline/test/finish', [] );
  const exitCode = await new Promise( ( resolve ) => child.once( 'exit', resolve ) );
  if ( exitCode !== 0 ) throw new Error( `sclang fixture exited ${ exitCode }` );
  passed += 1;
  console.log( `hosted-real-sclang: ${ passed }/11 pass (11 events, bounded SC projection, final onset 773s, no playback)` );
} catch ( error ) {
  console.error( `hosted-real-sclang: FAIL after ${ passed }/11: ${ error.message }` );
  console.error( output.slice( -8000 ) );
  process.exitCode = 1;
} finally {
  client?.disconnect();
  await bridge?.close();
  if ( child.exitCode === null ) child.kill( 'SIGTERM' );
  await rm( temporary, { recursive: true, force: true } );
}
