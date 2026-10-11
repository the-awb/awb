import assert from 'node:assert/strict';
import test from 'node:test';
import {
  permitsDisplayMediaRequest, permitsMediaCheck, permitsMediaRequest, responseHeadersForTool
} from '../src/rendererPolicy.mjs';

const lissajous = {
  renderer: { crossOriginIsolated: true },
  capabilities: { media: [ 'audio-input', 'system-audio' ] }
};

test( 'cross-origin isolation headers are limited to requesting tools', () => {
  assert.deepEqual( responseHeadersForTool( lissajous, { Existing: [ 'yes' ] } ), {
    Existing: [ 'yes' ],
    'Cross-Origin-Embedder-Policy': [ 'require-corp' ],
    'Cross-Origin-Opener-Policy': [ 'same-origin' ]
  } );
  assert.deepEqual( responseHeadersForTool( { renderer: { crossOriginIsolated: false } }, { Existing: [ 'yes' ] } ),
    { Existing: [ 'yes' ] } );
} );

test( 'display capture is restricted to declared system-audio tools', () => {
  assert.equal( permitsDisplayMediaRequest( lissajous, { audioRequested: true, videoRequested: true } ), true );
  assert.equal( permitsDisplayMediaRequest( lissajous, { audioRequested: false, videoRequested: true } ), false );
  assert.equal( permitsDisplayMediaRequest( lissajous, { audioRequested: true, videoRequested: false } ), false );
  assert.equal( permitsDisplayMediaRequest( { capabilities: { media: [] } }, {
    audioRequested: true, videoRequested: true
  } ), false );
} );

test( 'media permission is audio-only and capability-gated', () => {
  assert.equal( permitsMediaRequest( lissajous, 'media', { mediaTypes: [ 'audio' ] } ), true );
  assert.equal( permitsMediaRequest( lissajous, 'media', { mediaTypes: [ 'audio', 'video' ] } ), false );
  assert.equal( permitsMediaRequest( lissajous, 'geolocation', {} ), false );
  assert.equal( permitsMediaRequest( { capabilities: { media: [] } }, 'media', { mediaTypes: [ 'audio' ] } ), false );
  assert.equal( permitsMediaCheck( lissajous, 'media', { mediaType: 'audio' } ), true );
  assert.equal( permitsMediaCheck( lissajous, 'media', { mediaType: 'video' } ), false );
} );


test( 'ordinary MIDI permission is capability gated and excludes sysex', () => {
  const lattice = { capabilities: { media: [ 'midi-input' ] } };
  assert.equal( permitsMediaRequest( lattice, 'midi', {} ), true );
  assert.equal( permitsMediaCheck( lattice, 'midi', {} ), true );
  assert.equal( permitsMediaRequest( lattice, 'midiSysex', {} ), false );
  assert.equal( permitsMediaCheck( lattice, 'midiSysex', {} ), false );
  assert.equal( permitsMediaRequest( lissajous, 'midi', {} ), false );
  assert.equal( permitsMediaCheck( null, 'midi', {} ), false );
} );
