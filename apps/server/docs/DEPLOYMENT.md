# 国学平台 — 生产部署手册

## 1. 系统架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Nginx     │────▶│  NestJS API  │────▶│  PostgreSQL 16  │
│   :443 TLS  │     │  :3000       │     │  :5432          │
└─────────────┘     └──────┬───────┘     └─────────────────┘
                           │
                           ▼
                    ┌──────────────┐     ┌─────────────────┐
                    │   Redis 7    │     │  腾讯云 COS/IM   │
                    │   :6379      │     │  直播/点播/SMS   │
                    └──────────────┘     └─────────────────┘
```

**关键组件：**
| 组件 | 用途 | 端口 |
|------|------|------|
| PostgreSQL 16 | 主数据存储 | 5432 |
| Redis 7 | 缓存/限流/会话 | 6379 |
| NestJS 10.x | API 服务 | 3000 |
| Nginx | 反向代理 + TLS | 80/443 |

---

## 2. 环境要求

| 依赖 | 最低版本 |
|------|----------|
| Docker | 24.0+ |
| Docker Compose | 2.20+ |
| Node.js (手动部署) | 22.x 或 24.x LTS |
| pnpm (手动部署) | 10.x |
| 内存 | ≥ 2GB |
| 磁盘 | ≥ 20GB |

---

## 3. 快速开始（开发环境）

```bash
# 1. 启动基础设施
cd docker
cp ../apps/server/.env.example ../apps/server/.env
docker compose up -d postgres redis

# 2. 初始化数据库
cd ../apps/server
pnpm install
npx prisma migrate deploy
npx prisma db seed

# 3. 启动服务
pnpm dev
# → http://localhost:3000/api/v1
# → http://localhost:3000/api-docs (Swagger)
```

---

## 4. 环境变量配置

### 4.1 必填项（生产）

```bash
# 基础设施（必填）
DATABASE_URL="postgresql://guoxue:${DB_PASSWORD}@localhost:5432/guoxue"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="<64位随机字符串>"      # openssl rand -hex 32
ENCRYPTION_KEY="<32位密钥>"        # 数据加密密钥
PORT=3000
NODE_ENV="production"
```

### 4.2 腾讯云服务

```bash
# 基础凭证（所有云服务共用）
TENCENT_SECRET_ID="AKIDxxxxxxxx"
TENCENT_SECRET_KEY="xxxxxxxx"

# COS 对象存储
COS_SECRET_ID=${TENCENT_SECRET_ID}
COS_SECRET_KEY=${TENCENT_SECRET_KEY}
COS_BUCKET="guoxue-1234567890"
COS_REGION="ap-guangzhou"

# IM 即时通讯
IM_APP_ID="1400000000"
IM_ADMIN_KEY="xxxxxxxx"

# VOD 点播 / 直播
VOD_SUB_APP_ID="1500000000"
LIVE_PUSH_DOMAIN="push.example.com"
LIVE_PLAY_DOMAIN="play.example.com"

# SMS 短信
SMS_APP_ID="1400000000"
SMS_SIGN_NAME="国学平台"
SMS_TEMPLATE_ID="1234567"
```

### 4.3 微信生态

```bash
# 微信开放平台
WECHAT_APP_ID="wx0000000000000000"
WECHAT_APP_SECRET="xxxxxxxx"

# 小程序 + 公众号
WECHAT_MINI_APP_ID="wx1111111111111111"
WECHAT_MP_APP_ID="wx2222222222222222"

# 微信支付 V3
WECHAT_PAY_MCH_ID="1600000000"
WECHAT_PAY_SERIAL_NO="xxxxxxxx"
WECHAT_PAY_API_V3_KEY="<32位密钥>"
WECHAT_PAY_PRIVATE_KEY_PATH="/opt/guoxue/certs/apiclient_key.pem"
WECHAT_PAY_NOTIFY_URL="https://api.example.com/api/v1/payment/notify/wechat"
```

### 4.4 可选服务

```bash
# 支付
ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY / ALIPAY_PUBLIC_KEY
UNIONPAY_MER_ID / UNIONPAY_PFX_PATH

