#!/bin/bash
# 启动状态网站服务器

cd ~/.openclaw/workspace/workspace-status

# 停止已有的服务器
pkill -f "python3 -m http.server 8082" 2>/dev/null

# 启动新服务器
nohup python3 -m http.server 8082 --bind 0.0.0.0 > server.log 2>&1 &

echo "服务器已启动"
echo "本地访问: http://localhost:8082"
echo "服务器IP: $(curl -s ifconfig.me 2>/dev/null):8082"
