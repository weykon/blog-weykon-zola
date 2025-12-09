import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: mode === 'production' ? '/blog/' : '/',
      build: {
        outDir: '../backend/static/app',
        emptyOutDir: true,
      },
      server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
          '/blog/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
          }
        }
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
