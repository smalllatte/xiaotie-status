#!/usr/bin/env node
// 状态更新脚本 - 由主会话调用，更新实时状态到本地文件
// 部署时会被打包供 Worker 读取

const fs = require('fs');
const path = require('path');

const STATUS_FILE = path.join(__dirname, 'data', 'realtime-status.json');
const DATA_DIR = path.join(__dirname, 'data');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 读取今日统计
function getTodayStats() {
  const today = new Date().toISOString().split('T')[0];
  const statsFile = path.join(DATA_DIR, `stats-${today}.json`);
  
  if (fs.existsSync(statsFile)) {
    return JSON.parse(fs.readFileSync(statsFile, 'utf8'));
  }
  
  return { tasks: 0, messages: 0, learning: 0, startTime: Date.now() };
}

// 保存今日统计
function saveTodayStats(stats) {
  const today = new Date().toISOString().split('T')[0];
  const statsFile = path.join(DATA_DIR, `stats-${today}.json`);
  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
}

// 更新状态
function updateStatus(data) {
  const today = new Date().toISOString().split('T')[0];
  const stats = getTodayStats();
  
  // 更新统计
  if (data.taskCompleted) stats.tasks++;
  if (data.messageReceived) stats.messages++;
  if (data.learningItem) stats.learning++;
  
  saveTodayStats(stats);
  
  // 构建完整状态
  const status = {
    timestamp: new Date().toISOString(),
    today: today,
    stats: stats,
    session: data.session || null,
    tasks: data.tasks || [],
    learning: data.learning || getDefaultLearningProgress()
  };
  
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  console.log('Status updated:', STATUS_FILE);
}

function getDefaultLearningProgress() {
  return [
    { name: 'OTA 行业知识', percent: 15 },
    { name: '交通业务产品', percent: 8 },
    { name: '产品经理技能', percent: 22 }
  ];
}

// 命令行接口
const args = process.argv.slice(2);
const command = args[0];

if (command === 'task') {
  const stats = getTodayStats();
  stats.tasks++;
  saveTodayStats(stats);
  console.log(`Task count: ${stats.tasks}`);
} else if (command === 'message') {
  const stats = getTodayStats();
  stats.messages++;
  saveTodayStats(stats);
  console.log(`Message count: ${stats.messages}`);
} else if (command === 'session') {
  const sessionData = {
    title: args[1] || '工作中',
    description: args[2] || '处理用户指令',
    startTime: Date.now()
  };
  updateStatus({ session: sessionData });
} else if (command === 'get') {
  if (fs.existsSync(STATUS_FILE)) {
    console.log(fs.readFileSync(STATUS_FILE, 'utf8'));
  } else {
    console.log(JSON.stringify({ error: 'No status file' }, null, 2));
  }
} else {
  // 默认更新当前状态
  updateStatus({
    session: {
      title: '活跃中',
      description: '等待用户指令',
      startTime: Date.now() - 1000 * 60 * 30 // 假设已在线30分钟
    }
  });
}
