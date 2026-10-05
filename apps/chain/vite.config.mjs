import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],base:'./',cacheDir:'../../.vite-chain',build:{sourcemap:true}});
