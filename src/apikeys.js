// API Key 轮询管理器

// 从环境变量中获取所有 API Keys
export function getApiKeys(env) {
  const keys = [];

  // 支持多种格式：
  // 1. FIREWORKS_API_KEY (单个)
  // 2. FIREWORKS_API_KEYS (逗号分隔)
  // 3. FIREWORKS_API_KEY_1, FIREWORKS_API_KEY_2, ... (多个)

  if (env.FIREWORKS_API_KEYS) {
    // 逗号分隔的多个 key
    const keysArray = env.FIREWORKS_API_KEYS.split(',').map(k => k.trim()).filter(k => k);
    keys.push(...keysArray);
  } else if (env.FIREWORKS_API_KEY) {
    // 单个 key
    keys.push(env.FIREWORKS_API_KEY);
  }

  // 检查编号的 key (FIREWORKS_API_KEY_1, FIREWORKS_API_KEY_2, ...)
  for (let i = 1; i <= 10; i++) {
    const key = env[`FIREWORKS_API_KEY_${i}`];
    if (key) {
      keys.push(key);
    }
  }

  return [...new Set(keys)]; // 去重
}

// 获取下一个可用的 API Key
export async function getNextApiKey(env) {
  const keys = getApiKeys(env);

  if (keys.length === 0) {
    throw new Error('未配置 API Key');
  }

  if (keys.length === 1) {
    return keys[0];
  }

  // 从 KV 中获取当前索引
  const indexKey = 'config:api_key_index';
  const indexJson = await env.DB.get(indexKey);
  let currentIndex = indexJson ? parseInt(indexJson) : 0;

  // 轮询到下一个
  currentIndex = (currentIndex + 1) % keys.length;

  // 保存新索引
  await env.DB.put(indexKey, String(currentIndex));

  return keys[currentIndex];
}

// 记录 API Key 使用情况
export async function recordApiKeyUsage(env, apiKey, success, error = null) {
  const keyHash = await hashApiKey(apiKey);
  const statsKey = `api_key_stats:${keyHash}`;

  try {
    const statsJson = await env.DB.get(statsKey);
    const stats = statsJson ? JSON.parse(statsJson) : {
      total: 0,
      success: 0,
      failed: 0,
      lastUsed: null,
      lastError: null,
    };

    stats.total += 1;
    if (success) {
      stats.success += 1;
    } else {
      stats.failed += 1;
      stats.lastError = error;
    }
    stats.lastUsed = Date.now();

    await env.DB.put(statsKey, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to record API key usage:', e);
  }
}

// 获取 API Key 统计信息（管理员）
export async function getApiKeyStats(env) {
  const keys = getApiKeys(env);
  const stats = [];

  for (const key of keys) {
    const keyHash = await hashApiKey(key);
    const statsKey = `api_key_stats:${keyHash}`;
    const statsJson = await env.DB.get(statsKey);

    if (statsJson) {
      const keyStats = JSON.parse(statsJson);
      stats.push({
        keyPreview: `${key.substring(0, 8)}...${key.substring(key.length - 4)}`,
        ...keyStats,
      });
    } else {
      stats.push({
        keyPreview: `${key.substring(0, 8)}...${key.substring(key.length - 4)}`,
        total: 0,
        success: 0,
        failed: 0,
        lastUsed: null,
        lastError: null,
      });
    }
  }

  return stats;
}

// 对 API Key 进行哈希（用于存储统计信息）
async function hashApiKey(apiKey) {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// 处理获取 API Key 统计（管理员）
export async function handleGetApiKeyStats(request, env) {
  try {
    const stats = await getApiKeyStats(env);
    const keys = getApiKeys(env);

    return {
      totalKeys: keys.length,
      stats,
    };
  } catch (e) {
    throw new Error(String(e.message || e));
  }
}
