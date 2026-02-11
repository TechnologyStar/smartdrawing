import { jsonResponse, getUserFromRequest, generateToken } from './utils.js';

// 用户注册
export async function handleRegister(request, env) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return jsonResponse({ error: '用户名和密码不能为空' }, 400);
    }

    if (username.length < 3 || password.length < 6) {
      return jsonResponse({ error: '用户名至少3位，密码至少6位' }, 400);
    }

    // 检查用户是否已存在
    const existingUser = await env.DB.get(`user:${username}`);
    if (existingUser) {
      return jsonResponse({ error: '用户名已存在' }, 400);
    }

    // 创建用户
    const user = {
      username,
      password, // 生产环境应该加密存储
      credits: 0,
      createdAt: Date.now(),
      totalGenerated: 0,
    };

    await env.DB.put(`user:${username}`, JSON.stringify(user));

    return jsonResponse({ message: '注册成功', username });
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}

// 用户登录
export async function handleLogin(request, env) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return jsonResponse({ error: '用户名和密码不能为空' }, 400);
    }

    const userJson = await env.DB.get(`user:${username}`);
    if (!userJson) {
      return jsonResponse({ error: '用户名或密码错误' }, 401);
    }

    const user = JSON.parse(userJson);
    if (user.password !== password) {
      return jsonResponse({ error: '用户名或密码错误' }, 401);
    }

    // 生成 JWT Token
    const token = await generateToken(
      {
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7天过期
      },
      env.JWT_SECRET
    );

    return jsonResponse({
      message: '登录成功',
      token,
      user: {
        username: user.username,
        credits: user.credits,
        totalGenerated: user.totalGenerated,
      },
    });
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}

// 获取用户信息
export async function handleGetUserInfo(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) {
    return jsonResponse({ error: '未授权' }, 401);
  }

  return jsonResponse({
    username: user.username,
    credits: user.credits,
    totalGenerated: user.totalGenerated,
    createdAt: user.createdAt,
  });
}

// 兑换码充值
export async function handleRedeem(request, env) {
  try {
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return jsonResponse({ error: '未授权' }, 401);
    }

    const { code } = await request.json();
    if (!code) {
      return jsonResponse({ error: '兑换码不能为空' }, 400);
    }

    // 查询兑换码
    const codeJson = await env.DB.get(`code:${code}`);
    if (!codeJson) {
      return jsonResponse({ error: '兑换码不存在或已失效' }, 400);
    }

    const codeData = JSON.parse(codeJson);
    if (codeData.used) {
      return jsonResponse({ error: '兑换码已被使用' }, 400);
    }

    // 标记兑换码为已使用
    codeData.used = true;
    codeData.usedBy = user.username;
    codeData.usedAt = Date.now();
    await env.DB.put(`code:${code}`, JSON.stringify(codeData));

    // 增加用户积分
    user.credits += codeData.credits;
    await env.DB.put(`user:${user.username}`, JSON.stringify(user));

    return jsonResponse({
      message: '兑换成功',
      credits: codeData.credits,
      totalCredits: user.credits,
    });
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}
