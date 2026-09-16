#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createPlaybackReadiness } from '../src/index.js';

const ready = createPlaybackReadiness( {
  hostKind: 'standalone', engine: 'ready', audio: 'running', score: 'ready', definitions: 'ready'
} );
assert.equal( ready.canPlay, true );
assert.equal( ready.reason, null );

const suspended = createPlaybackReadiness( {
  hostKind: 'standalone', engine: 'ready', audio: 'suspended', score: 'ready', definitions: 'ready'
} );
assert.equal( suspended.canPlay, false );
assert.match( suspended.reason, /suspended/ );

const desktop = createPlaybackReadiness( {
  hostKind: 'desktop', engine: 'ready', audio: 'notApplicable', score: 'ready', definitions: 'ready'
} );
assert.equal( desktop.canPlay, true );

const missing = createPlaybackReadiness( {
  hostKind: 'desktop', engine: 'ready', audio: 'notApplicable', score: 'ready',
  definitions: 'missing', missingDefinitions: [ 'a', 'a', 'b' ]
} );
assert.equal( missing.canPlay, false );
assert.deepEqual( missing.missingDefinitions, [ 'a', 'b' ] );
assert.match( missing.reason, /a, b/ );

assert.throws( () => createPlaybackReadiness( { engine: 'probably' } ), /Unknown SC engine state/ );

console.log( 'sc-runtime readiness: 10/10 pass' );
