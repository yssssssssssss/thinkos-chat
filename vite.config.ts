import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3666,
      host: '0.0.0.0',
      proxy: {
        '/jdcloud': {
          target: 'http://ai-api.jdcloud.com',
          changeOrigin: true,
          rewrite: (pathStr) => pathStr.replace(/^\/jdcloud/, ''),
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
      'process.env.TEXT_MODEL_API_URL': JSON.stringify(env.VITE_TEXT_MODEL_API_URL),
      'process.env.TEXT_MODEL_API_KEY': JSON.stringify(env.VITE_TEXT_MODEL_API_KEY),
      'process.env.GEMINI_IMAGE_API_URL': JSON.stringify(env.VITE_GEMINI_IMAGE_API_URL)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