# 企业微信通知
WEWORK_WEBHOOK_URL / WEWORK_WEBHOOK_ALERT_URL

# AI / 邮件 / 快递查询 / 地图
DEEPSEEK_API_KEY / EMAIL_* / KUAIDI100_* / TENCENT_MAP_KEY / TENCENT_MAP_SK

# 可观测性
OTEL_EXPORTER_OTLP_ENDPOINT="http://jaeger:4318/v1/traces"
OTEL_SERVICE_NAME="guoxue-platform"
```

---

## 5. Docker Compose 生产部署

### 5.1 准备

```bash
# 在服务器上
mkdir -p /opt/guoxue && cd /opt/guoxue

# 上传 .env 文件到服务器，填入所有生产密钥
cat > .env.production << 'ENVEOF'
# 按上面第 4 节填入所有必填环境变量
ENVEOF

# 上传 docker-compose.yml + docker-compose.prod.yml + Dockerfile
```

### 5.2 启动

```bash
# 合并 base + prod 覆盖配置
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  up -d

# 验证
docker compose ps                    # 所有容器应为 Up
curl http://localhost:3000/api/v1/health
```

### 5.3 数据库迁移

```bash
# 首次部署或 schema 变更后执行
docker exec guoxue-server sh -c "cd /app/apps/server && npx prisma migrate deploy"

