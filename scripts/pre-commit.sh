#!/usr/bin/env bash
# ============================================================
# Pre-commit 检查 — 国学平台服务端
# 在提交前自动运行类型检查 + 代码规范 + 受影响测试
# 用法: bash scripts/pre-commit.sh
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check_step() {
  local label="$1"
  shift
  echo -n "  ${label} ... "
  if "$@" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}✗${NC}"
    FAIL=$((FAIL + 1))
    return 1
  fi
}

echo ""
echo "════════════════════════════════════════"
echo "  国学平台 Pre-commit 检查"
echo "════════════════════════════════════════"
echo ""

# ───── 1. 类型检查 ─────
echo -e "${YELLOW}[类型检查]${NC}"

# 检查暂存文件所属的包，只对相关包做 tsc 检查
STAGED_TS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.ts$' || true)
TSC_PASS=0
TSC_FAIL=0

run_tsc() {
  local pkg="$1"
  local label="$2"
  echo -n "  ${label} ... "
  if pnpm --filter "$pkg" exec npx tsc --noEmit > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    TSC_PASS=$((TSC_PASS + 1))
  else
    echo -e "${RED}✗${NC}"
    TSC_FAIL=$((TSC_FAIL + 1))
  fi
}

if [ -n "$STAGED_TS_FILES" ]; then
  if echo "$STAGED_TS_FILES" | grep -q 'packages/bazi-engine/'; then
    run_tsc "@guoxue/bazi-engine" "bazi-engine tsc"
  fi
  if echo "$STAGED_TS_FILES" | grep -q 'packages/ziwei-engine/'; then
    run_tsc "@guoxue/ziwei-engine" "ziwei-engine tsc"
  fi
  if echo "$STAGED_TS_FILES" | grep -q 'packages/shared/'; then
    run_tsc "@guoxue/shared" "shared tsc"
  fi
  if echo "$STAGED_TS_FILES" | grep -q 'apps/server/'; then
    run_tsc "@guoxue/server" "server tsc"
  fi
  if echo "$STAGED_TS_FILES" | grep -q 'apps/admin/'; then
    run_tsc "@guoxue/admin" "admin vue-tsc"
  fi
  if [ $TSC_FAIL -eq 0 ] && [ $TSC_PASS -gt 0 ]; then
    PASS=$((PASS + 1))
  elif [ $TSC_FAIL -gt 0 ]; then
    echo -e "  ${RED}✗ 类型错误，请修复后重试${NC}"
    FAIL=$((FAIL + 1))
  else
    echo "  (无匹配包的 TypeScript 文件变更，跳过)"
    PASS=$((PASS + 1))
  fi
else
  echo "  (无 TypeScript 文件变更，跳过)"
  PASS=$((PASS + 1))
fi

# ───── 2. 代码规范 ─────
echo ""
echo -e "${YELLOW}[代码规范]${NC}"
STAGED_TS=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.ts$' || true)
if [ -n "$STAGED_TS" ]; then
  check_step "ESLint 检查暂存文件" npx eslint $STAGED_TS --quiet || true
else
  echo "  (无 TypeScript 文件变更，跳过)"
  PASS=$((PASS + 1))
fi

# ───── 3. 服务端测试 ─────
echo ""
echo -e "${YELLOW}[服务端测试]${NC}"
STAGED_SERVER=$(git diff --cached --name-only --diff-filter=ACM | grep '^apps/server/' || true)
if [ -n "$STAGED_SERVER" ]; then
  # 只运行与变更文件相关的测试
  SPEC_FILES=""
  for f in $STAGED_SERVER; do
    base=$(basename "$f" .ts)
    dir=$(dirname "$f" | sed 's|^apps/server/||')
    # src/modules/xxx/xxx.service.ts → src/modules/xxx/xxx.service.spec.ts
    spec="apps/server/${dir}/${base}.spec.ts"
    if [ -f "$spec" ]; then
      SPEC_FILES="$SPEC_FILES $spec"
    fi
  done

  if [ -n "$SPEC_FILES" ]; then
    echo "  运行关联测试: $(echo $SPEC_FILES | tr '\n' ' ')"
    REL_SPECS=$(echo "$SPEC_FILES" | sed 's|apps/server/||g')
    if (cd apps/server && npx jest --config jest.config.ts $REL_SPECS --no-coverage --forceExit 2>&1); then
      echo -e "  ${GREEN}✓${NC}"
      PASS=$((PASS + 1))
    else
      echo -e "  ${RED}✗ 测试失败${NC}"
      FAIL=$((FAIL + 1))
    fi
  else
    echo "  变更文件无关联测试，运行全量 src/ 测试"
    if (cd apps/server && npx jest --config jest.config.ts --testPathPattern "src/" --no-coverage --forceExit 2>&1); then
      echo -e "  ${GREEN}✓${NC}"
      PASS=$((PASS + 1))
    else
      echo -e "  ${RED}✗ 测试失败${NC}"
      FAIL=$((FAIL + 1))
    fi
  fi
else
  echo "  (无服务端变更，跳过)"
  PASS=$((PASS + 1))
fi

# ───── 4. 汇总 ─────
echo ""
echo "════════════════════════════════════════"
TOTAL=$((PASS + FAIL))
echo "  结果: ${PASS}/${TOTAL} 通过"
if [ $FAIL -gt 0 ]; then
  echo -e "  ${RED}存在 ${FAIL} 项失败，提交已阻止${NC}"
  echo ""
  echo "  提示："
  echo "  - 使用 git commit --no-verify 跳过检查（不推荐）"
  echo "  - 使用 npm run lint:fix 自动修复 lint 问题"
  exit 1
else
  echo -e "  ${GREEN}全部通过，允许提交 ✓${NC}"
  echo ""
  exit 0
fi
