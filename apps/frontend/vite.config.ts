import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Frontend MALEX : consomme le backend REST /api/v1 et WS /ws/{room_instance_id}.
// Le backend reste lancé séparément, uniquement après accord humain.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Le serveur reste local ; Tailscale Funnel termine HTTPS et proxifie vers ce port.
    host: '0.0.0.0',
    // Hôtes Tailscale explicites uniquement : ne pas utiliser `true`, qui désactive la protection
    // contre le DNS rebinding. Le domaine MALEX sert le partage dev décidé le 2026-08-10.
    allowedHosts: [
      'profkrapu-ms-7971.tail8d8b1f.ts.net',
      'macbook-pro-de-alex.taild22ef5.ts.net',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
