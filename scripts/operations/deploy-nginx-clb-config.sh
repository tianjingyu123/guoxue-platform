#!/usr/bin/env bash

set -Eeuo pipefail

project_root="${PROJECT_ROOT:-/opt/gx-role-hotfix-stage-20260731}"
docker_dir="${project_root}/docker"
env_file="${docker_dir}/.env.production"
backup_root="${BACKUP_ROOT:-/opt/guoxue/backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${backup_root}/nginx-clb-config-${timestamp}"

if [[ ! -r "${env_file}" ]]; then
  echo "生产环境配置不可读：${env_file}" >&2
  exit 2
fi

read_env_value() {
  local key="$1"
  awk -F= -v wanted="$key" '
    $1 == wanted {
      if (seen++) exit 2
      print substr($0, index($0, "=") + 1)
    }
    END { if (seen != 1) exit 3 }
  ' "${env_file}"
}

nginx_server_names="${NGINX_SERVER_NAMES:-}"
if [[ -z "${nginx_server_names}" ]]; then
  nginx_server_names="$(read_env_value NGINX_SERVER_NAMES)" || {
    echo "NGINX_SERVER_NAMES 缺失或重复" >&2
    exit 2
  }
fi
nginx_server_names="${nginx_server_names//$'\r'/}"
nginx_server_names="${nginx_server_names#\"}"
nginx_server_names="${nginx_server_names%\"}"
nginx_server_names="${nginx_server_names#\'}"
nginx_server_names="${nginx_server_names%\'}"

probe_host="${CLB_PROBE_HOST:-}"
if [[ -z "${probe_host}" ]]; then
  read -r probe_host _ <<<"${nginx_server_names}"
fi
if [[ ! "${probe_host}" =~ ^[A-Za-z0-9.-]+$ ]] \
  || [[ "${probe_host}" == "localhost" ]] \
  || [[ "${probe_host}" == *.example.com ]]; then
  echo "CLB 探测域名无效：${probe_host:-<empty>}" >&2
  exit 2
fi

declare -A incoming=(
  [docker-compose.tencent.yml]="/tmp/docker-compose.tencent.new.yml"
  [nginx/nginx.clb.conf.template]="/tmp/nginx.clb.conf.new.template"
  [nginx/security-headers.conf]="/tmp/security-headers.new.conf"
)

for name in "${!incoming[@]}"; do
  if [[ ! -s "${incoming[$name]}" ]]; then
    echo "缺少待部署配置：${incoming[$name]}" >&2
    exit 2
  fi
  if [[ ! -f "${docker_dir}/${name}" && "${name}" != "nginx/security-headers.conf" ]]; then
    echo "缺少现有配置：${docker_dir}/${name}" >&2
    exit 2
  fi
done

if [[ "$(docker inspect -f '{{.State.Running}}' guoxue-server 2>/dev/null || true)" != "true" ]]; then
  echo "业务容器未运行，拒绝更新 Nginx" >&2
  exit 2
fi

docker run --rm \
  --network docker_default \
  -e NGINX_SERVER_NAMES="${nginx_server_names}" \
  -v "${incoming[nginx/nginx.clb.conf.template]}:/tmp/nginx.clb.conf.template:ro" \
  -v "${incoming[nginx/security-headers.conf]}:/etc/nginx/snippets/security-headers.conf:ro" \
  nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10 \
  sh -ec 'envsubst '\''$NGINX_SERVER_NAMES'\'' < /tmp/nginx.clb.conf.template > /etc/nginx/nginx.conf; nginx -t'

install -d -m 0750 "${backup_dir}/nginx"
for name in "${!incoming[@]}"; do
  if [[ -f "${docker_dir}/${name}" ]]; then
    install -m 0640 "${docker_dir}/${name}" "${backup_dir}/${name}"
  else
    touch "${backup_dir}/${name}.absent"
  fi
done

rollback() {
  local status=$?
  trap - ERR
  echo "Nginx 配置更新失败，正在恢复：${backup_dir}" >&2
  for name in "${!incoming[@]}"; do
    if [[ -f "${backup_dir}/${name}.absent" ]]; then
      rm -f "${docker_dir}/${name}"
    else
      install -m 0644 "${backup_dir}/${name}" "${docker_dir}/${name}"
    fi
  done
  (
    cd "${docker_dir}"
    docker compose --env-file "${env_file}" \
      -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tencent.yml \
      up -d --no-deps --force-recreate nginx
  ) || true
  exit "${status}"
}
trap rollback ERR

for name in "${!incoming[@]}"; do
  install -m 0644 "${incoming[$name]}" "${docker_dir}/${name}"
done

docker network inspect monitoring >/dev/null 2>&1 || docker network create monitoring >/dev/null

(
  cd "${docker_dir}"
  docker compose --env-file "${env_file}" \
    -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tencent.yml \
    config -q
  docker compose --env-file "${env_file}" \
    -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tencent.yml \
    up -d --no-deps --force-recreate nginx
)

for attempt in $(seq 1 30); do
  if curl -fsS -H "Host: ${probe_host}" http://127.0.0.1/nginx-health >/dev/null; then
    break
  fi
  if [[ "${attempt}" == "30" ]]; then
    echo "Nginx 未在 60 秒内恢复健康" >&2
    false
  fi
  sleep 2
done

headers="$(curl -fsSI -H "Host: ${probe_host}" http://127.0.0.1/h5/)"
for expected in strict-transport-security x-frame-options x-content-type-options referrer-policy permissions-policy; do
  if ! grep -qi "^${expected}:" <<<"${headers}"; then
    echo "H5 缺少安全响应头：${expected}" >&2
    false
  fi
done

for attempt in $(seq 1 30); do
  if [[ "$(docker inspect -f '{{.State.Health.Status}}' guoxue-nginx 2>/dev/null || true)" == "healthy" ]]; then
    break
  fi
  if [[ "${attempt}" == "30" ]]; then
    echo "Nginx 容器健康状态未在 60 秒内转为 healthy" >&2
    false
  fi
  sleep 2
done

trap - ERR
echo "Nginx CLB 配置更新完成，回退副本：${backup_dir}"
