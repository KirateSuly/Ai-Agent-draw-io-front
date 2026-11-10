# 基础镜像（阿里云镜像站，国内拉取更快）
FROM registry.cn-hangzhou.aliyuncs.com/xfg-studio/node:20-alpine AS base
RUN apk add --no-cache libc6-compat

# ---- 1. 安装依赖 ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- 2. 构建 ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* 在构建期被内联进前端产物，必须在 build 时传入
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# 可选：自建 draw.io 嵌入地址；留空则使用官方 https://embed.diagrams.net
ARG NEXT_PUBLIC_DRAWIO_BASE_URL
ENV NEXT_PUBLIC_DRAWIO_BASE_URL=$NEXT_PUBLIC_DRAWIO_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- 3. 运行时（仅保留 standalone 产物） ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# standalone 产物（含最小 node_modules 和 server.js）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# static 与 public 不会被 standalone 自动复制，需手动拷贝
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
