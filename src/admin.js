import { jsonResponse, generateRedeemCode } from './utils.js';
import { handleGetModerationLogs, handleAddSensitiveWord, handleGetSensitiveWords } from './moderation.js';
import { handleGetApiKeyStats } from './apikeys.js';

// 管理员登录验证
function checkAdminAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  const base64 = authHeader.substring(6);
  const decoded = atob(base64);
  const [username, password] = decoded.split(':');

  return username === 'admin' && password === env.ADMIN_PASSWORD;
}

// 生成兑换码
export async function handleCreateCode(request, env) {
  if (!checkAdminAuth(request, env)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  try {
    const { credits, count = 1 } = await request.json();

    if (!credits || credits < 1) {
      return jsonResponse({ error: '积分数必须大于0' }, 400);
    }

    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = generateRedeemCode();
      const codeData = {
        code,
        credits,
        used: false,
        createdAt: Date.now(),
      };
      await env.DB.put(`code:${code}`, JSON.stringify(codeData));
      codes.push(code);
    }

    return jsonResponse({ message: '生成成功', codes, credits });
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}

// 获取用户列表
export async function handleGetUsers(request, env) {
  if (!checkAdminAuth(request, env)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  try {
    const list = await env.DB.list({ prefix: 'user:' });
    const users = [];

    for (const key of list.keys) {
      const userJson = await env.DB.get(key.name);
      if (userJson) {
        const user = JSON.parse(userJson);
        users.push({
          username: user.username,
          credits: user.credits,
          totalGenerated: user.totalGenerated,
          createdAt: user.createdAt,
        });
      }
    }

    return jsonResponse({ users });
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}

// 获取所有生成记录
export async function handleGetAllRecords(request, env) {
  if (!checkAdminAuth(request, env)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const list = await env.DB.list({ prefix: 'record:', limit });
    const records = [];

    for (const key of list.keys) {
      const recordJson = await env.DB.get(key.name);
      if (recordJson) {
        records.push(JSON.parse(recordJson));
      }
    }

    records.sort((a, b) => b.createdAt - a.createdAt);

    return jsonResponse({ records });
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}

// 获取统计信息
export async function handleGetStats(request, env) {
  if (!checkAdminAuth(request, env)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  try {
    const userList = await env.DB.list({ prefix: 'user:' });
    const recordList = await env.DB.list({ prefix: 'record:' });
    const codeList = await env.DB.list({ prefix: 'code:' });

    let totalCredits = 0;
    let usedCodes = 0;

    for (const key of userList.keys) {
      const userJson = await env.DB.get(key.name);
      if (userJson) {
        const user = JSON.parse(userJson);
        totalCredits += user.credits;
      }
    }

    for (const key of codeList.keys) {
      const codeJson = await env.DB.get(key.name);
      if (codeJson) {
        const code = JSON.parse(codeJson);
        if (code.used) usedCodes++;
      }
    }

    return jsonResponse({
      totalUsers: userList.keys.length,
      totalRecords: recordList.keys.length,
      totalCodes: codeList.keys.length,
      usedCodes,
      totalCredits,
    });
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}

// 获取审核记录（管理员）
export async function handleAdminGetModerationLogs(request, env) {
  if (!checkAdminAuth(request, env)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  return handleGetModerationLogs(request, env);
}

// 添加敏感词（管理员）
export async function handleAdminAddSensitiveWord(request, env) {
  if (!checkAdminAuth(request, env)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  return handleAddSensitiveWord(request, env);
}

// 获取敏感词列表（管理员）
export async function handleAdminGetSensitiveWords(request, env) {
  if (!checkAdminAuth(request, env)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  return handleGetSensitiveWords(request, env);
}

// 获取 API Key 统计（管理员）
export async function handleAdminGetApiKeyStats(request, env) {
  if (!checkAdminAuth(request, env)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  try {
    const stats = await handleGetApiKeyStats(request, env);
    return jsonResponse(stats);
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}
