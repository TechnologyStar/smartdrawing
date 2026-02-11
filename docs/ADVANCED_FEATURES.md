# 图片改图、批量生成和队列功能说明

## 1. 图片改图功能（Image-to-Image）

### 功能说明
基于已有图片生成新图片，可以修改图片风格、添加元素或进行其他变换。

### 使用方式

#### 上传图片
```
POST /api/upload-image
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
  image: <file>
```

**限制**：
- 最大文件大小：10MB
- 支持格式：JPEG、PNG、WebP

**响应**：
```json
{
  "message": "上传成功",
  "data_url": "data:image/png;base64,...",
  "size": 1024000,
  "type": "image/png"
}
```

#### 改图生成
```
POST /api/image-to-image
Content-Type: application/json
Authorization: Bearer <token>

{
  "prompt": "transform into watercolor painting",
  "input_image": "data:image/png;base64,..." or "https://...",
  "image_prompt_strength": 0.5,
  "aspect_ratio": "1:1",
  "seed": 12345,
  "output_format": "png"
}
```

**参数说明**：
- `prompt` (必填): 变换描述
- `input_image` (必填): 输入图片（base64 或 URL）
- `image_prompt_strength` (可选): 图片影响强度 0-1，默认 0.5
  - 0: 完全忽略输入图片
  - 1: 完全保留输入图片
  - 0.5: 平衡
- 其他参数同文生图

**积分消耗**：2 积分/次

**响应**：
```json
{
  "message": "改图成功",
  "request_id": "req_abc123",
  "image_url": "https://...",
  "credits_remaining": 8
}
```

## 2. 批量生成功能

### 功能说明
一次性提交多个生成任务，系统自动排队处理。

### 使用方式

#### 方式 1：多个不同 Prompt
```
POST /api/batch/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "prompts": [
    "A cat sitting on a windowsill",
    "A dog running in the park",
    "A bird flying in the sky"
  ],
  "aspect_ratio": "16:9",
  "output_format": "png"
}
```

#### 方式 2：同一个 Prompt 生成多次
```
POST /api/batch/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "prompt": "A beautiful landscape",
  "count": 5,
  "aspect_ratio": "16:9",
  "output_format": "png"
}
```

**限制**：
- 最多 10 个任务/批次
- 每个任务消耗 1 积分
- 提交时一次性扣除所有积分

**响应**：
```json
{
  "message": "批量任务已创建",
  "batch_id": "batch:username:1707654321000",
  "total_tasks": 5,
  "credits_deducted": 5,
  "credits_remaining": 15
}
```

### 查询批量任务状态

```
GET /api/batch/status?batch_id=batch:username:1707654321000
Authorization: Bearer <token>
```

**响应**：
```json
{
  "batchId": "batch:username:1707654321000",
  "username": "testuser",
  "tasks": [
    {
      "taskId": "batch:username:1707654321000:0",
      "prompt": "A cat sitting on a windowsill",
      "status": "completed",
      "progress": 100,
      "result": {
        "imageUrl": "https://...",
        "requestId": "req_abc123"
      },
      "error": null,
      "createdAt": 1707654321000
    },
    {
      "taskId": "batch:username:1707654321000:1",
      "prompt": "A dog running in the park",
      "status": "processing",
      "progress": 45,
      "result": null,
      "error": null,
      "createdAt": 1707654321000
    }
  ],
  "totalTasks": 5,
  "completedTasks": 1,
  "failedTasks": 0,
  "status": "processing",
  "createdAt": 1707654321000,
  "updatedAt": 1707654322000
}
```

**任务状态**：
- `pending`: 等待处理
- `processing`: 处理中
- `completed`: 已完成
- `failed`: 失败

**批次状态**：
- `pending`: 等待开始
- `processing`: 处理中
- `completed`: 全部完成

### 获取用户的所有批量任务

```
GET /api/batch/list
Authorization: Bearer <token>
```

**响应**：
```json
{
  "batches": [
    {
      "batchId": "batch:username:1707654321000",
      "totalTasks": 5,
      "completedTasks": 5,
      "failedTasks": 0,
      "status": "completed",
      "createdAt": 1707654321000,
      "updatedAt": 1707654400000
    }
  ]
}
```

### 手动触发任务处理

```
POST /api/batch/process
Content-Type: application/json
Authorization: Bearer <token>

{
  "batch_id": "batch:username:1707654321000",
  "task_index": 0
}
```

**说明**：
- 通常由系统自动处理
- 也可以手动触发单个任务的处理
- 用于调试或重试失败的任务

## 3. 生成队列和进度显示

### 队列机制

批量任务采用队列机制处理：

