#!/bin/bash
# 国学平台 — SSL 证书自动申请脚本 (Let's Encrypt)
# 用法: bash setup-ssl.sh example.com admin@example.com
# 证书通过 Certbot standalone 获取后放置到 docker/nginx/ssl/

set -e

DOMAIN="${1:-}"
EMAIL="${2:-}"
SSL_DIR="$(cd "$(dirname "$0")" && pwd)/ssl"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "用法: $0 <真实域名> <证书通知邮箱>"
  exit 64
fi
if [[ "$DOMAIN" == *"example.com"* ]] || [[ "$EMAIL" != *"@"* ]]; then
  echo "[ssl] 错误：域名或邮箱仍是占位值"
  exit 64
fi

echo "[ssl] 为 $DOMAIN 申请 SSL 证书..."

# 检查 certbot 是否已安装
if ! command -v certbot &> /dev/null; then
  echo "[ssl] 安装 certbot..."
  if command -v apt-get &> /dev/null; then
    sudo apt-get update && sudo apt-get install -y certbot
  elif command -v yum &> /dev/null; then
    sudo yum install -y certbot
  else
    echo "[ssl] 请手动安装 certbot: https://certbot.eff.org/"
    exit 1
  fi
fi

# 确保证书目录存在
mkdir -p "$SSL_DIR"

# 申请证书（standalone 模式，需要 80 端口空闲）
# 如果 Nginx 在运行，先暂停止
NGINX_RUNNING=false
if docker ps -q --filter "name=guoxue-nginx" | grep -q .; then
  NGINX_RUNNING=true
  echo "[ssl] 暂停止 Nginx 以释放 80 端口..."
  docker stop guoxue-nginx
fi

sudo certbot certonly --standalone \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive

# 复制证书到 nginx ssl 目录
CERT_SRC="/etc/letsencrypt/live/$DOMAIN"
if [ -d "$CERT_SRC" ]; then
  sudo cp "$CERT_SRC/fullchain.pem" "$SSL_DIR/"
  sudo cp "$CERT_SRC/privkey.pem" "$SSL_DIR/"
  sudo chown $(id -u):$(id -g) "$SSL_DIR/fullchain.pem" "$SSL_DIR/privkey.pem"
  chmod 644 "$SSL_DIR/fullchain.pem"
  chmod 600 "$SSL_DIR/privkey.pem"
  echo "[ssl] 证书已复制到 $SSL_DIR/"
else
  echo "[ssl] 错误: 证书目录不存在 $CERT_SRC"
  exit 1
fi

# 恢复 Nginx
if [ "$NGINX_RUNNING" = true ]; then
  echo "[ssl] 恢复 Nginx..."
  docker start guoxue-nginx
fi

# 添加 crontab 自动续期
CERT_RENEW_CMD="0 3 * * 0 certbot renew --quiet --post-hook 'cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_DIR/ && docker exec guoxue-nginx nginx -s reload'"
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
  (crontab -l 2>/dev/null; echo "$CERT_RENEW_CMD") | crontab -
  echo "[ssl] 已添加 Sunday 3:00 AM 自动续期 crontab"
fi

echo "[ssl] 完成 — 证书有效期 90 天，crontab 每周自动续期"
