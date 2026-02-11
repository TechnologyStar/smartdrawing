# API 文档

## 基础信息

- **Base URL**: `https://your-worker-url.workers.dev`
- **认证方式**: JWT Bearer Token（用户端）/ Basic Auth（管理端）

## 用户端 API

### 1. 注册

**POST** `/api/register`

**请求体**:
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**响应**:
```json
{
  "message": "注册成功",
  "username": "testuser"
}
```

### 2. 登录

**POST** `/api/login`

**请求体**:
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**响应**:
```json
{
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "testuser",
    "credits": 0,
    "totalGenerated": 0
  }
}
```

### 3. 获取用户信息

**GET** `/api/user`

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "username": "testuser",
  "credits": 10,
  "totalGenerated": 5,
  "createdAt": 1707654321000
}
```

### 4. 兑换积分

**POST** `/api/redeem`

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "code": "ABCD1234EFGH5678"
}
```

**响应**:
```json
{
  "message": "兑换成功",
  "credits": 10,
  "totalCredits": 20
}
```

### 5. 生成图片

**POST** `/api/generate`

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "prompt": "A beautiful sunset over the ocean",
  "aspect_ratio": "16:9",
  "output_format": "png",
  "seed": 12345
}
```

**参数说明**:
- `prompt` (必填): 提示词
- `aspect_ratio` (可选): 宽高比，可选值：`1:1`, `4:3`, `3:4`, `16:9`, `9:16`, `21:9`, `9:21`
- `output_format` (可选): 输出格式，`png` 或 `jpeg`，默认 `png`
- `seed` (可选): 随机种子，用于复现相同结果

**响应**:
```json
{
  "message": "生成成功",
  "request_id": "req_abc123",
  "image_url": "https://...",
  "credits_remaining": 9
}
```

### 6. 获取生成记录

**GET** `/api/records?limit=20`

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "records": [
    {
      "username": "testuser",
      "prompt": "A beautiful sunset",
      "imageUrl": "https://...",
      "requestId": "req_abc123",
      "createdAt": 1707654321000,
      "aspectRatio": "16:9",
      "seed": 12345
    }
  ]
}
```

## 管理端 API

所有管理端 API 需要 Basic Auth 认证：

**请求头**:
```
Authorization: Basic base64(admin:password)
```

### 1. 生成兑换码

**POST** `/api/admin/codes`

**请求体**:
```json
{
  "credits": 10,
  "count": 5
}
```

**响应**:
```json
{
  "message": "生成成功",
  "codes": [
    "ABCD1234EFGH5678",
    "WXYZ9876STUV5432"
  ],
  "credits": 10
}
```

### 2. 获取用户列表

**GET** `/api/admin/users`

**响应**:
```json
{
  "users": [
    {
      "username": "testuser",
      "credits": 10,
      "totalGenerated": 5,
      "createdAt": 1707654321000
    }
  ]
}
```

### 3. 获取所有生成记录

**GET** `/api/admin/records?limit=50`

**响应**:
```json
{
  "records": [
    {
      "username": "testuser",
      "prompt": "A beautiful sunset",
      "imageUrl": "https://...",
      "requestId": "req_abc123",
      "createdAt": 1707654321000,
      "aspectRatio": "16:9",
      "seed": 12345
    }
  ]
}
```

### 4. 获取统计信息

**GET** `/api/admin/stats`

**响应**:
```json
{
  "totalUsers": 100,
  "totalRecords": 500,
  "totalCodes": 50,
  "usedCodes": 30,
  "totalCredits": 200
}
```

## 错误响应

所有 API 在出错时返回以下格式：

```json
{
  "error": "错误描述"
}
```

常见 HTTP 状态码：
- `200`: 成功
- `400`: 请求参数错误
- `401`: 未授权
- `500`: 服务器错误
- `502`: 上游服务错误（Fireworks API）
- `504`: 请求超时
