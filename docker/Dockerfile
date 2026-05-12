FROM node:20-alpine AS builder
RUN npm install -g corepack@latest && corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# 依赖缓存层
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/bazi-engine/package.json packages/bazi-engine/
COPY packages/ziwei-engine/package.json packages/ziwei-engine/

RUN pnpm install --frozen-lockfile

# 源代码 + 构建
COPY . .
RUN pnpm --filter @guoxue/server exec prisma generate
RUN pnpm --filter @guoxue/bazi-engine build
RUN pnpm --filter @guoxue/ziwei-engine build
RUN pnpm build:server

# ── 运行阶段 ──
FROM node:20-alpine
RUN npm install -g corepack@latest && corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# 仅复制运行时依赖
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

# Prisma 生成产物 + dist + 构建后的 workspace 包
COPY --from=builder /app/apps/server/node_modules/.prisma ./apps/server/node_modules/.prisma
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/packages/bazi-engine/dist ./packages/bazi-engine/dist
COPY --from=builder /app/packages/bazi-engine/package.json ./packages/bazi-engine/
COPY --from=builder /app/packages/ziwei-engine/dist ./packages/ziwei-engine/dist
COPY --from=builder /app/packages/ziwei-engine/package.json ./packages/ziwei-engine/
COPY --from=builder /app/package.json ./
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
