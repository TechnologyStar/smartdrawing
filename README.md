# Fireworks 生图平台

基于 Cloudflare Workers + Fireworks FLUX.1 Kontext Pro 的 AI 图片生成平台

## 功能特性

### 用户功能
- 用户注册/登录系统（JWT 认证）
- **Linux Do OAuth 登录**（支持社区账号登录）
- 兑换码系统（积分充值）
- AI 图片生成（基于 FLUX.1 Kontext Pro）
- **内容审核系统**（敏感词过滤）
- 多种宽高比支持（1:1, 4:3, 16:9 等）
- 生成记录查询和历史管理
- Seed 复现功能

### 管理功能
- 管理员后台（Basic Auth）
- 批量生成兑换码
- 用户管理和查询
- 生成记录统计
- 平台数据概览
- **审核记录查看**
- **敏感词管理**
- **多 API Key 轮询统计**

### 技术特性
- 一键部署到 Cloudflare Workers
- 无服务器架构，零运维成本
- 使用 Cloudflare KV 存储数据
- **多 API Key 轮询机制**（负载均衡）
- 完全响应式设计
- 无需数据库，开箱即用

## 快速开始

### 1. 安装依赖

```bash
npm install -g wrangler
npm install
```

### 2. 配置环境变量

创建 KV 命名空间：

```bash
wrangler kv:namespace create DB
```

将返回的 `id` 填入 `wrangler.toml` 中的 `kv_namespaces.id`

设置密钥：

```bash
wrangler secret put FIREWORKS_API_KEY
wrangler secret put JWT_SECRET
```

### 3. 本地开发

```bash
npm run dev
```

### 4. 部署到 Cloudflare Workers

```bash
npm run deploy
```

## 使用说明

### 用户端

1. 访问首页注册账号
2. 使用兑换码充值积分
3. 输入 Prompt 生成图片（每次消耗 1 积分）
4. 查看生成历史

详细使用指南：[docs/USAGE.md](docs/USAGE.md)

### 管理端

访问 `/admin` 使用管理员密码登录：

- 生成兑换码
- 查看用户列表
- 查看生成记录统计

## 文档

- [部署指南](docs/DEPLOY.md) - 详细的部署步骤
- [API 文档](docs/API.md) - 完整的 API 接口说明
- [使用指南](docs/USAGE.md) - 用户和管理员使用说明
- [项目结构](docs/STRUCTURE.md) - 代码结构和模块说明

## 技术栈

- **运行环境**: Cloudflare Workers
- **数据存储**: Cloudflare KV
- **AI 服务**: Fireworks AI FLUX.1 Kontext Pro
- **认证方式**: JWT (用户端) / Basic Auth (管理端)
- **前端**: 原生 HTML + CSS + JavaScript

## 特点

- **零成本部署**: 使用 Cloudflare Workers 免费套餐即可运行
- **无需数据库**: 使用 KV 存储，简单高效
- **开箱即用**: 无需复杂配置，一键部署
- **完全响应式**: 支持桌面和移动设备
- **安全可靠**: JWT 认证 + Basic Auth 双重保护

## 截图

### 用户端
- 登录/注册界面
- 图片生成界面
- 生成记录查询

### 管理端
- 统计概览
- 兑换码生成
- 用户管理

## 许可证

MIT
