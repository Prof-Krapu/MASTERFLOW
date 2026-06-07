import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Frontend MALEX : consomme le backend REST /api/v1 et WS /ws/{room_instance_id}.
// Le backend reste lancé séparément, uniquement après accord humain.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Bind sur toutes les interfaces (incl. l'IP Tailscale 100.100.128.63) : Tailscale Serve
    // NE sert PAS les nœuds *partagés* (node-share) → MALEX doit joindre l'IP tailnet directe
    // (http://100.100.128.63:5174). Le proxy Serve :10000 reste valable pour les membres du
    // tailnet de Vincent. Tailnet privé uniquement — toujours pas de Funnel public.
    host: '0.0.0.0',
    // Autoriser le host MagicDNS de Vincent (Vite 6 bloque sinon). Les accès par IP sont
    // autorisés d'office. Sans effet en local.
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
