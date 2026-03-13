#!/bin/bash
# 小铁状态网站 - 自动部署脚本
# 用法：./auto-deploy.sh "提交信息"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🦾 小铁状态网站 - 自动部署脚本"
echo "================================"
echo ""

# 1. 检查 Git 状态
echo "📦 步骤 1: 检查 Git 状态..."
git status --short

# 2. 添加所有变更
echo ""
echo "📦 步骤 2: 添加所有变更..."
git add -A
echo "✅ 已添加所有变更"

# 3. 提交
COMMIT_MSG="${1:-chore: 自动更新 $(date +%Y-%m-%d-%H%M)}"
echo ""
echo "📦 步骤 3: 提交变更..."
echo "   提交信息：$COMMIT_MSG"
git commit -m "$COMMIT_MSG" || {
    echo "⚠️ 没有变更需要提交"
    echo ""
    echo "✅ 没有新变更，跳过部署"
    exit 0
}

# 4. 推送（触发 Cloudflare Pages 自动部署）
echo ""
echo "🚀 步骤 4: 推送到 GitHub..."
git push

# 5. 完成
echo ""
echo "================================"
echo "✅ 部署完成！"
echo ""
echo "🌐 生产域名：https://xiaotie-status.pages.dev"
echo "⏱️ 部署时间：通常 30-60 秒"
echo ""
echo "💡 提示：硬刷新查看最新版本 (Ctrl+Shift+R / Cmd+Shift+R)"
echo "================================"
