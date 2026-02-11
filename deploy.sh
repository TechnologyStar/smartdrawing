#!/bin/bash

# Fireworks 生图平台 - 快速部署脚本

set -e

echo "🚀 Fireworks 生图平台 - 快速部署"
echo "================================"
echo ""

# 检查 wrangler 是否安装
if ! command -v wrangler &> /dev/null; then
    echo "❌ 未检测到 wrangler，正在安装..."
    npm install -g wrangler
    echo "✅ wrangler 安装完成"
else
    echo "✅ wrangler 已安装"
fi

echo ""
echo "📝 步骤 1: 登录 Cloudflare"
wrangler login

echo ""
echo "📝 步骤 2: 创建 KV 命名空间"
echo "正在创建 KV 命名空间..."
KV_OUTPUT=$(wrangler kv:namespace create DB)
echo "$KV_OUTPUT"

# 提取 KV namespace ID
KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+')

if [ -z "$KV_ID" ]; then
    echo "❌ 无法获取 KV namespace ID，请手动创建"
    exit 1
fi

echo "✅ KV namespace ID: $KV_ID"

# 更新 wrangler.toml
echo "正在更新 wrangler.toml..."
sed -i "s/your_kv_namespace_id/$KV_ID/g" wrangler.toml
echo "✅ wrangler.toml 已更新"

echo ""
echo "📝 步骤 3: 设置密钥"
echo "请输入 Fireworks API Key:"
wrangler secret put FIREWORKS_API_KEY

echo ""
echo "请输入 JWT Secret (建议使用随机字符串):"
wrangler secret put JWT_SECRET

echo ""
echo "📝 步骤 4: 部署到 Cloudflare Workers"
wrangler deploy

echo ""
echo "🎉 部署完成！"
echo ""
echo "📌 下一步："
echo "1. 访问你的 Worker URL"
echo "2. 注册一个账号"
echo "3. 访问 /admin 生成兑换码"
echo "4. 使用兑换码充值积分"
echo "5. 开始生成图片！"
echo ""
echo "📚 更多信息请查看 docs/ 目录下的文档"
