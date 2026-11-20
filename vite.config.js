import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const apiTarget = process.env.API_PROXY_TARGET || 'http://127.0.0.1:4000';
const previewHost = process.env.PREVIEW_HOST;
const port = Number(process.env.PORT) || 3000;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    // Explicitly allow only the configured preview hostname (never a wildcard).
    allowedHosts: previewHost ? [previewHost] : undefined,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/socket.io': { target: apiTarget, ws: true, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
