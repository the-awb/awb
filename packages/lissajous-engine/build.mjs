import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { build } from 'vite';

const packageRoot = path.dirname( fileURLToPath( import.meta.url ) );
const fromRoot = ( relativePath ) => path.join( packageRoot, relativePath );
const dist = fromRoot( 'dist' );

await rm( dist, { recursive: true, force: true } );

// Package ESM keeps peers external so an R3F or vanilla Three.js host shares its existing runtime.
await build( {
  configFile: false,
  root: packageRoot,
  plugins: [ react() ],
  build: {
    outDir: dist,
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: {
        core: fromRoot( 'src/core/index.js' ),
        r3f: fromRoot( 'src/r3f/index.jsx' ),
        vanilla: fromRoot( 'src/vanilla/index.js' )
      },
      formats: [ 'es' ],
      fileName: ( _format, entryName ) => `${ entryName }.js`
    },
    rollupOptions: {
      external: ( id ) => id === 'three' || id.startsWith( 'three/' ) ||
        id === 'react' || id.startsWith( 'react/' ) || id === '@react-three/fiber',
      output: {
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
} );

// This ESM file is directly importable by a browser: Three and OrbitControls are included, so no
// bundler or import map is required.
await build( {
  configFile: false,
  root: packageRoot,
  build: {
    outDir: dist,
    emptyOutDir: false,
    sourcemap: false,
    minify: 'oxc',
    lib: {
      entry: fromRoot( 'src/browser.js' ),
      formats: [ 'es' ],
      fileName: () => 'lissajous-engine.browser.js'
    }
  }
} );

// Classic script-tag build. Loading it creates globalThis.AWBLissajous and has no runtime
// dependencies. It intentionally owns its bundled Three runtime and is for standalone embeds;
// existing Three.js applications should use the external-peer ESM entrypoints above.
await build( {
  configFile: false,
  root: packageRoot,
  build: {
    outDir: dist,
    emptyOutDir: false,
    sourcemap: false,
    minify: 'oxc',
    lib: {
      entry: fromRoot( 'src/browser.js' ),
      name: 'AWBLissajous',
      formats: [ 'iife' ],
      fileName: () => 'lissajous-engine.global.js'
    }
  }
} );
