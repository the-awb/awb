import assert from 'node:assert/strict';
import test from 'node:test';
import { fieldConfigFromState, saveableFieldState, stateFromFieldConfig } from '../src/documentSession.js';

const state = { instruments: [], room: {}, surfaces: {}, microphones: [], display: {}, timeFactor: 1,
  meta: { title: 'Room' }, score: [ { id: 'must-not-persist' } ], scoreSessionID: 'runtime-only',
  runID: 'runtime-only', activeTab: 'settings' };

test( 'field config extraction excludes score, runtime and UI state', () => {
  const saved = saveableFieldState( state );
  assert.deepEqual( Object.keys( saved ).sort(), [ 'display', 'instruments', 'meta', 'microphones', 'room', 'surfaces', 'timeFactor' ] );
  const config = fieldConfigFromState( state, { configID: 'field-main' } );
  assert.equal( config.schema, 'awb.field-config/1' );
  assert.deepEqual( stateFromFieldConfig( config ), saved );
} );
