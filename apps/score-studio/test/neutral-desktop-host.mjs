#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNeutralDesktopHost } from '../src/host/neutralDesktopHost.js';

const text = await readFile( new URL( '../public/examples/sonic-attunement-01.score.json', import.meta.url ), 'utf8' );
const handle = { kind: 'desktop-file', grantID: 'file-1', name: 'source.score.json' };
const calls = []; const states = [];
const bridge = {
  initialLaunchContext: () => ( { shellProtocol: 1, viewID: 'view-1', tool: { id: 'score-studio' },
    toolSessionID: 'tool-1', owner: { pid: 123 }, connections: { endpoint: 'ws://127.0.0.1/token' } } ),
  capabilities: () => ( { filesystem: [ 'open-file', 'open-directory', 'save-file' ], connections: [ 'hosted-timeline' ] } ),
  request: async ( operation, payload ) => {
    calls.push( [ operation, payload ] );
    if ( operation === 'filesystem.initial-file' || operation === 'filesystem.open-file'
      || operation === 'filesystem.read-file' ) return { handle, name: handle.name, text };
    if ( operation === 'score.load-synthdefs' ) return { status: 'loaded', sourceName: 'synths.scd' };
    if ( operation === 'artifact.read-text' ) return { handle: null, name: payload.name, text };
    if ( operation === 'filesystem.open-directory' || operation === 'filesystem.list-directory' ) return { handle: { kind: 'desktop-directory', grantID: 'dir-1', name: 'scores' }, name: 'scores', files: [] };
    if ( operation === 'filesystem.save-file' ) return { handle: payload.handle ?? { ...handle, grantID: 'saved-1' }, name: payload.suggestedName };
    throw new Error( `Unexpected ${ operation }` );
  },
  reportSessionState: ( state ) => states.push( state ), shellState: async () => ( { processID: 1 } ),
  focusView: async () => true, closeView: async () => true
};
const storage = new Map();
const host = createNeutralDesktopHost( { bridge, storage: { setItem: ( key, value ) => storage.set( key, value ) }, confirm: () => true } );
const opened = await host.initialScore();
assert.equal( opened.document.scoreID, 'sonic-attunement-01' );
assert.equal( opened.handle.grantID, 'file-1' ); assert.equal( opened.handle.path, undefined );
assert.deepEqual( calls.slice( 0, 2 ).map( ( call ) => call[ 0 ] ), [
  'filesystem.initial-file', 'score.load-synthdefs'
] );
assert.equal( host.hostedLaunchContext().toolSessionID, 'tool-1' );
assert.deepEqual( host.capabilities.executionModes, [ 'hosted' ] );
const saved = await host.saveCanonical( opened.document, { handle, expectedHash: opened.hash } );
assert.equal( saved.handle.grantID, 'file-1' );
assert.equal( calls.at( -1 )[ 0 ], 'filesystem.save-file' ); assert.equal( calls.at( -1 )[ 1 ].expectedText, text );
await host.saveProjection( '// new', { scoreID: opened.document.scoreID, handle, expectedText: '// old' } );
assert.equal( calls.at( -1 )[ 1 ].expectedText, '// old' );
assert.equal( host.storeRecovery( opened.document ), true ); host.reportSessionState( { scoreID: opened.document.scoreID } );
assert.equal( states[ 0 ].scoreID, opened.document.scoreID );
console.log( 'neutral-desktop-host: pass' );
