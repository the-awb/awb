#!/usr/bin/env node
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import { readFile } from 'node:fs/promises';
import { WebSocket } from 'ws';
import { hashScoreDocument, parseScoreDocument } from '@awb/score';
import { createHostedBridge } from '../server/hosted-bridge.mjs';
import { decodeOscMessage, encodeOscMessage } from '../server/osc-codec.mjs';
import { HostedScoreClient } from '../src/engine/HostedScoreClient.js';

const fixture = parseScoreDocument( await readFile(
  new URL( '../../../packages/score/fixtures/connector-v1/score.json', import.meta.url ), 'utf8'
) );
const synthDefBytes = await readFile(
  new URL( '../public/synthdefs/fieldBasic.scsyndef', import.meta.url )
);
const synthDefHexChunks = synthDefBytes.toString( 'hex' ).match( /.{1,1200}/g );
const osc = dgram.createSocket( 'udp4' );
await new Promise( ( resolve ) => osc.bind( 0, '127.0.0.1', resolve ) );
const oscPort = osc.address().port;
const received = [];
let endCount = 0;
let droppedStateID = null;
let projectionRequests = 0;
let synthDefInventory = [ 'fieldBasic', 'unmodelled' ];

function reply( rinfo, address, args ) {
  osc.send( encodeOscMessage( address, args ), rinfo.port, rinfo.address );
}

function result( rinfo, args, ok, action, scoreID, revision, code, detail = '' ) {
  reply( rinfo, '/awb/timeline/result', [ args[ 0 ], args[ 1 ], ok ? 1 : 0, action, scoreID, revision, code, detail ] );
}

