#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createScoreDocument } from '@awb/score';
import { readLocalProjection, storeLocalProjection } from '../src/engine/localProjectionStore.js';

const values = new Map();
const storage = {
  getItem: ( key ) => values.get( key ) ?? null,
  setItem: ( key, value ) => values.set( key, value )
};
const document = createScoreDocument( {
  scoreID: 'stored/score', revision: 3,
  meta: { title: 'Stored', description: '', tags: [] }, entries: []
} );
const stored = storeLocalProjection( document, 'browser-pseq', '// pseq', storage );
assert.equal( stored.schema, 'awb.score.projection/1' );
assert.equal( stored.scoreID, 'stored/score' );
assert.equal( stored.revision, 3 );
assert.equal( stored.kind, 'browser-pseq' );
assert.equal( stored.text, '// pseq' );
assert.equal( readLocalProjection( document, 'browser-pseq', storage ).text, '// pseq' );
assert.equal( readLocalProjection( { ...document, revision: 4 }, 'browser-pseq', storage ), null,
  'a projection from an older canonical revision is not restored' );
assert.equal( readLocalProjection( document, 'desktop-score', storage ), null,
  'projection targets have independent app-data records' );
values.set( 'awb.score.projection.stored%2Fscore.browser-pseq', '{not json' );
assert.equal( readLocalProjection( document, 'browser-pseq', storage ), null,
  'corrupt app data is ignored' );

console.log( 'local-projection-store: 9/9 pass' );
