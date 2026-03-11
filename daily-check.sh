#!/bin/bash
# 每日检查网站状态脚本
# 由小铁主动执行，确保网站数据真实准确

set -e

WORKSPACE_DIR="/home/admin/.openclaw/workspace/workspace-status"
LOG_FILE="$WORKSPACE_DIR/data/daily-check.log"

cd "$WORKSPACE_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始每日检查..." >> "$LOG_FILE"

# 1. 生成最新状态数据
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 生成最新状态数据..." >> "$LOG_FILE"
node generate-status.js >> "$LOG_FILE" 2>&1

# 2. 检查数据是否合理
STATUS_FILE="$WORKSPACE_DIR/api/status.json"
if [ -f "$STATUS_FILE" ]; then
    # 检查是否有负数
    if grep -q '"-[0-9]' "$STATUS_FILE"; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ 警告：发现负数数据，需要修复" >> "$LOG_FILE"
        # 重新生成
        node generate-status.js >> "$LOG_FILE" 2>&1
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ 数据检查通过" >> "$LOG_FILE"
    fi
fi

# 3. 提交并推送（如果有变化）
if [ -n "$(git status --porcelain)" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 发现变化，提交并推送..." >> "$LOG_FILE"
    git add -A
    git commit -m "data: daily update $(date '+%Y-%m-%d %H:%M')" >> "$LOG_FILE" 2>&1 || true
    git push origin main >> "$LOG_FILE" 2>&1 || echo "[$(date '+%Y-%m-%d %H:%M:%S')] 推送失败，稍后重试" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 无变化，跳过提交" >> "$LOG_FILE"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 每日检查完成" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"
