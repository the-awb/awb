#!/usr/bin/env node
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import { readFile } from 'node:fs/promises';
import { WebSocket } from 'ws';
import { parseScoreDocument } from '@awb/score';
import { createHostedBridge } from '../server/hosted-bridge.mjs';
import { decodeOscMessage, encodeOscMessage } from '../server/osc-codec.mjs';
import { HostedScoreClient } from '../src/engine/HostedScoreClient.js';

const fixture = parseScoreDocument( await readFile(
  new URL( '../../../packages/score/fixtures/connector-v1/score.json', import.meta.url ), 'utf8'
) );
const osc = dgram.createSocket( 'udp4' );
await new Promise( ( resolve ) => osc.bind( 0, '127.0.0.1', resolve ) );
const oscPort = osc.address().port;
const received = [];
let endCount = 0;
let droppedStateID = null;

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
  }
} );

const bridge = await createHostedBridge( { port: 0, oscPort } );
const client = new HostedScoreClient( { clientID: 'score-browser-test', WebSocketImpl: WebSocket, requestTimeoutMs: 80 } );
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

  await client.loadDocument( fixture );
  assert.equal( endCount, 2, 'missing chunks restart the complete snapshot' );
  assert.equal( client.getState().remoteRevision, fixture.revision );
  assert.ok( received.some( ( message ) => message.address === '/awb/timeline/snapshot/chunk' ) );

  await client.command( fixture, 'play' );
  await waitFor( () => client.getState().realizations.length === 1 );
  assert.equal( client.getState().transport.runID, 'run-1' );
  assert.deepEqual( client.getState().realizations[ 0 ].nodeIDs, [ 1001, 1002 ] );

  await client.command( fixture, 'state' );
  const stateMessages = received.filter( ( message ) => message.address === '/awb/timeline/command' && message.args[ 4 ] === 'state' );
  assert.equal( stateMessages.length, 2, 'a timed-out request is retried' );
  assert.equal( stateMessages[ 0 ].args[ 1 ], stateMessages[ 1 ].args[ 1 ], 'retry retains its idempotency key' );

  await waitFor( () => client.getState().clockOffset !== null );
  assert.ok( client.estimateScorePosition() >= 0 );

  const untrusted = new WebSocket( bridge.endpoint.replace( /token=[^&]+/, 'token=wrong' ) );
  const closeCode = await new Promise( ( resolve ) => untrusted.addEventListener( 'close', ( event ) => resolve( event.code ) ) );
  assert.equal( closeCode, 1008, 'bridge rejects clients without its session token' );

  console.log( 'hosted-transport: 13/13 pass' );
} finally {
  client.disconnect();
  await bridge.close();
  osc.close();
}
