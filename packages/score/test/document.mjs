import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  SCORE_SCHEMA,
  createScoreDocument,
  hashScoreDocument,
  parseScoreDocument,
  reviseScoreDocument,
  serializeScoreDocument,
  validateScoreDocument,
} from '../src/index.js';

const fixtureUrl = new URL( '../fixtures/connector-v1/score.json', import.meta.url );
const manifestUrl = new URL( '../fixtures/connector-v1/manifest.json', import.meta.url );
const source = await readFile( fixtureUrl, 'utf8' );
const manifest = JSON.parse( await readFile( manifestUrl, 'utf8' ) );
const document = parseScoreDocument( source );

assert.equal( document.schema, SCORE_SCHEMA );
assert.equal( document.scoreID, 'connector-fixture-v1' );
assert.equal( document.entries.length, 3 );
assert.equal( serializeScoreDocument( document ), source, 'fixture uses canonical bytes' );

const hash = await hashScoreDocument( document );
assert.match( hash, /^[a-f0-9]{64}$/ );
assert.equal( hash, manifest.canonicalScoreSha256, 'fixture hash is pinned for both runtimes' );
assert.equal( await hashScoreDocument( parseScoreDocument( source ) ), hash );
assert.equal( Object.isFrozen( document ), true );
assert.equal( Object.isFrozen( document.entries[0].event ), true );

const revised = reviseScoreDocument( document, document.entries.map( ( entry ) => (
  entry.id === 'n2' ? { ...entry, time: 5 } : entry
) ) );
assert.equal( revised.revision, 1 );
assert.equal( document.revision, 0, 'revision is immutable' );
assert.equal( revised.entries[1].time, 5 );

const sameTime = createScoreDocument( {
  scoreID: 'same-time',
  entries: [
    { id: 'b', time: 0, path: [], event: { type: 'note' } },
    { id: 'a', time: 0, path: [], event: { type: 'note' } },
  ]
} );
assert.deepEqual( sameTime.entries.map( ( entry ) => entry.id ), [ 'b', 'a' ] );

const invalid = validateScoreDocument( {
  schema: SCORE_SCHEMA,
  scoreID: 'bad',
  revision: 0,
  meta: {},
  entries: [
    { id: 'x', time: 0, path: [], event: { type: 'note' } },
    { id: 'x', time: -1, path: [ 1 ], event: { value: undefined } },
  ]
} );
assert.equal( invalid.ok, false );
assert.ok( invalid.errors.some( ( error ) => error.includes( 'duplicates x' ) ) );
assert.ok( invalid.errors.some( ( error ) => error.includes( 'non-negative finite' ) ) );
assert.ok( invalid.errors.some( ( error ) => error.includes( 'array of strings' ) ) );
assert.ok( invalid.errors.some( ( error ) => error.includes( 'undefined' ) ) );

console.log( `score-document: 19/19 pass (${ hash })` );
