import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveToolBindingFromProject } from '../src/scoreProjectResolver.mjs';

const project = JSON.stringify( { schema: 'awb.score-project/1', projectID: 'piece',
  score: { path: './piece.score.json', scoreID: 'piece' }, tools: [
    { bindingID: 'field-a', tool: 'field-modelling', config: './field/a.field.json' },
    { bindingID: 'field-b', tool: 'field-modelling', config: './field/b.field.json' },
    { bindingID: 'viz', tool: 'lissajous', config: './visual/viz.lissajous.json' }
  ] } );

test( 'project bindings resolve only the explicitly selected tool config', () => {
  const binding = resolveToolBindingFromProject( project, '/tmp/piece/piece.awb-project.json',
    { toolID: 'field-modelling', bindingID: 'field-b' } );
  assert.equal( binding.scorePath, '/tmp/piece/piece.score.json' );
  assert.equal( binding.configPath, '/tmp/piece/field/b.field.json' );
  assert.equal( binding.binding.bindingID, 'field-b' );
} );

test( 'ambiguous and cross-tool bindings are refused', () => {
  assert.throws( () => resolveToolBindingFromProject( project, '/tmp/piece/project.awb-project.json',
    { toolID: 'field-modelling' } ), /choose bindingID/ );
  assert.throws( () => resolveToolBindingFromProject( project, '/tmp/piece/project.awb-project.json',
    { toolID: 'score-studio' } ), /no score-studio binding/ );
} );
