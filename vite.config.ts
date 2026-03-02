import fs from 'fs';
import path from 'path';
import sirv from 'sirv';
import type { Plugin, ResolvedConfig } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import Busboy from 'busboy';

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
        '/jdoss': {
          target: 'https://maas-task.s3.cn-north-1.jdcloud-oss.com',
          changeOrigin: true,
          rewrite: (pathStr) => pathStr.replace(/^\/jdoss/, ''),
          secure: true,
        },
        '/api/oss/upload': {
          target: 'http://localhost:3666',
          selfHandleResponse: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              if (req.method !== 'POST') {
                res.writeHead(405, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Method Not Allowed' }));
                return;
              }

              const busboy = Busboy({ headers: req.headers });
              let fileKey = 'file';
              let fileBuffer: Buffer | null = null;
              let fileName = 'file';
              let contentType = 'application/octet-stream';

              busboy.on('file', (name, file, info) => {
                const { filename, encoding, mimeType } = info;
                fileName = filename;
                contentType = mimeType;
                const chunks: any[] = [];
                file.on('data', (data) => {
                  chunks.push(data);
                }).on('close', () => {
                  fileBuffer = Buffer.concat(chunks);
                });
              });

              busboy.on('field', (name, val) => {
                if (name === 'fileKey') fileKey = val;
              });

              busboy.on('finish', async () => {
                try {
                  if (!fileBuffer) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'No file uploaded' }));
                    return;
                  }

                  const region = env.JD_OSS_REGION || 'cn-south-1';
                  const endpoint = env.JD_OSS_ENDPOINT;
                  const bucket = env.JD_OSS_BUCKET;
                  const accessKeyId = env.JD_OSS_ACCESS_KEY_ID;
                  const secretAccessKey = env.JD_OSS_SECRET_ACCESS_KEY;
                  const uploadPrefix = env.JD_OSS_UPLOAD_PREFIX || 'uploads';

                  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'OSS configuration missing in .env.local' }));
                    return;
                  }

                  const s3Client = new S3Client({
                    region,
                    endpoint,
                    credentials: { accessKeyId, secretAccessKey },
                    forcePathStyle: false,
                  });

                  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                  const uuid = randomUUID();
                  const ext = fileName.split('.').pop() || 'bin';
                  const objectKey = `${uploadPrefix}/${datePart}/${fileKey}/${uuid}.${ext}`;

                  await s3Client.send(new PutObjectCommand({
                    Bucket: bucket,
                    Key: objectKey,
                    Body: fileBuffer,
                    ContentType: contentType,
                  }));

                  // 生成预签名 GET URL，以便外部模型服务访问
                  const getCommand = new GetObjectCommand({
                    Bucket: bucket,
                    Key: objectKey,
                  });
                  const signedUrl = await getSignedUrl(s3Client, getCommand, {
                    expiresIn: 3600 * 24 // 24小时有效期
                  });

                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ objectKey, url: signedUrl }));
                } catch (err) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
                }
              });

              req.pipe(busboy);
            });
          }
        },
        '/api/oss/presign-put': {
          target: 'http://localhost:3666',
          selfHandleResponse: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', async (proxyReq, req, res) => {
              if (req.method !== 'POST') {
                res.writeHead(405, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Method Not Allowed' }));
                return;
              }

              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { fileKey, filename, contentType } = JSON.parse(body);
                  const region = env.JD_OSS_REGION || 'cn-south-1';
                  const endpoint = env.JD_OSS_ENDPOINT;
                  const bucket = env.JD_OSS_BUCKET;
                  const accessKeyId = env.JD_OSS_ACCESS_KEY_ID;
                  const secretAccessKey = env.JD_OSS_SECRET_ACCESS_KEY;
                  const uploadPrefix = env.JD_OSS_UPLOAD_PREFIX || 'uploads';

                  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'OSS configuration missing in .env.local' }));
                    return;
                  }

                  const s3Client = new S3Client({
                    region,
                    endpoint,
                    credentials: { accessKeyId, secretAccessKey },
                    forcePathStyle: false,
                  });

                  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                  const uuid = randomUUID();
                  const ext = filename?.split('.').pop() || 'bin';
                  const objectKey = `${uploadPrefix}/${datePart}/${fileKey || 'file'}/${uuid}.${ext}`;

                  const command = new PutObjectCommand({
                    Bucket: bucket,
                    Key: objectKey,
                    ContentType: contentType || 'application/octet-stream',
                  });

                  const signedPutUrl = await getSignedUrl(s3Client, command, {
                    expiresIn: 3600,
                    unhoistableHeaders: new Set(["content-type"])
                  });

                  // 同时返回可读的预签名 GET URL，供模型服务读取上传后的文件
                  const getCommand = new GetObjectCommand({
                    Bucket: bucket,
                    Key: objectKey,
                  });
                  const signedGetUrl = await getSignedUrl(s3Client, getCommand, {
                    expiresIn: 3600 * 24,
                  });

                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    objectKey,
                    signedPutUrl,
                    headers: { 'Content-Type': contentType || 'application/octet-stream' },
                    url: signedGetUrl,
                  }));
                } catch (err) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
                }
              });
            });
          }
        },
        '/api/jdcloud/task/submit': {
          target: 'http://localhost:3666',
          selfHandleResponse: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', async (proxyReq, req, res) => {
              if (req.method !== 'POST') {
                res.writeHead(405, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Method Not Allowed' }));
                return;
              }

              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const payload = JSON.parse(body);
                  const traceId = randomUUID().replace(/-/g, '');
                  // 使用服务端 env token, 与 joy_ip_video 保持一致
                  const tokenRaw = (env.JD_MODEL_SERVICE_TOKEN || env.VITE_TEXT_MODEL_API_KEY || '').trim();
                  const authorization = tokenRaw
                    ? (tokenRaw.toLowerCase().startsWith('bearer ') ? tokenRaw : `Bearer ${tokenRaw}`)
                    : '';

                  const controller = new AbortController();
                  const timeout = setTimeout(() => controller.abort(), 180_000);

                  const response = await fetch('https://modelservice.jdcloud.com/v1/task/submit', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Trace-id': traceId,
                      ...(authorization ? { Authorization: authorization } : {}),
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                  });
                  clearTimeout(timeout);

                  const resText = await response.text();
                  res.writeHead(response.status, { 'Content-Type': 'application/json' });
                  res.end(resText);
                } catch (err) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
                }
              });
            });
          }
        },
        '/api/jdcloud/task/status': {
          target: 'http://localhost:3666',
          selfHandleResponse: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', async (proxyReq, req, res) => {
              const url = new URL(req.url || '', 'http://localhost');
              const taskId = url.searchParams.get('taskId');
              if (!taskId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'taskId is required' }));
                return;
              }

              try {
                const traceId = randomUUID().replace(/-/g, '');
                // 使用服务端 env token, 与 joy_ip_video 保持一致
                const tokenRaw = (env.JD_MODEL_SERVICE_TOKEN || env.VITE_TEXT_MODEL_API_KEY || '').trim();
                const authorization = tokenRaw
                  ? (tokenRaw.toLowerCase().startsWith('bearer ') ? tokenRaw : `Bearer ${tokenRaw}`)
                  : '';

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 60_000);

                const response = await fetch(`https://modelservice.jdcloud.com/v1/task/${taskId}`, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'Trace-id': traceId,
                    ...(authorization ? { Authorization: authorization } : {}),
                  },
                  signal: controller.signal,
                });
                clearTimeout(timeout);

                const resText = await response.text();
                res.writeHead(response.status, { 'Content-Type': 'application/json' });
                res.end(resText);
              } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
              }
            });
          }
        }
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
