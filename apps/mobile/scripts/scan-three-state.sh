#!/bin/bash
# ============================================================
# 三态 UI 覆盖率扫描
# 检查数据驱动页面是否有 loading / error / empty 三态
# ============================================================

cd "$(dirname "$0")/.."

echo "=== 三态 UI 覆盖率扫描 ==="
echo ""

EXIT_CODE=0
TOTAL=0
MISSING_ANY=0
MISSING_LOADING=0
MISSING_ERROR=0
MISSING_EMPTY=0
HAS_ALL=0

# 三态检测模式
HAS_LOADING='isLoading|AppSkeleton|v-if="loading|loading\.value|dataLoading'
HAS_ERROR='loadError|AppError|v-if="error|error\.value'
HAS_EMPTY='isEmpty|AppEmpty|v-if="empty|empty\.value'

while IFS= read -r -d '' vuefile; do
  # 跳过组件文件 — 只看页面
  [[ "$vuefile" == *"/components/"* ]] && continue
  [[ "$vuefile" == *"node_modules"* ]] && continue

  # 检查是否导入了数据层（有数据加载需求）
  HAS_DATA=$(grep -cP "from ['\"]@/lib/[^'\"]+data" "$vuefile" 2>/dev/null || true)
  USES_ASYNC=$(grep -c "useAsyncData\|onMounted\|\.value\s*=\s*await" "$vuefile" 2>/dev/null || true)

  # 跳过没有数据加载的页面（纯静态/纯表单/纯展示）
  if [ "$HAS_DATA" -eq 0 ] && [ "$USES_ASYNC" -eq 0 ]; then
    continue
  fi

  TOTAL=$((TOTAL + 1))

  L=0; E=0; M=0
  grep -qP "$HAS_LOADING" "$vuefile" 2>/dev/null && L=1
  grep -qP "$HAS_ERROR" "$vuefile" 2>/dev/null && E=1
  grep -qP "$HAS_EMPTY" "$vuefile" 2>/dev/null && M=1

  if [ $L -eq 1 ] && [ $E -eq 1 ] && [ $M -eq 1 ]; then
    HAS_ALL=$((HAS_ALL + 1))
    continue
  fi

  MISSING_ANY=$((MISSING_ANY + 1))
  [ $L -eq 0 ] && MISSING_LOADING=$((MISSING_LOADING + 1))
  [ $E -eq 0 ] && MISSING_ERROR=$((MISSING_ERROR + 1))
  [ $M -eq 0 ] && MISSING_EMPTY=$((MISSING_EMPTY + 1))

  STATUS="${L}${E}${M}"
  case "$STATUS" in
    000) ICON="❌❌❌" ;;
    100) ICON="✅❌❌" ;;
    010) ICON="❌✅❌" ;;
    001) ICON="❌❌✅" ;;
    110) ICON="✅✅❌" ;;
    101) ICON="✅❌✅" ;;
    011) ICON="❌✅✅" ;;
  esac

  REL="${vuefile#src/}"
  printf "  %s L%s E%s M%s  %s\n" "$ICON" "$L" "$E" "$M" "$REL"

done < <(find src -name "*.vue" -type f -print0 2>/dev/null)

echo ""
echo "--- 汇总 ---"
echo "数据驱动页面总数: $TOTAL"
echo "三态完整(✅✅✅): $HAS_ALL"
echo "有缺失:          $MISSING_ANY"
echo "  缺 Loading:    $MISSING_LOADING"
echo "  缺 Error:      $MISSING_ERROR"
echo "  缺 Empty:      $MISSING_EMPTY"

if [ "$MISSING_ANY" -gt 0 ]; then
  EXIT_CODE=1
fi

exit $EXIT_CODE
