#!/bin/bash
# 殆知阁古籍全自动导入流水线
# 持续下载→生成种子→导入数据库，直到全部 8,860 部古籍处理完毕
#
# 用法: bash scripts/daizhige-pipeline.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BATCH_SIZE=600
TOTAL=8860

echo "=========================================="
echo "  殆知阁古籍全自动导入流水线"
echo "  目标: ${TOTAL} 部古籍"
echo "  批次大小: ${BATCH_SIZE}"
echo "=========================================="

downloaded=0
batch=1

while [ $downloaded -lt $TOTAL ]; do
  next_target=$((downloaded + BATCH_SIZE))

  echo ""
  echo "===== 批次 ${batch}: 下载至 ${next_target} ====="

  cd "$PROJECT_DIR"
  py scripts/daizhige-scraper.py download $next_target

  echo ""
  echo "===== 批次 ${batch}: 生成种子 ====="
  py scripts/daizhige-scraper.py generate

  echo ""
  echo "===== 批次 ${batch}: 导入数据库 ====="
  cd "$PROJECT_DIR/apps/server"
  npx ts-node --transpile-only scripts/import-daizhige-seeds.ts --max $BATCH_SIZE

  downloaded=$next_target
  batch=$((batch + 1))

  echo ""
  echo "===== 批次 ${batch} 完成 (已处理 ${downloaded}/${TOTAL}) ====="
done

echo ""
echo "=========================================="
echo "  全部完成! ${TOTAL} 部古籍已导入"
echo "=========================================="
