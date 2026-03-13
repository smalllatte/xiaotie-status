#!/bin/bash
# 使用通义万相 API 生成"拿铁小龙虾"图片

API_KEY="sk-sp-0e8a4f20a9e9477b9194d22716f066b7"
PROMPT="一只可爱的卡通小龙虾吉祥物，拟人化设计，小龙虾站立着拿着拿铁咖啡杯，现代卡通插画风格，色彩鲜艳，可爱 Q 版，简洁背景"

echo "============================================================"
echo "🦞 拿铁小龙虾 AI 生图工具 - 通义万相"
echo "============================================================"
echo ""

# 第一步：提交任务
echo "🎨 正在提交生成任务..."
RESPONSE=$(curl -s -X POST \
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-DashScope-Async: enable" \
  -d "{
    \"model\": \"wanx2.1-t2i-turbo\",
    \"input\": {
      \"prompt\": \"$PROMPT\"
    },
    \"parameters\": {
      \"size\": \"1024*1024\",
      \"n\": 1,
      \"style\": \"<cartoon>\",
      \"seed\": 42
    }
  }")

echo "提交响应：$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

# 提取任务 ID
TASK_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('output', {}).get('task_id', ''))" 2>/dev/null)

if [ -z "$TASK_ID" ]; then
    echo "❌ 未获取到任务 ID"
    exit 1
fi

echo ""
echo "✅ 任务已提交，任务 ID: $TASK_ID"
echo ""
echo "⏳ 等待图片生成中..."

# 第二步：轮询任务状态
for i in {1..30}; do
    sleep 10
    echo "  第 $i 次查询..."
    
    TASK_RESPONSE=$(curl -s \
      "https://dashscope.aliyuncs.com/api/v1/tasks/$TASK_ID" \
      -H "Authorization: Bearer $API_KEY")
    
    STATUS=$(echo "$TASK_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('output', {}).get('task_status', 'UNKNOWN'))" 2>/dev/null)
    echo "  状态：$STATUS"
    
    if [ "$STATUS" = "SUCCEEDED" ]; then
        echo ""
        echo "✅ 图片生成成功！"
        
        # 提取图片 URL
        IMAGE_URL=$(echo "$TASK_RESPONSE" | python3 -c "import sys, json; results=json.load(sys.stdin).get('output', {}).get('results', []); print(results[0].get('url', '') if results else '')" 2>/dev/null)
        
        if [ -n "$IMAGE_URL" ]; then
            echo "🔗 URL: $IMAGE_URL"
            
            # 下载图片
            OUTPUT_PATH="/home/admin/.openclaw/workspace/workspace-status/avatar/latte-lobster-$(date +%Y%m%d_%H%M%S).png"
            echo ""
            echo "📥 正在下载图片到：$OUTPUT_PATH"
            curl -s -o "$OUTPUT_PATH" "$IMAGE_URL"
            
            if [ -f "$OUTPUT_PATH" ]; then
                echo "✅ 图片已保存！"
                ls -lh "$OUTPUT_PATH"
            fi
        fi
        exit 0
    elif [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "CANCELED" ]; then
        echo "❌ 任务失败"
        echo "$TASK_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$TASK_RESPONSE"
        exit 1
    fi
done

echo "⏰ 等待超时"
exit 1
