import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 28888;

// 静态文件服务
app.use(express.static(path.join(__dirname, '../dist')));

// API路由（如果需要）
app.use('/api', (req, res) => {
  res.json({ message: 'API endpoint' });
});

// 处理单页应用路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
});

export default app;