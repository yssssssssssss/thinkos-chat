# ThinkOS 项目启动指南

## 🚀 本地开发启动

### 前置要求
- Node.js (推荐 18+ 版本)
- npm 或 yarn

### 启动步骤

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置环境变量**
   
   编辑 `.env.local` 文件，配置以下API密钥：
   ```env
   # Gemini API Key
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Text Model API Configuration
   VITE_TEXT_MODEL_API_URL=https://modelservice.jdcloud.com/v1/chat/completions
   VITE_TEXT_MODEL_API_KEY=your_text_model_api_key_here
   
   # Gemini Image API Configuration
   VITE_GEMINI_IMAGE_API_URL=http://ai-api.jdcloud.com/v1/images/gemini_flash/generations
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```
   
   访问: `http://localhost:3666` (或显示的端口)

4. **构建生产版本**
   ```bash
   npm run build
   ```

5. **预览生产版本**
   ```bash
   npm run preview
   ```

---

## 🌐 云服务器部署启动

### 服务器要求
- Linux 系统
- Python 3.x 或 Node.js
- 28888端口可用

### 部署步骤

1. **上传项目文件**
   
   在本地运行：
   ```bash
   # Windows PowerShell
   .\deploy.ps1
   
   # 然后执行显示的scp命令
   scp -P 20105 -r deploy-package/* root@xy1-gcs.jdcloud.com:/data/thinkos/
   ```

2. **SSH连接到服务器**
   ```bash
   ssh root@xy1-gcs.jdcloud.com -p 20105
   # 密码: d784fe5e83
   ```

3. **启动服务**
   ```bash
   cd /data/thinkos
   chmod +x server-config/deploy-and-start.sh
   ./server-config/deploy-and-start.sh
   ```

4. **验证服务**
   
   启动成功后，访问: `http://服务器IP:28888`

### 服务管理命令

```bash
# 查看服务状态
netstat -tuln | grep 28888

# 查看服务日志
tail -f /data/thinkos/server.log

# 停止服务
pkill -f "python.*28888"
# 或
pkill -f "node.*28888"

# 重启服务
cd /data/thinkos
./server-config/deploy-and-start.sh
```

---

## 🛠️ 故障排除

### 本地开发问题

1. **端口被占用**
   - Vite会自动尝试其他端口
   - 或手动指定端口: `npm run dev -- --port 3000`

2. **API密钥错误**
   - 检查 `.env.local` 文件配置
   - 确保API密钥有效

3. **依赖安装失败**
   ```bash
   # 清除缓存重新安装
   rm -rf node_modules package-lock.json
   npm install
   ```

### 云服务器问题

1. **28888端口无法访问**
   ```bash
   # 检查防火墙
   sudo ufw allow 28888
   
   # 检查服务是否运行
   netstat -tuln | grep 28888
   ```

2. **服务启动失败**
   ```bash
   # 查看详细日志
   cat /data/thinkos/server.log
   
   # 检查Python/Node.js是否安装
   python3 --version
   node --version
   ```

3. **文件权限问题**
   ```bash
   # 修复权限
   chmod -R 755 /data/thinkos
   chmod +x /data/thinkos/server-config/deploy-and-start.sh
   ```

---

## 📝 项目结构

```
thinkos/
├── dist/                 # 构建输出目录
├── src/                  # 源代码
├── public/               # 静态资源
├── server-config/        # 服务器配置
│   ├── deploy-and-start.sh
│   ├── start-server.py
│   ├── server.js
│   └── nginx.conf
├── package.json
└── .env.local           # 环境变量配置
```

---

## 🔧 开发工具

- **Vite**: 构建工具和开发服务器
- **React**: 前端框架
- **TypeScript**: 类型安全
- **Lucide React**: 图标库