1. **提交阶段**
   - 用户提交批量任务
   - 系统创建批次记录
   - 一次性扣除所有积分
   - 所有任务初始状态为 `pending`

2. **处理阶段**
   - 系统按顺序处理每个任务
   - 任务状态变为 `processing`
   - 实时更新进度（0-100%）
   - 完成后状态变为 `completed` 或 `failed`

3. **完成阶段**
   - 所有任务处理完成
   - 批次状态变为 `completed`
   - 用户可查看所有结果

### 进度显示

每个任务的进度分为以下阶段：

- **0%**: 等待开始
- **10%**: 任务已接收
- **30%**: 创建 API 请求
- **30-90%**: 等待生成（轮询中）
- **100%**: 生成完成

### 前端集成示例

```javascript
// 提交批量任务
async function submitBatch() {
  const res = await fetch('/api/batch/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      prompts: ['prompt1', 'prompt2', 'prompt3']
    })
  });

  const data = await res.json();
  const batchId = data.batch_id;

  // 开始轮询状态
  pollBatchStatus(batchId);
}

// 轮询批量任务状态
async function pollBatchStatus(batchId) {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/batch/status?batch_id=${batchId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const batch = await res.json();

    // 更新 UI 显示进度
    updateProgressUI(batch);

    // 如果全部完成，停止轮询
    if (batch.status === 'completed') {
      clearInterval(interval);
      showResults(batch);
    }
  }, 2000); // 每 2 秒查询一次
}

// 更新进度 UI
function updateProgressUI(batch) {
  batch.tasks.forEach((task, index) => {
    const progressBar = document.getElementById(`task-${index}-progress`);
    progressBar.style.width = `${task.progress}%`;
    progressBar.textContent = `${task.status} - ${task.progress}%`;
  });
}
```

## 4. 数据结构

### 批量任务记录

```json
{
  "batchId": "batch:username:timestamp",
  "username": "testuser",
  "tasks": [
    {
      "taskId": "batch:username:timestamp:index",
      "prompt": "prompt text",
      "params": {
        "aspect_ratio": "16:9",
        "seed": 12345,
        "output_format": "png"
      },
      "status": "completed",
      "progress": 100,
      "result": {
        "imageUrl": "https://...",
        "requestId": "req_abc123"
      },
      "error": null,
      "createdAt": 1707654321000
    }
  ],
  "totalTasks": 5,
  "completedTasks": 3,
  "failedTasks": 1,
  "status": "processing",
  "createdAt": 1707654321000,
  "updatedAt": 1707654400000
}
```

存储键：`batch:{username}:{timestamp}`

### 改图记录

```json
{
  "username": "testuser",
  "type": "image_to_image",
  "prompt": "transform into watercolor",
  "imageUrl": "https://...",
  "requestId": "req_abc123",
  "createdAt": 1707654321000,
  "aspectRatio": "1:1",
  "seed": 12345,
  "imagePromptStrength": 0.5
}
```

存储键：`record:{username}:{timestamp}`

## 5. 错误处理

### 改图失败
- 自动退回 2 积分
- 返回详细错误信息
- 记录失败日志

### 批量任务失败
- 单个任务失败不影响其他任务
- 失败任务标记为 `failed`
- 不退回失败任务的积分（已消耗 API 资源）
- 可以手动重试失败的任务

### 超时处理
- 单个任务超时：标记为失败
- 批量任务超时：继续处理其他任务
- 超时时间：约 32 秒（40 次轮询 × 0.8 秒）

## 6. 性能优化建议

### 批量任务
- 建议每批次不超过 5 个任务
- 避免同时提交多个批次
- 使用多 API Key 提高并发能力

### 改图功能
- 压缩图片后再上传
- 使用合适的 `image_prompt_strength`
- 避免上传过大的图片

### 前端轮询
- 轮询间隔建议 2-3 秒
- 使用 WebSocket 可以实现实时推送（需要额外开发）
- 批次完成后停止轮询

## 7. 使用场景

### 改图功能
- 风格转换（照片 → 油画、水彩等）
- 图片修复和增强
- 添加或删除元素
- 改变图片构图

### 批量生成
- 生成多个相似风格的图片
- A/B 测试不同 Prompt
- 批量生成素材库
- 自动化内容生产

## 8. 注意事项

1. **积分消耗**
   - 改图：2 积分/次
   - 批量生成：1 积分/任务
   - 批量任务提交时一次性扣除

2. **并发限制**
   - 建议不要同时处理过多批次
   - 单个批次最多 10 个任务

3. **数据保留**
   - 批量任务记录永久保留
   - 可以随时查询历史批次

4. **失败重试**
   - 失败的任务可以手动重试
   - 重试需要重新消耗积分
