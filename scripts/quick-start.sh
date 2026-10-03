#!/usr/bin/env bash
# ============================================================
# 国学平台 — 一键快速启动（全栈开发环境）
# 用法: bash scripts/quick-start.sh [--no-seed] [--no-admin]
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

NO_SEED=false
NO_ADMIN=false
for arg in "$@"; do
  case "$arg" in
    --no-seed) NO_SEED=true ;;
    --no-admin) NO_ADMIN=true ;;
  esac
done

echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}  国学传统文化综合平台 — 快速启动${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""

# ───── 1. 环境检查 ─────
echo -e "${YELLOW}[1/6] 环境检查${NC}"

command -v node >/dev/null 2>&1 || { echo -e "${RED}请先安装 Node.js 22 或 24 LTS${NC}"; exit 1; }
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -ne 22 ] && [ "$NODE_VER" -ne 24 ]; then
  echo -e "${RED}Node.js 22 或 24 LTS required，当前: $(node -v)${NC}"
  exit 1
fi
echo "  Node.js: $(node -v)"

command -v pnpm >/dev/null 2>&1 || {
  echo -e "${YELLOW}  pnpm 未安装，正在安装...${NC}"
  npm install -g pnpm
}
echo "  pnpm: $(pnpm -v)"

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
elif docker-compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  echo -e "${RED}请先安装 Docker Compose${NC}"
  exit 1
fi
echo "  Docker Compose: OK"

# ───── 2. 安装依赖 ─────
echo ""
echo -e "${YELLOW}[2/6] 安装项目依赖${NC}"
pnpm install --prefer-offline 2>&1 | tail -3
echo -e "  ${GREEN}依赖安装完成${NC}"

# ───── 3. 启动 Docker 服务 ─────
echo ""
echo -e "${YELLOW}[3/6] 启动 Docker 基础设施（PostgreSQL + Redis）${NC}"
$DOCKER_COMPOSE -f docker/docker-compose.yml up -d postgres redis 2>&1

echo "  等待 PostgreSQL 就绪..."
for i in $(seq 1 30); do
  if $DOCKER_COMPOSE -f docker/docker-compose.yml exec -T postgres pg_isready -U guoxue >/dev/null 2>&1; then
    echo -e "  ${GREEN}PostgreSQL 就绪${NC}"
    break
  fi
  [ "$i" -eq 30 ] && { echo -e "${RED}PostgreSQL 启动超时${NC}"; exit 1; }
  sleep 2
done

echo "  等待 Redis 就绪..."
for i in $(seq 1 15); do
  if $DOCKER_COMPOSE -f docker/docker-compose.yml exec -T redis redis-cli ping >/dev/null 2>&1; then
    echo -e "  ${GREEN}Redis 就绪${NC}"
    break
  fi
  [ "$i" -eq 15 ] && { echo -e "${RED}Redis 启动超时${NC}"; exit 1; }
  sleep 1
done

# ───── 4. 初始化 .env ─────
echo ""
echo -e "${YELLOW}[4/6] 配置环境变量${NC}"
if [ ! -f "apps/server/.env" ]; then
  cp apps/server/.env.example apps/server/.env
  echo -e "  ${GREEN}已从 .env.example 创建 .env（使用默认开发值）${NC}"
  echo "  如需接入第三方服务，请编辑 apps/server/.env"
else
  echo "  .env 已存在，跳过"
fi

# ───── 5. 数据库迁移 + 种子数据 ─────
echo ""
echo -e "${YELLOW}[5/6] 数据库迁移 + 种子数据${NC}"
echo "  正在生成 Prisma Client..."
npx prisma generate --schema=apps/server/prisma/schema.prisma 2>&1 | tail -1

echo "  正在执行数据库迁移..."
# 本地开发库也默认拒绝破坏性变更；如检测到数据丢失风险，命令会失败并要求人工处理。
npx prisma db push --schema=apps/server/prisma/schema.prisma \
  --skip-generate 2>&1 | tail -3

if [ "$NO_SEED" = false ]; then
  : "${SEED_ADMIN_PASSWORD:?执行 seed 前请设置 SEED_ADMIN_PASSWORD（至少 12 个字符）}"
  : "${SEED_TEACHER_PASSWORD:?执行 seed 前请设置 SEED_TEACHER_PASSWORD（至少 12 个字符）}"
  : "${SEED_OPERATOR_PASSWORD:?执行 seed 前请设置 SEED_OPERATOR_PASSWORD（至少 12 个字符）}"
  echo "  正在填充种子数据..."
  npx tsx apps/server/prisma/seed.ts 2>&1 | tail -5
  echo -e "  ${GREEN}种子数据填充完成${NC}"
else
  echo "  --no-seed: 跳过种子数据"
fi

# ───── 6. 启动服务 ─────
echo ""
echo -e "${YELLOW}[6/6] 启动开发服务${NC}"

# 后台启动后端
echo "  启动后端 (http://localhost:3000)..."
pnpm --filter @guoxue/server dev > /tmp/guoxue-server.log 2>&1 &
SERVER_PID=$!
echo "  后端 PID: $SERVER_PID"

# 等待后端启动
sleep 5
if kill -0 $SERVER_PID 2>/dev/null; then
  echo -e "  ${GREEN}后端已启动${NC}"
else
  echo -e "${RED}后端启动失败，查看日志: tail -f /tmp/guoxue-server.log${NC}"
  exit 1
fi

if [ "$NO_ADMIN" = false ]; then
  echo "  启动管理后台 (http://localhost:5173)..."
  pnpm --filter @guoxue/admin dev > /tmp/guoxue-admin.log 2>&1 &
  ADMIN_PID=$!
  echo "  管理后台 PID: $ADMIN_PID"
  sleep 3
fi

# ───── 完成 ─────
echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  启动完成！${NC}"
echo ""
echo "  后端 API:    http://localhost:3000"
echo "  Swagger:     http://localhost:3000/api/docs"
echo "  健康检查:    http://localhost:3000/api/v1/health"
if [ "$NO_ADMIN" = false ]; then
  echo "  管理后台:    http://localhost:5173"
fi
echo ""
echo "  管理员账号:  13800000000 / 密码由 SEED_ADMIN_PASSWORD 提供"
echo "  讲师账号:    13800000001 / 密码由 SEED_TEACHER_PASSWORD 提供"
echo ""
echo "  查看后端日志: tail -f /tmp/guoxue-server.log"
if [ "$NO_ADMIN" = false ]; then
  echo "  查看后台日志: tail -f /tmp/guoxue-admin.log"
fi
echo ""
echo "  停止所有服务: kill \$(cat /tmp/guoxue-server.pid) \$(cat /tmp/guoxue-admin.pid 2>/dev/null)"
echo -e "${CYAN}════════════════════════════════════════${NC}"

# 保存 PID
echo $SERVER_PID > /tmp/guoxue-server.pid
if [ "$NO_ADMIN" = false ]; then
  echo $ADMIN_PID > /tmp/guoxue-admin.pid
fi
