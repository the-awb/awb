import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const packages = {
  score: { exports: { '.': './dist/index.js' }, files: [ 'index.js' ] },
  'sc-wasm': { exports: { './core': './dist/core.js', './react': './dist/react.js' }, files: [ 'core.js', 'react.js' ] },
  instruments: { exports: { '.': './dist/index.js' }, files: [ 'index.js' ] },
  'field-engine': { exports: { '.': './dist/index.js' }, files: [ 'index.js' ] },
  'render-pipeline': { exports: { '.': './dist/index.js' }, files: [ 'index.js' ] }
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

const score = await import( '@awb/score' );
const instruments = await import( '@awb/instruments' );
const field = await import( '@awb/field-engine' );
const sc = await import( '@awb/sc-wasm/core' );
const pipeline = await import( '@awb/render-pipeline' );

assert.equal( typeof score.makeEvent, 'function' );
assert.equal( typeof instruments.instrumentType, 'function' );
assert.equal( typeof field.projectInstrumentToFieldComponents, 'function' );
assert.equal( typeof sc.createScEngine, 'function' );
assert.equal( typeof pipeline.runRenderPipeline, 'function' );

console.log( 'All AWB package exports resolve from built distribution artifacts.' );
