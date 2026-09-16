import test from 'node:test';
import assert from 'node:assert/strict';
import { validateToolManifest } from '../src/manifestLoader.mjs';

const valid = { schema: 'awb.tool/1', id: 'test-tool', name: 'Test Tool', version: '1.0.0',
  renderer: { entry: 'dist/index.html', preloadProtocol: 1 }, view: { allowMultiple: true },
  launchProfiles: [ { id: 'standalone', label: 'Standalone' } ], capabilities: {} };

test( 'validates a bounded awb.tool/1 manifest', () => {
  const manifest = validateToolManifest( valid, '/tmp/artifact' );
  assert.equal( manifest.id, 'test-tool' );
  assert.equal( manifest.renderer.entryPath, '/tmp/artifact/dist/index.html' );
} );
test( 'rejects malformed manifests', () => assert.throws( () => validateToolManifest( {}, '/tmp/artifact' ), /Unsupported/ ) );
test( 'rejects escaping renderer paths', () => assert.throws( () => validateToolManifest( { ...valid, renderer: { ...valid.renderer, entry: '../escape.html' } }, '/tmp/artifact' ), /escapes/ ) );
test( 'rejects unsupported preload protocols', () => assert.throws( () => validateToolManifest( { ...valid, renderer: { ...valid.renderer, preloadProtocol: 2 } }, '/tmp/artifact' ), /Unsupported preload/ ) );
test( 'normalizes multi-protocol relay lifecycle addresses', () => {
  const manifest = validateToolManifest( {
    ...valid,
    capabilities: { connections: [ 'hosted' ] },
    connectionPolicies: { hosted: {
      allowedPrefixes: [ '/awb/timeline/', '/awb/synthdef/' ],
      clientIdentityAddresses: [ '/awb/timeline/hello', '/awb/synthdef/hello' ],
      disconnectAddresses: [ '/awb/timeline/disconnect', '/awb/synthdef/disconnect' ]
    } }
  }, '/tmp/artifact' );
  assert.deepEqual( manifest.connectionPolicies.hosted.disconnectAddresses,
    [ '/awb/timeline/disconnect', '/awb/synthdef/disconnect' ] );
} );
