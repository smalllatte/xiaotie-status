#!/usr/bin/env node
// 学习进度记录工具
// 用法：node record-learning.js "OTA 行业知识" 2 "学习了市场分析方法"

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'learning-events.jsonl');
const GENERATE_SCRIPT = path.join(__dirname, 'generate-status.js');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const topics = {
  '1': 'OTA 行业知识',
  '2': '交通业务产品',
  '3': '产品经理技能',
  'ota': 'OTA 行业知识',
  'traffic': '交通业务产品',
  'pm': '产品经理技能'
};

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
  console.log(`
📚 小铁学习进度记录工具

用法:
  node record-learning.js <主题> [增量] [描述]

主题可以是:
  1 / ota        - OTA 行业知识
  2 / traffic    - 交通业务产品
  3 / pm         - 产品经理技能

示例:
  node record-learning.js ota 2 "阅读了 OTA 市场分析报告"
  node record-learning.js 3 1 "学习了需求分析方法"
  node record-learning.js pm 3 "完成竞品分析框架学习"

快捷命令:
  node record-learning.js auto  - 根据最近学习内容自动记录
`);
  process.exit(0);
}

// 解析主题
let topic = args[0];
if (topics[topic.toLowerCase()]) {
  topic = topics[topic.toLowerCase()];
}

const increment = parseInt(args[1]) || 1;
const description = args.slice(2).join(' ') || '';

// 记录事件
const event = {
  timestamp: Date.now(),
  topic: topic,
  increment: increment,
  description: description
};

fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n');
console.log(`✅ 学习记录：${topic} +${increment}%`);
if (description) {
  console.log(`   描述：${description}`);
}

// 重新生成状态
const { execSync } = require('child_process');
try {
  execSync(`node ${GENERATE_SCRIPT}`, { stdio: 'inherit' });
} catch (e) {
  console.error('重新生成状态失败:', e.message);
}
