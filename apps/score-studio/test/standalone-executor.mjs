import assert from 'node:assert/strict';
import { createScoreDocument, makeEvent } from '@awb/score';
import { createStandaloneScoreExecutor } from '../src/engine/StandaloneScoreExecutor.js';

let nowMs = 0;
let nextTimer = 1;
const timers = new Map();
const sent = [];
const oscListeners = new Set();
const setTimer = ( callback, delay ) => {
  const id = nextTimer++;
  timers.set( id, { at: nowMs + delay, callback } );
  return id;
};
const clearTimer = ( id ) => timers.delete( id );
const advance = ( milliseconds ) => {
  const target = nowMs + milliseconds;
  while ( true ) {
    const due = [ ...timers.entries() ]
      .filter( ( [ , timer ] ) => timer.at <= target )
      .sort( ( left, right ) => left[ 1 ].at - right[ 1 ].at )[ 0 ];
    if ( !due ) break;
    timers.delete( due[ 0 ] );
    nowMs = due[ 1 ].at;
    due[ 1 ].callback();
  }
  nowMs = target;
};

const executor = createStandaloneScoreExecutor( {
  sendOsc: ( address, args ) => { sent.push( { address, args } ); return true; },
  subscribeOscReply: ( listener ) => { oscListeners.add( listener ); return () => oscListeners.delete( listener ); },
  parseOsc: ( message ) => message,
  now: () => nowMs,
  setTimer,
  clearTimer,
  nodeIDStart: 9000
} );
const document = createScoreDocument( {
  scoreID: 'standalone-test',
  entries: [
    makeEvent( 0, { type: 'note', def: 'awbTestTone', freq: [ 220, 330 ], amp: 0.1, dur: 1 }, { id: 'n1' } ),
    makeEvent( 0.25, { type: 'set', target: 'n1', amp: 0.05 }, { id: 's1' } ),
    makeEvent( 0.5, { type: 'release', target: '@prev' }, { id: 'r1' } ),
    makeEvent( 1, { type: 'free', target: '@all' }, { id: 'f1' } )
  ]
} );

executor.load( document );
assert.equal( executor.getState().status, 'ready' );
executor.play();
advance( 0 );
assert.equal( sent.filter( ( message ) => message.address === '/s_new' ).length, 2, 'array controls expand to two realizations' );
assert.deepEqual( sent[ 0 ].args.slice( 0, 4 ), [ 'awbTestTone', 9000, 1, 0 ] );
assert.equal( executor.getState().liveCount, 2 );
assert.match( executor.getState().runID, /^browser-run-/ );

advance( 250 );
assert.equal( sent.filter( ( message ) => message.address === '/n_set' && message.args.includes( 'amp' ) ).length, 2 );
executor.pause();
assert.equal( executor.getState().status, 'paused' );
assert.equal( sent.filter( ( message ) => message.address === '/n_run' && message.args[ 1 ] === 0 ).length, 2 );
advance( 500 );
executor.play();
assert.equal( sent.filter( ( message ) => message.address === '/n_run' && message.args[ 1 ] === 1 ).length, 2 );

advance( 250 );
assert.equal( sent.filter( ( message ) => message.address === '/n_set' && message.args.includes( 'gate' ) ).length, 1, '@prev releases only the latest realization' );
advance( 300 );
assert.equal( sent.filter( ( message ) => message.address === '/n_set' && message.args.includes( 'gate' ) ).length, 2, 'dur times default legato and releases the remaining realization' );
advance( 200 );
assert.equal( sent.filter( ( message ) => message.address === '/n_free' ).length, 2 );
assert.equal( executor.getState().status, 'ended' );
assert.equal( executor.getState().liveCount, 0 );
const beforeReplay = sent.filter( ( message ) => message.address === '/s_new' ).length;
executor.play();
advance( 0 );
assert.equal( sent.filter( ( message ) => message.address === '/s_new' ).length, beforeReplay + 2,
  'play after the end restarts from zero' );
executor.stop();

executor.load( document );
executor.seek( 0.25 );
assert.equal( executor.getState().status, 'stopped' );
const beforeSeekPlay = sent.length;
executor.play();
advance( 0 );
assert.equal( sent.slice( beforeSeekPlay ).some( ( message ) => message.address === '/s_new' ), false,
  'event-boundary seek does not reconstruct a note that began earlier' );

assert.throws( () => executor.load( createScoreDocument( {
  scoreID: 'unsupported', entries: [ makeEvent( 0, { type: 'visual' } ) ]
} ) ), /unhandled|unsupported/i );
executor.dispose();
assert.equal( oscListeners.size, 0 );

console.log( 'standalone-executor: 19/19 pass' );
