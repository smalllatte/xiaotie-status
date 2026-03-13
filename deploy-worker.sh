#!/bin/bash
# Cloudflare Workers 部署脚本

set -e

cd ~/.openclaw/workspace/workspace-status

echo "🚀 开始部署到 Cloudflare Workers..."

# 检查 wrangler 是否安装
if ! command -v wrangler &> /dev/null; then
    echo "❌ 未找到 wrangler CLI，正在安装..."
    npm install -g wrangler
fi

# 检查是否已登录
if ! wrangler whoami &> /dev/null; then
    echo "⚠️  未登录 Cloudflare，请先登录："
    wrangler login
fi

# 创建 KV 命名空间（如果不存在）
echo "📦 检查 KV 命名空间..."
KV_NAMESPACE="xiaotie_status"
KV_ID=$(wrangler kv namespace list | grep -A2 "\"$KV_NAMESPACE\"" | grep "id" | head -1 | awk -F'"' '{print $4}')

if [ -z "$KV_ID" ]; then
    echo "📦 创建 KV 命名空间：$KV_NAMESPACE"
    KV_ID=$(wrangler kv namespace create "$KV_NAMESPACE" | grep "id" | awk -F'"' '{print $4}')
    echo "✅ KV 命名空间已创建，ID: $KV_ID"
else
    echo "✅ KV 命名空间已存在，ID: $KV_ID"
fi

# 更新 wrangler.toml 中的 KV ID
echo "⚙️  更新 wrangler.toml 配置..."
sed -i "s/id = \"\"/id = \"$KV_ID\"/" wrangler.toml

# 部署 Worker
echo "🚀 部署 Worker..."
wrangler deploy

echo ""
echo "✅ 部署完成！"
echo ""
echo "📊 访问地址："
echo "   https://xiaotie-status.<你的 subdomain>.workers.dev"
echo ""
echo "🔧 管理后台："
echo "   https://dash.cloudflare.com/?to=/:account/workers-and-pages/services/view/xiaotie-status"
echo ""
