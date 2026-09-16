import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RUNTIME_OWNERSHIP,
  additionalSynthDefControls,
  assertRuntimeInstrumentNode,
  curatedControlNames,
  drawableRuntimeInstruments,
  runtimeNodeToFieldInstrument
} from '../src/engine/instrumentPresentation.js';

const speakers = [ { id: 'L', label: 'L' }, { id: 'R', label: 'R' } ];
const node = { entryID: 'entry-1', synthDefName: 'substrate', ownership: RUNTIME_OWNERSHIP.EXTERNAL,
  active: true, controls: { freqA: 72, beat: 0.25, amp: 0.4, flip: 1 } };

test( 'runtime ownership must be supplied rather than inferred from identifiers', () => {
  assert.throws( () => assertRuntimeInstrumentNode( { entryID: '100001', synthDefName: 'substrate' } ),
    /ownership must be supplied explicitly/ );
} );

test( 'known runtime SynthDefs reuse explicit Field projections', () => {
  const instrument = runtimeNodeToFieldInstrument( node, speakers );
  assert.equal( instrument.type, 'substrate' );
  assert.equal( instrument.params.freqA, 72 );
  assert.equal( instrument.params.beat, 0.25 );
  assert.equal( instrument.amp, 0.4 );
  assert.equal( instrument.external, true );
  assert.equal( instrument.runtimeEntryID, 'entry-1' );
} );

test( 'unknown SynthDefs remain audible-only instead of receiving invented physics', () => {
  const unknown = { ...node, entryID: 'entry-2', synthDefName: 'temp__0' };
  assert.equal( runtimeNodeToFieldInstrument( unknown, speakers ), null );
  assert.deepEqual( drawableRuntimeInstruments( [ node, unknown ], speakers ).map( ( item ) => item.runtimeEntryID ), [ 'entry-1' ] );
} );

test( 'only active externally-owned runtime nodes join the Field renderer', () => {
  const owned = { ...node, entryID: 'owned-1', ownership: RUNTIME_OWNERSHIP.OWNED };
  const inactive = { ...node, entryID: 'external-ended', active: false };
  assert.deepEqual( drawableRuntimeInstruments( [ owned, inactive, node ], speakers )
    .map( ( item ) => item.runtimeEntryID ), [ 'entry-1' ] );
} );

test( 'shared SynthDef descriptions expose only non-curated additional controls', () => {
  const instrument = runtimeNodeToFieldInstrument( node, speakers );
  const curated = curatedControlNames( instrument, speakers );
  const description = { schema: 'awb.synthdef-interface/1', name: 'substrate', controls: [
    { name: 'freqA', default: 60, numChannels: 1 },
    { name: 'gate', default: 1, numChannels: 1 },
    { name: 'out', default: 0, numChannels: 1 },
    { name: 'amp', default: 1, numChannels: 1 },
    { name: 'noiseBlend', default: 0, numChannels: 1 }
  ] };
  assert.deepEqual( additionalSynthDefControls( description,
    { curated, gainControl: 'amp' } ).map( ( control ) => control.name ), [ 'noiseBlend' ] );
} );
