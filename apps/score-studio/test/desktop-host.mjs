#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDesktopHost } from '../src/host/desktopHost.js';

const text = await readFile(
  new URL( '../public/examples/sonic-attunement-01.score.json', import.meta.url ), 'utf8'
);
const calls = [];
const record = { path: '/scores/source.score.json', name: 'source.score.json', text };
const bridge = {
  launchContext: () => ( {
    endpoint: 'ws://127.0.0.1:9000/token', toolSessionID: 'tool-1',
    scorePath: record.path, ownerPID: 123
  } ),
  initialScore: async () => record,
  openScore: async () => record,
  loadBundledScore: async ( url, name ) => ( { ...record, path: url, name } ),
  openScoreDirectory: async () => ( {
    handle: { kind: 'desktop-directory', name: 'scores', path: '/scores' }, name: 'scores', files: []
  } ),
  refreshScoreDirectory: async ( directory ) => directory,
  openDirectoryScore: async () => record,
  saveCanonical: async ( request ) => {
    calls.push( [ 'canonical', request ] );
    return { path: '/scores/saved.score.json', name: 'saved.score.json' };
  },
  saveProjection: async ( request ) => {
    calls.push( [ 'projection', request ] );
    return { path: '/scores/saved.score.scd', name: 'saved.score.scd' };
  },
  reportSessionState: ( state ) => calls.push( [ 'state', state ] ),
  shellState: async () => ( { processID: 456, windowID: 1 } ),
  focusWindow: () => true,
  closeWindow: () => true
};
const stored = new Map();
const host = createDesktopHost( {
  bridge, storage: { setItem: ( key, value ) => stored.set( key, value ) }, confirm: () => true
} );

assert.equal( host.kind, 'desktop' );
assert.equal( host.capabilities.nativeWindowFocus, true );
assert.equal( host.capabilities.downloadFallback, false );
assert.equal( host.hostedLaunchContext().toolSessionID, 'tool-1' );
const opened = await host.initialScore();
assert.equal( opened.document.scoreID, 'sonic-attunement-01' );
assert.equal( opened.handle.path, record.path );
assert.equal( ( await host.openScore() ).name, record.name );
assert.equal( ( await host.loadBundledScore( '/examples/demo.score.json', 'demo.score.json' ) ).name,
  'demo.score.json' );
assert.equal( ( await host.loadBundledScore( '/examples/demo.score.json', 'demo.score.json' ) ).handle,
  null );
assert.equal( ( await host.openScoreDirectory() ).name, 'scores' );
assert.equal( ( await host.openDirectoryScore( { handle: opened.handle } ) ).document.scoreID,
  'sonic-attunement-01' );

const saved = await host.saveCanonical( opened.document, {
  handle: opened.handle, expectedHash: opened.hash
} );
assert.equal( saved.handle.path, '/scores/saved.score.json' );
assert.equal( calls[ 0 ][ 1 ].expectedHash, opened.hash );
assert.match( calls[ 0 ][ 1 ].text, /"schema": "awb.score\/1"/ );
const projection = await host.saveProjection( '// projection', {
  scoreID: opened.document.scoreID, expectedText: '// old'
} );
assert.equal( projection.handle.name, 'saved.score.scd' );
assert.equal( calls[ 1 ][ 1 ].expectedText, '// old' );
assert.equal( host.storeRecovery( opened.document ), true );
assert.equal( stored.has( 'awb.score.draft.sonic-attunement-01' ), true );
host.reportSessionState( { scoreID: opened.document.scoreID } );
assert.equal( calls[ 2 ][ 0 ], 'state' );
assert.equal( ( await host.shellState() ).processID, 456 );
assert.equal( host.focusWindow(), true );
assert.equal( host.closeWindow(), true );

console.log( 'desktop-host: pass' );
