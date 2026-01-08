#!/bin/bash

# 服务器部署和启动脚本
# 在云服务器上运行此脚本

PROJECT_DIR="/data/thinkos"
PORT=28888

echo "开始部署ThinkOS项目..."

# 创建项目目录
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

echo "1. 检查项目文件..."
if [ ! -d "dist" ]; then
    echo "错误: dist目录不存在，请先上传项目文件"
    exit 1
fi

echo "2. 检查Python环境..."
if command -v python3 &> /dev/null; then
    echo "Python3 已安装"
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    echo "Python 已安装"
    PYTHON_CMD="python"
else
    echo "错误: 未找到Python，请安装Python"
    exit 1
fi

echo "3. 检查Node.js环境..."
if command -v node &> /dev/null; then
    echo "Node.js 已安装"
    NODE_AVAILABLE=true
else
    echo "Node.js 未安装，将使用Python服务器"
    NODE_AVAILABLE=false
fi

echo "4. 停止现有服务..."
# 停止可能运行的服务
pkill -f "python.*28888" 2>/dev/null || true
pkill -f "node.*28888" 2>/dev/null || true

echo "5. 启动服务器..."

# 优先使用Python服务器（更稳定，无需额外依赖）
echo "使用Python服务器启动..."
nohup $PYTHON_CMD server-config/start-server.py > server.log 2>&1 &
echo "Python服务器已启动，日志文件: server.log"

# 等待服务启动
sleep 2

# 检查服务是否启动成功
if netstat -tuln | grep -q ":$PORT "; then
    echo "✅ 服务器启动成功!"
    echo "🌐 访问地址: http://$(hostname -I | awk '{print $1}'):$PORT"
    echo "📝 查看日志: tail -f $PROJECT_DIR/server.log"
else
    echo "❌ 服务器启动失败，请检查日志文件"
    tail -10 server.log
fi

echo "部署完成!"