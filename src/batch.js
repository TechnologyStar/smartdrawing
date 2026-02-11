import { jsonResponse, getUserFromRequest } from './utils.js';
import { moderatePrompt, logModerationFailure } from './moderation.js';

// 批量生成任务
export async function handleBatchGenerate(request, env) {
  try {
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return jsonResponse({ error: '未授权，请先登录' }, 401);
    }

    const body = await request.json();
    const { prompts, count, ...commonParams } = body;

    // 支持两种方式：
    // 1. prompts 数组：多个不同的 prompt
    // 2. count 数量：同一个 prompt 生成多次
    let taskList = [];

    if (prompts && Array.isArray(prompts)) {
      // 方式 1：多个不同 prompt
      if (prompts.length === 0 || prompts.length > 10) {
        return jsonResponse({ error: 'prompts 数量必须在 1-10 之间' }, 400);
      }
      taskList = prompts.map(prompt => ({ prompt, ...commonParams }));
    } else if (count && commonParams.prompt) {
      // 方式 2：同一个 prompt 生成多次
      if (count < 1 || count > 10) {
        return jsonResponse({ error: 'count 必须在 1-10 之间' }, 400);
      }
      taskList = Array(count).fill(null).map(() => ({ ...commonParams }));
    } else {
      return jsonResponse({ error: '请提供 prompts 数组或 count + prompt' }, 400);
    }

    // 检查积分
    const requiredCredits = taskList.length;
    if (user.credits < requiredCredits) {
      return jsonResponse({
        error: '积分不足',
        required: requiredCredits,
        available: user.credits
      }, 400);
    }

    // 审核所有 prompt
    for (const task of taskList) {
      const moderation = moderatePrompt(task.prompt);
      if (!moderation.passed) {
        await logModerationFailure(env, user.username, task.prompt, moderation.reason);
        return jsonResponse({
          error: '内容审核未通过',
          reason: moderation.reason,
          prompt: task.prompt,
          moderated: true
        }, 400);
      }
    }

    // 创建批量任务
    const batchId = `batch:${user.username}:${Date.now()}`;
    const batch = {
      batchId,
      username: user.username,
      tasks: taskList.map((task, index) => ({
        taskId: `${batchId}:${index}`,
        prompt: task.prompt,
        params: {
          aspect_ratio: task.aspect_ratio,
          seed: task.seed,
          output_format: task.output_format || 'png',
        },
        status: 'pending', // pending, processing, completed, failed
        progress: 0,
        result: null,
        error: null,
        createdAt: Date.now(),
      })),
      totalTasks: taskList.length,
      completedTasks: 0,
      failedTasks: 0,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 保存批量任务
    await env.DB.put(batchId, JSON.stringify(batch));

    // 扣除积分
    user.credits -= requiredCredits;
    await env.DB.put(`user:${user.username}`, JSON.stringify(user));

    return jsonResponse({
      message: '批量任务已创建',
      batch_id: batchId,
      total_tasks: taskList.length,
      credits_deducted: requiredCredits,
      credits_remaining: user.credits,
    });
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}

// 获取批量任务状态
export async function handleGetBatchStatus(request, env) {
  try {
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return jsonResponse({ error: '未授权' }, 401);
    }

    const url = new URL(request.url);
    const batchId = url.searchParams.get('batch_id');

    if (!batchId) {
      return jsonResponse({ error: '缺少 batch_id' }, 400);
    }

    const batchJson = await env.DB.get(batchId);
    if (!batchJson) {
      return jsonResponse({ error: '批量任务不存在' }, 404);
    }

    const batch = JSON.parse(batchJson);

    // 验证权限
    if (batch.username !== user.username) {
      return jsonResponse({ error: '无权访问此批量任务' }, 403);
    }

    return jsonResponse(batch);
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}

// 获取用户的所有批量任务
export async function handleGetUserBatches(request, env) {
  try {
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return jsonResponse({ error: '未授权' }, 401);
    }

    const prefix = `batch:${user.username}:`;
    const list = await env.DB.list({ prefix, limit: 50 });

    const batches = [];
    for (const key of list.keys) {
      const batchJson = await env.DB.get(key.name);
      if (batchJson) {
        const batch = JSON.parse(batchJson);
        // 只返回摘要信息
        batches.push({
          batchId: batch.batchId,
          totalTasks: batch.totalTasks,
          completedTasks: batch.completedTasks,
          failedTasks: batch.failedTasks,
          status: batch.status,
          createdAt: batch.createdAt,
          updatedAt: batch.updatedAt,
        });
      }
    }

    // 按时间倒序
    batches.sort((a, b) => b.createdAt - a.createdAt);

    return jsonResponse({ batches });
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}

// 处理批量任务（由 Worker 定时调用或手动触发）
export async function processBatchTask(env, batchId, taskIndex) {
  try {
    const batchJson = await env.DB.get(batchId);
    if (!batchJson) {
      return { success: false, error: '批量任务不存在' };
    }

    const batch = JSON.parse(batchJson);
    const task = batch.tasks[taskIndex];

    if (!task || task.status !== 'pending') {
      return { success: false, error: '任务不存在或已处理' };
    }

    // 更新任务状态为处理中
    task.status = 'processing';
    task.progress = 10;
    batch.updatedAt = Date.now();
    await env.DB.put(batchId, JSON.stringify(batch));

    // 调用生成 API（这里简化处理，实际应该调用 handleGenerate 的逻辑）
    // 为了避免重复代码，这里只是示例
    const { getNextApiKey, recordApiKeyUsage } = await import('./apikeys.js');
    const { safeJson, sleep } = await import('./utils.js');

    const model = 'flux-kontext-pro';
    const createUrl = `https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/${model}`;
    const apiKey = await getNextApiKey(env);

    // 创建任务
    const createResp = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: task.prompt,
        aspect_ratio: task.params.aspect_ratio,
        seed: task.params.seed,
        output_format: task.params.output_format,
        prompt_upsampling: false,
        safety_tolerance: 2,
      }),
    });

    const createJson = await safeJson(createResp);
    if (!createResp.ok) {
      task.status = 'failed';
      task.error = '创建任务失败';
      task.progress = 0;
      batch.failedTasks += 1;
      batch.updatedAt = Date.now();
      await env.DB.put(batchId, JSON.stringify(batch));
      await recordApiKeyUsage(env, apiKey, false, JSON.stringify(createJson));
      return { success: false, error: '创建任务失败' };
    }

    const requestId = createJson?.request_id;
    task.progress = 30;
    await env.DB.put(batchId, JSON.stringify(batch));

    // 轮询结果
    const getUrl = `https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/${model}/get_result`;
    const maxTries = 40;
    const delayMs = 800;

    for (let i = 0; i < maxTries; i++) {
      await sleep(delayMs);
      task.progress = 30 + Math.floor((i / maxTries) * 60);
      await env.DB.put(batchId, JSON.stringify(batch));

      const rr = await fetch(getUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id: requestId }),
      });

      const rj = await safeJson(rr);

      if (rr.ok && rj?.status === 'Ready') {
        const imageUrl = rj?.result?.sample || rj?.result?.url || (typeof rj?.result === 'string' ? rj.result : null);

        if (imageUrl) {
          task.status = 'completed';
          task.progress = 100;
          task.result = { imageUrl, requestId };
          batch.completedTasks += 1;
          batch.updatedAt = Date.now();

          // 检查是否所有任务都完成
          if (batch.completedTasks + batch.failedTasks === batch.totalTasks) {
            batch.status = 'completed';
          }

          await env.DB.put(batchId, JSON.stringify(batch));
          await recordApiKeyUsage(env, apiKey, true);
          return { success: true, imageUrl };
        }
      }

      if (rr.ok && (rj?.status === 'Error' || rj?.status === 'Content Moderated')) {
        task.status = 'failed';
        task.error = `任务失败: ${rj?.status}`;
        task.progress = 0;
        batch.failedTasks += 1;
        batch.updatedAt = Date.now();
        await env.DB.put(batchId, JSON.stringify(batch));
        await recordApiKeyUsage(env, apiKey, false, `任务失败: ${rj?.status}`);
        return { success: false, error: task.error };
      }
    }

    // 超时
    task.status = 'failed';
    task.error = '等待超时';
    task.progress = 0;
    batch.failedTasks += 1;
    batch.updatedAt = Date.now();
    await env.DB.put(batchId, JSON.stringify(batch));
    await recordApiKeyUsage(env, apiKey, false, '等待超时');
    return { success: false, error: '等待超时' };
  } catch (e) {
    return { success: false, error: String(e.message || e) };
  }
}

// 手动触发批量任务处理
export async function handleProcessBatch(request, env) {
  try {
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return jsonResponse({ error: '未授权' }, 401);
    }

    const { batch_id, task_index } = await request.json();

    if (!batch_id || task_index === undefined) {
      return jsonResponse({ error: '缺少 batch_id 或 task_index' }, 400);
    }

    const result = await processBatchTask(env, batch_id, task_index);

    return jsonResponse(result);
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}
