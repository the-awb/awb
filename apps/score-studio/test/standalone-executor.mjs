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
assert.equal( sent.filter( ( message ) => message.address === '/n_set' && message.args.includes( 'gate' ) ).length, 1,
  'unknown SynthDef duration does not manufacture a release boundary' );
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
executor.play();
advance( 0 );
advance( 100 );
executor.pause();
const beforePausedSeekFrees = sent.filter( ( message ) => message.address === '/n_free' ).length;
executor.seek( 0.5 );
assert.equal( executor.getState().status, 'stopped', 'seeking while paused prepares a fresh stopped run' );
assert.equal( executor.getState().liveCount, 0, 'seeking while paused frees suspended nodes' );
assert.equal( sent.filter( ( message ) => message.address === '/n_free' ).length, beforePausedSeekFrees + 2 );

executor.load( document );
executor.play();
advance( 0 );
advance( 100 );
executor.stop();
assert.equal( executor.getState().position, 0.1, 'first stop preserves the transport position' );

executor.load( document );
executor.seek( 0.25 );
assert.equal( executor.getState().status, 'stopped' );
const beforeSeekPlay = sent.length;
executor.play();
advance( 0 );
assert.equal( sent.slice( beforeSeekPlay ).some( ( message ) => message.address === '/s_new' ), false,
  'event-boundary seek does not reconstruct a note that began earlier' );

executor.load( createScoreDocument( {
  scoreID: 'synth-event-overlap', entries: [
    makeEvent( 0, { type: 'note', def: 'resonantBassEnv2', dur: 10, ampEnvRatio: 0.25 }, { id: 'rb1' } )
  ]
} ) );
const beforeResobass = sent.length;
executor.play();
advance( 0 );
const resobassArgs = sent.slice( beforeResobass ).find( ( message ) => message.address === '/s_new' ).args;
assert.equal( resobassArgs[ resobassArgs.indexOf( 'dur' ) + 1 ], 10,
  'event dur is forwarded when the known SynthDef also declares dur' );
assert.equal( resobassArgs.includes( 'sustain' ), false,
  'standalone execution does not manufacture sustain from modulation duration' );
executor.stop();

executor.load( createScoreDocument( {
  scoreID: 'open-synth', entries: [
    makeEvent( 0, { type: 'note', def: 'awbTestTone', freq: 110, amp: 0.01, dur: 'inf' }, { id: 'open-1' } ),
    makeEvent( 0.25, { type: 'set', target: 'open-1', freq: 165 }, { id: 'open-set' } )
  ]
} ) );
executor.play();
advance( 0 );
advance( 300 );
assert.equal( executor.getState().status, 'playing', 'infinite synth keeps transport live after finite score entries end' );
assert.equal( executor.getState().liveCount, 1, 'infinite synth remains live beyond the event horizon' );
const openNode = executor.getState().realizations.at( -1 );
assert.equal( executor.setRealization( openNode.nodeID, 'freq', 220, 1 ), true );
assert.deepEqual( sent.at( -1 ), { address: '/n_set', args: [ openNode.nodeID, 'freq', 220 ] } );
assert.equal( executor.getState().realizations.at( -1 ).params.freq, 220 );
assert.equal( executor.commandRealization( openNode.nodeID, 'pause' ), true );
assert.equal( executor.getState().realizations.at( -1 ).state, 'paused' );
assert.equal( executor.commandRealization( openNode.nodeID, 'resume' ), true );
assert.equal( executor.getState().realizations.at( -1 ).state, 'running' );
assert.equal( executor.commandRealization( openNode.nodeID, 'release' ), true );
assert.equal( executor.getState().realizations.at( -1 ).state, 'released' );
const beforeInfiniteStopFrees = sent.filter( ( message ) => message.address === '/n_free' ).length;
executor.stop();
assert.equal( sent.filter( ( message ) => message.address === '/n_free' ).length,
  beforeInfiniteStopFrees + 1, 'transport stop frees an open-ended synth' );
assert.equal( executor.getState().realizations.at( -1 ).state, 'ended' );

assert.throws( () => executor.load( createScoreDocument( {
  scoreID: 'missing-duration', entries: [
    makeEvent( 0, { type: 'note', def: 'awbTestTone' }, { id: 'missing-dur' } )
  ]
} ) ), /finite (?:dur|number) or "inf"/ );

assert.throws( () => executor.load( createScoreDocument( {
  scoreID: 'unsupported', entries: [ makeEvent( 0, { type: 'visual' } ) ]
} ) ), /unhandled|unsupported/i );
executor.dispose();
assert.equal( oscListeners.size, 0 );

console.log( 'standalone-executor: pass' );
