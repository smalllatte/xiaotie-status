#!/usr/bin/env node
// 测试前端数据获取逻辑

const http = require('http');

const API_URL = 'http://localhost:8082/api/status.json';

console.log('🧪 测试前端数据获取逻辑...\n');

// 模拟前端 getData 函数
async function getData() {
    return new Promise((resolve, reject) => {
        const url = API_URL + '?t=' + Date.now();
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('JSON 解析失败：' + e.message));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

// 测试
(async () => {
    try {
        console.log('📡 请求 API:', API_URL);
        const data = await getData();
        
        console.log('✅ 数据获取成功\n');
        console.log('📊 数据内容:');
        console.log(`   - Tasks: ${data.today.tasks}`);
        console.log(`   - Messages: ${data.today.messages}`);
        console.log(`   - Learning: ${data.today.learning}`);
        console.log(`   - Uptime: ${data.today.uptime}s (${Math.floor(data.today.uptime/3600)}h ${Math.floor((data.today.uptime%3600)/60)}m)`);
        console.log(`   - Uptime%: ${data.today.uptimePercent}%`);
        console.log(`   - Learning Progress:`);
        data.learning.forEach(l => {
            console.log(`     • ${l.name}: ${l.percent}%`);
        });
        
        console.log('\n✅ 前端逻辑测试通过！数据应该正常显示。');
        console.log('\n💡 如果网页仍显示 0，可能是:');
        console.log('   1. 浏览器缓存了旧版 index.html');
        console.log('   2. JavaScript 执行被阻止');
        console.log('   3. CORS 问题（但本地访问不应该）');
        console.log('\n🔧 解决方法:');
        console.log('   - 强制刷新：Ctrl+F5 或 Cmd+Shift+R');
        console.log('   - 清除缓存后重新加载');
        console.log('   - 打开开发者工具查看控制台错误');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        process.exit(1);
    }
})();
