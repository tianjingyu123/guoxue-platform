FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# 依赖缓存层
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

# 源代码 + 构建
COPY . .
RUN npx prisma generate --schema=apps/server/prisma/schema.prisma
RUN pnpm build:server

# ── 运行阶段 ──
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# 仅复制运行时依赖
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

# Prisma 生成产物 + dist
COPY --from=builder /app/apps/server/node_modules/.prisma ./apps/server/node_modules/.prisma
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "apps/server/dist/main.js"]
