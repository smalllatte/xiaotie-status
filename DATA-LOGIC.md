# 网站数据实现逻辑说明

## 数据来源总览

```
┌─────────────────────────────────────────────────────────────┐
│                      前端展示层                              │
│                   (index.html)                               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  DataManager                                         │   │
│  │  - 从 /api/status 获取实时数据                        │   │
│  │  - localStorage 缓存 (5 秒 TTL)                         │   │
│  │  - 每秒自动刷新                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            │ fetch('/api/status')
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      后端 API 层                              │
│              (generate-status.js + api/status.json)         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  数据聚合逻辑                                        │   │
│  │  - 读取 memory 文件 → 任务数/学习条目/活动日志         │   │
│  │  - 读取 data 文件 → 消息数/在线时长/学习进度          │   │
│  │  - 生成 status.json (每次调用更新)                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            │ 读取
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      数据持久层                              │
│                                                              │
│  /memory/YYYY-MM-DD.md          → 任务记录/活动日志         │
│  /data/message-count.txt        → 消息计数                  │
│  /data/today-start-time.txt     → 今日开始时间              │
│  /data/learning-events.jsonl    → 学习事件记录              │
│  /data/current-session.json     → 当前会话状态              │
└─────────────────────────────────────────────────────────────┘
```

---

## 各项数据详细算法

### 1. 今日任务数 (`today.tasks`)

**数据来源**: `/memory/YYYY-MM-DD.md`

**算法**:
```javascript
// 解析 memory 文件中 ### HH:MM 格式的事件条目
const eventMatches = content.match(/###\s+\d{2}:\d{2}/g);
const tasks = eventMatches ? eventMatches.length : 0;
```

**更新方式**: 
- 每次在 memory 文件中添加 `### HH:MM - 任务描述` 格式的记录
- 自动被 generate-status.js 解析

**真实性**: ✅ 完全真实，来自实际工作记录

---

### 2. 消息交互数 (`today.messages`)

**数据来源**: `/data/message-count.txt`

**算法**:
```javascript
// 读取计数文件
const count = parseInt(fs.readFileSync(msgFile, 'utf8').trim()) || 0;
```

**更新方式**:
```bash
# 手动增加计数
node generate-status.js message
```

**真实性**: ⚠️ 需要主动调用更新（后续可集成到消息处理流程）

---

### 3. 学习条目数 (`today.learning`)

**数据来源**: `/memory/YYYY-MM-DD.md`

**算法**:
```javascript
// 扫描学习相关关键词出现次数
const learningKeywords = ['学习', '阅读', '研究', '了解', '掌握', '技能'];
let learning = 0;
learningKeywords.forEach(keyword => {
  const matches = content.match(new RegExp(keyword, 'g'));
  if (matches) learning += matches.length;
});
learning = Math.min(learning, 10); // 上限 10
```

**真实性**: ✅ 基于实际学习内容

---

### 4. 在线时长 (`today.uptime`)

**数据来源**: `/data/today-start-time.txt`

**算法**:
```javascript
const startTime = parseInt(fs.readFileSync(startFile, 'utf8').trim());
const uptime = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
```

**单位**: 秒

**更新方式**:
- 每日首次运行时自动创建开始时间记录
- 每次生成状态时重新计算

**真实性**: ✅ 实时计算

---

### 5. 在线率 (`today.uptimePercent`)

**算法**:
```javascript
const workDaySeconds = 16 * 3600; // 16 小时工作日 = 57600 秒
const uptimePercent = Math.min(100, Math.round((uptime / workDaySeconds) * 100));
```

**基准**: 16 小时工作日（08:00-24:00）

**真实性**: ✅ 基于真实在线时长计算

---

### 6. 学习进度 (`learning[]`)

**数据来源**: `/data/learning-events.jsonl`

**算法**:
```javascript
// 从事件文件累加学习进度
const baseProgress = {
  'OTA 行业知识': 0,
  '交通业务产品': 0,
  '产品经理技能': 0
};

// 读取 JSONL 事件文件并累加
events.forEach(event => {
  if (event.topic && baseProgress.hasOwnProperty(event.topic)) {
    baseProgress[event.topic] += (event.increment || 1);
  }
});

// 转换为数组格式，上限 100%
return Object.entries(baseProgress).map(([name, percent]) => ({
  name,
  percent: Math.min(100, percent)
}));
```

**更新方式**:
```bash
# 记录学习事件
node record-learning.js "OTA 行业知识" 2 "学习了市场分析方法"
node record-learning.js pm 1 "阅读需求分析文档"

# 或使用快捷命令
node generate-status.js learn "交通业务产品" 3 "研究了竞品功能"
```

