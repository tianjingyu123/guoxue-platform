FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates curl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# H5 的公网地址属于构建时配置，生产构建必须由 Compose 显式注入。
ARG VITE_API_URL
ARG VITE_PUBLIC_H5_URL
ARG VITE_PUBLIC_ASSET_ORIGIN
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PUBLIC_H5_URL=$VITE_PUBLIC_H5_URL
ENV VITE_PUBLIC_ASSET_ORIGIN=$VITE_PUBLIC_ASSET_ORIGIN

# 全量复制 → 严格按锁文件安装，避免生产镜像混入未验收依赖版本
COPY . .
RUN pnpm install --frozen-lockfile

# 构建
RUN cd apps/server && npx prisma generate
RUN pnpm --filter @guoxue/shared build
RUN pnpm --filter @guoxue/bazi-engine build
RUN pnpm --filter @guoxue/ziwei-engine build
RUN pnpm build:server
RUN pnpm build:admin
RUN pnpm --filter @guoxue/mobile build:h5
RUN node scripts/migration/check-client-artifacts.mjs apps/mobile/dist/build/h5 \
  --forbid-origin https://api.rebugx.cn \
  --expect-origin "$VITE_API_URL" \
  --expect-origin "$VITE_PUBLIC_ASSET_ORIGIN"
RUN node scripts/migration/check-client-artifacts.mjs apps/admin/dist \
  --forbid-origin https://api.rebugx.cn \
  --expect-origin "$VITE_PUBLIC_H5_URL"

# ── 运行阶段 ──
FROM node:20-slim
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

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
COPY --from=builder /app/apps/admin/dist ./admin-dist
COPY --from=builder /app/apps/mobile/dist/build/h5 ./h5-dist

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health/live || exit 1

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
