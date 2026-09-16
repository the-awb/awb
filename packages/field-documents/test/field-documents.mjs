import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {
  FIELD_CONFIG_SCHEMA, SCORE_PROJECT_SCHEMA, createFieldConfig, parseFieldConfig,
  resolveScoreProject, serializeFieldConfig, validateScoreProject
} from '../src/index.js';

const field = { room: {}, instruments: [], surfaces: {}, microphones: [], display: {} };

test( 'field configs round-trip without score or runtime identity', () => {
  const config = createFieldConfig( field, { configID: 'field-main', title: 'Main room' } );
  assert.equal( parseFieldConfig( serializeFieldConfig( config ) ).schema, FIELD_CONFIG_SCHEMA );
  assert.equal( Object.hasOwn( config, 'score' ), false );
  assert.equal( Object.hasOwn( config, 'runID' ), false );
} );

test( 'score projects resolve guarded relative score and tool paths', () => {
  const project = validateScoreProject( { schema: SCORE_PROJECT_SCHEMA, projectID: 'piece',
    score: { path: './piece.score.json', scoreID: 'piece' }, tools: [
      { bindingID: 'field-main', tool: 'field-modelling', config: './field/main.field.json', role: 'primary' }
    ] } );
  const resolved = resolveScoreProject( project, path.resolve( '/tmp/piece/piece.awb-project.json' ) );
  assert.equal( resolved.scorePath, path.resolve( '/tmp/piece/piece.score.json' ) );
  assert.equal( resolved.tools[ 0 ].configPath, path.resolve( '/tmp/piece/field/main.field.json' ) );
} );

test( 'absolute, escaping and duplicate bindings are rejected', () => {
  const base = { schema: SCORE_PROJECT_SCHEMA, projectID: 'piece',
    score: { path: './piece.score.json', scoreID: 'piece' }, tools: [] };
  assert.throws( () => validateScoreProject( { ...base, score: { ...base.score, path: '../other.score.json' } } ), /escapes/ );
  assert.throws( () => validateScoreProject( { ...base, tools: [
    { bindingID: 'same', tool: 'field-modelling', config: './a.field.json' },
    { bindingID: 'same', tool: 'lissajous', config: './b.lissajous.json' }
  ] } ), /Duplicate/ );
} );
