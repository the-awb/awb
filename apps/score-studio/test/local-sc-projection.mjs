#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createScoreDocument } from '@awb/score';
import { generateLocalScProjection } from '../src/engine/localScProjection.js';

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

console.log( 'local-sc-projection: 11/11 pass' );
