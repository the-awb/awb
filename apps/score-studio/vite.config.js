import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig( {
  plugins: [ react() ],
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
