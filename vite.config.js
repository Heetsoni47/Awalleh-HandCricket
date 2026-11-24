import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' makes the build work on GitHub Pages at https://<you>.github.io/<repo>/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
});
