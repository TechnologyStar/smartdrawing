# 项目结构

```
fireworks-image-platform/
├── src/                      # 源代码目录
│   ├── index.js             # 主入口文件（路由 + HTML）
│   ├── auth.js              # 用户认证模块（注册/登录/兑换）
│   ├── generate.js          # 图片生成模块
│   ├── admin.js             # 管理员功能模块
│   └── utils.js             # 工具函数（JWT/随机码生成等）
├── docs/                     # 文档目录
│   ├── API.md               # API 接口文档
│   ├── DEPLOY.md            # 部署指南
│   └── USAGE.md             # 使用指南
├── package.json             # 项目配置
├── wrangler.toml            # Cloudflare Workers 配置
├── .gitignore               # Git 忽略文件
└── README.md                # 项目说明
```

## 模块说明

### src/index.js
- 主入口文件
- 处理路由分发
- 包含用户端和管理端的 HTML 页面

### src/auth.js
- `handleRegister()` - 用户注册
- `handleLogin()` - 用户登录
- `handleGetUserInfo()` - 获取用户信息
- `handleRedeem()` - 兑换码充值

### src/generate.js
- `handleGenerate()` - 调用 Fireworks API 生成图片
- `handleGetRecords()` - 获取用户生成记录

### src/admin.js
- `handleCreateCode()` - 生成兑换码
- `handleGetUsers()` - 获取用户列表
- `handleGetAllRecords()` - 获取所有生成记录
- `handleGetStats()` - 获取统计信息

### src/utils.js
- `generateToken()` - 生成 JWT Token
- `verifyToken()` - 验证 JWT Token
- `generateRedeemCode()` - 生成兑换码
- `jsonResponse()` - 返回 JSON 响应
- `getUserFromRequest()` - 从请求中获取用户信息
- `safeJson()` - 安全的 JSON 解析
- `sleep()` - 延迟函数

## 数据存储

使用 Cloudflare KV 存储，键值结构：

### 用户数据
- **Key**: `user:{username}`
- **Value**:
  ```json
  {
    "username": "testuser",
    "password": "password123",
    "credits": 10,
    "createdAt": 1707654321000,
    "totalGenerated": 5
  }
  ```

### 兑换码数据
- **Key**: `code:{code}`
- **Value**:
  ```json
  {
    "code": "ABCD1234EFGH5678",
    "credits": 10,
    "used": false,
    "createdAt": 1707654321000,
    "usedBy": null,
    "usedAt": null
  }
  ```

### 生成记录
- **Key**: `record:{username}:{timestamp}`
- **Value**:
  ```json
  {
    "username": "testuser",
    "prompt": "A beautiful sunset",
    "imageUrl": "https://...",
    "requestId": "req_abc123",
    "createdAt": 1707654321000,
    "aspectRatio": "16:9",
    "seed": 12345
  }
  ```

## API 路由

### 用户端
- `POST /api/register` - 注册
- `POST /api/login` - 登录
- `GET /api/user` - 获取用户信息
- `POST /api/redeem` - 兑换积分
- `POST /api/generate` - 生成图片
- `GET /api/records` - 获取生成记录

### 管理端
- `POST /api/admin/codes` - 生成兑换码
- `GET /api/admin/users` - 获取用户列表
- `GET /api/admin/records` - 获取所有生成记录
- `GET /api/admin/stats` - 获取统计信息

## 技术栈

- **运行环境**: Cloudflare Workers
- **数据存储**: Cloudflare KV
- **AI 服务**: Fireworks AI FLUX.1 Kontext Pro
- **认证方式**: JWT (用户端) / Basic Auth (管理端)
- **前端**: 原生 HTML + CSS + JavaScript（无框架）
