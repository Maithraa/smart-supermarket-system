import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Relative base for GitHub Pages subpath hosting
  server: {
    port: 5173
  }
});
