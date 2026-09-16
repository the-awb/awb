#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initialLiveInstrumentParams, liveInstrumentLibrary } from '../src/engine/liveInstrumentLibrary.js';

const manifestJSON = JSON.parse( await readFile(
  new URL( '../public/synthdefs/manifest.json', import.meta.url ), 'utf8'
) );
const manifest = new Map( manifestJSON.patches.flatMap( ( patch ) => patch.defs )
  .map( ( definition ) => [ definition.name, definition ] ) );
const library = liveInstrumentLibrary( manifest );

assert.equal( library.length, 4 );
assert.deepEqual( library.map( ( instrument ) => instrument.definition ), [
  'fieldBasic', 'substrate', 'substrate2', 'resonantBassEnv2'
] );
assert.ok( library.every( ( instrument ) => instrument.available ) );
const basic = library[ 0 ];
assert.ok( basic.controls.some( ( control ) => control.name === 'freqL' ) );
assert.ok( basic.controls.every( ( control ) => ![ 'out', 'gate' ].includes( control.name ) ) );
const basicParams = initialLiveInstrumentParams( basic );
assert.equal( basicParams.amp, 1, 'live rack preserves the audible SynthDef gain default' );
assert.equal( basicParams.freqL, 60 );
assert.ok( Object.isFrozen( library[ 0 ] ) && Object.isFrozen( basicParams ) );
const substrate2 = library.find( ( instrument ) => instrument.key === 'substrate2' );
assert.ok( substrate2.controls.every( ( control ) => ![ 'difF', 'difFTime' ].includes( control.name ) ),
  'multichannel controls are not misrepresented as scalar inputs' );
assert.equal( substrate2.controls.find( ( control ) => control.name === 'flip' ).editor.kind, 'boolean' );

console.log( 'live-instrument-library: 10/10 pass' );