osc.on( 'message', ( packet, rinfo ) => {
  const message = decodeOscMessage( packet );
  received.push( message );
  const args = message.args;
  if ( message.address === '/awb/timeline/hello' ) {
    reply( rinfo, '/awb/timeline/connected', [ args[ 0 ], 1 ] );
    reply( rinfo, '/awb/timeline/runtime', [ args[ 0 ], 'ready', 'notApplicable', 'notLoaded', 'unknown', '', 0 ] );
  } else if ( message.address === '/awb/synthdef/hello' ) {
    reply( rinfo, '/awb/synthdef/connected', [ args[ 0 ], 1 ] );
  } else if ( message.address === '/awb/synthdef/list' ) {
    reply( rinfo, '/awb/synthdef/list/begin', [ args[ 0 ], args[ 1 ], synthDefInventory.length ] );
    synthDefInventory.forEach( ( name, index ) => {
      reply( rinfo, '/awb/synthdef/list/item', [ args[ 0 ], args[ 1 ], index, name ] );
    } );
    reply( rinfo, '/awb/synthdef/list/end', [ args[ 0 ], args[ 1 ], synthDefInventory.length ] );
  } else if ( message.address === '/awb/synthdef/describe' ) {
    reply( rinfo, '/awb/synthdef/description/begin', [
      args[ 0 ], args[ 1 ], args[ 2 ], synthDefBytes.length, synthDefHexChunks.length, 0
    ] );
    synthDefHexChunks.forEach( ( chunk, index ) => reply(
      rinfo, '/awb/synthdef/description/chunk', [ args[ 0 ], args[ 1 ], index, chunk ]
    ) );
    reply( rinfo, '/awb/synthdef/description/end', [
      args[ 0 ], args[ 1 ], args[ 2 ], synthDefBytes.length, synthDefHexChunks.length, 0
    ] );
  } else if ( message.address === '/awb/timeline/ping' ) {
    reply( rinfo, '/awb/timeline/pong', [ args[ 0 ], args[ 1 ], performance.now() / 1000 + 100 ] );
  } else if ( message.address === '/awb/timeline/snapshot/begin' ) {
    result( rinfo, args, true, 'snapshotBegin', args[ 3 ], args[ 4 ], 'accepted', args[ 2 ] );
  } else if ( message.address === '/awb/timeline/snapshot/chunk' ) {
    args.slice( 4 ).forEach( ( entry ) => JSON.parse( entry ) );
    result( rinfo, args, true, 'snapshotChunk', fixture.scoreID, fixture.revision, 'accepted' );
  } else if ( message.address === '/awb/timeline/snapshot/end' ) {
    endCount += 1;
    if ( endCount === 1 ) {
      result( rinfo, args, false, 'snapshotEnd', fixture.scoreID, fixture.revision, 'missingChunks', 'retry whole snapshot' );
    } else {
      result( rinfo, args, true, 'snapshotEnd', fixture.scoreID, fixture.revision, 'installed' );
      reply( rinfo, '/awb/timeline/runtime', [ args[ 0 ], 'ready', 'notApplicable', 'ready', 'ready', '', 0 ] );
      reply( rinfo, '/awb/timeline/transport', [ args[ 0 ], fixture.scoreID, fixture.revision, '', 'stopped', 0, performance.now() / 1000 + 100, 0, 0 ] );
    }
  } else if ( message.address === '/awb/timeline/command' ) {
    const command = args[ 4 ];
    if ( command === 'state' && droppedStateID === null ) {
      droppedStateID = args[ 1 ];
      return;
    }
    result( rinfo, args, true, command, fixture.scoreID, fixture.revision, 'ok' );
    if ( command === 'play' ) {
      const hostTime = performance.now() / 1000 + 100;
      reply( rinfo, '/awb/timeline/transport', [ args[ 0 ], fixture.scoreID, fixture.revision, 'run-1', 'playing', 0, hostTime, 1, 0 ] );
      reply( rinfo, '/awb/timeline/realization', [ args[ 0 ], fixture.scoreID, fixture.revision, 'run-1', 'n1', 'realization-1', 'started', 0, 0, 2, 1001, 1002 ] );
    }
  } else if ( message.address === '/awb/timeline/instrument' ) {
    result( rinfo, args, true, args[ 2 ], args[ 3 ], 0, 'applied' );
    reply( rinfo, '/awb/timeline/instrument/state', [
      args[ 0 ], args[ 3 ], args[ 2 ] === 'free' ? 'ended' : 'running',
      args[ 2 ] === 'free' ? -1 : 1200
    ] );
  } else if ( message.address === '/awb/timeline/projection/request' ) {
    projectionRequests += 1;
    const text = '// α projection\n';
    reply( rinfo, '/awb/timeline/projection/begin', [
      args[ 0 ], args[ 1 ], args[ 2 ], args[ 3 ], args[ 4 ], args[ 5 ], 2, [ ...text ].length
    ] );
    reply( rinfo, '/awb/timeline/projection/chunk', [ args[ 0 ], args[ 1 ], 0, '// α ' ] );
    if ( projectionRequests > 1 ) reply( rinfo, '/awb/timeline/projection/chunk', [ args[ 0 ], args[ 1 ], 1, 'projection\n' ] );
    reply( rinfo, '/awb/timeline/projection/end', [
      args[ 0 ], args[ 1 ], args[ 2 ], args[ 3 ], args[ 4 ], args[ 5 ], 2
    ] );
    result( rinfo, args, true, 'projection', fixture.scoreID, fixture.revision, 'generated', '2' );
  }
} );

const bridge = await createHostedBridge( { port: 0, oscPort } );
const client = new HostedScoreClient( {
  clientID: 'score-browser-test', toolSessionID: 'score-session-test',
  WebSocketImpl: WebSocket, requestTimeoutMs: 80
} );
const waitFor = async ( predicate, timeout = 2000 ) => {
  const start = Date.now();
  while ( !predicate() ) {
    if ( Date.now() - start > timeout ) throw new Error( 'timed out waiting for hosted transport state' );
    await new Promise( ( resolve ) => setTimeout( resolve, 10 ) );
  }
};

