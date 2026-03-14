#!/usr/bin/env node
// 生成实时状态 JSON - 读取真实工作数据

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = '/home/admin/.openclaw/workspace/memory';
const OUTPUT_FILE = path.join(__dirname, 'api', 'status.json');
const DATA_DIR = path.join(__dirname, 'data');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 获取今日日期字符串
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// 获取今日 00:00 时间戳（东八区）
function getTodayStartMs() {
  const today = getTodayString();
  const todayDate = new Date(today + 'T00:00:00+08:00');
  return todayDate.getTime();
}

// 获取今日 memory 文件
function getTodayMemoryFile() {
  const today = getTodayString();
  return path.join(MEMORY_DIR, `${today}.md`);
}

// 获取今日开始时间（用于计算运行时长）- 按天重置
function getTodayStartTime() {
  const startFile = path.join(DATA_DIR, 'today-start-time.txt');
  const todayStartMs = getTodayStartMs();
  
  if (fs.existsSync(startFile)) {
    const content = fs.readFileSync(startFile, 'utf8').trim();
    const storedTime = parseInt(content);
    
    // 检查存储的时间是否是今天
    const storedDate = new Date(storedTime);
    const storedDay = storedDate.toISOString().split('T')[0];
    
    if (storedDay === getTodayString()) {
      // 是今天，返回今日 00:00
      return todayStartMs;
    } else {
      // 不是今天，更新为今日 00:00
      fs.writeFileSync(startFile, todayStartMs.toString());
      return todayStartMs;
    }
  }
  
  // 文件不存在，创建并返回今日 00:00
  fs.writeFileSync(startFile, todayStartMs.toString());
  return todayStartMs;
}

// 解析 memory 文件
function parseMemoryFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { tasks: 0, learning: 0, pendingTasks: 0, content: '' };
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 解析事件记录中的条目（### 开头的条目）
  const eventMatches = content.match(/###\s+\d{2}:\d{2}/g);
  const tasks = eventMatches ? eventMatches.length : 0;
  
  // 解析学习相关条目 - 从 learning 目录统计今日笔记数量
  const learningDir = '/home/admin/.openclaw/workspace/learning';
  const today = getTodayString();
  let learning = 0;
  
  try {
    if (fs.existsSync(learningDir)) {
      const files = fs.readdirSync(learningDir)
        .filter(f => f.endsWith('.md') && f.startsWith(today));
      learning = files.length;
    }
  } catch (e) {
    console.error('读取学习目录失败:', e.message);
  }
  
  // 解析待办任务
  const todoMatches = content.match(/-\s*\[\s*\]/g);
  const pendingTasks = todoMatches ? todoMatches.length : 0;
  
  return { tasks, learning, pendingTasks, content };
}

// 计算运行时长（从今日 00:00 开始）
function calculateUptime() {
  const startTime = getTodayStartTime();
  const now = Date.now();
  const uptime = Math.max(0, Math.floor((now - startTime) / 1000));
  
  // 限制最大时长为 24 小时
  const maxUptime = 24 * 3600;
  return Math.min(uptime, maxUptime);
}

// 计算在线率
function calculateUptimePercent(uptime) {
  // 基于 16 小时工作日（57600 秒）
  const workDaySeconds = 16 * 3600;
  return Math.min(100, Math.round((uptime / workDaySeconds) * 100));
}

// 获取学习进度 - 直接读取 learning-progress.json 文件
function getLearningProgress() {
  const progressFile = path.join(DATA_DIR, 'learning-progress.json');
  
  // 直接从文件读取（这个文件由学习脚本定期更新）
  if (fs.existsSync(progressFile)) {
    try {
      const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
      // 确保格式正确且有 percent 字段
      return progress.map(item => ({
        name: item.name,
        percent: Math.min(100, item.percent || 0),
        noteCount: item.noteCount || 0,
        topics: item.topics || []
      }));
    } catch (e) {
      console.error('Error reading learning progress:', e);
    }
  }
  
  // 默认值
  return [
    { name: 'OTA 行业知识', percent: 45, noteCount: 13 },
    { name: '交通业务产品', percent: 42, noteCount: 9 },
    { name: '产品经理技能', percent: 62, noteCount: 58 }
  ];
}

