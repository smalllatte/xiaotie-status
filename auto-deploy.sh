#!/bin/bash
# 自动部署脚本 - 检查文件变化并重新部署到 Cloudflare Pages

set -e

WORKSPACE_DIR="/home/admin/.openclaw/workspace/workspace-status"
HASH_FILE="$WORKSPACE_DIR/.last-deploy-hash"
API_TOKEN="TnMRrsi38EH9p0L8-Uoc6J6duuscrdBLqjx4Ymfj"
PROJECT_NAME="xiaotie-status"

cd "$WORKSPACE_DIR"

# 先生成最新状态数据
echo "[$(date)] 生成最新状态数据..."
node generate-status.js

# 计算当前文件哈希（排除 .git 和临时文件）
CURRENT_HASH=$(find . -type f -not -path './.git/*' -not -path './node_modules/*' -not -name '.last-deploy-hash' -not -name 'auto-deploy.sh' -not -name '*.log' -exec md5sum {} \; | sort | md5sum | awk '{print $1}')

# 检查是否有变化
if [ -f "$HASH_FILE" ]; then
    LAST_HASH=$(cat "$HASH_FILE")
    if [ "$CURRENT_HASH" == "$LAST_HASH" ]; then
        echo "[$(date)] 文件无变化，跳过部署"
        exit 0
    fi
fi

echo "[$(date)] 检测到文件变化，开始部署..."

# 执行部署
export CLOUDFLARE_API_TOKEN="$API_TOKEN"
npx wrangler pages deploy . --project-name="$PROJECT_NAME" --commit-dirty=true --branch=main

# 保存当前哈希
echo "$CURRENT_HASH" > "$HASH_FILE"

echo "[$(date)] 部署完成"
