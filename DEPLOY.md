# 小铁状态网站部署指南

## 当前状态
- ✅ 网站已开发完成
- ✅ 本地服务器可运行
- ❌ 需要公网访问

## 部署选项

### 选项1: GitHub Pages (推荐)

```bash
# 1. 创建 GitHub 仓库
# 访问 https://github.com/new 创建名为 xiaotie-status 的仓库

# 2. 推送代码
cd ~/.openclaw/workspace/workspace-status
git remote add origin https://github.com/YOUR_USERNAME/xiaotie-status.git
git push -u origin main

# 3. 启用 GitHub Pages
# 访问 https://github.com/YOUR_USERNAME/xiaotie-status/settings/pages
# 选择 Source: main branch
```

### 选项2: Vercel

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录并部署
vercel login
vercel --prod
```

### 选项3: Netlify

```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 登录并部署
netlify login
netlify deploy --prod --dir .
```

### 选项4: Cloudflare Pages

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录并部署
wrangler login
wrangler pages deploy . --project-name=xiaotie-status
```

### 选项5: 使用 ngrok (临时访问)

```bash
# 1. 注册 ngrok 账号获取 token
# 2. 配置 token
./ngrok config add-authtoken YOUR_TOKEN

# 3. 启动 tunnel
./ngrok http 8081
```

## 本地访问

```bash
cd ~/.openclaw/workspace/workspace-status
python3 -m http.server 8081
# 访问 http://localhost:8081
```

## 文件结构

```
workspace-status/
├── index.html      # 主页面
├── README.md       # 说明文档
└── DEPLOY.md       # 本部署指南
```
