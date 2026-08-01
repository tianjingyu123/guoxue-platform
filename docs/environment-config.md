# 热卜国学平台 — 环境配置文档

> 更新时间：2026-05-11 | 覆盖开发/测试/生产三套环境

## 一、环境概览

| 维度 | 开发 (dev) | 测试 (test/CI) | 生产 (production) |
|------|-----------|---------------|-------------------|
| **用途** | 本地开发 + 热重载 | CI 自动化测试 + E2E | 线上正式服务 |
| **数据库** | 本地 PostgreSQL:5432 | CI 服务容器 PostgreSQL:5432 | 独立 PostgreSQL:5432 |
| **Redis** | 本地 Redis:6379 | CI 服务容器 Redis:6379 | 独立 Redis:6379 |
| **端口** | 3000 | 不对外 | 3000 (仅内网或反向代理) |
| **日志级别** | debug | warn | info |
| **源码挂载** | 是 (热重载) | 否 | 否 |
| **健康检查** | 无 | 无 | 有 (30s 间隔) |
| **资源限制** | 1G 内存 | 无 | 512M 内存 |
| **SSL/TLS** | 否 | 否 | Nginx/Caddy 反向代理 |
| **支付沙箱** | 是 | N/A | 否 |

## 二、基础设施差异

### 2.1 数据库

| 配置项 | 开发 | 测试 | 生产 |
|--------|------|------|------|
| 镜像 | postgres:16-alpine | postgres:16-alpine (CI services) | 托管 PostgreSQL 或自建 |
| 端口暴露 | 5432 → 宿主机 | 5432 → 内部 | 不对外暴露 |
| 数据持久化 | pgdata volume | 无 (容器销毁即清) | pgdata volume (持久) |
| 备份策略 | 无 | 无 | 每日凌晨 3:00 自动备份 |
| 连接池 | 默认 | 默认 | 建议 20-50 |

### 2.2 Redis

| 配置项 | 开发 | 测试 | 生产 |
|--------|------|------|------|
| 镜像 | redis:7-alpine | redis:7-alpine (CI services) | redis:7-alpine |
| 端口暴露 | 6379 → 宿主机 | 6379 → 内部 | 不对外暴露 |
| 持久化 | 否 | 否 | AOF + RDB 双写 |
| 最大内存 | 无限制 | 无限制 | maxmemory 256MB |
| 淘汰策略 | noeviction | noeviction | allkeys-lru |
| 密码 | 无 | 无 | 强密码 |

### 2.3 容器化

| 配置 | 开发 | 测试 | 生产 |
|------|------|------|------|
| Dockerfile | Dockerfile.dev | Dockerfile.test | Dockerfile |
| Compose 文件 | compose.yml + dev.yml | compose.test.yml | compose.yml + prod.yml |
| 构建阶段 | 多阶段 (builder+runner) | 单阶段 (含 devDeps) | 多阶段 (最小化) |
| Cap 限制 | 无 | 无 | cap_drop: ALL, cap_add: NET_BIND_SERVICE |

## 三、环境变量完整清单

### 3.1 基础设施

| 变量名 | 开发默认值 | 测试默认值 | 生产 | 说明 |
|--------|----------|----------|------|------|
| `NODE_ENV` | `development` | `test` | `production` | 运行模式 |
| `PORT` | `3000` | `3000` | `3000` | 服务端口 |
| `DATABASE_URL` | `postgresql://guoxue:guoxue123@localhost:5432/guoxue` | CI 容器地址 | **生产地址** | PostgreSQL 连接串 |
| `REDIS_URL` | `redis://localhost:6379` | CI 容器地址 | **生产地址** | Redis 连接串 |
| `JWT_SECRET` | `dev-secret` | `e2e-test-jwt-secret` | **64位随机字符串** | JWT 签名密钥 |
| `ENCRYPTION_KEY` | `dev-key-32bytes-long!!!!` | `e2e-test-key-32bytes-long!!!` | **32位随机字符串** | AES-256-GCM 加密密钥 |
| `CORS_ORIGIN` | `*` | `*` | **具体域名列表** | CORS 允许来源 |
| `PRISMA_SLOW_QUERY_MS` | `200` | `500` | `500` | 慢查询阈值(ms) |

### 3.2 腾讯云基础凭证

| 变量名 | 开发 | 测试 | 生产 |
|--------|------|------|------|
| `TENCENT_SECRET_ID` | 个人账号 | 空/假值 | **生产账号** |
| `TENCENT_SECRET_KEY` | 个人账号 | 空/假值 | **生产账号** |

