import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { documentKindIDForPath, RecentStore } from '../src/recentStore.mjs';

test( 'document kinds are inferred from declared compound suffixes', () => {
  const kinds = [ { id: 'score', extensions: [ 'score.json' ] }, { id: 'json', extensions: [ 'json' ] } ];
  assert.equal( documentKindIDForPath( kinds, '/scores/Named Piece.score.json' ), 'score' );
  assert.equal( documentKindIDForPath( kinds, '/scores/Named Piece.txt' ), null );
} );

test( 'recent descriptors are bounded, redacted and scoped to tool document kinds', async () => {
  const root = await mkdtemp( path.join( os.tmpdir(), 'awb-recents-' ) );
  try {
    const filePath = path.join( root, 'recent.json' ); const target = path.join( root, 'piece.score.json' );
    const store = new RecentStore( { filePath, limit: 2 } ); await store.load();
    const added = await store.add( { toolID: 'score-studio', documentKindID: 'score', target } );
    const publicItem = store.list( 'score-studio', 'score' )[ 0 ];
    assert.equal( publicItem.name, 'piece.score.json' ); assert.equal( publicItem.path, undefined );
    assert.equal( store.resolve( added.recentID, 'score-studio', 'score' ), target );
    assert.throws( () => store.resolve( added.recentID, 'lissajous', 'score' ), /another tool/ );
    const reloaded = new RecentStore( { filePath } ); await reloaded.load();
    assert.equal( reloaded.list( 'score-studio', 'score' )[ 0 ].recentID, added.recentID );
  } finally { await rm( root, { recursive: true, force: true } ); }
} );
