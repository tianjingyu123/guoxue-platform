#!/usr/bin/env bash

set -Eeuo pipefail

project_root="${PROJECT_ROOT:-/opt/gx-role-hotfix-stage-20260731}"
monitoring_dir="${project_root}/docker/monitoring"
env_file="${project_root}/docker/.env.production"
backup_root="${BACKUP_ROOT:-/opt/guoxue/backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${backup_root}/monitoring-config-${timestamp}"

declare -A incoming=(
  [docker-compose.yml]="/tmp/monitoring-compose.new.yml"
  [prometheus.yml]="/tmp/prometheus.new.yml"
  [alert-rules.yml]="/tmp/alert-rules.new.yml"
  [blackbox.yml]="/tmp/blackbox.new.yml"
)

for name in "${!incoming[@]}"; do
  if [[ ! -s "${incoming[$name]}" ]]; then
    echo "缺少待部署配置：${incoming[$name]}" >&2
    exit 2
  fi
  if [[ ! -f "${monitoring_dir}/${name}" ]]; then
    echo "缺少现有配置：${monitoring_dir}/${name}" >&2
    exit 2
  fi
done

if [[ ! -s "${monitoring_dir}/.generated/alertmanager.yml" ]]; then
  echo "缺少已渲染的 Alertmanager 私密配置，拒绝更新" >&2
  exit 2
fi

install -d -m 0750 "${backup_dir}"
for name in "${!incoming[@]}"; do
  install -m 0640 "${monitoring_dir}/${name}" "${backup_dir}/${name}"
done

rollback() {
  local status=$?
  trap - ERR
  echo "监控配置更新失败，正在恢复：${backup_dir}" >&2
  for name in "${!incoming[@]}"; do
    install -m 0644 "${backup_dir}/${name}" "${monitoring_dir}/${name}"
  done
  node "${project_root}/scripts/release/render-monitoring-config.mjs" "${env_file}" || {
    echo "旧监控配置重新渲染失败，必须人工恢复：${backup_dir}" >&2
    exit 3
  }
  (
    cd "${monitoring_dir}"
    docker compose --env-file "${env_file}" -f docker-compose.yml up -d
    docker compose --env-file "${env_file}" -f docker-compose.yml \
      up -d --force-recreate prometheus blackbox-exporter
  ) || true
  exit "${status}"
}
trap rollback ERR

for name in "${!incoming[@]}"; do
  install -m 0644 "${incoming[$name]}" "${monitoring_dir}/${name}"
done

node "${project_root}/scripts/release/render-monitoring-config.mjs" "${env_file}"
docker run --rm --entrypoint /bin/promtool \
  -v "${monitoring_dir}/.generated/prometheus.yml:/etc/prometheus/prometheus.yml:ro" \
  -v "${monitoring_dir}/alert-rules.yml:/etc/prometheus/alert-rules.yml:ro" \
  prom/prometheus:v2.55.1 \
  check config /etc/prometheus/prometheus.yml

docker network inspect monitoring >/dev/null 2>&1 || docker network create monitoring >/dev/null

(
  cd "${monitoring_dir}"
  docker compose --env-file "${env_file}" -f docker-compose.yml config -q
  docker compose --env-file "${env_file}" -f docker-compose.yml up -d
  # install 会原子替换配置文件 inode；运行中的 bind mount 仍指向旧 inode，
  # 因此必须只重建直接挂载这些文件的两个监控容器。
  docker compose --env-file "${env_file}" -f docker-compose.yml \
    up -d --force-recreate prometheus blackbox-exporter
)

for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:9090/-/ready >/dev/null \
    && curl -fsS http://127.0.0.1:9093/-/ready >/dev/null \
    && curl -fsS http://127.0.0.1:3001/api/health >/dev/null; then
    break
  fi
  if [[ "${attempt}" == "30" ]]; then
    echo "监控组件未在 60 秒内全部就绪" >&2
    false
  fi
  sleep 2
done

if ! docker inspect -f '{{json .NetworkSettings.Networks}}' guoxue-prometheus | grep -q '"monitoring"'; then
  echo "Prometheus 未加入业务共享监控网络" >&2
  false
fi

sleep 20
curl -fsS --get --data-urlencode 'query=up{job="guoxue-server"}' \
  http://127.0.0.1:9090/api/v1/query >/tmp/monitoring-guoxue-up.json
curl -fsS --get --data-urlencode 'query=probe_ssl_earliest_cert_expiry{job="blackbox-tls"}' \
  http://127.0.0.1:9090/api/v1/query >/tmp/monitoring-tls-expiry.json

python3 - <<'PY'
import json

checks = (
    ("/tmp/monitoring-guoxue-up.json", "业务指标采集", lambda data: any(item.get("value", [None, "0"])[1] == "1" for item in data)),
    ("/tmp/monitoring-tls-expiry.json", "TLS 到期指标", lambda data: len(data) >= 2),
)

for path, label, validator in checks:
    with open(path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)
    result = payload.get("data", {}).get("result", [])
    if payload.get("status") != "success" or not validator(result):
        raise SystemExit(f"{label}未形成有效时序")
    print(f"PASS {label}")
PY

trap - ERR
echo "监控配置更新完成，回退副本：${backup_dir}"
