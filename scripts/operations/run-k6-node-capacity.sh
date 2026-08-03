#!/usr/bin/env bash

set -Eeuo pipefail

vus="${1:-20}"
duration="${2:-60s}"
container_name="${CONTAINER_NAME:-guoxue-server}"
k6_script="${K6_SCRIPT:-/tmp/rebugx-launch-readiness.js}"
base_url="${BASE_URL:-http://127.0.0.1:3000}"
run_id="$(date -u +%Y%m%dT%H%M%SZ)"
stats_log="/tmp/guoxue-capacity-${run_id}.stats"
run_flag="/tmp/guoxue-capacity-${run_id}.running"

if ! [[ "${vus}" =~ ^[1-9][0-9]*$ ]]; then
  echo "VUS 必须是正整数" >&2
  exit 2
fi

if [[ ! -f "${k6_script}" ]]; then
  echo "找不到 k6 脚本：${k6_script}" >&2
  exit 2
fi

if [[ "$(docker inspect -f '{{.State.Running}}' "${container_name}" 2>/dev/null || true)" != "true" ]]; then
  echo "容器未运行：${container_name}" >&2
  exit 2
fi

touch "${run_flag}"

sample_resources() {
  while [[ -f "${run_flag}" ]]; do
    local timestamp load1 memory_used memory_total container_stats
    timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    load1="$(awk '{print $1}' /proc/loadavg)"
    read -r memory_total memory_used < <(free -m | awk '/^Mem:/ {print $2, $3}')
    container_stats="$(docker stats --no-stream --format '{{.CPUPerc}}|{{.MemPerc}}|{{.MemUsage}}' "${container_name}")"
    printf 'SAMPLE|%s|%s|%s|%s|%s\n' \
      "${timestamp}" "${load1}" "${memory_used}" "${memory_total}" "${container_stats}"
    sleep 2
  done
}

cleanup() {
  rm -f "${run_flag}"
  if [[ -n "${sampler_pid:-}" ]]; then
    wait "${sampler_pid}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

sample_resources >"${stats_log}" &
sampler_pid=$!

echo "开始节点容量测试：VUS=${vus}，DURATION=${duration}，BASE_URL=${base_url}"
set +e
docker run --rm \
  --network "container:${container_name}" \
  -v "${k6_script}:/script.js:ro" \
  -e "BASE_URL=${base_url}" \
  -e "VUS=${vus}" \
  -e "DURATION=${duration}" \
  grafana/k6:2.1.0@sha256:65c920dc067d5e2e00befbf982af6ad6ad0117034e8b1c65817c7975c52d4669 run /script.js
k6_status=$?
set -e

cleanup
trap - EXIT

awk -F'|' '
  $1 == "SAMPLE" {
    cpu = $6; sub(/%$/, "", cpu)
    memory = $7; sub(/%$/, "", memory)
    if (cpu + 0 > max_cpu) max_cpu = cpu + 0
    if (memory + 0 > max_container_memory) max_container_memory = memory + 0
    if ($3 + 0 > max_load1) max_load1 = $3 + 0
    if ($4 + 0 > max_host_memory) max_host_memory = $4 + 0
    samples++
  }
  END {
    printf "资源采样：samples=%d, max_load1=%.2f, max_host_memory_mb=%d, max_container_cpu_pct=%.2f, max_container_memory_pct=%.2f\n", samples, max_load1, max_host_memory, max_cpu, max_container_memory
  }
' "${stats_log}"

echo "资源明细：${stats_log}"
exit "${k6_status}"
