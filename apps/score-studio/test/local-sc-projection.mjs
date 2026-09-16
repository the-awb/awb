#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createScoreDocument } from '@awb/score';
import { generateLocalScProjection, SC_PROJECTION_KINDS } from '../src/engine/localScProjection.js';

const document = createScoreDocument( {
  scoreID: 'local-score',
  revision: 4,
  meta: { title: 'Local projection', description: '', tags: [] },
  entries: [
    { id: 'later', time: 2, path: [ 'part-one' ], event: { type: 'set', target: '@all', controls: { amp: 0.2 } } },
    { id: 'note-1', time: 0, path: [ 'part-one' ], event: { type: 'note', def: 'substrate', freqA: [ 36, 54 ], enabled: true } }
  ]
} );
const text = generateLocalScProjection( document );

assert.match( text, /^\/\/ AWB GENERATED SCORE PROJECTION/m );
assert.match( text, /\/\/ Score ID: local-score/ );
assert.match( text, /PScoreTimelinePlayer\(\[/ );
assert.match( text, /'instrument': 'substrate'/ );
assert.doesNotMatch( text, /'def':/ );
assert.match( text, /'type': 'note'/ );
assert.match( text, /'path': \[ 'part-one' \]/ );
assert.match( text, /'freqA': \[ 36, 54 \]/ );
assert.match( text, /'controls': \( 'amp': 0\.2 \)/ );
assert.ok( text.indexOf( 'note-1' ) < text.indexOf( 'later' ), 'entries are stably sorted by absolute time' );
assert.equal( generateLocalScProjection( document ), text, 'projection is deterministic' );
assert.throws( () => generateLocalScProjection( { ...document, entries: [ {
  id: 'bad', time: 0, path: [], event: { type: 'note', freq: Number.NaN }
} ] } ), /non-finite number/ );

const pseqDocument = createScoreDocument( {
  scoreID: 'browser-pattern',
  revision: 7,
  meta: { title: 'Browser pattern', description: '', tags: [] },
  entries: [
    { id: 'first', time: 2, path: [], event: { type: 'note', def: 'substrate', freqA: 36, dur: 10, legato: 0.5 } },
    { id: 'release-all', time: 4, path: [], event: { type: 'release', target: '@all' } },
    { id: 'second', time: 7, path: [], event: { type: 'note', def: 'substrate2', freq: 40, sustain: 3 } }
  ]
} );
const pseq = generateLocalScProjection( pseqDocument, { kind: SC_PROJECTION_KINDS.BROWSER_PSEQ } );
assert.match( pseq, /^\/\/ AWB GENERATED BROWSER PSEQ REDUCTION/m );
assert.match( pseq, /~scorePattern = Pseq\(\[/ );
assert.match( pseq, /'instrument': 'substrate', 'delta': 5, 'sustain': 5/ );
assert.match( pseq, /'instrument': 'substrate2', 'delta': 0, 'sustain': 3/ );
assert.match( pseq, /Omitted non-note entries: release-all:release/ );
assert.doesNotMatch( pseq, /'target': '@all'/ );
assert.match( pseq, /~scorePlayer = ~scorePattern\.play/ );
assert.throws( () => generateLocalScProjection( document, { kind: 'unknown' } ), /Unknown SC projection kind/ );

console.log( 'local-sc-projection: 19/19 pass' );
