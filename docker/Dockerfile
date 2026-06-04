FROM node:20.19-alpine AS builder
RUN npm install -g pnpm@10.33.3
WORKDIR /app

# 依赖缓存层
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY apps/admin/package.json apps/admin/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared/package.json packages/shared/
COPY packages/bazi-engine/package.json packages/bazi-engine/
COPY packages/ziwei-engine/package.json packages/ziwei-engine/

RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# 源代码 + 构建（排除 node_modules 避免覆盖）
COPY . .
RUN pnpm --filter @guoxue/server exec prisma generate
RUN pnpm --filter @guoxue/shared build
RUN pnpm --filter @guoxue/bazi-engine build
RUN pnpm --filter @guoxue/ziwei-engine build
RUN pnpm build:server
RUN pnpm build:admin || true

# ── 运行阶段 ──
FROM node:20.19-alpine
RUN npm install -g pnpm@10.33.3
WORKDIR /app

# 仅复制运行时依赖
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

# Prisma 生成产物 + dist + 构建后的 workspace 包
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

# 管理后台前端构建产物
COPY --from=builder /app/apps/admin/dist ./admin-dist

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health/live || exit 1

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
