#!/bin/bash
# 核心 API 压力测试
# 用法: bash scripts/load-test.sh
BASE="http://localhost:3000/api/v1"
DURATION=30
CONNECTIONS=10

echo "╔══════════════════════════════════════════╗"
echo "║  国学平台 API 压力测试                    ║"
echo "║  并发: ${CONNECTIONS}  持续: ${DURATION}s            ║"
echo "╚══════════════════════════════════════════╝"

function run_test() {
  local method=$1
  local path=$2
  local body=$3
  local label=$4

  echo ""
  echo "═══ ${label} ═══"
  echo "  ${method} ${path}"

  if [ -n "$body" ]; then
    autocannon -c $CONNECTIONS -d $DURATION \
      -H "Content-Type: application/json" \
      -m $method -b "$body" \
      "${BASE}${path}" 2>&1
  else
    autocannon -c $CONNECTIONS -d $DURATION \
      -m $method "${BASE}${path}" 2>&1
  fi
}

# 1. 健康检查 (baseline)
run_test GET "/system/health" "" "1. 健康检查 GET /system/health"

# 2. 首页 (重查询)
run_test GET "/home?stationId=default" "" "2. 首页 GET /home?stationId=default"

# 3. 搜索
run_test GET "/search?q=论语&page=1&pageSize=5" "" "3. 搜索 GET /search?q=论语"

# 4. 排盘 (计算密集)
run_test POST "/paipan/bazi/preview" '{"gender":"男","year":1990,"month":5,"day":15,"hour":10}' "4. 排盘 POST /paipan/bazi/preview"

# 5. 课程列表
run_test GET "/courses?page=1&pageSize=10" "" "5. 课程 GET /courses"

# 6. 商品列表
run_test GET "/shop/products?page=1&pageSize=10" "" "6. 商品 GET /shop/products"

# 7. 古籍列表
run_test GET "/classic/books?page=1&pageSize=5" "" "7. 古籍 GET /classic/books"

echo ""
echo "╔════════════════════════════════╗"
echo "║  压力测试完成                   ║"
echo "╚════════════════════════════════╝"
