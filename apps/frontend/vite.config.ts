import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Frontend MALEX : consomme le backend REST /api/v1 et WS /ws/{room_instance_id}.
// Le backend reste lancé séparément, uniquement après accord humain.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Accès distant via Tailscale Serve (tailnet privé) : autoriser le host MagicDNS de Vincent.
    // Ajouté pour exposer le frontend à MALEX sur le tailnet ; sans effet en local.
    allowedHosts: ['profkrapu-ms-7971.tail8d8b1f.ts.net'],
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
