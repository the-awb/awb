import assert from 'node:assert/strict';
import test from 'node:test';
import { createFieldConfig } from '@awb/field-documents';
import { createScoreDocument, serializeScoreDocument } from '@awb/score';
import { fieldConfigFromState, openInitialDocument, saveableFieldState,
  saveFieldDocument, stateFromFieldConfig } from '../src/documentSession.js';

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

test( 'project open resolves score and config while config save leaves score untouched', async () => {
  const config = createFieldConfig( saveableFieldState( state ), { configID: 'field-main' } );
  const score = createScoreDocument( { scoreID: 'score-a', revision: 7 } );
  const project = { schema: 'awb.score-project/1', projectID: 'project-a',
    score: { path: './score-a.score.json', scoreID: 'score-a' },
    tools: [ { bindingID: 'field-main', tool: 'field-modelling', config: './field.field.json' } ] };
  const calls = [];
  const host = { request: async ( operation, payload = {} ) => {
    calls.push( { operation, payload } );
    if ( operation === 'filesystem.initial-file' ) return { handle: 'project', name: 'piece.awb-project.json' };
    if ( operation === 'filesystem.resolve-score-project' ) return { binding: project.tools[ 0 ],
      score: { handle: 'score', name: 'score-a.score.json' }, config: { handle: 'config', name: 'field.field.json' } };
    if ( operation === 'filesystem.read-file' && payload.handle === 'project' ) return { handle: 'project', name: 'piece.awb-project.json', text: JSON.stringify( project ) };
    if ( operation === 'filesystem.read-file' && payload.handle === 'config' ) return { handle: 'config', name: 'field.field.json', text: JSON.stringify( config ) };
    if ( operation === 'filesystem.read-file' && payload.handle === 'score' ) return { handle: 'score', name: 'score-a.score.json', text: serializeScoreDocument( score ) };
    if ( operation === 'filesystem.save-file' ) return { handle: 'config', name: 'field.field.json' };
    throw new Error( `Unexpected operation: ${ operation }` );
  } };
  const opened = await openInitialDocument( host, { payload: { documentKindID: 'score-project', bindingID: 'field-main' } } );
  assert.equal( opened.score.document.revision, 7 );
  await saveFieldDocument( host, stateFromFieldConfig( opened.config ), opened.file );
  const writes = calls.filter( ( call ) => call.operation === 'filesystem.save-file' );
  assert.equal( writes.length, 1 );
  assert.equal( writes[ 0 ].payload.documentKindID, 'field-config' );
  assert.equal( score.revision, 7 );
} );

test( 'direct score attachment opens observation data without inventing a Field config', async () => {
  const score = createScoreDocument( { scoreID: 'score-a', revision: 7 } );
  const host = { request: async ( operation ) => {
    if ( operation === 'filesystem.initial-file' ) return { handle: 'score', name: 'score-a.score.json' };
    if ( operation === 'filesystem.read-file' ) return { handle: 'score', name: 'score-a.score.json',
      text: serializeScoreDocument( score ) };
    throw new Error( `Unexpected operation: ${ operation }` );
  } };
  const opened = await openInitialDocument( host, { payload: { documentKindID: 'score' } } );
  assert.equal( opened.kind, 'score' );
  assert.equal( opened.config, null );
  assert.equal( opened.score.document.scoreID, 'score-a' );
} );
