#!/usr/bin/env node
import assert from 'node:assert/strict';
import { scoreInstruments } from '../src/engine/scoreInstruments.js';

const document = {
  entries: [
    { id: 'a', time: 0, path: [ 'opening', 'bass' ], event: { type: 'note', def: 'substrate', freqA: 40, dur: 8 } },
    { id: 'b', time: 4, path: [ 'opening', 'bass' ], event: { type: 'note', instrument: 'substrate', freqA: 42, amp: 0.5 } },
    { id: 'c', time: 6, path: [ 'answer' ], event: { type: 'note', def: 'unknownDef', freq: 220 } },
    { id: 'd', time: 7, path: [], event: { type: 'set', target: 'a', amp: 0.2 } }
  ]
};

const instruments = scoreInstruments( document );
assert.equal( instruments.length, 2 );
assert.deepEqual( instruments[ 0 ], {
  definition: 'substrate',
  references: [ 'substrate' ],
  entryIDs: [ 'a', 'b' ],
  paths: [ 'opening/bass' ],
  authoredControls: [ 'amp', 'dur', 'freqA' ],
  knownControls: [ 'freqA', 'beat', 'freqQ', 'movement', 'tremF', 'difF', 'amp', 'attackT', 'releaseT' ],
  envelopes: [
    { id: 'amplitude', label: 'Amplitude', role: 'amplitude', target: 'outputGain', completionAction: 'freeNode' },
    { id: 'beat', label: 'Beat modulation', role: 'modulation', target: 'beatFrequency', completionAction: null },
    { id: 'tremolo', label: 'Tremolo depth', role: 'modulation', target: 'tremoloDepth', completionAction: null }
  ],
  firstTime: 0,
  lastTime: 4,
  noteCount: 2,
  entryCount: 2,
  catalogKey: 'substrate',
  label: 'Substrate',
  note: ''
} );
assert.equal( instruments[ 1 ].definition, 'unknownDef' );
assert.equal( instruments[ 1 ].catalogKey, null );
assert.deepEqual( instruments[ 1 ].authoredControls, [ 'freq' ] );
assert.ok( Object.isFrozen( instruments ) && Object.isFrozen( instruments[ 0 ].paths ) );

console.log( 'score-instruments: 12/12 pass' );