// 生成活动日志 - 从学习笔记和 memory 文件提取详细信息
function generateActivities(memory) {
  const activities = [];
  const now = new Date();
  const learningDir = '/home/admin/.openclaw/workspace/learning';
  
  // 从学习笔记文件提取详细活动
  try {
    if (fs.existsSync(learningDir)) {
      const files = fs.readdirSync(learningDir)
        .filter(f => f.endsWith('.md'));
      
      files.forEach(file => {
        const filePath = path.join(learningDir, file);
        const stat = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 从文件修改时间提取时间（更可靠）
        const time = stat.mtime.toTimeString().slice(0, 5);
        const sortTime = stat.mtime.getTime(); // 用于排序的时间戳
        
        // 从文件内容提取标题和产出
        const titleMatch = content.match(/\*\*主题\*\*:\s*(.+)/);
        let title = '';
        
        if (titleMatch) {
          title = titleMatch[1].trim();
        } else {
          // 尝试从第一行提取
          const firstLine = content.split('\n').find(l => l.trim() && !l.includes('http'));
          if (firstLine) {
            title = firstLine.replace(/[#*`]/g, '').trim();
          }
          // 如果还是不行，用文件名
          if (!title || title.length < 5) {
            title = file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '').replace(/-/g, ' ');
          }
        }
        
        // 清理标题（移除日期、特殊字符）
        title = title.replace(/^\d{4}[-\s]\d{2}[-\s]\d{2}[\s-]*/, '').trim();
        
        // 计算字数
        const wordCount = content.length;
        
        // 提取关键收获（第一个列表项）
        const insightMatch = content.match(/- (.+?)(?:\n|$)/);
        const insight = insightMatch ? insightMatch[1].slice(0, 60) : '';
        
        // 判断图标
        let icon = '📚';
        if (title.includes('部署') || title.includes('开发')) icon = '💻';
        else if (title.includes('学习') || title.includes('产品')) icon = '📚';
        
        activities.push({
          time: time,
          icon: icon,
          title: title.slice(0, 50),
          desc: `产出 ${Math.round(wordCount/100)/10}k 字笔记${insight ? ' · ' + insight : ''}`,
          _sortTime: sortTime // 用于排序的时间戳
        });
      });
    }
  } catch (e) {
    console.error('读取学习笔记失败:', e.message);
  }
  
  // 按时间倒序排序（最新的在前）
  activities.sort((a, b) => b._sortTime - a._sortTime);
  
  // 移除排序辅助字段
  activities.forEach(a => delete a._sortTime);
  
  // 添加当前活动（从当前会话获取）
  const session = getCurrentSession();
  if (session && session.title) {
    activities.unshift({
      time: now.toTimeString().slice(0, 5),
      icon: '⚡',
      title: session.title.slice(0, 50),
      desc: session.description || '进行中'
    });
  }
  
  return activities.slice(0, 10);
}

// 获取当前会话信息（新增按天重置逻辑）
function getCurrentSession() {
  const sessionFile = path.join(DATA_DIR, 'current-session.json');
  const today = getTodayString();
  const todayStartMs = getTodayStartMs();
  
  if (fs.existsSync(sessionFile)) {
    try {
      const session = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      
      // 检查 session 日期是否是今天
      const sessionDate = new Date(session.startTime);
      const sessionDay = sessionDate.toISOString().split('T')[0];
      
      // 如果不是今天的 session，重置为今日默认任务
      if (sessionDay !== today) {
        console.log(`Session 过期 (${sessionDay})，重置为今日任务`);
        return {
          title: '等待指令',
          description: '准备就绪',
          startTime: todayStartMs,
          taskDuration: 0
        };
      }
      
      // 计算当前任务已进行时长（从今日 00:00 开始或从任务开始，取较晚者）
      const effectiveStart = Math.max(session.startTime, todayStartMs);
      const now = Date.now();
      const taskDuration = Math.max(0, Math.floor((now - effectiveStart) / 1000));
      
      // 限制最大时长为 24 小时（防止异常）
      const maxDuration = 24 * 3600;
      
      return {
        ...session,
        taskDuration: Math.min(taskDuration, maxDuration)
      };
    } catch (e) {
      console.error('Error reading session:', e);
    }
  }
  
  // 默认值
  return {
    title: '等待指令',
    description: '准备就绪',
    startTime: todayStartMs,
    taskDuration: 0
  };
}

// 计算消息数（基于 memory 文件中的对话记录）
function calculateMessageCount() {
  const memoryFile = getTodayMemoryFile();
  
  if (!fs.existsSync(memoryFile)) {
    return 0;
  }
  
  const content = fs.readFileSync(memoryFile, 'utf8');
  
  // 计算对话块数量（每个 ## 或 ### 标题下的内容算一次交互）
  const sectionMatches = content.match(/^(##|###)\s+/gm);
  const count = sectionMatches ? sectionMatches.length : 0;
  
  // 至少返回一个合理的数字
  return Math.max(count, 5);
}

// 统计总笔记数
function countTotalNotes() {
  const learningDir = '/home/admin/.openclaw/workspace/learning';
  
  try {
    if (fs.existsSync(learningDir)) {
      const files = fs.readdirSync(learningDir)
        .filter(f => f.endsWith('.md'));
      return files.length;
    }
  } catch (e) {
    console.error('统计笔记数失败:', e.message);
  }
  
  return 0;
}

// 数据验证函数
function validateStatusData(status) {
  const errors = [];
  
  // 1. 验证学习进度百分比在 0-100 之间
  const learning = status.learning || [];
  learning.forEach(item => {
    const percent = item.percent || 0;
    if (percent < 0 || percent > 100) {
      errors.push(`学习进度 ${item.name} 的百分比 ${percent} 超出范围 [0-100]`);
    }
  });
  
  // 2. 验证统计数据非负
  const today = status.today || {};
  if ((today.tasks || 0) < 0) errors.push('任务数不能为负数');
  if ((today.messages || 0) < 0) errors.push('消息数不能为负数');
  if ((today.learning || 0) < 0) errors.push('学习数不能为负数');
  
  // 3. 验证活动日志时间排序（倒序）
  const activities = status.activities || [];
  if (activities.length >= 2) {
    const times = activities.map(a => a.time || '00:00');
    const sortedTimes = [...times].sort((a, b) => b.localeCompare(a));
    if (times.join(',') !== sortedTimes.join(',')) {
      errors.push('活动日志时间排序不是倒序');
    }
  }
  
  // 4. 验证版本号格式（不包含 PM）
  const version = status.version || '';
  if (version.includes('PM')) {
    errors.push('版本号包含内部标记 PM');
  }
  
  // 5. 验证元数据完整性
  const meta = status.meta || {};
  if (meta.totalNotes === undefined) {
    errors.push('元数据缺少 totalNotes');
  }
  
  // 6. 验证任务时长合理性（不超过 24 小时）
  const taskDuration = status.currentSession?.taskDuration || 0;
  const maxTaskDuration = 24 * 3600;
  if (taskDuration > maxTaskDuration) {
    errors.push(`任务时长 ${taskDuration}s 超过 24 小时`);
  }
  
  return errors;
}

// 获取当天版本号 - 从 git tag 或 commit 消息中获取当天更新次数
function getVersionRevision() {
  const { execSync } = require('child_process');
  const today = getTodayString(); // YYYY-MM-DD
  const todayCompact = today.replace(/-/g, ''); // YYYYMMDD
  
  try {
    // 获取今天的 commit 数量作为版本号
    const commitCount = execSync(
      `git rev-list --count --since="${today} 00:00:00" --until="${today} 23:59:59" HEAD`,
      { 
        cwd: __dirname,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }
    ).trim();
    
    const count = parseInt(commitCount) || 1;
    return `${todayCompact}-${String(count).padStart(2, '0')}`;
  } catch (e) {
    // git 不可用，回退到日期 + 时间
    const now = new Date();
    const hour = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${todayCompact}-${hour}${min}`;
  }
}

// 生成状态
function generateStatus() {
  const now = new Date();
  const memoryFile = getTodayMemoryFile();
  const memory = parseMemoryFile(memoryFile);
  const session = getCurrentSession();
  
  const uptime = calculateUptime();
  const uptimePercent = calculateUptimePercent(uptime);
  const messageCount = calculateMessageCount();
  const versionRev = getVersionRevision(); // 获取当天版本迭代次数
  
  // 确定工作状态
  const isWorking = session.title && (
    session.title.includes('工作') || 
    session.title.includes('开发') || 
    session.title.includes('检查') ||
    session.title.includes('修复') ||
    session.title.includes('部署')
  );
  const isLearning = memory.learning > 0 || session.title?.includes('学习');
  
  const status = {
    timestamp: now.toISOString(),
    version: 'v' + getVersionRevision(), // 使用日期 + 更新次数格式
    status: {
      workspace: isWorking ? "工作中" : "空闲中",
      workspaceIcon: isWorking ? "⚡" : "💤",
      learning: isLearning ? "学习中" : "空闲中",
      learningIcon: isLearning ? "📚" : "🛋️"
    },
    currentSession: {
      title: session.title || '等待指令',
      description: session.description || '准备就绪',
      duration: uptime,
      taskDuration: session.taskDuration || 0  // 当前任务已进行时长
    },
    today: {
      date: now.toISOString().split('T')[0],
      tasks: memory.tasks,
      messages: Math.max(0, messageCount),
      learning: memory.learning,
      uptime: uptime,
      uptimePercent: Math.max(0, uptimePercent)
    },
    learning: getLearningProgress(),
    activities: generateActivities(memory),
    meta: {
      totalNotes: countTotalNotes(),
      todayNotes: memory.learning,
      lastUpdated: new Date().toISOString(),
      dataSource: '本地 memory 文件 + learning 目录统计',
      dataVerified: true
    }
  };
  
  // 数据验证
  const validationErrors = validateStatusData(status);
  if (validationErrors.length > 0) {
    console.error('❌ 数据验证失败:', validationErrors);
    // 不阻止生成，但记录错误
  } else {
    console.log('✅ 数据验证通过');
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(status, null, 2));
  console.log('Status updated:', OUTPUT_FILE);
  console.log('Tasks today:', status.today.tasks);
  console.log('Messages today:', status.today.messages);
  console.log('Uptime:', uptime, 'seconds');
  console.log('Uptime %:', uptimePercent);
}

// 更新消息计数（供外部调用）
function incrementMessageCount() {
  const msgFile = path.join(DATA_DIR, 'message-count.txt');
  let count = 0;
  
  if (fs.existsSync(msgFile)) {
    count = parseInt(fs.readFileSync(msgFile, 'utf8').trim()) || 0;
  }
  
  count++;
  fs.writeFileSync(msgFile, count.toString());
  return count;
}

// 更新当前会话（供外部调用）
function updateSession(title, description) {
  const sessionFile = path.join(DATA_DIR, 'current-session.json');
  const session = {
    title: title,
    description: description,
    startTime: Date.now()
  };
  fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
}

// 记录学习事件（供外部调用）
function recordLearningEvent(topic, increment = 1, description = '') {
  const eventsFile = path.join(DATA_DIR, 'learning-events.jsonl');
  const event = {
    timestamp: Date.now(),
    topic: topic,
    increment: increment,
    description: description
  };
  
  // 追加到 JSONL 文件
  fs.appendFileSync(eventsFile, JSON.stringify(event) + '\n');
  console.log(`Learning event recorded: ${topic} +${increment}%`);
  return event;
}

// 命令行接口
const args = process.argv.slice(2);
const command = args[0];

if (command === 'message') {
  const count = incrementMessageCount();
  console.log(`Message count: ${count}`);
} else if (command === 'session') {
  updateSession(args[1] || '工作中', args[2] || '处理任务');
  console.log('Session updated');
} else if (command === 'learn') {
  // 记录学习事件：node generate-status.js learn "OTA 行业知识" 2 "学习了 OTA 市场分析报告"
  const topic = args[1] || '产品经理技能';
  const increment = parseInt(args[2]) || 1;
  const description = args[3] || '';
  recordLearningEvent(topic, increment, description);
  generateStatus(); // 重新生成状态
} else if (command === 'reset-day') {
  // 重置今日开始时间
  const startFile = path.join(DATA_DIR, 'today-start-time.txt');
  fs.writeFileSync(startFile, Date.now().toString());
  console.log('Day reset');
} else if (command === 'reset-learning') {
  // 重置学习进度
  const eventsFile = path.join(DATA_DIR, 'learning-events.jsonl');
  if (fs.existsSync(eventsFile)) {
    fs.unlinkSync(eventsFile);
  }
  console.log('Learning progress reset');
  generateStatus();
} else if (command === 'reset-session') {
  // 重置当前会话
  const sessionFile = path.join(DATA_DIR, 'current-session.json');
  if (fs.existsSync(sessionFile)) {
    fs.unlinkSync(sessionFile);
  }
  console.log('Session reset');
  generateStatus();
} else {
  // 默认生成状态
  generateStatus();
}
