#!/bin/bash
# deploy-verify.sh — 国学平台部署后一键验证
# 用法: bash scripts/deploy-verify.sh [base-url]

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0

check() {
  local name="$1" url="$2" method="${3:-GET}" expect="${4:-200}" body="${5:-}"
  local code

  if [ "$method" = "POST" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$url" \
      -H "Content-Type: application/json" -d "$body" 2>/dev/null | tr -d '[:space:]')
  else
    code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null | tr -d '[:space:]')
  fi

  if [ "$expect" = "2xx" ]; then
    case "$code" in
      2*) echo "  ✅ $name" ; PASS=$((PASS + 1)) ;;
      *)  echo "  ❌ $name (期望 2xx, 实际 $code)" ; FAIL=$((FAIL + 1)) ;;
    esac
  elif [ "$code" = "$expect" ]; then
    echo "  ✅ $name"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $name (期望 $expect, 实际 $code)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     国学平台 — 部署后自动验证           ║"
echo "╠══════════════════════════════════════════╣"
echo "║ 目标: $BASE_URL"
echo "╚══════════════════════════════════════════╝"
echo ""

# 1. 健康检查
echo "── 1. 健康检查 ──"
check "健康检查 /health"        "$BASE_URL/api/v1/health"
check "Prometheus /metrics"    "$BASE_URL/api/v1/metrics"   "GET" "2xx"
check "经典列表 /classic/books" "$BASE_URL/api/v1/classic/books"

# 2. 公开接口
echo "── 2. 公开接口 ──"
check "小程序首页"    "$BASE_URL/api/v1/mini/home"
check "内容列表"      "$BASE_URL/api/v1/contents?page=1&pageSize=10"
check "发现页"        "$BASE_URL/api/v1/discover"
check "热门搜索"      "$BASE_URL/api/v1/search/hot"
check "搜索建议"      "$BASE_URL/api/v1/search/suggest?keyword=%E8%AE%BA%E8%AF%AD"
check "排盘工具目录"  "$BASE_URL/api/v1/tools/directory"
check "课程列表"      "$BASE_URL/api/v1/courses?page=1&pageSize=10"
check "商品列表"      "$BASE_URL/api/v1/shop/products"

# 3. 鉴权接口（未登录应返回 401）
echo "── 3. 鉴权守卫验证 ──"
check "未登录访问 /auth/me" "$BASE_URL/api/v1/auth/me" "GET" "401"

echo ""
echo "═══════════════════════════════════════════"
echo "  总计: $((PASS + FAIL)) 项 | 通过: $PASS | 失败: $FAIL"
echo "═══════════════════════════════════════════"

[ "$FAIL" -eq 0 ] || exit 1
