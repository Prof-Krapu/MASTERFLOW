import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Frontend MALEX : consomme le backend REST /api/v1 et WS /ws/{room_instance_id}.
// Le backend reste lancé séparément, uniquement après accord humain.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
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
