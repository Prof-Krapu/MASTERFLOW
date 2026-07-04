import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5175,
    strictPort: true,
    proxy: {
      "/control-api": "http://127.0.0.1:8010",
      "/health": "http://127.0.0.1:8010"
    }
  },
  preview: {
    host: "127.0.0.1",
    port: 5175
  }
});
