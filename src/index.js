import { handleRegister, handleLogin, handleGetUserInfo, handleRedeem } from './auth.js';
import { handleGenerate, handleGetRecords } from './generate.js';
import { handleCreateCode, handleGetUsers, handleGetAllRecords, handleGetStats } from './admin.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // 用户端首页
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(await getUserHTML(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 管理端页面
    if (request.method === 'GET' && url.pathname === '/admin') {
      return new Response(await getAdminHTML(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // API 路由
    const routes = {
      'POST /api/register': () => handleRegister(request, env),
      'POST /api/login': () => handleLogin(request, env),
      'GET /api/user': () => handleGetUserInfo(request, env),
      'POST /api/redeem': () => handleRedeem(request, env),
      'POST /api/generate': () => handleGenerate(request, env),
      'GET /api/records': () => handleGetRecords(request, env),
      'POST /api/admin/codes': () => handleCreateCode(request, env),
      'GET /api/admin/users': () => handleGetUsers(request, env),
      'GET /api/admin/records': () => handleGetAllRecords(request, env),
      'GET /api/admin/stats': () => handleGetStats(request, env),
    };

    const routeKey = `${request.method} ${url.pathname}`;
    const handler = routes[routeKey];

    if (handler) {
      return handler();
    }

    return new Response('Not Found', { status: 404 });
  },
};

// 用户端 HTML
async function getUserHTML() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Fireworks FLUX 生图平台</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f5f5f5; }
    .container { max-width: 900px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { font-size: 28px; margin-bottom: 8px; color: #333; }
    h2 { font-size: 20px; margin-bottom: 16px; color: #555; }
    .subtitle { color: #888; margin-bottom: 24px; }
    .tabs { display: flex; gap: 12px; margin-bottom: 20px; border-bottom: 2px solid #eee; }
    .tab { padding: 12px 24px; cursor: pointer; border: none; background: none; font-size: 16px; color: #666; transition: all 0.3s; }
    .tab.active { color: #1890ff; border-bottom: 2px solid #1890ff; margin-bottom: -2px; }
    .tab:hover { color: #1890ff; }
    .page { display: none; }
    .page.active { display: block; }
    input, textarea, select, button { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
    textarea { min-height: 100px; resize: vertical; font-family: inherit; }
    button { background: #1890ff; color: white; border: none; cursor: pointer; font-weight: 500; transition: background 0.3s; }
    button:hover { background: #40a9ff; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; }
    .row > * { flex: 1; min-width: 200px; }
    .info-bar { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #e6f7ff; border-radius: 8px; margin-bottom: 20px; }
    .info-item { font-size: 14px; color: #555; }
    .info-item strong { color: #1890ff; font-size: 18px; }
    .status { padding: 12px; margin: 12px 0; border-radius: 8px; }
    .status.success { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
    .status.error { background: #fff2e8; color: #fa541c; border: 1px solid #ffbb96; }
    .status.info { background: #e6f7ff; color: #1890ff; border: 1px solid #91d5ff; }
    img.result { max-width: 100%; border-radius: 8px; margin-top: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .record { padding: 16px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 12px; }
    .record img { max-width: 200px; border-radius: 4px; margin-top: 8px; }
    .record-info { font-size: 13px; color: #666; margin: 4px 0; }
    .logout-btn { background: #ff4d4f; padding: 8px 16px; width: auto; }
    .logout-btn:hover { background: #ff7875; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>🎨 Fireworks FLUX 生图平台</h1>
      <p class="subtitle">基于 FLUX.1 Kontext Pro 的 AI 图片生成服务</p>
    </div>

    <div id="auth-page" class="page active">
      <div class="card">
        <div class="tabs">
          <button class="tab active" onclick="switchAuthTab('login')">登录</button>
          <button class="tab" onclick="switchAuthTab('register')">注册</button>
        </div>

        <div id="login-form" class="auth-form">
          <h2>登录账号</h2>
          <input type="text" id="login-username" placeholder="用户名" />
          <input type="password" id="login-password" placeholder="密码" />
          <button onclick="login()">登录</button>
          <div id="login-status"></div>
        </div>

        <div id="register-form" class="auth-form" style="display:none">
          <h2>注册账号</h2>
          <input type="text" id="reg-username" placeholder="用户名（至少3位）" />
          <input type="password" id="reg-password" placeholder="密码（至少6位）" />
          <button onclick="register()">注册</button>
          <div id="register-status"></div>
        </div>
      </div>
    </div>

    <div id="main-page" class="page">
      <div class="info-bar">
        <div class="info-item">用户：<strong id="user-name"></strong></div>
        <div class="info-item">剩余积分：<strong id="user-credits"></strong></div>
        <div class="info-item">已生成：<strong id="user-total"></strong> 张</div>
        <button class="logout-btn" onclick="logout()">退出登录</button>
      </div>

      <div class="tabs">
        <button class="tab active" onclick="switchTab('generate')">生成图片</button>
        <button class="tab" onclick="switchTab('redeem')">兑换积分</button>
        <button class="tab" onclick="switchTab('records')">生成记录</button>
      </div>

      <div id="generate-page" class="tab-page active">
        <div class="card">
          <h2>生成图片</h2>
          <label>Prompt（提示词）</label>
          <textarea id="prompt" placeholder="例如：A beautiful sunset over the ocean with vibrant colors"></textarea>

          <div class="row">
            <div>
              <label>宽高比</label>
              <select id="aspect-ratio">
                <option value="">默认</option>
                <option value="1:1">1:1 (正方形)</option>
                <option value="4:3">4:3 (横向)</option>
                <option value="3:4">3:4 (竖向)</option>
                <option value="16:9">16:9 (宽屏)</option>
                <option value="9:16">9:16 (手机)</option>
              </select>
            </div>
            <div>
              <label>输出格式</label>
              <select id="output-format">
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
              </select>
            </div>
            <div>
              <label>Seed（可选）</label>
              <input type="number" id="seed" placeholder="留空随机" />
            </div>
          </div>

          <button onclick="generate()" id="gen-btn">生成图片（消耗 1 积分）</button>
          <div id="gen-status"></div>
          <img id="gen-result" class="result" style="display:none" />
        </div>
      </div>

      <div id="redeem-page" class="tab-page">
        <div class="card">
          <h2>兑换积分</h2>
          <label>兑换码</label>
          <input type="text" id="redeem-code" placeholder="输入兑换码" />
          <button onclick="redeem()">兑换</button>
          <div id="redeem-status"></div>
        </div>
      </div>

      <div id="records-page" class="tab-page">
        <div class="card">
          <h2>生成记录</h2>
          <button onclick="loadRecords()">刷新记录</button>
          <div id="records-list"></div>
        </div>
      </div>
    </div>
  </div>

<script>
  let token = localStorage.getItem('token');
  let userData = null;

  if (token) {
    checkAuth();
  }

  function switchAuthTab(tab) {
    document.querySelectorAll('.auth-form').forEach(f => f.style.display = 'none');
    document.querySelectorAll('#auth-page .tab').forEach(t => t.classList.remove('active'));

    if (tab === 'login') {
      document.getElementById('login-form').style.display = 'block';
      document.querySelectorAll('#auth-page .tab')[0].classList.add('active');
    } else {
      document.getElementById('register-form').style.display = 'block';
      document.querySelectorAll('#auth-page .tab')[1].classList.add('active');
    }
  }

  function switchTab(tab) {
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('#main-page .tab').forEach(t => t.classList.remove('active'));

    const pages = { generate: 0, redeem: 1, records: 2 };
    document.querySelectorAll('.tab-page')[pages[tab]].classList.add('active');
    document.querySelectorAll('#main-page .tab')[pages[tab]].classList.add('active');

    if (tab === 'records') loadRecords();
  }

  async function register() {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const status = document.getElementById('register-status');

    status.className = 'status info';
    status.textContent = '注册中...';

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok) {
      status.className = 'status success';
      status.textContent = '注册成功！请登录';
      setTimeout(() => switchAuthTab('login'), 1500);
    } else {
      status.className = 'status error';
      status.textContent = data.error || '注册失败';
    }
  }

  async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const status = document.getElementById('login-status');

    status.className = 'status info';
    status.textContent = '登录中...';

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok) {
      token = data.token;
      localStorage.setItem('token', token);
      status.className = 'status success';
      status.textContent = '登录成功！';
      setTimeout(() => {
        document.getElementById('auth-page').classList.remove('active');
        document.getElementById('main-page').classList.add('active');
        checkAuth();
      }, 1000);
    } else {
      status.className = 'status error';
      status.textContent = data.error || '登录失败';
    }
  }

  async function checkAuth() {
    const res = await fetch('/api/user', {
      headers: { Authorization: \`Bearer \${token}\` },
    });

    if (res.ok) {
      userData = await res.json();
      document.getElementById('user-name').textContent = userData.username;
      document.getElementById('user-credits').textContent = userData.credits;
      document.getElementById('user-total').textContent = userData.totalGenerated;
      document.getElementById('auth-page').classList.remove('active');
      document.getElementById('main-page').classList.add('active');
    } else {
      logout();
    }
  }

  function logout() {
    token = null;
    localStorage.removeItem('token');
    document.getElementById('main-page').classList.remove('active');
    document.getElementById('auth-page').classList.add('active');
  }

  async function generate() {
    const prompt = document.getElementById('prompt').value.trim();
    const aspectRatio = document.getElementById('aspect-ratio').value;
    const outputFormat = document.getElementById('output-format').value;
    const seed = document.getElementById('seed').value;
    const status = document.getElementById('gen-status');
    const btn = document.getElementById('gen-btn');
    const img = document.getElementById('gen-result');

    if (!prompt) {
      status.className = 'status error';
      status.textContent = '请输入 Prompt';
      return;
    }

    btn.disabled = true;
    status.className = 'status info';
    status.textContent = '生成中，请稍候...';
    img.style.display = 'none';

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: \`Bearer \${token}\`,
      },
      body: JSON.stringify({
        prompt,
        aspect_ratio: aspectRatio || null,
        output_format: outputFormat,
        seed: seed ? Number(seed) : null,
      }),
    });

    const data = await res.json();
    btn.disabled = false;

    if (res.ok) {
      status.className = 'status success';
      status.textContent = \`生成成功！剩余积分：\${data.credits_remaining}\`;
      img.src = data.image_url;
      img.style.display = 'block';
      checkAuth();
    } else {
      status.className = 'status error';
      status.textContent = data.error || '生成失败';
    }
  }

  async function redeem() {
    const code = document.getElementById('redeem-code').value.trim();
    const status = document.getElementById('redeem-status');

    if (!code) {
      status.className = 'status error';
      status.textContent = '请输入兑换码';
      return;
    }

    status.className = 'status info';
    status.textContent = '兑换中...';

    const res = await fetch('/api/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: \`Bearer \${token}\`,
      },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();

    if (res.ok) {
      status.className = 'status success';
      status.textContent = \`兑换成功！获得 \${data.credits} 积分，当前总积分：\${data.totalCredits}\`;
      document.getElementById('redeem-code').value = '';
      checkAuth();
    } else {
      status.className = 'status error';
      status.textContent = data.error || '兑换失败';
    }
  }

  async function loadRecords() {
    const list = document.getElementById('records-list');
    list.innerHTML = '<div class="status info">加载中...</div>';

    const res = await fetch('/api/records', {
      headers: { Authorization: \`Bearer \${token}\` },
    });

    const data = await res.json();

    if (res.ok && data.records.length > 0) {
      list.innerHTML = data.records.map(r => \`
        <div class="record">
          <div class="record-info"><strong>Prompt:</strong> \${r.prompt}</div>
          <div class="record-info"><strong>时间:</strong> \${new Date(r.createdAt).toLocaleString('zh-CN')}</div>
          <div class="record-info"><strong>宽高比:</strong> \${r.aspectRatio || '默认'} | <strong>Seed:</strong> \${r.seed || '随机'}</div>
          <img src="\${r.imageUrl}" alt="生成图片" />
        </div>
      \`).join('');
    } else {
      list.innerHTML = '<div class="status info">暂无记录</div>';
    }
  }
</script>
</body>
</html>`;
}

// 管理端 HTML
async function getAdminHTML() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>管理后台 - Fireworks FLUX</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { font-size: 28px; margin-bottom: 24px; color: #333; }
    h2 { font-size: 20px; margin-bottom: 16px; color: #555; }
    .tabs { display: flex; gap: 12px; margin-bottom: 20px; border-bottom: 2px solid #eee; }
    .tab { padding: 12px 24px; cursor: pointer; border: none; background: none; font-size: 16px; color: #666; }
    .tab.active { color: #1890ff; border-bottom: 2px solid #1890ff; margin-bottom: -2px; }
    .page { display: none; }
    .page.active { display: block; }
    input, button, select { padding: 12px; margin: 8px 8px 8px 0; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
    button { background: #1890ff; color: white; border: none; cursor: pointer; }
    button:hover { background: #40a9ff; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; }
    .stat-value { font-size: 32px; font-weight: bold; margin: 8px 0; }
    .stat-label { font-size: 14px; opacity: 0.9; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #fafafa; font-weight: 600; }
    .code-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .code-item { padding: 12px; background: #f0f0f0; border-radius: 8px; font-family: monospace; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>🔧 管理后台</h1>
    </div>

    <div class="tabs">
      <button class="tab active" onclick="switchTab('stats')">统计概览</button>
      <button class="tab" onclick="switchTab('codes')">生成兑换码</button>
      <button class="tab" onclick="switchTab('users')">用户列表</button>
      <button class="tab" onclick="switchTab('records')">生成记录</button>
    </div>

    <div id="stats-page" class="page active">
      <div class="stats" id="stats-cards"></div>
    </div>

    <div id="codes-page" class="page">
      <div class="card">
        <h2>生成兑换码</h2>
        <label>积分数量：</label>
        <input type="number" id="code-credits" value="10" min="1" />
        <label>生成数量：</label>
        <input type="number" id="code-count" value="1" min="1" max="50" />
        <button onclick="createCodes()">生成</button>
        <div id="codes-result"></div>
      </div>
    </div>

    <div id="users-page" class="page">
      <div class="card">
        <h2>用户列表</h2>
        <button onclick="loadUsers()">刷新</button>
        <table id="users-table">
          <thead><tr><th>用户名</th><th>积分</th><th>已生成</th><th>注册时间</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div id="records-page" class="page">
      <div class="card">
        <h2>生成记录</h2>
        <button onclick="loadRecords()">刷新</button>
        <table id="records-table">
          <thead><tr><th>用户</th><th>Prompt</th><th>时间</th><th>图片</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  </div>

<script>
  const auth = 'Basic ' + btoa('admin:' + prompt('请输入管理员密码：'));

  loadStats();

  function switchTab(tab) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

    const pages = { stats: 0, codes: 1, users: 2, records: 3 };
    document.querySelectorAll('.page')[pages[tab]].classList.add('active');
    document.querySelectorAll('.tab')[pages[tab]].classList.add('active');

    if (tab === 'stats') loadStats();
    if (tab === 'users') loadUsers();
    if (tab === 'records') loadRecords();
  }

  async function loadStats() {
    const res = await fetch('/api/admin/stats', { headers: { Authorization: auth } });
    const data = await res.json();

    if (res.ok) {
      document.getElementById('stats-cards').innerHTML = \`
        <div class="stat-card"><div class="stat-label">总用户数</div><div class="stat-value">\${data.totalUsers}</div></div>
        <div class="stat-card"><div class="stat-label">总生成数</div><div class="stat-value">\${data.totalRecords}</div></div>
        <div class="stat-card"><div class="stat-label">兑换码总数</div><div class="stat-value">\${data.totalCodes}</div></div>
        <div class="stat-card"><div class="stat-label">已使用兑换码</div><div class="stat-value">\${data.usedCodes}</div></div>
        <div class="stat-card"><div class="stat-label">剩余总积分</div><div class="stat-value">\${data.totalCredits}</div></div>
      \`;
    }
  }

  async function createCodes() {
    const credits = document.getElementById('code-credits').value;
    const count = document.getElementById('code-count').value;

    const res = await fetch('/api/admin/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ credits: Number(credits), count: Number(count) }),
    });

    const data = await res.json();

    if (res.ok) {
      document.getElementById('codes-result').innerHTML = \`
        <h3>生成成功（\${data.codes.length} 个，每个 \${data.credits} 积分）</h3>
        <div class="code-list">\${data.codes.map(c => \`<div class="code-item">\${c}</div>\`).join('')}</div>
      \`;
    }
  }

  async function loadUsers() {
    const res = await fetch('/api/admin/users', { headers: { Authorization: auth } });
    const data = await res.json();

    if (res.ok) {
      const tbody = document.querySelector('#users-table tbody');
      tbody.innerHTML = data.users.map(u => \`
        <tr>
          <td>\${u.username}</td>
          <td>\${u.credits}</td>
          <td>\${u.totalGenerated}</td>
          <td>\${new Date(u.createdAt).toLocaleString('zh-CN')}</td>
        </tr>
      \`).join('');
    }
  }

  async function loadRecords() {
    const res = await fetch('/api/admin/records', { headers: { Authorization: auth } });
    const data = await res.json();

    if (res.ok) {
      const tbody = document.querySelector('#records-table tbody');
      tbody.innerHTML = data.records.map(r => \`
        <tr>
          <td>\${r.username}</td>
          <td>\${r.prompt.substring(0, 50)}...</td>
          <td>\${new Date(r.createdAt).toLocaleString('zh-CN')}</td>
          <td><a href="\${r.imageUrl}" target="_blank">查看</a></td>
        </tr>
      \`).join('');
    }
  }
</script>
</body>
</html>`;
}
