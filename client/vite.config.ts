import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const api = { target: 'http://localhost:4000', changeOrigin: false };
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': api, '/health': api } },
});
