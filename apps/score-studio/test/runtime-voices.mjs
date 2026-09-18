import assert from 'node:assert/strict';
import { musicalVoiceLabel, voicesForRealization } from '../src/engine/runtimeVoices.js';

assert.equal( musicalVoiceLabel( { freq: 216 } ), '216' );
assert.equal( musicalVoiceLabel( { midinote: 55 } ), 'G3' );
assert.equal( musicalVoiceLabel( { degree: 8, octave: 3 } ), "8'''" );

const voices = voicesForRealization( {
  nodeIDs: [ 1001, 1002, 1003 ], state: 'running',
  voiceStates: { 1002: 'paused' }, voiceParams: { 1003: { freq: 333 } }
}, { type: 'note', def: 'tone', freq: [ 111, 222 ], dur: 4 } );
assert.deepEqual( voices.map( ( voice ) => voice.label ), [ '111', '222', '333' ] );
assert.deepEqual( voices.map( ( voice ) => voice.state ), [ 'running', 'paused', 'running' ] );

console.log( 'runtime-voices: pass' );
