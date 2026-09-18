#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createScoreDocument } from '@awb/score';
import { PairSaveError, retryScoreProjection, saveScorePair } from '../src/engine/scorePairSave.js';

const document = createScoreDocument( {
  scoreID: 'pair-save-test', revision: 3,
  entries: [ { id: 'entry-a', time: 0, path: [], event: { type: 'note', def: 'default', dur: 1 } } ]
} );
const order = [];
let savedIdentity;
const canonicalHandle = { grantID: 'canonical-score' };
const complete = await saveScorePair( {
  document,
  saveCanonical: async ( value, identity ) => { order.push( 'canonical' ); return { hash: identity.contentHash, value, handle: canonicalHandle }; },
  requestProjection: async ( identity ) => { order.push( 'request' ); savedIdentity = identity; return { ...identity, text: '// generated\n' }; },
  saveProjection: async ( text, identity ) => {
    order.push( 'projection' );
    assert.equal( identity.canonicalHandle, canonicalHandle );
    return { text };
  }
} );
assert.equal( complete.status, 'complete' );
assert.deepEqual( order, [ 'canonical', 'request', 'projection' ] );
assert.equal( complete.identity.revision, 3 );
assert.equal( complete.projection.text, '// generated\n' );

let projectionRequested = false;
await assert.rejects( () => saveScorePair( {
  document,
  saveCanonical: async () => { throw new Error( 'disk changed' ); },
  requestProjection: async () => { projectionRequested = true; },
  saveProjection: async () => {}
} ), ( error ) => error instanceof PairSaveError && error.stage === 'canonical' );
assert.equal( projectionRequested, false, 'projection is never requested before canonical success' );

const partial = await saveScorePair( {
  document,
  saveCanonical: async ( value, identity ) => ( { hash: identity.contentHash } ),
  requestProjection: async () => { throw new Error( 'desktop unavailable' ); },
  saveProjection: async () => { throw new Error( 'must not run' ); }
} );
assert.equal( partial.status, 'partial' );
assert.equal( partial.canonicalSaved, true );
assert.equal( partial.projectionSaved, false );
assert.match( partial.projectionError, /desktop unavailable/ );

const mismatch = await saveScorePair( {
  document,
  saveCanonical: async ( value, identity ) => ( { hash: identity.contentHash } ),
  requestProjection: async ( identity ) => ( { ...identity, revision: 2, text: '// wrong\n' } ),
  saveProjection: async () => { throw new Error( 'must not run' ); }
} );
assert.equal( mismatch.status, 'partial' );
assert.match( mismatch.projectionError, /different revision/ );

const retried = await retryScoreProjection( {
  document, identity: complete.identity,
  requestProjection: async ( identity ) => ( { ...identity, text: '// recovered\n' } ),
  saveProjection: async ( text ) => ( { text } )
} );
assert.equal( retried.status, 'complete' );
assert.equal( retried.projectionResult.text, '// recovered\n' );

const changed = createScoreDocument( { ...document, revision: 4 } );
await assert.rejects( () => retryScoreProjection( {
  document: changed, identity: savedIdentity,
  requestProjection: async () => {}, saveProjection: async () => {}
} ), ( error ) => error instanceof PairSaveError && error.stage === 'recovery' );

console.log( 'pair-save: 15/15 pass' );
