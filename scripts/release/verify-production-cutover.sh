#!/bin/bash
# DNS 已切向新环境后，重建易过期证据并汇总上线判定。
# 本脚本不启动/停止容器、不执行数据库迁移、不修改 DNS，只写发布证据目录。
set -euo pipefail

die() {
  echo "$1" >&2
  exit 64
}

PLATFORM_ROOT="${PLATFORM_ROOT:-/opt/guoxue}"
RELEASE_ID="${RELEASE_ID:-${1:-}}"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-24}"
DEPLOY_TARGET="${DEPLOY_TARGET:-}"
NODE_ROLE="${NODE_ROLE:-operations}"
ENV_FILE="${ENV_FILE:-$PLATFORM_ROOT/shared/.env.production}"
INFRASTRUCTURE_INTAKE_FILE="${INFRASTRUCTURE_INTAKE_FILE:-$PLATFORM_ROOT/shared/infrastructure-intake.json}"
NODE_BIN="${NODE_BIN:-node}"

[[ "$RELEASE_ID" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$ ]] || die "发布标识格式无效"
case "$MAX_AGE_HOURS" in
  12|24|48) ;;
  *) die "证据有效期仅允许 12、24 或 48 小时" ;;
esac
case "$DEPLOY_TARGET" in
  standard|tencent) ;;
  *) die "DEPLOY_TARGET 必须显式设置为 standard 或 tencent" ;;
esac
command -v "$NODE_BIN" >/dev/null 2>&1 || die "缺少 Node.js 运行时: $NODE_BIN"
command -v realpath >/dev/null 2>&1 || die "缺少 realpath，无法安全核对发布目录"

PLATFORM_ROOT_REAL="$(realpath -e "$PLATFORM_ROOT")"
RELEASE_DIR="$(realpath -e "$PLATFORM_ROOT_REAL/releases/$RELEASE_ID")"
CURRENT_DIR="$(realpath -e "$PLATFORM_ROOT_REAL/current")"
EXPECTED_RELEASE_DIR="$PLATFORM_ROOT_REAL/releases/$RELEASE_ID"
REPORT_DIR="$PLATFORM_ROOT_REAL/release-evidence/$RELEASE_ID"

[ "$RELEASE_DIR" = "$EXPECTED_RELEASE_DIR" ] || die "待验收版本不在受管 releases/<release-id> 目录"
[ "$CURRENT_DIR" = "$RELEASE_DIR" ] || die "current 未指向待验收版本"
[ -f "$CURRENT_DIR/.release-id" ] || die "current 目录缺少 .release-id"
[ "$(tr -d '\r\n' < "$CURRENT_DIR/.release-id")" = "$RELEASE_ID" ] || die "current 目录内发布标识与待验收版本不一致"
[ -f "$PLATFORM_ROOT_REAL/current-release-id" ] || die "缺少 current-release-id 兼容指针"
[ "$(tr -d '\r\n' < "$PLATFORM_ROOT_REAL/current-release-id")" = "$RELEASE_ID" ] || die "current-release-id 兼容指针与待验收版本不一致"

[ -f "$ENV_FILE" ] || die "缺少生产环境文件: $ENV_FILE"
ENV_MODE="$(stat -c '%a' "$ENV_FILE")"
[ "$ENV_MODE" = "600" ] || [ "$ENV_MODE" = "400" ] || die "生产环境文件权限必须为 600 或 400"
[ -f "$INFRASTRUCTURE_INTAKE_FILE" ] || die "缺少新基础设施接入清单: $INFRASTRUCTURE_INTAKE_FILE"
INTAKE_MODE="$(stat -c '%a' "$INFRASTRUCTURE_INTAKE_FILE")"
[ "$INTAKE_MODE" = "600" ] || [ "$INTAKE_MODE" = "400" ] || die "新基础设施接入清单权限必须为 600 或 400"

