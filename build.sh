#!/bin/bash

set -e

# 构建期写入前端的后端地址（NEXT_PUBLIC_* 会被内联进 JS，部署后无法再改）
# 注意：不要带 /api/v1，api-config.ts 会自动拼接 prefix
DEFAULT_API_URL="http://122.51.85.195:8091"
API_URL=${1:-$DEFAULT_API_URL}

# 传 same-origin 表示与页面同源（例如由 Nginx 反向代理到后端）
if [ "$API_URL" = "same-origin" ]; then
  API_URL=""
fi

# 可选：自建 draw.io 嵌入地址（留空使用官方 embed.diagrams.net）
DRAWIO_URL=${2:-${NEXT_PUBLIC_DRAWIO_BASE_URL:-}}

# 目标服务器为 x86（amd64）；需要 ARM 时用 PLATFORMS=linux/amd64,linux/arm64
PLATFORMS=${PLATFORMS:-linux/amd64}

# 必须与 .local-config 中的 LOCAL_IMAGE 完全一致
IMAGE="kiratesuly/ai-agent-draw-io-app-front:1.0"

echo "Building Docker image: ${IMAGE}"
echo "  platform:                 ${PLATFORMS}"
echo "  NEXT_PUBLIC_API_BASE_URL: ${API_URL:-<same-origin>}"
echo "  NEXT_PUBLIC_DRAWIO_BASE_URL: ${DRAWIO_URL:-<官方 embed.diagrams.net>}"

docker build \
  --platform "$PLATFORMS" \
  --build-arg NEXT_PUBLIC_API_BASE_URL="$API_URL" \
  --build-arg NEXT_PUBLIC_DRAWIO_BASE_URL="$DRAWIO_URL" \
  --load \
  -t "$IMAGE" .

echo "Build complete: ${IMAGE}"
