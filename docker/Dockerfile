FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates curl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
WORKDIR /app

# 全量复制 → pnpm install
COPY . .
RUN pnpm install --loglevel debug 2>&1 | tail -50 || (echo "=== pnpm install FAILED ===" && exit 1)

# 构建
RUN pnpm --filter @guoxue/server exec prisma generate || echo "prisma generate skipped"
RUN pnpm --filter @guoxue/shared build
RUN pnpm --filter @guoxue/bazi-engine build
RUN pnpm --filter @guoxue/ziwei-engine build
RUN pnpm build:server
RUN (pnpm build:admin || echo "admin build skipped")

# ── 运行阶段 ──
FROM node:20-slim
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates && rm -rf /var/lib/apt/lists/*

# 运行时依赖
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

# 构建产物
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/bazi-engine/dist ./packages/bazi-engine/dist
COPY --from=builder /app/packages/bazi-engine/package.json ./packages/bazi-engine/
COPY --from=builder /app/packages/ziwei-engine/dist ./packages/ziwei-engine/dist
COPY --from=builder /app/packages/ziwei-engine/package.json ./packages/ziwei-engine/
COPY --from=builder /app/package.json ./

# 管理后台
COPY --from=builder /app/apps/admin/dist ./admin-dist

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health/live || exit 1

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