install -d -m 0750 "$REPORT_DIR"
REPORT_DIR_REAL="$(realpath -e "$REPORT_DIR")"
[ "$REPORT_DIR_REAL" = "$REPORT_DIR" ] || die "发布证据目录不允许通过符号链接逃逸"
[ -f "$REPORT_DIR/database-migration-verification.json" ] || die "缺少最终数据库迁移核验证据；请先完成 final 恢复、对账并生成报告"
[ -f "$RELEASE_DIR/RELEASE-MANIFEST.json" ] || die "固定发布目录缺少 RELEASE-MANIFEST.json"
[ -f "$RELEASE_DIR/release-evidence/client-config-binding.json" ] || die "固定发布目录缺少客户端配置绑定证据"

SOURCE_COMMIT="$($NODE_BIN -e '
  const fs = require("fs");
  const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  process.stdout.write(String(manifest.commit || ""));
' "$RELEASE_DIR/RELEASE-MANIFEST.json")"
[[ "$SOURCE_COMMIT" =~ ^[a-fA-F0-9]{40}$ ]] || die "发布清单缺少有效的 40 位源提交 SHA"

$NODE_BIN "$RELEASE_DIR/scripts/release/verify-client-config-binding.mjs" \
  "$RELEASE_DIR/release-evidence/client-config-binding.json" \
  "$ENV_FILE" \
  --expected-release-id "$RELEASE_ID" \
  --expected-commit "$SOURCE_COMMIT" \
  --report "$REPORT_DIR/client-config-binding-verification.json"
$NODE_BIN "$RELEASE_DIR/scripts/migration/check-env.mjs" "$ENV_FILE" --full \
  --deploy-target "$DEPLOY_TARGET" \
  --node-role "$NODE_ROLE" \
  --report "$REPORT_DIR/environment-readiness.json"
$NODE_BIN -- "$RELEASE_DIR/scripts/release/audit-infrastructure-intake.mjs" \
  --input "$INFRASTRUCTURE_INTAKE_FILE" --stage launch \
  --expected-deploy-target "$DEPLOY_TARGET" \
  --env-file "$ENV_FILE" \
  --report "$REPORT_DIR/infrastructure-intake-readiness.json"
if [ "$DEPLOY_TARGET" = "tencent" ]; then
  command -v python3 >/dev/null 2>&1 || die "腾讯云现场审计缺少 Python 3 运行时"
  python3 "$RELEASE_DIR/scripts/operations/audit-tencent-cloud-readiness.py" \
    --env-file "$ENV_FILE" \
    --release-id "$RELEASE_ID" \
    --report "$REPORT_DIR/tencent-cloud-readiness.json"
fi
$NODE_BIN -- "$RELEASE_DIR/scripts/release/audit-host-preflight.mjs" \
  --project-dir "$RELEASE_DIR" --env-file "$ENV_FILE" \
  --release-id "$RELEASE_ID" --allow-occupied-ports \
  --report "$REPORT_DIR/host-preflight-readiness.json"
$NODE_BIN "$RELEASE_DIR/scripts/release/verify-runtime.mjs" "$ENV_FILE" \
  --expected-release-id "$RELEASE_ID" \
  --report "$REPORT_DIR/runtime-verification.json"
$NODE_BIN "$RELEASE_DIR/scripts/release/audit-release-retention.mjs" \
  --root "$PLATFORM_ROOT_REAL" --keep 5 --min-free-gb 20 \
  --report "$REPORT_DIR/retention-audit.json"
$NODE_BIN "$RELEASE_DIR/scripts/release/aggregate-launch-evidence.mjs" \
  --release-id "$RELEASE_ID" --evidence-dir "$REPORT_DIR" \
  --max-age-hours "$MAX_AGE_HOURS" \
  --report "$REPORT_DIR/launch-decision.json"

chmod 0600 "$REPORT_DIR"/*.json
$NODE_BIN -e '
  const fs = require("fs");
  const file = process.argv[1];
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  if (report.decision !== "GO") process.exit(1);
  console.log(`生产上线判定：${report.decision}（${report.summary.passed}/${report.summary.total}）`);
' "$REPORT_DIR/launch-decision.json"
