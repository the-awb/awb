#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertScoreStudioHost } from '../src/host/hostContract.js';
import { createBrowserHost } from '../src/host/browserHost.js';
import { createNodeRegistry } from '@awb/sc-runtime';

const scoreText = await readFile(
  new URL( '../public/examples/sonic-attunement-01.score.json', import.meta.url ), 'utf8'
);
const downloads = [];
const revoked = [];
const stored = new Map();
const browserDocument = {
  createElement() {
    return {
      href: '', name: '',
      click() { downloads.push( this.download ); }
    };
  }
};
const browser = { confirm: ( message ) => message === 'discard?' };
const sharedRegistry = createNodeRegistry();
const host = createBrowserHost( {
  browser,
  browserDocument,
  storage: { setItem: ( key, value ) => stored.set( key, value ) },
  fetchImpl: async () => ( { ok: true, text: async () => scoreText } ),
  urlAPI: {
    createObjectURL: () => `blob:test-${ downloads.length }`,
    revokeObjectURL: ( url ) => revoked.push( url )
  },
  nodeRegistry: sharedRegistry,
  launch: {
    endpoint: 'ws://127.0.0.1:1234/token',
    initialScoreURL: '/__awb/hosted-score',
    initialScoreName: 'launched.score.json',
    toolInstanceID: 'instance-1'
  }
} );

assert.equal( assertScoreStudioHost( host ), host );
assert.equal( host.kind, 'browser' );
assert.equal( host.engineNodeRegistry(), sharedRegistry,
  'the browser host exposes the injected engine lifecycle authority by identity' );
assert.deepEqual( host.capabilities, {
  filePicker: false,
  fileInputFallback: true,
  directoryPicker: false,
  canonicalSave: true,
  projectionSave: true,
  retainedFileHandles: false,
  downloadFallback: true,
  recoveryStorage: true,
  hostedLaunch: true,
  documentIngress: { new: true, open: true, demo: true, browse: true },
  executionModes: [ 'hosted', 'standalone' ],
  nativeWindowFocus: false,
  nativeWindowClose: false
} );
assert.deepEqual( host.hostedLaunchContext(), {
  endpoint: 'ws://127.0.0.1:1234/token',
  initialScoreURL: '/__awb/hosted-score',
  initialScoreName: 'launched.score.json',
  toolInstanceID: 'instance-1'
} );

const initial = await host.initialScore();
assert.equal( initial.name, 'launched.score.json' );
assert.equal( initial.document.scoreID, 'sonic-attunement-01' );
assert.equal( await host.openScore(), null );
assert.equal( await host.openScoreDirectory(), null );
assert.equal( host.confirmDiscard( 'discard?' ), true );
assert.equal( host.focusWindow(), false );
assert.equal( host.closeWindow(), false );
assert.equal( host.shellState().kind, 'browser' );

assert.equal( host.storeRecovery( initial.document ), true );
assert.match( stored.get( 'awb.score.draft.sonic-attunement-01' ), /"schema": "awb.score\/1"/ );
const canonical = await host.saveCanonical( initial.document );
const projection = await host.saveProjection( '// generated', { scoreID: initial.document.scoreID } );
assert.equal( canonical.downloaded, true );
assert.equal( projection.downloaded, true );
assert.deepEqual( downloads, [ 'sonic-attunement-01.score.json', 'sonic-attunement-01.score.scd' ] );

await new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
assert.equal( revoked.length, 2 );
assert.throws( () => assertScoreStudioHost( { kind: 'broken', capabilities: {} } ), /initialScore/ );
assert.throws( () => createBrowserHost( { browser, browserDocument, nodeRegistry: {} } ),
  /engine node registry/ );

const writes = [];
const scoreHandle = {
  kind: 'file',
  name: 'picker.score.json',
  async getFile() { return { name: this.name, text: async () => scoreText }; },
  async createWritable() {
    return { write: async ( text ) => writes.push( [ 'score', text ] ), close: async () => {} };
  }
};
const projectionHandle = {
  async getFile() { return { text: async () => '// previous' }; },
  async createWritable() {
    return { write: async ( text ) => writes.push( [ 'projection', text ] ), close: async () => {} };
  }
};
const directoryHandle = {
  name: 'scores',
  async *values() {
    yield { kind: 'file', name: 'z.score.json' };
    yield scoreHandle;
  }
};
const pickerHost = createBrowserHost( {
  browser: {
    confirm: () => true,
    showOpenFilePicker: async () => [ scoreHandle ],
    showDirectoryPicker: async () => directoryHandle,
    showSaveFilePicker: async () => scoreHandle
  },
  browserDocument,
  storage: null,
  fetchImpl: async () => ( { ok: true, text: async () => scoreText } ),
  urlAPI: { createObjectURL: () => 'unused', revokeObjectURL() {} }
} );
assert.equal( pickerHost.capabilities.filePicker, true );
assert.equal( pickerHost.capabilities.directoryPicker, true );
assert.equal( pickerHost.capabilities.retainedFileHandles, true );
assert.equal( ( await pickerHost.openScore() ).handle, scoreHandle );
assert.deepEqual( ( await pickerHost.openScoreDirectory() ).files.map( ( file ) => file.name ), [
  'picker.score.json', 'z.score.json'
] );
assert.equal( ( await pickerHost.openDirectoryScore( { handle: scoreHandle } ) ).document.scoreID,
  'sonic-attunement-01' );
await assert.rejects( pickerHost.saveCanonical( initial.document, {
  handle: scoreHandle, expectedHash: 'stale-hash'
} ), /changed on disk/ );
await pickerHost.saveCanonical( initial.document, { handle: scoreHandle, expectedHash: initial.hash } );
await assert.rejects( pickerHost.saveProjection( '// next', {
  scoreID: initial.document.scoreID, handle: projectionHandle, expectedText: '// stale'
} ), /changed on disk/ );
await pickerHost.saveProjection( '// next', {
  scoreID: initial.document.scoreID, handle: projectionHandle, expectedText: '// previous'
} );
assert.match( writes[ 0 ][ 1 ], /"scoreID": "sonic-attunement-01"/ );
assert.deepEqual( writes[ 1 ], [ 'projection', '// next' ] );

console.log( 'host-adapter: pass' );
