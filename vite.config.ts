import fs from 'fs';
import path from 'path';
import sirv from 'sirv';
import type { Plugin, ResolvedConfig } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const resolveReferencePnpmPackageDir = (packageName: string): string | null => {
  const pnpmRoot = path.resolve(__dirname, 'reference/jdc-png2apng/node_modules/.pnpm');
  if (!fs.existsSync(pnpmRoot)) return null;

  const entries = fs.readdirSync(pnpmRoot, { withFileTypes: true });
  const match = entries.find((ent) => ent.isDirectory() && ent.name.startsWith(`${packageName}@`))?.name;
  if (!match) return null;

  const dir = path.join(pnpmRoot, match, 'node_modules', packageName);
  return fs.existsSync(dir) ? dir : null;
};

const ffmpegAssetsPlugin = (): Plugin => {
  let resolvedConfig: ResolvedConfig | null = null;
  const mountPath = '/ffmpeg';
  const sourceDir = path.resolve(__dirname, 'reference/jdc-video2gif/public/ffmpeg');

  return {
    name: 'ffmpeg-assets',
    enforce: 'pre',
    configResolved(config) {
      resolvedConfig = config;
    },
    configureServer(server) {
      if (!fs.existsSync(sourceDir)) return;
      server.middlewares.use(mountPath, sirv(sourceDir, { dev: true }));
    },
    async closeBundle() {
      if (!resolvedConfig || resolvedConfig.command !== 'build') return;

      const outDir = path.resolve(resolvedConfig.root, resolvedConfig.build.outDir);
      if (!fs.existsSync(sourceDir)) {
        // eslint-disable-next-line no-console
        console.warn(`[ffmpeg-assets] 跳过复制：未找到 ${sourceDir}`);
        return;
      }

      const destDir = path.resolve(outDir, mountPath.replace(/^\//, ''));
      await fs.promises.rm(destDir, { recursive: true, force: true });
      await fs.promises.mkdir(destDir, { recursive: true });
      await fs.promises.cp(sourceDir, destDir, { recursive: true });
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const upngJsDir = path.resolve(__dirname, 'reference/jdc-png2apng/node_modules/upng-js');
  const pakoDir = resolveReferencePnpmPackageDir('pako');

  const alias: Record<string, string> = {
    '@': path.resolve(__dirname, '.'),
    'upng-js': upngJsDir,
  };

  if (pakoDir) {
    alias.pako = pakoDir;
  }

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
        ...alias,
      }
    },
    optimizeDeps: {
      include: ['upng-js', 'pako'],
    },
    plugins: [ffmpegAssetsPlugin(), react()],
  };
});
