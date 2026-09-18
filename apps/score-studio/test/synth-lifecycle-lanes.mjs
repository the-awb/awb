import assert from 'node:assert/strict';
import { makeEvent } from '@awb/score';
import {
  lifecycleInheritedValuesForEntry, projectSynthLifecycleLanes
} from '../src/engine/synthLifecycleLanes.js';

const lanes = projectSynthLifecycleLanes( [
  makeEvent( 0, { type: 'note', def: 'a', freq: 100, dur: 10 }, { id: 'n1', path: [ 'opening' ] } ),
  makeEvent( 0.5, { type: 'set', target: '@prev', amp: 0.2 }, { id: 's1' } ),
  makeEvent( 1, { type: 'note', def: 'b', freq: [ 200, 300, 400 ], dur: 'inf' }, { id: 'n2', path: [ 'answer' ] } ),
  makeEvent( 2, { type: 'release', target: '@all' }, { id: 'r1' } ),
  makeEvent( 3, { type: 'free', target: 'n1' }, { id: 'f1' } ),
  makeEvent( 4, { type: 'set', target: '@all', amp: 0.1 }, { id: 's2' } ),
  makeEvent( 5, { type: 'set', target: 'missing', amp: 0 }, { id: 's3' } ),
  makeEvent( 6, { type: 'visual', opacity: 0.5 }, { id: 'v1' } )
] );

assert.equal( lanes.length, 3, 'two create lanes plus one unresolved lane' );
assert.equal( lanes[ 0 ].id, 'n1' );
assert.equal( lanes[ 0 ].definition, 'a' );
assert.equal( lanes[ 0 ].expansionCount, 1 );
assert.deepEqual( lanes[ 0 ].events.map( ( event ) => event.role ), [ 'create', 'set', 'release', 'free' ] );
assert.equal( lanes[ 0 ].startTime, 0 );
assert.equal( lanes[ 0 ].endTime, 3, 'unknown release tail is not guessed; explicit free is definitive' );
assert.equal( lanes[ 0 ].durationTime, 10, 'authored event duration remains visible without claiming lifecycle' );
assert.equal( lanes[ 0 ].freeTime, 3 );
assert.equal( lanes[ 1 ].id, 'n2' );
assert.equal( lanes[ 1 ].expansionCount, 3, 'runtime expansion stays a badge on one authored lane' );
assert.deepEqual( lanes[ 1 ].events.map( ( event ) => event.entry.id ), [ 'n2', 'r1', 's2' ] );
assert.equal( lanes[ 1 ].openEnded, false, 'an explicit release closes an infinite synth lane' );
assert.equal( lanes[ 2 ].id, '__unassigned__' );
assert.deepEqual( lanes[ 2 ].events.map( ( event ) => event.entry.id ), [ 's3', 'v1' ] );

const envelopeLane = projectSynthLifecycleLanes( [
  makeEvent( 10, { type: 'note', def: 'substrate', dur: 20, attackT: 3, releaseT: 5 }, { id: 'env' } ),
  makeEvent( 20, { type: 'set', target: 'env', releaseT: 7 }, { id: 'env-set' } )
] )[ 0 ];
assert.equal( envelopeLane.gateReleaseTime, 25, 'known total duration places gate release before the tail' );
assert.equal( envelopeLane.gateMarker.role, 'auto-release' );
assert.equal( envelopeLane.gateMarker.synthetic, true );
assert.equal( envelopeLane.durationTime, 30, 'duration handle marks authored total duration' );
assert.equal( envelopeLane.endTime, 32, 'a later set changes the actual release tail without rewriting dur' );
assert.equal( envelopeLane.envelopes.length, 3, 'substrate exposes amplitude, beat and tremolo envelopes' );
assert.deepEqual( envelopeLane.envelopes.map( ( envelope ) => envelope.id ), [ 'amplitude', 'beat', 'tremolo' ] );
assert.equal( envelopeLane.envelope.completionAction, 'freeNode' );
assert.equal( envelopeLane.envelope.releaseControl, 'releaseT' );

const coupledLane = projectSynthLifecycleLanes( [
  makeEvent( 0, { type: 'note', def: 'resonantBassEnv2', dur: 20, ampEnvRatio: 0.25 }, { id: 'coupled' } )
] )[ 0 ];
assert.equal( coupledLane.gateReleaseTime, null, 'modulation dur does not invent amplitude gate timing' );
assert.equal( coupledLane.endTime, null, 'resonant bass node completion remains unresolved' );
assert.equal( coupledLane.durationTime, 20, 'its authored event/modulation duration is still visible' );
assert.deepEqual( coupledLane.envelopes.map( ( envelope ) => envelope.id ), [
  'amplitude', 'frequency-motion', 'phase-modulation'
] );
assert.equal( coupledLane.envelope.derived, true );

const openLane = projectSynthLifecycleLanes( [
  makeEvent( 3, { type: 'note', def: 'substrate', dur: 'inf' }, { id: 'open' } ),
  makeEvent( 12, { type: 'set', target: 'open', amp: 0.4 }, { id: 'open-set' } )
] )[ 0 ];
assert.equal( openLane.openEnded, true, 'dur inf remains open without release or free' );
assert.equal( openLane.durationTime, null, 'infinite duration never becomes a finite drag handle' );
assert.equal( openLane.events.at( -1 ).time, 12, 'open lane retains finite child-event extent' );

const inheritedScore = [
  makeEvent( 0, { type: 'note', def: 'substrate', freqA: 36, amp: 0.2, dur: 'inf' }, { id: 'parent' } ),
  makeEvent( 1, { type: 'set', target: 'parent', amp: 0.3 }, { id: 'earlier-set' } ),
  makeEvent( 2, { type: 'set', target: 'parent', freqA: 48 }, { id: 'edited-set' } )
];
assert.deepEqual( lifecycleInheritedValuesForEntry( inheritedScore, 'edited-set' ), {
  freqA: 36, amp: 0.3, dur: 'inf'
}, 'set editor inheritance reflects the parent after earlier child sets but before its own payload' );
assert.equal( lifecycleInheritedValuesForEntry( inheritedScore, 'earlier-set' ).amp, 0.2,
  'a set does not inherit its own authored override' );

console.log( 'synth-lifecycle-lanes: pass' );
