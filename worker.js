// Cloudflare Worker - 小铁实时状态 API + 静态文件服务
// 部署到 Cloudflare Workers，提供 HTTPS 公开访问

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS 处理
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
    
    // API 路由
    if (url.pathname === '/api/status') {
      const status = await getStatus(env);
      return jsonResponse(status);
    }
    
    // 增加消息计数
    if (url.pathname === '/api/message' && request.method === 'POST') {
      const count = await incrementMessageCount(env);
      return jsonResponse({ count });
    }
    
    // 更新会话
    if (url.pathname === '/api/session' && request.method === 'POST') {
      const body = await request.json();
      await updateSession(env, body);
      return jsonResponse({ success: true });
    }
    
    // 记录学习事件
    if (url.pathname === '/api/learn' && request.method === 'POST') {
      const body = await request.json();
      await recordLearning(env, body);
      return jsonResponse({ success: true });
    }
    
    // 静态文件服务（从 ASSETS 绑定读取）
    if (env.ASSETS) {
      try {
        let path = url.pathname;
        if (path === '/' || path === '') {
          path = '/index.html';
        }
        const asset = env.ASSETS.get(path);
        if (asset) {
          const contentType = getContentType(path);
          return new Response(asset, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=300'
            }
          });
        }
      } catch (e) {
        console.error('Asset serve error:', e);
      }
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

async function getStatus(env) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // 从 KV 读取数据
  const startTime = await env.STATUS_KV.get('start_time') || now.getTime().toString();
  const messageCount = parseInt(await env.STATUS_KV.get('message_count') || '0');
  const taskCount = parseInt(await env.STATUS_KV.get('task_count') || '0');
  const learningCount = parseInt(await env.STATUS_KV.get('learning_count') || '0');
  const sessionData = JSON.parse(await env.STATUS_KV.get('session') || '{}');
  const learningProgress = JSON.parse(await env.STATUS_KV.get('learning_progress') || '[]');
  const activities = JSON.parse(await env.STATUS_KV.get('activities') || '[]');
  
  // 计算运行时长
  const uptime = Math.floor((now.getTime() - parseInt(startTime)) / 1000);
  const uptimePercent = Math.min(100, Math.round((uptime / 57600) * 100));
  
  // 确定工作状态
  const isWorking = sessionData.title && (
    sessionData.title.includes('工作') || 
    sessionData.title.includes('开发') || 
    sessionData.title.includes('检查')
  );
  const isLearning = learningCount > 0;
  
  return {
    timestamp: now.toISOString(),
    status: {
      workspace: isWorking ? "工作中" : "空闲中",
      workspaceIcon: isWorking ? "⚡" : "💤",
      learning: isLearning ? "学习中" : "空闲中",
      learningIcon: isLearning ? "📚" : "🛋️"
    },
    currentSession: {
      title: sessionData.title || "等待指令",
      description: sessionData.description || "准备就绪",
      duration: uptime
    },
    today: {
      date: today,
      tasks: taskCount,
      messages: messageCount,
      learning: learningCount,
      uptime: uptime,
      uptimePercent: uptimePercent
    },
    learning: learningProgress.length > 0 ? learningProgress : [
      { name: 'OTA 行业知识', percent: 0 },
      { name: '交通业务产品', percent: 0 },
      { name: '产品经理技能', percent: 0 }
    ],
    activities: activities.slice(0, 10)
  };
}

async function incrementMessageCount(env) {
  const current = parseInt(await env.STATUS_KV.get('message_count') || '0');
  const next = current + 1;
  await env.STATUS_KV.put('message_count', next.toString());
  return next;
}

async function updateSession(env, body) {
  await env.STATUS_KV.put('session', JSON.stringify(body));
}

async function recordLearning(env, body) {
  const { topic, increment = 1, description = '' } = body;
  
  // 获取当前学习进度
  let progress = JSON.parse(await env.STATUS_KV.get('learning_progress') || '[]');
  
  // 更新对应主题的进度
  const topicIndex = progress.findIndex(p => p.name === topic);
  if (topicIndex >= 0) {
    progress[topicIndex].percent = Math.min(100, progress[topicIndex].percent + increment);
  } else {
    progress.push({ name: topic, percent: increment });
  }
  
  await env.STATUS_KV.put('learning_progress', JSON.stringify(progress));
  
  // 增加学习计数
  const current = parseInt(await env.STATUS_KV.get('learning_count') || '0');
  await env.STATUS_KV.put('learning_count', (current + 1).toString());
}

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function getContentType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const types = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon'
  };
  return types[ext] || 'text/plain';
}
