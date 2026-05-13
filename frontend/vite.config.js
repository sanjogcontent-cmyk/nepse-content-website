import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Development server config for local + Cloudflare tunnel sharing.
// Cloudflare generates a new random *.trycloudflare.com hostname each run;
// allowedHosts: true prevents Vite from blocking that public tunnel host.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
