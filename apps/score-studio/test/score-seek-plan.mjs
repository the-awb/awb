import assert from 'node:assert/strict';
import { createScoreDocument, makeEvent } from '@awb/score';
import { buildSeekReconstructionPlan } from '../src/engine/scoreSeekPlan.js';

const document = createScoreDocument( { scoreID: 'seek-plan', revision: 4, entries: [
  makeEvent( 0, { type: 'note', def: 'fieldBasic', freqL: [ 100, 200 ], amp: 0.2,
    attackT: 0.1, releaseT: 2, dur: 10 }, { id: 'finite' } ),
  makeEvent( 2, { type: 'set', target: 'finite', amp: [ 0.3, 0.4 ] }, { id: 'set' } ),
  makeEvent( 3, { type: 'note', def: 'fieldBasic', freqL: 300, releaseT: 4, dur: 'inf' }, { id: 'open' } ),
  makeEvent( 5, { type: 'release', target: 'open' }, { id: 'release-open' } ),
  makeEvent( 6, { type: 'note', def: 'unknown', dur: 30 }, { id: 'unknown' } ),
  makeEvent( 6, { type: 'note', def: 'resonantBassEnv2', dur: 30 }, { id: 'known-without-lifecycle' } ),
  makeEvent( 9, { type: 'free', target: 'finite' }, { id: 'free-finite' } ),
  makeEvent( 12, { type: 'note', def: 'fieldBasic', dur: 1 }, { id: 'future' } )
] } );

const atFour = buildSeekReconstructionPlan( document, 4 );
assert.equal( atFour.target, 4 );
assert.deepEqual( atFour.futureEntryIDs, [
  'release-open', 'unknown', 'known-without-lifecycle', 'free-finite', 'future'
] );
assert.equal( atFour.reconstructions.length, 3, 'two finite voices and one open voice survive' );
assert.deepEqual( atFour.reconstructions.slice( 0, 2 ).map( ( item ) => item.event.amp ), [ 0.3, 0.4 ],
  'set controls are folded per wrapped SC voice' );
assert.deepEqual( atFour.reconstructions.slice( 0, 2 ).map( ( item ) => item.remainingGate ), [ 4, 4 ],
  'finite notes retain only the remaining gate (10 * default legato - 4)' );
assert.equal( atFour.reconstructions[ 2 ].event.dur, 'inf' );

const atSix = buildSeekReconstructionPlan( document, 7 );
const releaseTail = atSix.reconstructions.find( ( item ) => item.entryID === 'open' );
assert.equal( releaseTail.phase, 'release' );
assert.equal( releaseTail.remainingRelease, 2 );
assert.equal( releaseTail.event.releaseT, 2, 'release tail is shortened to its remaining lifetime' );
assert.ok( atSix.skipped.some( ( item ) => item.entryID === 'unknown' ) );
assert.ok( atSix.skipped.some( ( item ) => item.entryID === 'known-without-lifecycle' ),
  'a catalogued SynthDef is still skipped when it has no finite lifecycle contract' );

const atTen = buildSeekReconstructionPlan( document, 10 );
assert.equal( atTen.reconstructions.length, 0, 'freed and naturally completed notes stay dead' );

console.log( 'score-seek-plan: pass' );
