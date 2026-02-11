import { jsonResponse, getUserFromRequest, safeJson, sleep } from './utils.js';
import { moderatePrompt, logModerationFailure } from './moderation.js';
import { getNextApiKey, recordApiKeyUsage } from './apikeys.js';

// 生成图片
export async function handleGenerate(request, env) {
  try {
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return jsonResponse({ error: '未授权，请先登录' }, 401);
    }

    // 检查积分
    if (user.credits < 1) {
      return jsonResponse({ error: '积分不足，请先充值' }, 400);
    }

    const body = await request.json();

    if (!body?.prompt || typeof body.prompt !== 'string') {
      return jsonResponse({ error: 'prompt 必填' }, 400);
    }

    // 内容审核
    const moderation = moderatePrompt(body.prompt);
    if (!moderation.passed) {
      await logModerationFailure(env, user.username, body.prompt, moderation.reason);
      return jsonResponse({
        error: '内容审核未通过',
        reason: moderation.reason,
        moderated: true
      }, 400);
    }

    // 扣除积分
    user.credits -= 1;
    user.totalGenerated += 1;
    await env.DB.put(`user:${user.username}`, JSON.stringify(user));

    const model = 'flux-kontext-pro';
    const createUrl = `https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/${model}`;

    // 获取下一个可用的 API Key
    const apiKey = await getNextApiKey(env);

    // 1) 创建任务
    const createResp = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: body.prompt,
        input_image: body.input_image ?? null,
        seed: body.seed ?? null,
        aspect_ratio: body.aspect_ratio ?? null,
        output_format: body.output_format ?? 'png',
        prompt_upsampling: false,
        safety_tolerance: 2,
      }),
    });

    const createJson = await safeJson(createResp);
    if (!createResp.ok) {
      // 失败退回积分
      user.credits += 1;
      user.totalGenerated -= 1;
      await env.DB.put(`user:${user.username}`, JSON.stringify(user));
      // 记录 API Key 使用失败
      await recordApiKeyUsage(env, apiKey, false, JSON.stringify(createJson));
      return jsonResponse({ error: '创建任务失败', details: createJson }, 502);
    }

    const requestId = createJson?.request_id;
    if (!requestId) {
      user.credits += 1;
      user.totalGenerated -= 1;
      await env.DB.put(`user:${user.username}`, JSON.stringify(user));
      await recordApiKeyUsage(env, apiKey, false, '缺少 request_id');
      return jsonResponse({ error: '缺少 request_id', details: createJson }, 502);
    }

    // 2) 轮询结果
    const getUrl = `https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/${model}/get_result`;
    const maxTries = 40;
    const delayMs = 800;
    let last = null;

    for (let i = 0; i < maxTries; i++) {
      await sleep(delayMs);

      const rr = await fetch(getUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id: requestId }),
      });

      const rj = await safeJson(rr);
      last = rj;

      if (rr.ok && rj?.status === 'Ready') {
        const imageUrl =
          rj?.result?.sample || rj?.result?.url || (typeof rj?.result === 'string' ? rj.result : null);

        if (!imageUrl) {
          await recordApiKeyUsage(env, apiKey, false, 'Ready 但无图片 URL');
          return jsonResponse({ error: 'Ready 但无图片 URL', raw: rj }, 502);
        }

        // 记录 API Key 使用成功
        await recordApiKeyUsage(env, apiKey, true);

        // 保存生成记录
        const recordId = `record:${user.username}:${Date.now()}`;
        const record = {
          username: user.username,
          prompt: body.prompt,
          imageUrl,
          requestId,
          createdAt: Date.now(),
          aspectRatio: body.aspect_ratio,
          seed: body.seed,
        };
        await env.DB.put(recordId, JSON.stringify(record));

        return jsonResponse({
          message: '生成成功',
          request_id: requestId,
          image_url: imageUrl,
          credits_remaining: user.credits,
        });
      }

      if (rr.ok && (rj?.status === 'Error' || rj?.status === 'Content Moderated' || rj?.status === 'Request Moderated')) {
        // 失败退回积分
        user.credits += 1;
        user.totalGenerated -= 1;
        await env.DB.put(`user:${user.username}`, JSON.stringify(user));
        await recordApiKeyUsage(env, apiKey, false, `任务失败: ${rj?.status}`);
        return jsonResponse({ error: '任务失败', raw: rj }, 502);
      }
    }

    // 超时退回积分
    user.credits += 1;
    user.totalGenerated -= 1;
    await env.DB.put(`user:${user.username}`, JSON.stringify(user));
    await recordApiKeyUsage(env, apiKey, false, '等待超时');
    return jsonResponse({ error: '等待超时', request_id: requestId, last }, 504);
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}

// 获取生成记录
export async function handleGetRecords(request, env) {
  try {
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return jsonResponse({ error: '未授权' }, 401);
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // 列出用户的所有记录
    const prefix = `record:${user.username}:`;
    const list = await env.DB.list({ prefix, limit });

    const records = [];
    for (const key of list.keys) {
      const recordJson = await env.DB.get(key.name);
      if (recordJson) {
        records.push(JSON.parse(recordJson));
      }
    }

    // 按时间倒序
    records.sort((a, b) => b.createdAt - a.createdAt);

    return jsonResponse({ records });
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}
