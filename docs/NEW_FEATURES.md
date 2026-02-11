# 新功能说明

## 1. Linux Do OAuth 登录

### 功能说明
支持使用 Linux Do 社区账号登录，无需注册即可使用平台服务。

### 配置步骤

1. 访问 [Linux Do Connect](https://connect.linux.do) 申请接入
2. 填写应用信息，获取 Client ID 和 Client Secret
3. 设置回调地址为：`https://your-worker-url.workers.dev/api/linuxdo/callback`
4. 配置密钥：

```bash
wrangler secret put LINUXDO_CLIENT_ID
wrangler secret put LINUXDO_CLIENT_SECRET
```

### 使用方式

用户点击「使用 Linux Do 登录」按钮，系统会：
1. 跳转到 Linux Do 授权页面
2. 用户授权后自动创建账号
3. 根据信任等级自动分配初始积分：
   - TL0（新用户）：5 积分
   - TL1（基础用户）：10 积分
   - TL2（成员）：20 积分
   - TL3（常客）：50 积分
   - TL4（领袖）：100 积分

### API 端点

- `GET /api/linuxdo/login` - 发起 OAuth 登录
- `GET /api/linuxdo/callback` - OAuth 回调处理
- `GET /api/linuxdo/info` - 获取 Linux Do 用户信息

## 2. 内容审核系统

### 功能说明
自动检测用户提交的 Prompt，过滤敏感内容，保护平台安全。

### 审核规则

1. **长度检查**
   - 最小长度：3 字符
   - 最大长度：2000 字符

2. **敏感词检查**
   - 内置敏感词库
   - 支持自定义敏感词
   - 大小写不敏感

3. **审核失败处理**
   - 不扣除积分
   - 记录审核日志（保留 30 天）
   - 返回具体失败原因

### 管理功能

#### 查看审核记录
```
GET /api/admin/moderation/logs
```

返回最近 100 条审核失败记录，包含：
- 用户名
- Prompt 内容
- 失败原因
- 时间戳

#### 添加敏感词
```
POST /api/admin/moderation/words
Content-Type: application/json

{
  "word": "敏感词"
}
```

#### 查看敏感词列表
```
GET /api/admin/moderation/words
```

返回：
- 内置敏感词列表
- 自定义敏感词列表
- 总数统计

## 3. 多 API Key 轮询

### 功能说明
支持配置多个 Fireworks API Key，自动轮询使用，提高并发能力和可用性。

### 配置方式

#### 方式 1：逗号分隔
```bash
wrangler secret put FIREWORKS_API_KEYS
# 输入：key1,key2,key3
```

#### 方式 2：编号方式
```bash
wrangler secret put FIREWORKS_API_KEY_1
wrangler secret put FIREWORKS_API_KEY_2
wrangler secret put FIREWORKS_API_KEY_3
```

#### 方式 3：单个 Key（兼容旧版）
```bash
wrangler secret put FIREWORKS_API_KEY
```

### 轮询机制

- 使用轮询算法（Round Robin）
- 自动记录每个 Key 的使用情况
- 统计成功/失败次数
- 记录最后使用时间和错误信息

### 统计查看

```
GET /api/admin/apikeys
```

返回每个 API Key 的统计信息：
- Key 预览（前 8 位 + 后 4 位）
- 总调用次数
- 成功次数
- 失败次数
- 最后使用时间
- 最后错误信息

## 4. 数据结构变更

### 用户数据新增字段

```json
{
  "username": "linuxdo_12345",
  "loginMethod": "linuxdo",
  "linuxdo_id": 12345,
  "linuxdo_username": "username",
  "linuxdo_name": "Display Name",
  "linuxdo_trust_level": 2,
  "avatar": "https://...",
  "credits": 20,
  "totalGenerated": 0,
  "createdAt": 1707654321000
}
```

### 审核日志数据

```json
{
  "username": "testuser",
  "prompt": "违规内容",
  "reason": "Prompt 包含敏感词：xxx",
  "timestamp": 1707654321000
}
```

存储键：`moderation:{timestamp}:{username}`
过期时间：30 天

### API Key 统计数据

```json
{
  "total": 100,
  "success": 95,
  "failed": 5,
  "lastUsed": 1707654321000,
  "lastError": "创建任务失败"
}
```

存储键：`api_key_stats:{key_hash}`

## 5. 安全性增强

### 内容审核
- 防止生成违规内容
- 记录审核日志便于追溯
- 支持动态更新敏感词库

### API Key 保护
- Key 哈希存储统计信息
- 仅显示部分 Key 内容
- 失败自动记录便于排查

### Linux Do 集成
- OAuth 2.0 标准认证
- 不存储用户密码
- 基于信任等级的权限控制

## 6. 性能优化

### 多 Key 轮询
- 分散请求压力
- 提高并发能力
- 单个 Key 失败不影响整体服务

### 审核缓存
- 敏感词列表缓存在 KV
- 减少重复查询
- 提高审核速度

## 7. 监控与统计

### 管理后台新增功能
- 审核记录查看
- 敏感词管理
- API Key 使用统计
- 失败原因分析

### 数据保留策略
- 审核日志：30 天自动删除
- API Key 统计：永久保留
- 用户数据：永久保留
