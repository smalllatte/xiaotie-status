#!/bin/bash
# 状态网站自动更新脚本
# 每分钟更新一次状态数据

cd ~/.openclaw/workspace/workspace-status

# 生成最新状态
node generate-status.js

# 可选：推送更新到 Cloudflare Workers（如果已部署）
# if [ -f "wrangler.toml" ]; then
#     wrangler deploy --dry-run 2>/dev/null || true
# fi
