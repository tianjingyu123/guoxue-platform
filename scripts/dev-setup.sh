#!/usr/bin/env bash
# ============================================================
# 国学平台 — 新机开发环境一键初始化
# 支持: Ubuntu 20.04+ / Debian 11+ / macOS (Homebrew)
# 用法: bash scripts/dev-setup.sh
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}  国学平台 — 新机开发环境初始化${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""

OS="$(uname -s)"
if [ "$OS" = "Linux" ]; then
  DISTRO="$(. /etc/os-release && echo "$ID")"
elif [ "$OS" = "Darwin" ]; then
  DISTRO="macos"
else
  echo -e "${RED}不支持的操作系统: $OS${NC}"
  exit 1
fi
echo "  系统: $OS ($DISTRO)"

# ───── 1. Node.js >= 20 ─────
echo ""
echo -e "${YELLOW}[1/7] 安装 Node.js${NC}"
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VER" -ge 20 ]; then
    echo -e "  ${GREEN}Node.js $(node -v) 已就绪${NC}"
  else
    echo -e "  ${RED}Node.js $(node -v) < 20，请升级${NC}"
    exit 1
  fi
else
  case "$DISTRO" in
    ubuntu|debian)
      echo "  通过 NodeSource 安装 Node.js 22 LTS..."
      curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
      sudo apt-get install -y nodejs
      ;;
    macos)
      brew install node@22
      ;;
  esac
  echo -e "  ${GREEN}Node.js $(node -v) 安装完成${NC}"
fi

# ───── 2. pnpm ─────
echo ""
echo -e "${YELLOW}[2/7] 安装 pnpm${NC}"
if command -v pnpm >/dev/null 2>&1; then
  echo -e "  ${GREEN}pnpm $(pnpm -v) 已就绪${NC}"
else
  npm install -g pnpm
  echo -e "  ${GREEN}pnpm $(pnpm -v) 安装完成${NC}"
fi

# ───── 3. Docker ─────
echo ""
echo -e "${YELLOW}[3/7] 安装 Docker + Docker Compose${NC}"
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo -e "  ${GREEN}Docker + Compose 已就绪${NC}"
else
  case "$DISTRO" in
    ubuntu|debian)
      echo "  通过官方仓库安装 Docker..."
      sudo apt-get update
      sudo apt-get install -y ca-certificates curl
      sudo install -m 0755 -d /etc/apt/keyrings
      sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
      sudo chmod a+r /etc/apt/keyrings/docker.asc
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
      sudo apt-get update
      sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
      sudo usermod -aG docker "$USER"
      echo -e "  ${YELLOW}⚠ 请退出重新登录以生效 docker 组权限${NC}"
      ;;
    macos)
      echo "  请手动安装 Docker Desktop: https://www.docker.com/products/docker-desktop/"
      echo -e "  ${RED}安装后请重新运行此脚本${NC}"
      exit 1
      ;;
  esac
  echo -e "  ${GREEN}Docker 安装完成${NC}"
fi

# ───── 4. Git 配置 ─────
echo ""
echo -e "${YELLOW}[4/7] Git 配置${NC}"
if [ ! -f "$HOME/.ssh/id_ed25519" ]; then
  echo "  生成 SSH Key..."
  ssh-keygen -t ed25519 -C "dev@guoxue" -f "$HOME/.ssh/id_ed25519" -N ""
  echo ""
  echo -e "  ${YELLOW}请将以下公钥添加到 GitHub:${NC}"
  echo ""
  cat "$HOME/.ssh/id_ed25519.pub"
  echo ""
else
  echo -e "  ${GREEN}SSH Key 已存在${NC}"
fi

# ───── 5. 克隆项目（如果还没克隆）───
echo ""
echo -e "${YELLOW}[5/7] 项目代码${NC}"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ -f "$SCRIPT_DIR/pnpm-workspace.yaml" ]; then
  echo -e "  ${GREEN}项目已存在: $SCRIPT_DIR${NC}"
else
  echo "  请输入仓库地址:"
  read -r REPO_URL
  git clone "$REPO_URL" "$HOME/guoxue-platform"
  SCRIPT_DIR="$HOME/guoxue-platform"
  echo -e "  ${GREEN}项目已克隆到 $SCRIPT_DIR${NC}"
fi

# ───── 6. 安装依赖 ─────
echo ""
echo -e "${YELLOW}[6/7] 安装项目依赖${NC}"
cd "$SCRIPT_DIR"
pnpm install
echo -e "  ${GREEN}依赖安装完成${NC}"

# ───── 7. 环境配置 ─────
echo ""
echo -e "${YELLOW}[7/7] 环境配置${NC}"
if [ ! -f "apps/server/.env" ]; then
  cp apps/server/.env.example apps/server/.env
  echo -e "  ${GREEN}.env 已创建（开发默认值）${NC}"
else
  echo "  .env 已存在，跳过"
fi

# ───── 完成 ─────
echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  环境初始化完成！${NC}"
echo ""
echo "  下一步:"
echo "    bash scripts/quick-start.sh          # 一键启动全栈"
echo ""
echo "  手动启动:"
echo "    pnpm dev:server                       # 仅后端"
echo "    pnpm dev:admin                        # 仅管理后台"
echo ""
echo "  运行测试:"
echo "    pnpm test:server                      # 单元测试"
echo "    pnpm test:e2e                         # E2E 测试"
echo "    pnpm typecheck                        # 类型检查"
echo -e "${CYAN}════════════════════════════════════════${NC}"
