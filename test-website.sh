#!/bin/bash
# 小铁状态网站 - 测试脚本
# 用法：./test-website.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🦾 小铁状态网站 - 测试脚本"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

# 测试函数
test_case() {
    local name="$1"
    local result="$2"
    
    if [ "$result" = "true" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $name"
        ((PASS_COUNT++))
    else
        echo -e "${RED}❌ FAIL${NC}: $name"
        ((FAIL_COUNT++))
    fi
}

echo "📋 测试项目:"
echo ""

# 1. 测试 API 文件是否存在
if [ -f "api/status.json" ]; then
    test_case "API 文件存在" "true"
else
    test_case "API 文件存在" "false"
fi

# 2. 测试 API JSON 格式是否有效
if cat api/status.json | python3 -m json.tool > /dev/null 2>&1; then
    test_case "API JSON 格式有效" "true"
else
    test_case "API JSON 格式有效" "false"
fi

# 3. 测试 API 必需字段
REQUIRED_FIELDS=("timestamp" "status" "currentSession" "today" "learning" "activities")
ALL_FIELDS_PRESENT="true"
for field in "${REQUIRED_FIELDS[@]}"; do
    if ! grep -q "\"$field\"" api/status.json; then
        ALL_FIELDS_PRESENT="false"
        echo "  ⚠️  缺少字段：$field"
    fi
done
test_case "API 必需字段完整" "$ALL_FIELDS_PRESENT"

# 4. 测试学习进度数据合理性（percent 应该在 0-100 之间）
PERCENT_CHECK=$(python3 -c "
import json
with open('api/status.json') as f:
    data = json.load(f)
    for topic in data.get('learning', []):
        p = topic.get('percent', 0)
        if p < 0 or p > 100:
            print('false')
            exit()
print('true')
" 2>/dev/null || echo "false")
test_case "学习进度数据合理 (0-100%)" "$PERCENT_CHECK"

# 5. 测试活动日志是否按时间倒序
TIME_SORT_CHECK=$(python3 -c "
import json
with open('api/status.json') as f:
    data = json.load(f)
    activities = data.get('activities', [])
    if len(activities) < 2:
        print('true')
        exit()
    times = [a.get('time', '00:00') for a in activities]
    # 检查是否按时间倒序（从大到小）
    sorted_times = sorted(times, reverse=True)
    if times == sorted_times:
        print('true')
    else:
        print('false')
        print('当前顺序:', times[:5])
        print('应该顺序:', sorted_times[:5])
" 2>/dev/null || echo "false")
test_case "活动日志时间倒序" "$TIME_SORT_CHECK"

# 6. 测试 index.html 是否存在
if [ -f "index.html" ]; then
    test_case "index.html 文件存在" "true"
else
    test_case "index.html 文件存在" "false"
fi

# 7. 测试 index.html 是否包含必要元素
if grep -q "小铁的工作状态" index.html; then
    test_case "index.html 包含标题" "true"
else
    test_case "index.html 包含标题" "false"
fi

# 8. 测试版本号格式（不应该包含"PM"）
VERSION_CHECK=$(python3 -c "
import json
with open('api/status.json') as f:
    data = json.load(f)
    version = data.get('version', '')
    if 'PM' in version:
        print('false')
    else:
        print('true')
" 2>/dev/null || echo "false")
test_case "版本号格式正确（无 PM）" "$VERSION_CHECK"

# 9. 测试统计数据合理性
STATS_CHECK=$(python3 -c "
import json
with open('api/status.json') as f:
    data = json.load(f)
    today = data.get('today', {})
    tasks = today.get('tasks', 0)
    messages = today.get('messages', 0)
    learning = today.get('learning', 0)
    # 检查是否都是非负数
    if tasks >= 0 and messages >= 0 and learning >= 0:
        print('true')
    else:
        print('false')
" 2>/dev/null || echo "false")
test_case "统计数据合理（非负数）" "$STATS_CHECK"

# 10. 测试元数据完整性
META_CHECK=$(python3 -c "
import json
with open('api/status.json') as f:
    data = json.load(f)
    meta = data.get('meta', {})
    if 'totalNotes' in meta and 'lastUpdated' in meta:
        print('true')
    else:
        print('false')
" 2>/dev/null || echo "false")
test_case "元数据完整" "$META_CHECK"

echo ""
echo "================================"
echo "📊 测试结果："
echo -e "   ${GREEN}通过：$PASS_COUNT${NC}"
echo -e "   ${RED}失败：$FAIL_COUNT${NC}"
echo "================================"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}❌ 有测试失败，请修复后重新部署${NC}"
    exit 1
fi