try {
  await client.connect( bridge.endpoint );
  assert.equal( client.getState().status, 'connected' );
  assert.equal( client.getState().protocolVersion, 1 );
  assert.equal( client.getState().readiness.canPlay, false );
  const hello = received.find( ( message ) => message.address === '/awb/timeline/hello' );
  assert.equal( hello.args[ 2 ], 'score-session-test', 'hosted hello carries its ToolSession identity' );
  await waitFor( () => client.getState().synthDefContext.status === 'connected' );
  const context = await client.loadSynthDefContext( [ 'fieldBasic', 'missingFromDesktop' ] );
  assert.deepEqual( context.inventory, [ 'fieldBasic', 'unmodelled' ] );
  assert.deepEqual( context.missing, [ 'missingFromDesktop' ] );
  assert.equal( context.definitions.fieldBasic.interface.name, 'fieldBasic' );
  assert.ok( context.definitions.fieldBasic.interface.controls
    .find( ( control ) => control.name === 'freqL' ).roles.includes( 'oscillatorFrequency' ) );
  assert.match( context.definitions.fieldBasic.fingerprint, /^sha256:[0-9a-f]{64}$/ );
  assert.equal( received.filter( ( message ) => message.address === '/awb/synthdef/describe' ).length, 1,
    'inventory refresh does not eagerly request unselected definition graphs' );
  synthDefInventory = [ 'unmodelled' ];
  await client.listSynthDefs();
  assert.equal( client.getState().synthDefContext.definitions.fieldBasic, undefined,
    'inventory refresh prunes models whose definitions disappeared' );

  await client.instrumentCommand( 'start', 'basic', 'fieldBasic', { freqL: 60, amp: 1 } );
  await waitFor( () => client.getState().liveInstruments.basic?.nodeID === 1200 );
  const instrumentStart = received.find( ( message ) => message.address === '/awb/timeline/instrument' );
  assert.deepEqual( instrumentStart.args.slice( 2 ), [ 'start', 'basic', 'fieldBasic', 'freqL', 60, 'amp', 1 ] );
  await client.instrumentCommand( 'free', 'basic', 'fieldBasic' );
  await waitFor( () => !client.getState().liveInstruments.basic );

  await client.loadDocument( fixture );
  assert.equal( endCount, 2, 'missing chunks restart the complete snapshot' );
  assert.equal( client.getState().remoteRevision, fixture.revision );
  assert.equal( client.getState().readiness.canPlay, true );
  assert.ok( received.some( ( message ) => message.address === '/awb/timeline/snapshot/chunk' ) );

  await client.command( fixture, 'play' );
  await waitFor( () => client.getState().realizations.length === 1 );
  assert.equal( client.getState().transport.runID, 'run-1' );
  assert.deepEqual( client.getState().realizations[ 0 ].nodeIDs, [ 1001, 1002 ] );

  await client.command( fixture, 'state' );
  const stateMessages = received.filter( ( message ) => message.address === '/awb/timeline/command' && message.args[ 4 ] === 'state' );
  assert.equal( stateMessages.length, 2, 'a timed-out request is retried' );
  assert.equal( stateMessages[ 0 ].args[ 1 ], stateMessages[ 1 ].args[ 1 ], 'retry retains its idempotency key' );

  client.publish( { scoreID: null, remoteRevision: null } );
  await client.installDocument( fixture );
  const reconciledBegin = received.filter( ( message ) => message.address === '/awb/timeline/snapshot/begin' ).at( -1 );
  assert.equal( reconciledBegin.args[ 5 ], fixture.revision,
    'an unknown client state queries and guards against the actual desktop revision' );
  assert.equal( client.getState().remoteRevision, fixture.revision );

  const projection = await client.requestProjection( {
    scoreID: fixture.scoreID, revision: fixture.revision,
    contentHash: await hashScoreDocument( fixture ), kind: 'timeline'
  } );
  assert.equal( projection.text, '// α projection\n' );
  assert.equal( projection.kind, 'timeline' );
  assert.equal( projectionRequests, 2, 'an incomplete projection retries with the same request ID' );
  const projectionMessages = received.filter( ( message ) => message.address === '/awb/timeline/projection/request' );
  assert.equal( projectionMessages[ 0 ].args[ 1 ], projectionMessages[ 1 ].args[ 1 ] );

  await waitFor( () => client.getState().clockOffset !== null );
  assert.ok( client.estimateScorePosition() >= 0 );

  const untrusted = new WebSocket( bridge.endpoint.replace( /token=[^&]+/, 'token=wrong' ) );
  const closeCode = await new Promise( ( resolve ) => untrusted.addEventListener( 'close', ( event ) => resolve( event.code ) ) );
  assert.equal( closeCode, 1008, 'bridge rejects clients without its session token' );

  client.disconnect();
  await waitFor( () => received.some( ( message ) => (
    message.address === '/awb/timeline/disconnect'
      && message.args[ 0 ] === 'score-browser-test'
  ) ) );
  await waitFor( () => received.some( ( message ) => (
    message.address === '/awb/synthdef/disconnect'
      && message.args[ 0 ] === 'score-browser-test'
  ) ) );

  console.log( 'hosted-transport: 34/34 pass' );
} finally {
  client.disconnect();
  await bridge.close();
  osc.close();
}
