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
          target: 'https://modelservice.jdcloud.com',
          changeOrigin: true,
          rewrite: (pathStr) => pathStr.replace(/^\/jdcloud/, ''),
          secure: true, // 支持 HTTPS
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      'process.env.VITE_GEMINI_IMAGE_API_URL': JSON.stringify(env.VITE_GEMINI_IMAGE_API_URL),
      'process.env.VITE_JIMENG_IMAGE_API_URL': JSON.stringify(env.VITE_JIMENG_IMAGE_API_URL),
      'process.env.VITE_JIMENG_API_KEY': JSON.stringify(env.VITE_JIMENG_API_KEY),
      'process.env.VITE_TEXT_MODEL_API_URL': JSON.stringify(env.VITE_TEXT_MODEL_API_URL),
      'process.env.VITE_TEXT_MODEL_API_KEY': JSON.stringify(env.VITE_TEXT_MODEL_API_KEY),
      // 保持向后兼容
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
