#!/usr/bin/env python3
"""
简单的HTTP服务器，在28888端口启动
用于托管React应用的静态文件
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

PORT = 28888
DIRECTORY = "/data/thinkos/dist"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # 添加CORS头部
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_GET(self):
        # 处理单页应用路由 - 如果文件不存在，返回index.html
        if self.path != '/' and not os.path.exists(os.path.join(DIRECTORY, self.path.lstrip('/'))):
            # 检查是否是API请求或静态资源
            if not (self.path.startswith('/api/') or 
                   any(self.path.endswith(ext) for ext in ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.json'])):
                self.path = '/index.html'
        
        return super().do_GET()

def main():
    # 检查目录是否存在
    if not os.path.exists(DIRECTORY):
        print(f"错误: 目录 {DIRECTORY} 不存在")
        print("请确保项目文件已上传到服务器")
        sys.exit(1)
    
    # 切换到项目目录
    os.chdir(DIRECTORY)
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"服务器启动成功!")
        print(f"访问地址: http://localhost:{PORT}")
        print(f"项目目录: {DIRECTORY}")
        print("按 Ctrl+C 停止服务器")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务器已停止")

if __name__ == "__main__":
    main()