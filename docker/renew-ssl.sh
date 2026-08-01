#!/bin/bash
# 国学平台 standard 架构 Let's Encrypt 证书续期与演练。
# 正式续期：DEPLOY_TARGET=standard ENV_FILE=/opt/guoxue/shared/.env.production bash docker/renew-ssl.sh
# 权限演练：同上并追加 --dry-run（不会替换正式证书）。

set -euo pipefail

MODE="renew"
if [ "${1:-}" = "--dry-run" ]; then
  MODE="dry-run"
elif [ -n "${1:-}" ]; then
  echo "[tls-renew] 错误：仅支持可选参数 --dry-run" >&2
  exit 64
fi

DEPLOY_TARGET="${DEPLOY_TARGET:-}"
PLATFORM_ROOT="${PLATFORM_ROOT:-/opt/guoxue}"
ENV_FILE="${ENV_FILE:-$PLATFORM_ROOT/shared/.env.production}"
SSL_DIR="${SSL_DIR:-$PLATFORM_ROOT/shared/nginx-ssl}"
NGINX_CONTAINER="${NGINX_CONTAINER:-guoxue-nginx}"
CERTBOT_IMAGE="${CERTBOT_IMAGE:-certbot/certbot:v3.2.0}"
RENEW_BEFORE_SECONDS="${RENEW_BEFORE_SECONDS:-2592000}"
LOCK_FILE="${LOCK_FILE:-/var/lock/guoxue-tls-renewal.lock}"

read_env_value() {
  local key="$1"
  local line
  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$ENV_FILE" | tail -n 1 || true)"
  line="${line#*=}"
  line="${line%$'\r'}"
  if [[ "$line" == \"*\" ]] || [[ "$line" == \'*\' ]]; then
    line="${line:1:${#line}-2}"
  fi
  printf '%s' "$line"
}

if [ "$DEPLOY_TARGET" != "standard" ]; then
  echo "[tls-renew] 错误：本脚本只允许 DEPLOY_TARGET=standard；腾讯云 CLB/CDN 证书必须走云资源流程" >&2
  exit 64
fi
if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "[tls-renew] 错误：必须以 root 运行" >&2
  exit 1
fi
if [ ! -r "$ENV_FILE" ]; then
  echo "[tls-renew] 错误：无法读取正式环境文件 $ENV_FILE" >&2
  exit 1
fi

DOMAIN="${DOMAIN:-$(read_env_value PUBLIC_DOMAIN)}"
if [ -z "$DOMAIN" ] || [[ "$DOMAIN" == *"example.com"* ]]; then
  echo "[tls-renew] 错误：PUBLIC_DOMAIN 未填写真实域名" >&2
  exit 64
fi
if [ ! -r "$SSL_DIR/fullchain.pem" ] || [ ! -r "$SSL_DIR/privkey.pem" ]; then
  echo "[tls-renew] 错误：缺少当前证书或私钥，拒绝进入续期流程" >&2
  exit 1
fi
for command_name in docker openssl flock install mktemp; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "[tls-renew] 错误：缺少命令 $command_name" >&2
    exit 1
  fi
done

install -d -m 0750 "$(dirname "$LOCK_FILE")"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[tls-renew] 已有续期任务运行，本次安全退出"
  exit 0
fi

if [ "$MODE" = "renew" ] && openssl x509 -checkend "$RENEW_BEFORE_SECONDS" -noout -in "$SSL_DIR/fullchain.pem" >/dev/null 2>&1; then
  echo "[tls-renew] 当前证书有效期仍超过 30 天，无需续期"
  exit 0
fi

nginx_was_running="false"
if [ "$(docker inspect -f '{{.State.Running}}' "$NGINX_CONTAINER" 2>/dev/null || true)" = "true" ]; then
  nginx_was_running="true"
fi

restore_nginx() {
  if [ "$nginx_was_running" = "true" ] && [ "$(docker inspect -f '{{.State.Running}}' "$NGINX_CONTAINER" 2>/dev/null || true)" != "true" ]; then
    docker start "$NGINX_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap restore_nginx EXIT INT TERM

if [ "$nginx_was_running" = "true" ]; then
  echo "[tls-renew] 临时停止 Nginx，释放 HTTP-01 验证端口"
  docker stop --time 30 "$NGINX_CONTAINER" >/dev/null
fi

certbot_args=(renew --standalone --non-interactive --cert-name "$DOMAIN")
if [ "$MODE" = "dry-run" ]; then
  certbot_args+=(--dry-run)
fi
docker run --rm \
  -v "$SSL_DIR:/etc/letsencrypt" \
  -p 80:80 \
  "$CERTBOT_IMAGE" \
  "${certbot_args[@]}"

if [ "$MODE" = "dry-run" ]; then
  echo "[tls-renew] 演练通过；未替换正式证书"
  restore_nginx
  trap - EXIT INT TERM
  exit 0
fi

live_dir="$SSL_DIR/live/$DOMAIN"
if [ ! -r "$live_dir/fullchain.pem" ] || [ ! -r "$live_dir/privkey.pem" ]; then
  echo "[tls-renew] 错误：续期后找不到新证书文件" >&2
  exit 1
fi
if ! openssl x509 -checkend "$RENEW_BEFORE_SECONDS" -noout -in "$live_dir/fullchain.pem" >/dev/null 2>&1; then
  echo "[tls-renew] 错误：新证书有效期未超过 30 天，保留旧证书并停止部署" >&2
  exit 1
fi

tmp_fullchain="$(mktemp "$SSL_DIR/.fullchain.pem.XXXXXX")"
tmp_privkey="$(mktemp "$SSL_DIR/.privkey.pem.XXXXXX")"
cleanup_tmp() {
  rm -f "$tmp_fullchain" "$tmp_privkey"
}
trap 'cleanup_tmp; restore_nginx' EXIT INT TERM
install -m 0644 "$live_dir/fullchain.pem" "$tmp_fullchain"
install -m 0600 "$live_dir/privkey.pem" "$tmp_privkey"
mv -f "$tmp_fullchain" "$SSL_DIR/fullchain.pem"
mv -f "$tmp_privkey" "$SSL_DIR/privkey.pem"

restore_nginx
if [ "$nginx_was_running" = "true" ]; then
  docker exec "$NGINX_CONTAINER" nginx -t
fi
trap - EXIT INT TERM
echo "[tls-renew] 续期、原子替换与 Nginx 配置验证完成"
