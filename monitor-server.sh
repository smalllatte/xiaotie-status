#!/bin/bash
# 状态网站服务器守护进程
# 每分钟检查一次，确保服务器运行

SERVER_PID=$(pgrep -f "python3 -m http.server 8082" 2>/dev/null)

if [ -z "$SERVER_PID" ]; then
    echo "[$(date)] 服务器未运行，正在重启..." >> /tmp/xiaotie-server-monitor.log
    cd ~/.openclaw/workspace/workspace-status
    nohup python3 -m http.server 8082 --bind 0.0.0.0 > server.log 2>&1 &
    echo "[$(date)] 服务器已启动 (PID: $!)" >> /tmp/xiaotie-server-monitor.log
else
    echo "[$(date)] 服务器运行正常 (PID: $SERVER_PID)" >> /tmp/xiaotie-server-monitor.log
fi
