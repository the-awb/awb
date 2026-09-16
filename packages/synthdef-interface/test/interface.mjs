#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSynthDefInterface, parseSynthDef, synthDefFingerprint } from '../src/index.js';

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const manifest = JSON.parse( await readFile(
  path.join( root, 'apps/score-studio/public/synthdefs/manifest.json' ), 'utf8'
) );
const manifestDefinitions = new Map( manifest.patches.flatMap( ( patch ) => patch.defs )
  .map( ( definition ) => [ definition.name, definition ] ) );
const stableNumber = ( value ) => Array.isArray( value )
  ? value.map( stableNumber )
  : ( typeof value === 'number' ? Number( value.toPrecision( 12 ) ) : value );
const fixture = async ( name ) => {
  const bytes = await readFile( path.join( root, 'apps/score-studio/public/synthdefs', `${ name }.scsyndef` ) );
  const parsed = parseSynthDef( bytes );
  assert.equal( parsed.definitions.length, 1 );
  const describedControls = manifestDefinitions.get( name ).controls;
  assert.deepEqual( parsed.definitions[ 0 ].controls.map( ( item ) => ( {
    name: item.name, rate: item.rate, numChannels: item.numChannels, default: stableNumber( item.default )
  } ) ), describedControls.map( ( item ) => ( { ...item, default: stableNumber( item.default ) } ) ),
  `${ name } binary controls disagree with sclang SynthDesc manifest` );
  return { bytes, definition: parsed.definitions[ 0 ], model: buildSynthDefInterface( parsed.definitions[ 0 ] ) };
};
const control = ( model, name ) => model.controls.find( ( item ) => item.name === name );

const basic = await fixture( 'fieldBasic' );
assert.equal( basic.definition.name, 'fieldBasic' );
assert.equal( basic.definition.controls.find( ( item ) => item.name === 'freqL' ).default, 60 );
assert.ok( control( basic.model, 'freqL' ).roles.includes( 'oscillatorFrequency' ) );
assert.ok( control( basic.model, 'attackT' ).roles.includes( 'envelopeTime' ) );
assert.ok( control( basic.model, 'gate' ).roles.includes( 'envelopeGate' ) );
assert.equal( basic.model.outputs[ 0 ].channels, 2 );
assert.equal( basic.model.envelopes.length, 1 );
assert.equal( basic.model.envelopes[ 0 ].freesNode, true );
assert.ok( basic.model.envelopes[ 0 ].targets.includes( 'outputGain' ) );
assert.equal( basic.model.envelopes[ 0 ].envelope.stages.length, 2 );

const substrate = await fixture( 'substrate' );
assert.equal( substrate.model.envelopes.length, 4 );
assert.ok( substrate.model.envelopes.some( ( envelope ) => envelope.freesNode && envelope.targets.includes( 'outputGain' ) ) );
assert.ok( control( substrate.model, 'freqA' ).roles.includes( 'oscillatorFrequency' ) );

const substrate2 = await fixture( 'substrate2' );
assert.equal( substrate2.model.envelopes.length, 5 );
assert.equal( control( substrate2.model, 'difF' ).numChannels, 6 );
assert.equal( control( substrate2.model, 'difFTime' ).numChannels, 5 );

const bass = await fixture( 'resonantBassEnv2' );
assert.equal( bass.model.envelopes.length, 3 );
const bassAmplitude = bass.model.envelopes.find( ( envelope ) => envelope.freesNode );
assert.ok( bassAmplitude.targets.includes( 'outputGain' ) );
assert.equal( bassAmplitude.envelope.stages[ 0 ].duration.kind, 'binary' );
assert.equal( bassAmplitude.envelope.stages[ 0 ].duration.operator, '*' );
assert.deepEqual(
  [ bassAmplitude.envelope.stages[ 0 ].duration.left.name, bassAmplitude.envelope.stages[ 0 ].duration.right.name ].sort(),
  [ 'ampEnvRatio', 'sustain' ]
);
const phaseEnvelope = bass.model.envelopes.find( ( envelope ) => envelope.targets.includes( 'oscillatorPhase' ) );
assert.ok( phaseEnvelope && !phaseEnvelope.freesNode );
assert.equal( control( bass.model, 'dur' ).roles.includes( 'envelopeTime' ), true );

const suppliedSpecs = { freqL: { min: 20, max: 1000, warp: 'exp', step: 0.1, unit: 'Hz' } };
const specified = buildSynthDefInterface( basic.definition, { specs: suppliedSpecs } );
assert.deepEqual( control( specified, 'freqL' ).spec, { min: 20, max: 1000, warp: 'exp', step: 0.1, unit: 'Hz' } );
assert.equal( control( specified, 'freqR' ).spec, null );
assert.ok( Object.isFrozen( specified ) && Object.isFrozen( specified.controls ) );
assert.equal( Object.isFrozen( suppliedSpecs.freqL ), false, 'building an interface does not freeze caller-owned specs' );

const fingerprint = await synthDefFingerprint( basic.bytes );
assert.match( fingerprint, /^sha256:[0-9a-f]{64}$/ );
assert.throws( () => parseSynthDef( new Uint8Array( [ 0, 1, 2, 3 ] ) ), /invalid magic/ );

console.log( 'synthdef-interface: pass (4 arbitrary compiled graph fixtures)' );
