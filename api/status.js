// Cloudflare Worker - 小铁实时状态 API
// 部署到 Cloudflare Workers，供状态页面调用

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/status') {
      // 读取本地状态文件
      const status = await getRealtimeStatus(env);
      
      return new Response(JSON.stringify(status), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

async function getRealtimeStatus(env) {
  // 从环境变量或 KV 存储读取实时数据
  // 这些数据由主会话定期更新
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // 尝试从 KV 读取今日数据
  let todayStats = { tasks: 0, messages: 0, learning: 0 };
  let currentSession = null;
  let activeTasks = [];
  
  try {
    if (env.STATUS_KV) {
      const stored = await env.STATUS_KV.get(`status:${today}`);
      if (stored) {
        const data = JSON.parse(stored);
        todayStats = data.stats || todayStats;
        currentSession = data.session || null;
        activeTasks = data.tasks || [];
      }
    }
  } catch (e) {
    console.error('KV read error:', e);
  }
  
  // 计算在线时长（从今日第一条消息开始）
  const uptime = calculateUptime(today);
  
  // 学习进度（从持久化存储读取）
  const learningProgress = await getLearningProgress(env);
  
  return {
    timestamp: now.toISOString(),
    status: {
      workspace: currentSession ? '工作中' : '空闲中',
      workspaceIcon: currentSession ? '⚡' : '💤',
      learning: activeTasks.some(t => t.type === 'learning') ? '学习中' : '空闲中',
      learningIcon: activeTasks.some(t => t.type === 'learning') ? '📚' : '🛋️'
    },
    currentSession: currentSession || {
      title: '等待指令',
      description: '准备就绪',
      duration: uptime
    },
    today: {
      date: today,
      tasks: todayStats.tasks,
      messages: todayStats.messages,
      learning: todayStats.learning,
      uptime: uptime,
      uptimePercent: Math.min(100, Math.round((uptime / 86400) * 100)) // 基于24小时计算
    },
    learning: learningProgress,
    activeTasks: activeTasks.slice(0, 5) // 只返回最近5个
  };
}

function calculateUptime(today) {
  // 简化计算：假设从早上8点开始在线
  const startOfDay = new Date(`${today}T08:00:00`);
  const now = new Date();
  const uptimeSeconds = Math.floor((now - startOfDay) / 1000);
  return Math.max(0, uptimeSeconds);
}

async function getLearningProgress(env) {
  // 默认学习进度
  const defaultProgress = [
    { name: 'OTA 行业知识', percent: 15 },
    { name: '交通业务产品', percent: 8 },
    { name: '产品经理技能', percent: 22 }
  ];
  
  try {
    if (env.STATUS_KV) {
      const stored = await env.STATUS_KV.get('learning:progress');
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (e) {
    console.error('Learning progress read error:', e);
  }
  
  return defaultProgress;
}
