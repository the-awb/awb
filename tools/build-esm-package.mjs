import { rm } from 'node:fs/promises';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { build } from 'vite';

const packageRoot = process.cwd();
const packageJson = JSON.parse( readFileSync( path.join( packageRoot, 'package.json' ), 'utf8' ) );
const entries = Object.fromEntries( process.argv.slice( 2 ).map( ( argument ) => {
  const separator = argument.indexOf( '=' );
  if ( separator < 1 ) throw new Error( `Expected name=source entry, got ${ argument }` );
  return [ argument.slice( 0, separator ), path.join( packageRoot, argument.slice( separator + 1 ) ) ];
} ) );

if ( Object.keys( entries ).length === 0 ) throw new Error( 'At least one build entry is required.' );

const externalPackages = new Set( [
  ...Object.keys( packageJson.dependencies ?? {} ),
  ...Object.keys( packageJson.peerDependencies ?? {} )
] );
const external = ( id ) => [ ...externalPackages ].some(
  ( dependency ) => id === dependency || id.startsWith( `${ dependency }/` )
);
const dist = path.join( packageRoot, 'dist' );

await rm( dist, { recursive: true, force: true } );
await build( {
  configFile: false,
  root: packageRoot,
  build: {
    outDir: dist,
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: entries,
      formats: [ 'es' ],
      fileName: ( _format, entryName ) => `${ entryName }.js`
    },
    rollupOptions: {
      external,
      output: {
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
} );