> 此凭证被 AI(ASR/OCR/NLP)、短信、直播、点播等模块共用。

### 3.3 腾讯云 COS (对象存储)

| 变量名 | 开发 | 测试 | 生产 |
|--------|------|------|------|
| `COS_SECRET_ID` | 开发桶 | 空 | **生产桶** |
| `COS_SECRET_KEY` | 开发桶 | 空 | **生产桶** |
| `COS_BUCKET` | `guoxue-dev-xxx` | 空 | `guoxue-prod-xxx` |
| `COS_REGION` | `ap-guangzhou` | 空 | `ap-guangzhou` |
| `COS_CDN_BASE` | 空 | 空 | **CDN 加速域名** |

### 3.4 腾讯云 IM

| 变量名 | 开发 | 测试 | 生产 |
|--------|------|------|------|
| `IM_APP_ID` | 开发应用 | 空 | **生产应用** |
| `IM_ADMIN_KEY` | 开发密钥 | 空 | **生产密钥** |
| `IM_ADMIN_ID` | `administrator` | 空 | `administrator` |
| `IM_PRIVATE_KEY` | 开发密钥 | 空 | **生产密钥** |
| `IM_PUBLIC_KEY` | 开发密钥 | 空 | **生产密钥** |

### 3.5 腾讯云直播

| 变量名 | 开发 | 测试 | 生产 |
|--------|------|------|------|
| `LIVE_PUSH_DOMAIN` | 开发推流域名 | 空 | **生产推流域名** |
| `LIVE_PLAY_DOMAIN` | 开发播流域名 | 空 | **生产播流域名** |
| `LIVE_PUSH_KEY` | 开发密钥 | 空 | **生产密钥** |
| `LIVE_PLAY_KEY` | 开发密钥 | 空 | **生产密钥** |
| `LIVE_APP_NAME` | `live` | 空 | `live` |

### 3.6 腾讯云点播

| 变量名 | 开发 | 测试 | 生产 |
|--------|------|------|------|
| `VOD_SUB_APP_ID` | 开发应用ID | 空 | **生产应用ID** |

### 3.7 微信生态

| 变量名 | 开发 | 测试 | 生产 |
|--------|------|------|------|
| `WECHAT_APP_ID` | 开发应用 | 空 | **生产应用** |
| `WECHAT_APP_SECRET` | 开发密钥 | 空 | **生产密钥** |
| `WECHAT_MINI_APP_ID` | 开发小程序 | 空 | **生产小程序** |
| `WECHAT_MP_APP_ID` | 开发公众号 | 空 | **生产公众号** |

### 3.8 微信支付 V3

| 变量名 | 开发 | 测试 | 生产 |
|--------|------|------|------|
| `WECHAT_PAY_MCH_ID` | 沙箱商户号 | 空 | **正式商户号** |
| `WECHAT_PAY_SERIAL_NO` | 沙箱证书序列号 | 空 | **正式证书序列号** |
| `WECHAT_PAY_API_V3_KEY` | 沙箱密钥 | 空 | **正式密钥** |
| `WECHAT_PAY_PRIVATE_KEY` | 沙箱私钥 | 空 | **正式私钥** |
| `WECHAT_PAY_NOTIFY_URL` | 本地回调地址 | 空 | **生产回调地址** |
| `WECHAT_PAY_REFUND_NOTIFY_URL` | 本地回调地址 | 空 | **生产退款回调** |

### 3.9 支付宝

| 变量名 | 开发 | 测试 | 生产 |
|--------|------|------|------|
| `ALIPAY_APP_ID` | 沙箱应用 | 空 | **正式应用** |
| `ALIPAY_SANDBOX` | `true` | 空 | `false` |
| `ALIPAY_PRIVATE_KEY` | 沙箱私钥 | 空 | **正式私钥** |
| `ALIPAY_PUBLIC_KEY` | 沙箱公钥 | 空 | **正式公钥** |
| `ALIPAY_NOTIFY_URL` | 本地回调 | 空 | **生产回调** |

### 3.10 AI / 短信 / 邮件 / 地图

