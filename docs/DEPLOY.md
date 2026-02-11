# 部署指南

## 前置要求

- Node.js 16+
- Cloudflare 账号
- Fireworks AI API Key

## 步骤 1：安装 Wrangler CLI

```bash
npm install -g wrangler
```

## 步骤 2：登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器，授权 Wrangler 访问你的 Cloudflare 账号。

## 步骤 3：创建 KV 命名空间

```bash
wrangler kv:namespace create DB
```

命令会返回类似这样的输出：

```
🌀 Creating namespace with title "fireworks-image-platform-DB"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "DB", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

复制返回的 `id`，打开 `wrangler.toml`，将 `your_kv_namespace_id` 替换为实际的 ID：

```toml
[[kv_namespaces]]
binding = "DB"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # 替换这里
```

## 步骤 4：设置密钥

### 4.1 设置 Fireworks API Key

访问 [Fireworks AI](https://fireworks.ai/) 获取 API Key，然后运行：

```bash
wrangler secret put FIREWORKS_API_KEY
```

输入你的 API Key 并回车。

### 4.2 设置 JWT Secret

生成一个随机字符串作为 JWT 密钥：

```bash
wrangler secret put JWT_SECRET
```

输入一个随机字符串（建议 32 位以上），例如：`your-super-secret-jwt-key-here`

## 步骤 5：修改管理员密码（可选）

打开 `wrangler.toml`，修改 `ADMIN_PASSWORD`：

```toml
[vars]
ADMIN_PASSWORD = "your-secure-password"  # 修改这里
```

## 步骤 6：部署到 Cloudflare Workers

```bash
npm run deploy
```

部署成功后，会显示你的 Worker URL，例如：

```
https://fireworks-image-platform.your-subdomain.workers.dev
```

## 步骤 7：访问应用

- **用户端**：`https://your-worker-url.workers.dev/`
- **管理端**：`https://your-worker-url.workers.dev/admin`

## 本地开发

如果需要本地测试：

```bash
npm run dev
```

访问 `http://localhost:8787`

## 绑定自定义域名（可选）

1. 登录 Cloudflare Dashboard
2. 进入 Workers & Pages
3. 选择你的 Worker
4. 点击 "Triggers" 标签
5. 在 "Custom Domains" 部分添加你的域名

## 故障排查

### 问题：部署时提示 KV namespace not found

**解决方案**：确保 `wrangler.toml` 中的 KV namespace ID 正确。

### 问题：API 调用失败

**解决方案**：检查 Fireworks API Key 是否正确设置：

```bash
wrangler secret list
```

如果没有 `FIREWORKS_API_KEY`，重新设置：

```bash
wrangler secret put FIREWORKS_API_KEY
```

### 问题：管理后台无法登录

**解决方案**：检查 `wrangler.toml` 中的 `ADMIN_PASSWORD` 是否正确。

## 更新应用

修改代码后，重新部署：

```bash
npm run deploy
```

## 查看日志

实时查看 Worker 日志：

```bash
npm run tail
```

## 删除应用

如果需要删除 Worker：

```bash
wrangler delete
```

删除 KV 命名空间：

```bash
wrangler kv:namespace delete --namespace-id=your_namespace_id
```