**事件文件格式** (`learning-events.jsonl`):
```jsonl
{"timestamp":1710259200000,"topic":"OTA 行业知识","increment":2,"description":"学习了市场分析方法"}
{"timestamp":1710259300000,"topic":"产品经理技能","increment":1,"description":"阅读需求分析文档"}
```

**真实性**: ✅ 完全基于实际学习记录累加

---

### 7. 活动日志 (`activities[]`)

**数据来源**: `/memory/YYYY-MM-DD.md` + 当前会话

**算法**:
```javascript
// 从 memory 文件提取 ### HH:MM - 描述 格式的事件
const eventRegex = /###\s+(\d{2}:\d{2})\s*-\s*(.+)/g;

// 根据内容自动匹配图标
if (title.includes('部署') || title.includes('上线')) icon = '🚀';
else if (title.includes('开发') || title.includes('编写')) icon = '💻';
else if (title.includes('学习') || title.includes('研究')) icon = '📚';
else if (title.includes('配置') || title.includes('设置')) icon = '⚙️';
else if (title.includes('检查') || title.includes('对齐')) icon = '🔍';
else icon = '💬';
```

**真实性**: ✅ 来自实际工作记录

---

### 8. 当前会话状态 (`currentSession`)

**数据来源**: `/data/current-session.json`

**算法**:
```javascript
const session = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
```

**更新方式**:
```bash
node generate-status.js session "检查网站数据" "修复数据错误"
```

**文件格式**:
```json
{
  "title": "检查网站数据",
  "description": "修复数据错误",
  "startTime": 1710259200000
}
```

**真实性**: ✅ 需要主动更新（可集成到任务开始/结束时）

---

## 数据更新流程

### 自动更新（定时任务）
```bash
# 每分钟执行一次
node generate-status.js
```

### 手动更新
```bash
# 记录学习
node record-learning.js "OTA 行业知识" 2 "学习内容描述"

# 更新会话状态
node generate-status.js session "工作中" "任务描述"

# 重置学习进度（测试用）
node generate-status.js reset-learning

# 重置今日计时
node generate-status.js reset-day
```

---

## 数据真实性验证

| 数据项 | 数据来源 | 是否可追溯 | 验证方式 |
|--------|---------|-----------|---------|
| 今日任务 | memory 文件 | ✅ | 查看 memory/YYYY-MM-DD.md |
| 消息交互 | data 文件 | ✅ | 查看 data/message-count.txt |
| 学习条目 | memory 文件 | ✅ | 查看 memory 文件关键词 |
| 在线时长 | data 文件 | ✅ | 查看 data/today-start-time.txt |
| 在线率 | 计算得出 | ✅ | uptime / 57600 * 100% |
| 学习进度 | 事件累加 | ✅ | 查看 data/learning-events.jsonl |
| 活动日志 | memory 文件 | ✅ | 查看 memory 文件事件记录 |
| 当前会话 | data 文件 | ✅ | 查看 data/current-session.json |

---

## 前后端数据同步

**前端**:
- 每 1 秒从 `/api/status` 获取最新数据
- 5 秒缓存（避免频繁请求）
- API 失败时使用 localStorage 缓存兜底

**后端**:
- 每次调用 `generate-status.js` 重新生成 `api/status.json`
- 数据来自持久化文件，非内存缓存

**同步机制**:
```
前端 fetch('/api/status')
    ↓
后端返回 api/status.json (最新生成)
    ↓
前端解析并更新 UI
    ↓
localStorage 缓存 (5 秒)
```

---

## 后续优化建议

1. **自动消息计数**: 在消息处理流程中自动调用 `generate-status.js message`

2. **学习事件自动记录**: 当调用搜索/阅读技能时，自动记录学习事件

3. **会话状态自动更新**: 任务开始/结束时自动更新 current-session.json

4. **数据校验**: 添加数据范围校验，防止异常值

5. **API 端点**: 考虑使用 Cloudflare Worker 或本地 HTTP 服务提供 API

---

## 文件清单

```
workspace-status/
├── index.html              # 前端页面
├── generate-status.js      # 状态生成脚本（核心）
├── record-learning.js      # 学习记录工具
├── update-status.js        # 状态更新脚本
├── api/
│   └── status.json         # 实时状态数据（由 generate-status.js 生成）
├── data/
│   ├── message-count.txt   # 消息计数
│   ├── today-start-time.txt # 今日开始时间
│   ├── learning-events.jsonl # 学习事件记录
│   ├── current-session.json # 当前会话状态
│   └── learning-progress.json # (已废弃，改用事件累加)
└── DEPLOY.md               # 部署说明
```

---

**文档版本**: 2026-03-12  
**最后更新**: 方案 B 混合模式实现完成
