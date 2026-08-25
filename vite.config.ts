import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// API_manage SPA — sert la landing publique + UI admin.
// En dev : Vite sur :3000, proxy /api et /app vers Express :3100.
// En prod : `npm run build:web` + `npm run serve` — Express :3000 sert dist/ + API + reverse proxy.
const SERVER_PORT = process.env.SERVER_PORT ?? '3100';

export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: process.env.DISABLE_HMR !== 'true',
    proxy: {
      '/api': {target: `http://127.0.0.1:${SERVER_PORT}`, changeOrigin: true},
      '/app': {target: `http://127.0.0.1:${SERVER_PORT}`, changeOrigin: true, ws: true},
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  optimizeDeps: {
    include: ['lucide-react', 'react', 'react-dom'],
  },
}));
