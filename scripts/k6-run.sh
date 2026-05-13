#!/usr/bin/env bash
# ============================================================
# 国学平台 — k6 性能压测运行器
# 用法:
#   bash scripts/k6-run.sh smoke          # 冒烟测试 (1 VU, 1分钟)
#   bash scripts/k6-run.sh load           # 负载测试 (→50 VU, 10分钟)
#   bash scripts/k6-run.sh stress         # 压力测试 (→200 VU, 17分钟)
#   bash scripts/k6-run.sh soak           # 浸泡测试 (50 VU, 30分钟)
#   bash scripts/k6-run.sh spike          # 尖峰测试 (200 VU 突刺)
#   bash scripts/k6-run.sh all            # 全序运行（冒烟→负载→压力）
#   bash scripts/k6-run.sh quick          # 快速验证 (2 VU, 30秒)
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
K6_DIR="$ROOT/tests/performance/k6"
RESULTS_DIR="$ROOT/tests/performance/results"
mkdir -p "$RESULTS_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCENARIO="${1:-smoke}"
BASE_URL="${BASE_URL:-http://localhost:3000}"

# ── 检查服务可用性 ──
check_server() {
  echo -n "检查服务: $BASE_URL ... "
  if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/health" 2>/dev/null | grep -q "200"; then
    echo -e "${GREEN}OK${NC}"
  else
    echo -e "${RED}不可达${NC}"
    echo "  提示: 先启动服务 — bash scripts/quick-start.sh 或 pnpm dev:server"
    exit 1
  fi
}

# ── 生成 HTML 报告 ──
generate_report() {
  local scenario="$1"
  local json_file="$RESULTS_DIR/${scenario}-summary.json"
  local html_file="$RESULTS_DIR/${scenario}-report.html"

  if [ -f "$json_file" ]; then
    echo "  生成报告: $html_file"
    cat > "$html_file" << 'REPORT_HTML'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>国学平台 — 性能压测报告</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #333; }
  h1 { color: #C41E3A; border-bottom: 2px solid #C41E3A; padding-bottom: .5rem; }
  .metric { display: inline-block; background: #f5f5f5; padding: .5rem 1rem; margin: .25rem; border-radius: 4px; }
  .metric .label { font-size: .8rem; color: #666; }
  .metric .value { font-size: 1.2rem; font-weight: bold; }
  .pass { color: #22c55e; } .fail { color: #ef4444; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { border: 1px solid #e5e5e5; padding: .5rem .75rem; text-align: left; }
  th { background: #fafafa; }
  pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; }
</style>
</head>
<body>
<h1>🏮 国学平台 性能压测报告</h1>
<p>场景: SCENARIO | 时间: TIMESTAMP | 目标: TARGET_URL</p>
<div id="metrics"><p>加载中...</p></div>
<pre id="raw"></pre>
<script>
  fetch('SUMMARY_FILE')
    .then(r => r.json())
    .then(data => {
      const m = data.metrics || {};
      let html = '';
      const keys = [
        ['http_req_duration', '请求延迟 (avg)'],
        ['http_req_duration', '请求延迟 (p95)'],
        ['http_req_duration', '请求延迟 (p99)'],
        ['http_reqs', '总请求数'],
        ['http_req_failed', '失败率'],
        ['vus', '最大 VU'],
        ['iterations', '总迭代数'],
      ];
      for (const [k, label] of keys) {
        const v = m[k]?.values || {};
        const val = v.avg || v.p95 || v.p99 || v.value || v.max || '-';
        html += `<div class="metric"><div class="label">${label}</div><div class="value">${typeof val === 'number' ? val.toFixed(2) : val}</div></div>`;
      }
      document.getElementById('metrics').innerHTML = html;
      document.getElementById('raw').textContent = JSON.stringify(data, null, 2);
    });
</script>
</body>
</html>
REPORT_HTML
    # 替换占位符
    sed -i "s|SCENARIO|$scenario|g" "$html_file"
    sed -i "s|TIMESTAMP|$(date -Iseconds)|g" "$html_file"
    sed -i "s|TARGET_URL|$BASE_URL|g" "$html_file"
    sed -i "s|SUMMARY_FILE|$(basename "$json_file")|g" "$html_file"
    echo -e "  ${GREEN}报告已生成${NC}"
  fi
}

# ── 运行场景 ──
run_scenario() {
  local scenario="$1"
  local json_file="$RESULTS_DIR/${scenario}-summary.json"

  echo ""
  echo -e "${CYAN}════════════════════════════════════════${NC}"
  echo -e "${CYAN}  场景: $scenario${NC}"
  echo -e "${CYAN}════════════════════════════════════════${NC}"
  echo ""

  k6 run \
    --env BASE_URL="$BASE_URL" \
    --summary-export "$json_file" \
    --out json="$RESULTS_DIR/${scenario}-raw.json" \
    "$K6_DIR/main.js" 2>&1 | tail -30

  local exit_code=${PIPESTATUS[0]}
  echo ""

  if [ -f "$json_file" ]; then
    # 提取关键指标
    echo -e "${YELLOW}关键指标:${NC}"
    python3 -c "
import json
with open('$json_file') as f:
    d = json.load(f)
m = d.get('metrics', {})
def val(k, field):
    v = m.get(k, {}).get('values', {}).get(field)
    return v if v is not None else m.get(k, {}).get('value', '-')
print(f\"  总请求:    {val('http_reqs','count')}\")
print(f\"  失败率:    {val('http_req_failed','rate')}\")
print(f\"  P95延迟:   {val('http_req_duration','p(95)')}ms\")
print(f\"  P99延迟:   {val('http_req_duration','p(99)')}ms\")
print(f\"  平均延迟:  {val('http_req_duration','avg')}ms\")
print(f\"  最大VU:     {val('vus','max')}\")
print(f\"  迭代数:    {val('iterations','count')}\")
" 2>/dev/null || echo "  (需要 Python 3 提取指标)"
  fi

  return $exit_code
}

# ── 主入口 ──
case "$SCENARIO" in
  quick)
    echo -e "${YELLOW}快速验证 (2 VU × 30秒)${NC}"
    check_server
    k6 run --env BASE_URL="$BASE_URL" --duration 30s --vus 2 "$K6_DIR/main.js" 2>&1 | tail -15
    ;;

  smoke|load|stress|soak|spike)
    check_server
    run_scenario "$SCENARIO" || true
    ;;

  all)
    check_server
    for s in smoke load stress; do
      run_scenario "$s" || echo -e "${RED}$s 存在失败指标${NC}"
    done
    ;;

  *)
    echo "用法: bash scripts/k6-run.sh <场景>"
    echo ""
    echo "场景:"
    echo "  quick     快速验证 (2 VU × 30秒)"
    echo "  smoke     冒烟测试 (1 VU × 1分钟)"
    echo "  load      负载测试 (→50 VU × 10分钟)"
    echo "  stress    压力测试 (→200 VU × 17分钟)"
    echo "  soak      浸泡测试 (50 VU × 30分钟)"
    echo "  spike     尖峰测试 (200 VU 突刺)"
    echo "  all       全序运行 (冒烟→负载→压力)"
    ;;
esac
