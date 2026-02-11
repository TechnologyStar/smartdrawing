import { jsonResponse, generateToken, verifyToken } from './utils.js';

const LINUXDO_AUTHORIZE_URL = 'https://connect.linux.do/oauth2/authorize';
const LINUXDO_TOKEN_URL = 'https://connect.linux.do/oauth2/token';
const LINUXDO_USER_URL = 'https://connect.linux.do/api/user';

// 生成 Linux Do 登录 URL
export function handleLinuxDoLogin(request, env) {
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/linuxdo/callback`;

  const authUrl = new URL(LINUXDO_AUTHORIZE_URL);
  authUrl.searchParams.set('client_id', env.LINUXDO_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'user:email');

  return Response.redirect(authUrl.toString(), 302);
}

// Linux Do OAuth 回调处理
export async function handleLinuxDoCallback(request, env) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return jsonResponse({ error: '缺少授权码' }, 400);
    }

    const redirectUri = `${url.origin}/api/linuxdo/callback`;

    // 1. 用授权码换取 access_token
    const tokenResp = await fetch(LINUXDO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: env.LINUXDO_CLIENT_ID,
        client_secret: env.LINUXDO_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResp.ok) {
      const error = await tokenResp.text();
      return jsonResponse({ error: '获取 token 失败', details: error }, 502);
    }

    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;

    // 2. 用 access_token 获取用户信息
    const userResp = await fetch(LINUXDO_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResp.ok) {
      const error = await userResp.text();
      return jsonResponse({ error: '获取用户信息失败', details: error }, 502);
    }

    const userData = await userResp.json();

    // 3. 创建或更新用户
    const username = `linuxdo_${userData.id}`;
    let userJson = await env.DB.get(`user:${username}`);
    let user;

    if (!userJson) {
      // 新用户，创建账号
      user = {
        username,
        linuxdo_id: userData.id,
        linuxdo_username: userData.username,
        linuxdo_name: userData.name,
        linuxdo_trust_level: userData.trust_level,
        avatar: userData.avatar_template?.replace('{size}', '120'),
        credits: getInitialCredits(userData.trust_level), // 根据信任等级给初始积分
        createdAt: Date.now(),
        totalGenerated: 0,
        loginMethod: 'linuxdo',
      };
      await env.DB.put(`user:${username}`, JSON.stringify(user));
    } else {
      // 已有用户，更新信息
      user = JSON.parse(userJson);
      user.linuxdo_username = userData.username;
      user.linuxdo_name = userData.name;
      user.linuxdo_trust_level = userData.trust_level;
      user.avatar = userData.avatar_template?.replace('{size}', '120');
      await env.DB.put(`user:${username}`, JSON.stringify(user));
    }

    // 4. 生成 JWT Token
    const token = await generateToken(
      {
        username: user.username,
        linuxdo_id: userData.id,
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7天过期
      },
      env.JWT_SECRET
    );

    // 5. 返回 HTML 页面，将 token 传递给前端
    return new Response(
      `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>登录成功</title>
  <script>
    const token = ${JSON.stringify(token)};
    const user = ${JSON.stringify({
      username: user.username,
      credits: user.credits,
      totalGenerated: user.totalGenerated,
      linuxdo_name: user.linuxdo_name,
      avatar: user.avatar,
    })};

    // 保存到 localStorage
    localStorage.setItem('token', token);

    // 通知父窗口（如果是弹窗）
    if (window.opener) {
      window.opener.postMessage({ type: 'linuxdo_login', token, user }, '*');
      window.close();
    } else {
      // 直接跳转
      window.location.href = '/';
    }
  </script>
</head>
<body>
  <p>登录成功，正在跳转...</p>
</body>
</html>`,
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}

// 根据信任等级给初始积分
function getInitialCredits(trustLevel) {
  const creditsMap = {
    0: 5,   // 新用户
    1: 10,  // 基础用户
    2: 20,  // 成员
    3: 50,  // 常客
    4: 100, // 领袖
  };
  return creditsMap[trustLevel] || 5;
}

// 获取 Linux Do 用户额外信息
export async function handleGetLinuxDoInfo(request, env) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: '未授权' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token, env.JWT_SECRET);

    if (!payload || !payload.username) {
      return jsonResponse({ error: '无效的 token' }, 401);
    }

    const userJson = await env.DB.get(`user:${payload.username}`);
    if (!userJson) {
      return jsonResponse({ error: '用户不存在' }, 404);
    }

    const user = JSON.parse(userJson);

    if (user.loginMethod !== 'linuxdo') {
      return jsonResponse({ error: '非 Linux Do 用户' }, 400);
    }

    return jsonResponse({
      linuxdo_id: user.linuxdo_id,
      linuxdo_username: user.linuxdo_username,
      linuxdo_name: user.linuxdo_name,
      linuxdo_trust_level: user.linuxdo_trust_level,
      avatar: user.avatar,
    });
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}