| 变量名 | 开发 | 测试 | 生产 |
|--------|------|------|------|
| `DEEPSEEK_API_KEY` | 个人 Key | 空 | **生产 Key** |
| `SMS_APP_ID` | 开发应用 | 空 | **生产应用** |
| `SMS_SIGN_NAME` | 开发签名 | 空 | **正式签名** |
| `SMS_TEMPLATE_ID` | 开发模板 | 空 | **正式模板** |
| `TENCENT_MAP_KEY` | 个人 Key | 空 | **生产 Key** |
| `TENCENT_MAP_SK` | 个人 SK | 空 | **生产 SK**（用于签名校验） |
| `COZE_API_KEY` | 个人 Key | 空 | **生产 Key** |
| `COZE_BOT_ID` | 开发 Bot | 空 | **生产 Bot** |
| `KUAIDI100_API_KEY` | 开发 Key | 空 | **生产 Key** |
| `EMAIL_MODE` | `smtp` | 空 | `smtp` 或 `api` |
| `WEWORK_WEBHOOK_URL` | 测试群机器人 | 空 | **生产告警群** |

## 四、Docker Compose 启动命令

### 4.1 开发环境

```bash
# 启动（源码挂载 + 热重载）
docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d

# 仅启动基础设施（后端在宿主机跑）
docker compose -f docker/docker-compose.yml up -d postgres redis

# 查看日志
docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml logs -f server

# 停止
docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml down
```

### 4.2 测试环境

```bash
# 本地跑 E2E 测试
docker compose -f docker/docker-compose.test.yml up \
  --abort-on-container-exit --exit-code-from test

# CI 环境由 .github/workflows/ci.yml 自动执行
```

### 4.3 生产环境

```bash
# 首次部署
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d

# 更新部署（零停机）
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml pull server
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml \
  up -d --no-deps --scale server=2 server
sleep 5
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml \
  up -d --no-deps --scale server=1 server

# 查看运行状态
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml ps

# 停止
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml down
```

## 五、CI/CD 密钥配置 (GitHub Secrets)

部署流水线需要在 GitHub 仓库 Settings → Secrets and variables → Actions 中配置：

### 5.1 Staging 环境

| Secret 名称 | 说明 |
|-------------|------|
| `STAGING_HOST` | Staging 服务器 IP |
| `STAGING_USER` | SSH 用户名 |
| `STAGING_SSH_KEY` | SSH 私钥 (PEM) |
| `STAGING_SSH_FINGERPRINT` | Staging 服务器 SSH 主机公钥 SHA-256 指纹 |

### 5.2 Production 环境

| Secret 名称 | 说明 |
|-------------|------|
| `PROD_HOST_A` | 生产业务节点 A IP |
| `PROD_HOST_B` | 生产业务兼运维节点 B IP |
| `PROD_USER` | SSH 用户名 |
| `PROD_SSH_KEY` | SSH 私钥 (PEM) |
| `PROD_SSH_FINGERPRINT_A` | 节点 A SSH 主机公钥 SHA-256 指纹（须从可信控制台独立核对） |
| `PROD_SSH_FINGERPRINT_B` | 节点 B SSH 主机公钥 SHA-256 指纹（须从可信控制台独立核对） |
| `WEWORK_WEBHOOK_URL` | 企业微信机器人 Webhook (部署通知) |

### 5.3 通用 Secrets

| Secret 名称 | 说明 |
|-------------|------|
| `GITHUB_TOKEN` | 自动提供，用于推送镜像到 GHCR |

## 六、环境配置检查脚本

```bash
#!/bin/bash
# scripts/check-env.sh — 部署前检查环境变量完整性

REQUIRED_VARS=(
  "DATABASE_URL"
  "REDIS_URL"
  "JWT_SECRET"
  "ENCRYPTION_KEY"
)

PROD_ONLY_VARS=(
  "TENCENT_SECRET_ID"
  "TENCENT_SECRET_KEY"
  "WECHAT_APP_ID"
  "WECHAT_APP_SECRET"
  "COS_SECRET_ID"
  "COS_SECRET_KEY"
  "COS_BUCKET"
)

MISSING=0

echo "=== 环境变量检查 ==="
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ 缺少必需变量: $var"
    MISSING=$((MISSING + 1))
  else
    echo "✅ $var=***"
  fi
done

if [ "$NODE_ENV" = "production" ]; then
  echo "--- 生产环境额外检查 ---"
  for var in "${PROD_ONLY_VARS[@]}"; do
    if [ -z "${!var}" ]; then
      echo "⚠️  生产变量未设置: $var"
    else
      echo "✅ $var=***"
    fi
  done
fi

if [ $MISSING -gt 0 ]; then
  echo "❌ 共 $MISSING 个必需变量缺失，部署终止"
  exit 1
fi

echo "✅ 环境变量检查通过"
```
