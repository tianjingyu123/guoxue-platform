#!/usr/bin/env bash
# 国学平台 standard 架构 Let's Encrypt 首次签发/补签脚本。
# 用法：PLATFORM_ROOT=/opt/guoxue bash docker/nginx/setup-ssl.sh example.com admin@example.com

set -Eeuo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
PLATFORM_ROOT="${PLATFORM_ROOT:-/opt/guoxue}"
ENV_FILE="${ENV_FILE:-$PLATFORM_ROOT/shared/.env.production}"
SSL_DIR="${SSL_DIR:-$PLATFORM_ROOT/shared/nginx-ssl}"
NGINX_CONTAINER="${NGINX_CONTAINER:-guoxue-nginx}"
CERTBOT_IMAGE="certbot/certbot:v3.2.0"
RENEW_SCRIPT="$PLATFORM_ROOT/current/docker/renew-ssl.sh"
LOCK_FILE="${LOCK_FILE:-/var/lock/guoxue-tls-renewal.lock}"

fail() {
  echo "[ssl] 错误：$*" >&2
  exit 1
}

if [ "$(id -u)" -ne 0 ]; then
  fail "请用 root 权限运行：sudo PLATFORM_ROOT=$PLATFORM_ROOT bash docker/nginx/setup-ssl.sh <域名> <邮箱>"
fi
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "用法：$0 <真实域名> <证书通知邮箱>" >&2
  exit 64
fi
if [[ "$DOMAIN" == *"example.com"* ]] || [[ ! "$DOMAIN" =~ ^([A-Za-z0-9-]+\.)+[A-Za-z]{2,63}$ ]]; then
  fail "域名仍是占位值或格式无效"
fi
if [[ ! "$EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  fail "证书通知邮箱格式无效"
fi

for command_name in docker flock openssl crontab; do
  command -v "$command_name" >/dev/null 2>&1 || fail "缺少命令：$command_name"
done
docker info >/dev/null 2>&1 || fail "Docker daemon 不可用"

install -d -m 0750 "$SSL_DIR" "$(dirname "$LOCK_FILE")"
exec 9>"$LOCK_FILE"
flock -n 9 || fail "已有证书签发或续期任务正在执行"

nginx_was_running=false
restore_nginx() {
  if [ "$nginx_was_running" = true ]; then
    docker start "$NGINX_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap restore_nginx EXIT INT TERM

if docker ps --format '{{.Names}}' | grep -Fxq "$NGINX_CONTAINER"; then
  nginx_was_running=true
  echo "[ssl] 暂停 Nginx 释放 80 端口"
  docker stop --time 30 "$NGINX_CONTAINER" >/dev/null
fi

echo "[ssl] 为 $DOMAIN 申请 Let's Encrypt 证书"
docker run --rm \
  -v "$SSL_DIR:/etc/letsencrypt" \
  -p 80:80 \
  "$CERTBOT_IMAGE" \
  certonly --standalone --non-interactive --agree-tos \
  --cert-name "$DOMAIN" --email "$EMAIL" -d "$DOMAIN"

CERT_SRC="$SSL_DIR/live/$DOMAIN"
[ -f "$CERT_SRC/fullchain.pem" ] || fail "签发后缺少 fullchain.pem"
[ -f "$CERT_SRC/privkey.pem" ] || fail "签发后缺少 privkey.pem"
openssl x509 -in "$CERT_SRC/fullchain.pem" -noout -checkend 2592000 \
  || fail "新证书剩余有效期不足 30 天"

tmp_fullchain="$(mktemp "$SSL_DIR/.fullchain.XXXXXX")"
tmp_privkey="$(mktemp "$SSL_DIR/.privkey.XXXXXX")"
cleanup_tmp() {
  rm -f -- "$tmp_fullchain" "$tmp_privkey"
}
trap 'cleanup_tmp; restore_nginx' EXIT INT TERM
install -m 0644 "$CERT_SRC/fullchain.pem" "$tmp_fullchain"
install -m 0600 "$CERT_SRC/privkey.pem" "$tmp_privkey"
mv -f "$tmp_fullchain" "$SSL_DIR/fullchain.pem"
mv -f "$tmp_privkey" "$SSL_DIR/privkey.pem"

if [ "$nginx_was_running" = true ]; then
  docker start "$NGINX_CONTAINER" >/dev/null
  nginx_was_running=false
  docker exec "$NGINX_CONTAINER" nginx -t
fi

[ -f "$RENEW_SCRIPT" ] || fail "缺少统一续期脚本：$RENEW_SCRIPT；请先激活完整固定发布包"
EXISTING_CRON="$(crontab -l 2>/dev/null || true)"
FILTERED_CRON="$(
  printf '%s\n' "$EXISTING_CRON" \
    | grep -v '/var/log/guoxue-tls-renewal.log' \
    | grep -v 'certbot renew.*guoxue-nginx' \
    || true
)"
{
  printf '%s\n' "$FILTERED_CRON"
  echo "17 3 * * * DEPLOY_TARGET=standard PLATFORM_ROOT=$PLATFORM_ROOT ENV_FILE=$ENV_FILE DOMAIN=$DOMAIN bash $RENEW_SCRIPT >> /var/log/guoxue-tls-renewal.log 2>&1"
} | sed '/^[[:space:]]*$/d' | crontab -

echo "[ssl] 首次签发完成；已安装每天 03:17 的统一续期检查"
