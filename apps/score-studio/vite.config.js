import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { readFile } from 'node:fs/promises';

function hostedScoreSource() {
  const sourcePath = process.env.AWB_SCORE_STUDIO_SOURCE;
  return {
    name: 'awb-hosted-score-source',
    configureServer( server ) {
      server.middlewares.use( async ( request, response, next ) => {
        if ( request.url?.split( '?' )[ 0 ] !== '/__awb/hosted-score' ) return next();
        if ( !sourcePath ) {
          response.statusCode = 404;
          response.end( 'No hosted score was supplied.' );
          return;
        }
        try {
          response.setHeader( 'Content-Type', 'application/json; charset=utf-8' );
          response.setHeader( 'Cache-Control', 'no-store' );
          response.end( await readFile( sourcePath, 'utf8' ) );
        } catch ( error ) {
          response.statusCode = 500;
          response.end( error.message );
        }
      } );
    }
  };
}

export default defineConfig( {
  base: './',
  plugins: [ react(), hostedScoreSource() ],
  resolve: { dedupe: [ 'react', 'react-dom' ] },
  optimizeDeps: { exclude: [ '@awb/sc-wasm' ] },
  server: {
    port: 5201,
    strictPort: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
} );
