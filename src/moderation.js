import { jsonResponse } from './utils.js';

// 敏感词列表（示例，实际应该更完善）
const SENSITIVE_WORDS = [
  'violence', 'blood', 'gore', 'nsfw', 'nude', 'naked',
  '暴力', '血腥', '色情', '裸体', '赌博', '毒品'
];

// 检查文本是否包含敏感词
function containsSensitiveWords(text) {
  const lowerText = text.toLowerCase();
  for (const word of SENSITIVE_WORDS) {
    if (lowerText.includes(word.toLowerCase())) {
      return { blocked: true, word };
    }
  }
  return { blocked: false };
}

// 审核 Prompt
export function moderatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return { passed: false, reason: 'Prompt 不能为空' };
  }

  // 长度检查
  if (prompt.length > 2000) {
    return { passed: false, reason: 'Prompt 长度不能超过 2000 字符' };
  }

  if (prompt.length < 3) {
    return { passed: false, reason: 'Prompt 长度不能少于 3 字符' };
  }

  // 敏感词检查
  const sensitiveCheck = containsSensitiveWords(prompt);
  if (sensitiveCheck.blocked) {
    return {
      passed: false,
      reason: `Prompt 包含敏感词：${sensitiveCheck.word}`,
      blocked_word: sensitiveCheck.word
    };
  }

  return { passed: true };
}

// 记录审核失败
export async function logModerationFailure(env, username, prompt, reason) {
  const logKey = `moderation:${Date.now()}:${username}`;
  const logData = {
    username,
    prompt,
    reason,
    timestamp: Date.now(),
  };

  try {
    await env.DB.put(logKey, JSON.stringify(logData), {
      expirationTtl: 30 * 24 * 60 * 60, // 30 天后自动删除
    });
  } catch (e) {
    console.error('Failed to log moderation failure:', e);
  }
}

// 获取审核记录（管理员）
export async function handleGetModerationLogs(request, env) {
  try {
    const list = await env.DB.list({ prefix: 'moderation:', limit: 100 });
    const logs = [];

    for (const key of list.keys) {
      const logJson = await env.DB.get(key.name);
      if (logJson) {
        logs.push(JSON.parse(logJson));
      }
    }

    logs.sort((a, b) => b.timestamp - a.timestamp);

    return jsonResponse({ logs });
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}

// 添加敏感词（管理员）
export async function handleAddSensitiveWord(request, env) {
  try {
    const { word } = await request.json();

    if (!word || typeof word !== 'string') {
      return jsonResponse({ error: '敏感词不能为空' }, 400);
    }

    // 获取自定义敏感词列表
    const customWordsJson = await env.DB.get('config:sensitive_words');
    const customWords = customWordsJson ? JSON.parse(customWordsJson) : [];

    if (!customWords.includes(word.toLowerCase())) {
      customWords.push(word.toLowerCase());
      await env.DB.put('config:sensitive_words', JSON.stringify(customWords));
    }

    return jsonResponse({ message: '添加成功', word });
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}

// 获取敏感词列表（管理员）
export async function handleGetSensitiveWords(request, env) {
  try {
    const customWordsJson = await env.DB.get('config:sensitive_words');
    const customWords = customWordsJson ? JSON.parse(customWordsJson) : [];

    return jsonResponse({
      builtin: SENSITIVE_WORDS,
      custom: customWords,
      total: SENSITIVE_WORDS.length + customWords.length
    });
  } catch (e) {
    return jsonResponse({ error: String(e.message || e) }, 500);
  }
}

// 获取合并后的敏感词列表
export async function getAllSensitiveWords(env) {
  try {
    const customWordsJson = await env.DB.get('config:sensitive_words');
    const customWords = customWordsJson ? JSON.parse(customWordsJson) : [];
    return [...SENSITIVE_WORDS, ...customWords];
  } catch (e) {
    return SENSITIVE_WORDS;
  }
}
