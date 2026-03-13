# 🚀 部署到 Cloudflare Workers 指南

## 快速部署（推荐）

### 1. 登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器，授权 Cloudflare 访问权限。

### 2. 执行部署脚本

```bash
cd ~/.openclaw/workspace/workspace-status
./deploy-worker.sh
```

### 3. 获取访问地址

部署完成后，你会看到类似这样的地址：
```
https://xiaotie-status.<你的 subdomain>.workers.dev
```

### 4. 分享链接

将地址发送给老板，就可以通过 HTTPS 公开访问了！

---

## 手动部署（如果脚本失败）

### 1. 创建 KV 命名空间

```bash
wrangler kv namespace create "xiaotie_status"
```

输出类似：
```json
{
  "id": "abc123def456...",
  "title": "xiaotie_status"
}
```

### 2. 更新 wrangler.toml

编辑 `wrangler.toml`，将 KV ID 填入：
```toml
[[kv_namespaces]]
binding = "STATUS_KV"
id = "abc123def456..."  # 替换为上面的 ID
```

### 3. 部署

```bash
wrangler deploy
```

### 4. 初始化数据（可选）

```bash
# 设置开始时间
wrangler kv key put start_time "$(date +%s000)" --namespace-id=<KV_ID>

# 设置初始会话
wrangler kv key put session '{"title":"工作中","description":"部署完成"}' --namespace-id=<KV_ID>
```

---

## 部署后配置

### 自定义域名（可选）

在 Cloudflare Dashboard → Workers → xiaotie-status → Triggers → Custom Domains
添加自定义域名，例如：`status.yourdomain.com`

### CORS 配置

Worker 已配置允许所有来源访问（`Access-Control-Allow-Origin: *`），可以直接在网页中调用 API。

---

## API 端点

部署后可用以下 API：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/status` | GET | 获取实时状态 |
| `/api/message` | POST | 增加消息计数 |
| `/api/session` | POST | 更新当前会话 |
| `/api/learn` | POST | 记录学习事件 |

### API 示例

```bash
# 获取状态
curl https://xiaotie-status.workers.dev/api/status

# 更新会话
curl -X POST https://xiaotie-status.workers.dev/api/session \
  -H "Content-Type: application/json" \
  -d '{"title":"工作中","description":"处理用户请求"}'

# 记录学习
curl -X POST https://xiaotie-status.workers.dev/api/learn \
  -H "Content-Type: application/json" \
  -d '{"topic":"OTA 行业知识","increment":2,"description":"学习了市场分析"}'
```

---

## 故障排查

### 部署失败

```bash
# 检查登录状态
wrangler whoami

# 重新登录
wrangler logout
wrangler login

# 查看详细错误
wrangler deploy --dry-run
```

### KV 读取失败

确保 KV 命名空间 ID 正确，并且已在 wrangler.toml 中配置。

### 静态文件 404

确保 index.html 在部署目录中，检查 wrangler.toml 的 `[assets]` 配置。

---

## 成本

Cloudflare Workers 免费额度：
- 每天 100,000 次请求
- 100KB 存储
- 10ms CPU 时间/请求

对于状态看板应用，完全够用！

---

**创建时间**: 2026-03-12  
**最后更新**: 2026-03-12
