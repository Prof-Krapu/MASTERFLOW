import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Le PoC consomme le VRAI backend (REST /api/v1 + WS /ws/{room_instance_id})
// qui tourne sur :8000. On proxifie /api et /ws vers ce backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // REST : /api/v1/... -> backend HTTP
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // WebSocket : /ws/{room_instance_id} -> backend WS
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
