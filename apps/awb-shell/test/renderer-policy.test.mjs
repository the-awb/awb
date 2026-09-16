import assert from 'node:assert/strict';
import test from 'node:test';
import { permitsMediaCheck, permitsMediaRequest, responseHeadersForTool } from '../src/rendererPolicy.mjs';

const lissajous = {
  renderer: { crossOriginIsolated: true },
  capabilities: { media: [ 'audio-input' ] }
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

test( 'media permission is audio-only and capability-gated', () => {
  assert.equal( permitsMediaRequest( lissajous, 'media', { mediaTypes: [ 'audio' ] } ), true );
  assert.equal( permitsMediaRequest( lissajous, 'media', { mediaTypes: [ 'audio', 'video' ] } ), false );
  assert.equal( permitsMediaRequest( lissajous, 'geolocation', {} ), false );
  assert.equal( permitsMediaRequest( { capabilities: { media: [] } }, 'media', { mediaTypes: [ 'audio' ] } ), false );
  assert.equal( permitsMediaCheck( lissajous, 'media', { mediaType: 'audio' } ), true );
  assert.equal( permitsMediaCheck( lissajous, 'media', { mediaType: 'video' } ), false );
} );
