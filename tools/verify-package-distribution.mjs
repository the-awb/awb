import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const packages = {
  score: { exports: { '.': './dist/index.js' }, files: [ 'index.js' ] },
  'sc-wasm': { exports: { './core': './dist/core.js', './react': './dist/react.js' }, files: [ 'core.js', 'react.js' ] },
  'sc-console': { exports: { './core': './dist/core.js', './hook': './dist/hook.js', './react': './dist/react.js' }, files: [ 'core.js', 'hook.js', 'react.js' ] },
  'sc-envelope': { exports: { '.': './dist/index.js' }, files: [ 'index.js' ] },
  'sc-runtime': { exports: { '.': './dist/index.js' }, files: [ 'index.js' ] },
  'synthdef-interface': { exports: { '.': './dist/index.js' }, files: [ 'index.js' ] },
  instruments: { exports: { '.': './dist/index.js' }, files: [ 'index.js' ] },
  'field-engine': { exports: { '.': './dist/index.js' }, files: [ 'index.js' ] },
  'render-pipeline': {
    exports: { '.': './dist/index.js', './webcodecs': './dist/webcodecs.js' },
    files: [ 'index.js', 'webcodecs.js' ]
  }
};

for ( const [ name, contract ] of Object.entries( packages ) ) {
  const packageRoot = path.join( root, 'packages', name );
  const manifest = JSON.parse( readFileSync( path.join( packageRoot, 'package.json' ), 'utf8' ) );
  assert.deepEqual( manifest.exports, contract.exports, `${ name } exports source instead of dist` );
  assert.deepEqual( manifest.files, [ 'dist', 'README.md' ], `${ name } publishes an unexpected file set` );
  for ( const file of contract.files ) {
    assert.ok( existsSync( path.join( packageRoot, 'dist', file ) ), `${ name } missing dist/${ file }` );
  }
}

const consoleHook = readFileSync( path.join( root, 'packages/sc-console/dist/hook.js' ), 'utf8' );
assert.doesNotMatch( consoleHook, /@codemirror|@lezer/, 'the lifecycle hook pulls in the editor bundle' );

const score = await import( '@awb/score' );
const instruments = await import( '@awb/instruments' );
const field = await import( '@awb/field-engine' );
const sc = await import( '@awb/sc-wasm/core' );
const consoleCore = await import( '@awb/sc-console/core' );
const envelope = await import( '@awb/sc-envelope' );
const runtime = await import( '@awb/sc-runtime' );
const synthDefInterface = await import( '@awb/synthdef-interface' );
const pipeline = await import( '@awb/render-pipeline' );
const webcodecs = await import( '@awb/render-pipeline/webcodecs' );

assert.equal( typeof score.makeEvent, 'function' );
assert.equal( typeof instruments.instrumentType, 'function' );
assert.equal( typeof field.projectInstrumentToFieldComponents, 'function' );
assert.equal( typeof sc.createScEngine, 'function' );
assert.equal( typeof consoleCore.evalRangeAt, 'function' );
assert.equal( typeof envelope.scEnvAsArray, 'function' );
assert.equal( typeof runtime.createPlaybackReadiness, 'function' );
assert.equal( typeof synthDefInterface.buildSynthDefInterface, 'function' );
assert.equal( typeof pipeline.runRenderPipeline, 'function' );
assert.equal( typeof webcodecs.createWebCodecsSink, 'function' );

console.log( 'All AWB package exports resolve from built distribution artifacts.' );
