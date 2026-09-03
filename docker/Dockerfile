FROM node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS builder
RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null; \
    sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list 2>/dev/null; \
    apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates curl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
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
RUN pnpm --dir apps/server exec prisma generate
RUN pnpm --filter @guoxue/shared build
RUN pnpm --filter @guoxue/bazi-engine build
RUN pnpm --filter @guoxue/ziwei-engine build
# nest build 编译大型项目需要更多堆内存（默认 2GB 会 OOM）
ENV NODE_OPTIONS=--max-old-space-size=4096
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
FROM node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
WORKDIR /app

RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null; \
    sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list 2>/dev/null; \
    apt-get update && apt-get install -y --no-install-recommends wget ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/prisma.config.ts ./apps/server/
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
