import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import nodemailerPlugin from './vite-nodemailer-plugin.js';

export default defineConfig({
  plugins: [react(), nodemailerPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});
