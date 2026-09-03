#!/bin/sh
set -eu

if [ "${QA_ISOLATED_CONFIRM:-}" != "guoxue-admin-qa-20260902" ] || [ "${NODE_ENV:-}" != "test" ]; then
  echo "[qa-app] 拒绝在非隔离 QA 环境启动"
  exit 1
fi

umask 077
mkdir -p /qa-artifacts
echo "[qa-app] 开始服务端构建、后台零警告检查和正式构建"
(
  pnpm --dir apps/server build
  pnpm --dir apps/admin lint --max-warnings 0
  pnpm --dir apps/admin build
) > /qa-artifacts/app-build.log 2>&1 || {
  tail -n 60 /qa-artifacts/app-build.log
  exit 1
}

echo "[qa-app] 构建通过，启动隔离 API"
api_pid=""
preview_pid=""
cleanup() {
  [ -z "$preview_pid" ] || kill "$preview_pid" 2>/dev/null || true
  [ -z "$api_pid" ] || kill "$api_pid" 2>/dev/null || true
  wait || true
}
trap cleanup EXIT
trap 'exit 143' TERM INT
(cd /app/apps/server && exec node dist/main.js) > /qa-artifacts/server.log 2>&1 &
api_pid=$!

i=0
until node -e "fetch('http://127.0.0.1:3000/api/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; do
  if ! kill -0 "$api_pid" 2>/dev/null || [ "$i" -ge 90 ]; then
    echo "[qa-app] API 未通过就绪检查，详见 server.log"
    exit 1
  fi
  i=$((i + 1))
  sleep 2
done

echo "[qa-app] API 就绪，启动后台构建预览"
(cd /app/apps/admin && exec pnpm exec vite preview --host 0.0.0.0 --port 4173 --strictPort) > /qa-artifacts/preview.log 2>&1 &
preview_pid=$!
# 任一进程退出便停止另一进程，避免只剩界面的假健康状态。
wait -n "$api_pid" "$preview_pid"
exit 1
