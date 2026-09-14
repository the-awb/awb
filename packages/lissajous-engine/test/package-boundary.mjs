import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const packageJson = JSON.parse( readFileSync( path.join( packageRoot, 'package.json' ), 'utf8' ) );
const passes = [];
const pass = ( label ) => passes.push( `  PASS  ${ label }` );

assert.equal( packageJson.name, '@awb/lissajous-engine' );
assert.deepEqual( packageJson.exports, {
  './browser': './dist/lissajous-engine.browser.js',
  './core': './dist/core.js',
  './r3f': './dist/r3f.js',
  './vanilla': './dist/vanilla.js'
} );
assert.equal( packageJson.peerDependenciesMeta.react.optional, true );
assert.equal( packageJson.peerDependenciesMeta[ '@react-three/fiber' ].optional, true );
pass( 'the package exposes built browser, core, R3F and vanilla entry points' );

const distDir = path.join( packageRoot, 'dist' );
for ( const artifact of [
  'core.js', 'r3f.js', 'vanilla.js',
  'lissajous-engine.browser.js', 'lissajous-engine.global.js'
] ) assert.ok( existsSync( path.join( distDir, artifact ) ), `missing built artifact: ${ artifact }` );
const browserBundle = readFileSync( path.join( distDir, 'lissajous-engine.browser.js' ), 'utf8' );
const globalBundle = readFileSync( path.join( distDir, 'lissajous-engine.global.js' ), 'utf8' );
assert.doesNotMatch( browserBundle, /(?:from\s*|import\s*\()\s*['"]/ );
assert.match( globalBundle, /AWBLissajous/ );
assert.doesNotMatch( globalBundle, /(?:from\s*|import\s*\()\s*['"]/ );
pass( 'the direct-browser ESM and classic script bundles are self-contained' );

const source = ( relativeDir ) => readdirSync( path.join( packageRoot, relativeDir ) )
  .filter( ( name ) => name.endsWith( '.js' ) )
  .map( ( name ) => readFileSync( path.join( packageRoot, relativeDir, name ), 'utf8' ) )
  .join( '\n' );
assert.doesNotMatch( source( 'src/core' ),
  /(?:from|import\s*\()\s*['"](?:react|@react-three\/fiber|@react-three\/drei)/ );
assert.doesNotMatch( source( 'src/vanilla' ),
  /(?:from|import\s*\()\s*['"](?:react|@react-three\/fiber|@react-three\/drei)/ );
pass( 'core and vanilla source contain no React, R3F or drei imports' );

const core = await import( '@awb/lissajous-engine/core' );
for ( const exported of [
  'tickLissajousCore', 'createLissajousCore', 'createLissajousRenderObject',
  'MAX_GEOMETRY_POINTS', 'resolveGroupParamsAtTime'
] ) assert.ok( exported in core, `missing core export: ${ exported }` );
const vanilla = await import( '@awb/lissajous-engine/vanilla' );
assert.equal( typeof vanilla.createLissajousEngine, 'function' );
assert.equal( typeof vanilla.createLissajousRenderProducer, 'function' );
pass( 'Node resolves the workspace package and its public APIs' );

console.log( `\n${ passes.join( '\n' ) }\n\nAll checks passed.` );
