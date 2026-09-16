import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FileGrantStore } from '../src/fileGrants.mjs';
import { atomicWriteText, guardedWriteText } from '../src/nativeFiles.mjs';

test( 'file grants are opaque and scoped to one view', async () => {
  const root = await mkdtemp( path.join( os.tmpdir(), 'awb-grants-' ) );
  try {
    const target = path.join( root, 'example.score.json' ); await writeFile( target, '{}', 'utf8' );
    const grants = new FileGrantStore(); const record = await grants.fileRecord( 'view-a', target );
    assert.equal( record.handle.path, undefined ); assert.equal( record.text, '{}' );
    assert.throws( () => grants.resolve( 'view-b', record.handle, 'file' ), /another view/ );
  } finally { await rm( root, { recursive: true, force: true } ); }
} );

test( 'guarded writes reject external changes', async () => {
  const root = await mkdtemp( path.join( os.tmpdir(), 'awb-writes-' ) );
  try {
    const target = path.join( root, 'projection.scd' ); await atomicWriteText( target, '// first' );
    await guardedWriteText( target, '// second', { expectedText: '// first' } );
    await assert.rejects( guardedWriteText( target, '// third', { expectedText: '// stale' } ), /changed on disk/ );
    assert.equal( await readFile( target, 'utf8' ), '// second' );
  } finally { await rm( root, { recursive: true, force: true } ); }
} );
