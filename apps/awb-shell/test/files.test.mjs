import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { FileGrantStore } from '../src/fileGrants.mjs';
import { atomicWriteText, guardedWriteText } from '../src/nativeFiles.mjs';
import { RenderOutputStore } from '../src/renderOutputStore.mjs';

class FakePort extends EventEmitter {
  replies = [];
  postMessage( value ) { this.replies.push( value ); }
  start() {}
  request( value ) {
    this.emit( 'message', { data: value } );
    return new Promise( ( resolve ) => {
      const check = () => {
        const reply = this.replies.find( ( item ) => item.requestID === value.requestID );
        if ( reply ) resolve( reply ); else setImmediate( check );
      };
      check();
    } );
  }
}

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

test( 'render output bytes stay on a dedicated port and commit atomically', async () => {
  const root = await mkdtemp( path.join( os.tmpdir(), 'awb-render-output-' ) );
  try {
    const target = path.join( root, 'field.mp4' );
    const outputs = new RenderOutputStore();
    const descriptor = outputs.register( 'render-1', target );
    assert.equal( descriptor.locator, 'awb-render://render-1/field.mp4' );
    assert.equal( descriptor.path, undefined );
    const port = new FakePort();
    await outputs.open( 'render-1', 'lease-1', port );
    assert.deepEqual( await port.request( { type: 'chunk', requestID: 1, position: 2,
      data: new Uint8Array( [ 0, 1, 2, 3 ] ).buffer } ), { requestID: 1, ok: true, error: null } );
    assert.equal( await readFile( target ).catch( () => null ), null );
    assert.deepEqual( await port.request( { type: 'close', requestID: 2 } ),
      { requestID: 2, ok: true, error: null } );
    assert.deepEqual( [ ...await readFile( target ) ], [ 0, 0, 0, 1, 2, 3 ] );
  } finally { await rm( root, { recursive: true, force: true } ); }
} );