# 可选：导入种子数据
docker exec guoxue-server sh -c "cd /app/apps/server && npx prisma db seed"
```

### 5.4 生产安全加固

`docker-compose.prod.yml` 自动应用：
- 数据库端口不对外暴露
- 容器以 `read_only: true` 运行
- 资源限制：512M 内存上限
- 移除所有 Linux capabilities
- 仅 /tmp 可写

---

## 6. Nginx 反向代理

```nginx
# /etc/nginx/sites-available/guoxue
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    client_max_body_size 50m;  # 上传文件限制

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 上传文件直接由 NestJS 处理（或单独配置 COS 上传域名）
    location /uploads/ {
        proxy_pass http://localhost:3000;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/guoxue /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. 数据库备份与恢复

### 7.1 自动备份（crontab）

```bash
# 每天凌晨 3:00 备份，保留 30 天
0 3 * * * /opt/guoxue/docker/pg-backup.sh 30 >> /var/log/guoxue-backup.log 2>&1
```

### 7.2 手动备份

```bash
cd /opt/guoxue/docker
BACKUP_DIR=/opt/guoxue/backups ./pg-backup.sh
```

### 7.3 恢复

```bash
# 1. 确定要恢复的备份文件
ls -lt /opt/guoxue/backups/

# 2. 恢复
cd /opt/guoxue/docker
./pg-restore.sh /opt/guoxue/backups/guoxue_20260101_030000.sql.gz

# 3. 恢复后需要迁移到最新 schema
docker exec guoxue-server sh -c "cd /app/apps/server && npx prisma migrate deploy"
```

---

## 8. 健康检查与监控

### 8.1 健康检查端点

```bash
# 基本健康检查
curl http://localhost:3000/api/v1/health
# → {"status":"healthy","timestamp":"...","checks":{"database":true,"redis":true}}

# Prometheus 指标
curl http://localhost:3000/metrics
```

### 8.2 关键指标

| 指标 | 含义 | 告警阈值 |
|------|------|----------|
| `http_requests_total` | HTTP 请求总数 | — |
| `http_request_duration_seconds` | 请求延迟 | P95 > 2s |
| `http_requests_in_flight` | 并发请求数 | > 100 |
| PostgreSQL 连接数 | 活跃连接 | > 50 |
| Redis 内存使用 | 缓存内存 | > 80% |
| 磁盘使用率 | 备份+日志 | > 85% |

### 8.3 日志查看

```bash
# 查看服务日志（Pino 结构化 + traceId）
docker logs guoxue-server --tail 100

# 按 traceId 追踪请求链路
docker logs guoxue-server | grep "traceId=abc123"

# 查看慢查询（> PRISMA_SLOW_QUERY_MS）
docker logs guoxue-server | grep "慢查询"
```

---

## 9. Runbook — 常见故障处理

### 9.1 服务无法启动

```bash
# 症状：docker compose up 后 server 容器反复重启
docker logs guoxue-server --tail 50

# 常见原因：
# 1. 数据库连接失败 → 检查 DATABASE_URL、确认 postgres 容器已启动并健康
docker exec guoxue-postgres pg_isready -U guoxue

# 2. Redis 连接失败 → 检查 REDIS_URL
docker exec guoxue-redis redis-cli ping

# 3. 环境变量缺失 → 检查 .env 文件是否包含所有必填项
docker compose config  # 查看合并后的完整配置
```

### 9.2 数据库性能下降

```bash
# 症状：API 响应变慢，大量 5xx 错误
# 检查活跃连接
docker exec guoxue-postgres psql -U guoxue -c "SELECT count(*) FROM pg_stat_activity;"

# 检查慢查询
docker exec guoxue-postgres psql -U guoxue -c \
  "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# 紧急处理：重启连接池（Prisma 会自动重连）
docker restart guoxue-server
```

### 9.3 Redis 内存耗尽

```bash
# 症状：缓存命中率下降，响应变慢
docker exec guoxue-redis redis-cli INFO memory | grep used_memory_human

# 清理过期缓存
docker exec guoxue-redis redis-cli FLUSHDB  # 仅清理当前 DB

# 如不行则重启
docker restart guoxue-redis
# 应用会自动降级到内存缓存，不丢失功能
```

### 9.4 磁盘空间不足

```bash
# 症状：备份失败，数据库写入报错
df -h /var/lib/docker

# 清理：
docker system prune -a --filter "until=48h"  # 清理旧镜像
find /opt/guoxue/backups -name "*.sql.gz" -mtime +7 -delete  # 只保留7天备份
truncate -s 0 /var/log/*.log  # 清理日志
```

### 9.5 微信支付回调失败

```bash
# 症状：支付成功但订单状态未更新
# 1. 确认回调 URL 可从外网访问
curl -I https://api.example.com/api/v1/payment/notify/wechat

# 2. 检查 Nginx 日志是否有 4xx/5xx
tail -100 /var/log/nginx/access.log | grep "/api/v1/payment/notify"

# 3. 手动重试：在微信商户后台 → 交易中心 → 重新发送回调通知
```

### 9.6 限流误触发

```bash
# 症状：正常用户收到 429 Too Many Requests
# 检查当前限流状态
docker exec guoxue-redis redis-cli KEYS "throttle:*" | head -20

# 临时解封特定 IP
docker exec guoxue-redis redis-cli DEL "throttle:ip:xxx.xxx.xxx.xxx"

# 调整限流参数：修改 RedisThrottleGuard 配置后重新部署
```

### 9.7 缓存数据不一致

```bash
# 症状：更新了数据但 API 仍返回旧内容
# 按模块清理缓存
docker exec guoxue-redis redis-cli KEYS "courses:*" | xargs docker exec guoxue-redis redis-cli DEL
docker exec guoxue-redis redis-cli KEYS "content:*" | xargs docker exec guoxue-redis redis-cli DEL
docker exec guoxue-redis redis-cli KEYS "mini:*" | xargs docker exec guoxue-redis redis-cli DEL
```

---

## 10. 升级与回滚

### 10.1 灰度发布

```bash
# 使用 feature flag 控制新功能上线
# 在管理后台 → 功能开关 → 创建/修改开关
# 或通过 API：
curl -X PUT http://localhost:3000/api/v1/feature-flags/new-feature \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "percentage": 10}'  # 10% 用户可见
```

### 10.2 滚动升级（CI/CD）

```bash
# CI/CD 自动流程：构建镜像 → 推送 → SSH 部署 → 健康检查 → 自动回滚
# 手动触发：GitHub Actions → Deploy workflow → 选择环境和服务
```

### 10.3 手动回滚

```bash
# 1. 查看可用镜像版本
docker image ls guoxue-server

# 2. 停止当前容器
docker stop guoxue-server && docker rm guoxue-server

# 3. 启动指定版本
docker run -d \
  --name guoxue-server \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /opt/guoxue/.env.production \
  guoxue-server:<previous-tag>

# 4. 验证
curl http://localhost:3000/api/v1/health
```

### 10.4 数据库回滚

```bash
# Prisma 不支持自动回滚，需要手动操作
# 方案 A：从备份恢复（推荐，但会丢失增量数据）
./pg-restore.sh /opt/guoxue/backups/guoxue_<before_migration>.sql.gz

# 方案 B：创建新的回滚 migration
npx prisma migrate dev --name rollback_xxx --create-only
# 手动编辑生成的 SQL，写入逆向 DDL
npx prisma migrate deploy
```

---

## 11. 安全检查清单

- [ ] 所有密码/密钥使用强随机值（openssl rand -hex 32）
- [ ] JWT_SECRET ≥ 64 字符
- [ ] 数据库端口不对外暴露
- [ ] Redis 设置密码（修改 redis.conf）
- [ ] HTTPS 已启用，HTTP 重定向到 HTTPS
- [ ] CORS_ORIGIN 限制为生产域名
- [ ] CSP 头已配置
- [ ] 微信支付 API 密钥文件权限为 600
- [ ] .env 文件不包含在版本控制中
- [ ] Docker 镜像定期更新基础镜像
- [ ] 备份文件加密或存储在安全位置

---

## 12. GitHub Actions CI/CD 密钥配置

部署流水线 (`.github/workflows/deploy.yml`) 需要以下 GitHub Secrets：

### 12.1 Staging 环境

| Secret | 说明 |
|--------|------|
| `STAGING_HOST` | 预发布服务器 IP/域名 |
| `STAGING_USER` | SSH 用户名 |
| `STAGING_SSH_KEY` | SSH 私钥（对应公钥已添加到服务器） |
| `DEPLOY_PORT` | SSH 端口（默认 22） |

### 12.2 Production 环境

| Secret | 说明 |
|--------|------|
| `PROD_HOST` | 生产服务器 IP/域名 |
| `PROD_USER` | SSH 用户名 |
| `PROD_SSH_KEY` | SSH 私钥 |
| `DATABASE_URL` | 生产数据库连接串（迁移用） |

### 12.3 通知（可选）

| Secret | 说明 |
|--------|------|
| `WEWORK_WEBHOOK_URL` | 企业微信机器人 Webhook，用于部署结果通知 |

### 12.4 配置命令

```bash
# 在 GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret
gh secret set STAGING_HOST --body "123.45.67.89"
gh secret set STAGING_USER --body "deploy"
gh secret set STAGING_SSH_KEY --body "$(cat ~/.ssh/id_ed25519)"
gh secret set PROD_HOST --body "prod.example.com"
gh secret set PROD_USER --body "deploy"
gh secret set PROD_SSH_KEY --body "$(cat ~/.ssh/id_ed25519_prod)"
gh secret set DEPLOY_PORT --body "22"
gh secret set DATABASE_URL --body "postgresql://guoxue:<password>@localhost:5432/guoxue"
gh secret set WEWORK_WEBHOOK_URL --body "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"

# 在服务器上添加公钥
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@123.45.67.89
```

---

## 13. 云服务器一键初始化

```bash
# 在新服务器上（Ubuntu 20.04+ / Debian 11+ / Rocky 8+）
# 先上传已经通过门禁、带提交 SHA 的完整固定发布包，再从项目根目录执行
sudo DOMAIN=api.example.com LETSENCRYPT_EMAIL=ops@example.com \
  DATABASE_MODE=prepare ./docker/setup-server.sh
```

脚本自动执行：
1. 系统优化（时区/swap/内核参数）
2. 安装 Docker + Docker Compose
3. 配置防火墙（22/80/443）
4. 复核当前固定发布包 + 构建镜像
5. SSL 证书签发（Let's Encrypt）
6. 按显式 `DATABASE_MODE` 准备或恢复数据库
7. 注册 systemd 自启动服务
8. 配置定时备份 + 日志清理 cron

服务管理：
```bash
systemctl status guoxue       # 查看状态
systemctl restart guoxue      # 重启全部服务
journalctl -u guoxue -f       # 查看日志
```
