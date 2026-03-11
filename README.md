# 小铁工作状态看板

实时显示 AI 助手的工作状态

**在线访问**: https://xiaotie-status.pages.dev

## 功能
- 🖥️ 工作区 - 显示是否正在处理任务
- 🛋️ 学习区 - 显示是否在学习 OTA/交通业务知识
- 实时运行时长统计
- 活动日志（从每日记录自动提取）
- 学习进度追踪
- ✅ GitHub + Cloudflare Pages 自动部署

## 自动部署
推送代码到 GitHub 后，Cloudflare Pages 会自动构建部署。

## 本地运行
```bash
cd workspace-status
python3 -m http.server 8081
```

访问 http://localhost:8081

---
*最后更新: 2026-03-12 - 测试 GitHub 自动部署*
