# 国学平台 — 生产部署运维手册

> 本手册覆盖首次部署、日常更新、故障排查、回滚、备份恢复全流程。
> 按照本手册操作，可确保系统"万无一失"地运行。

---

## 目录

1. [架构总览](#1-架构总览)
2. [环境要求](#2-环境要求)
3. [首次部署](#3-首次部署)
4. [日常更新部署](#4-日常更新部署)
5. [回滚预案](#5-回滚预案)
6. [数据库运维](#6-数据库运维)
7. [备份与恢复](#7-备份与恢复)
8. [监控与告警](#8-监控与告警)
9. [故障排查手册](#9-故障排查手册)
10. [安全加固清单](#10-安全加固清单)
11. [性能调优指南](#11-性能调优指南)
12. [应急联系人](#12-应急联系人)

---

## 1. 架构总览

```
用户 → Nginx (443/SSL) → NestJS Server (3000) → PostgreSQL 16 + pgvector
                                               → Redis 7
                                               → DeepSeek AI API
                                               → 腾讯云 (COS/IM/SMS/VOD/Live)
                                               → 微信支付 / 支付宝 / 银联

监控栈: Prometheus → Grafana → Alertmanager → 企业微信告警
日志栈: Promtail → Loki → Grafana
追踪栈: OpenTelemetry → Tempo → Grafana
```

**关键端口:**

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx | 80/443 | 外部唯一入口 |
| NestJS Server | 3000 | 内部，不对外 |
| PostgreSQL | 5432 | 内部，不对外 |
| Redis | 6379 | 内部，不对外 |
| Prometheus | 9090 | 内部 |
| Grafana | 3001 | 内部/Nginx 代理 |
| Alertmanager | 9093 | 内部 |
| Loki | 3100 | 内部 |
| Tempo | 4318 | 内部，OTLP HTTP |

---

## 2. 环境要求

### 2.1 服务器最低配置

| 指标 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB | 8 GB |
| 磁盘 | 40 GB SSD | 100 GB SSD |
| 带宽 | 5 Mbps | 10 Mbps |
| 系统 | Ubuntu 22.04 | Ubuntu 22.04/24.04 |

### 2.2 必须安装

- Docker 24+ & Docker Compose Plugin
- Git
- curl / wget
- crontab (备份用)

### 2.3 域名与 DNS

确保以下域名已解析到服务器 IP：

```
api.example.com     → A 记录 → 服务器IP
shop.example.com    → A 记录 → 服务器IP
live.example.com    → A 记录 → 服务器IP
```

### 2.4 必需密钥清单

部署前必须准备以下密钥（缺一不可标注 ★）：

| 密钥 | 用途 | 必需 |
|------|------|------|
| DB_PASSWORD | 数据库密码 | ★ |
| JWT_SECRET | JWT 签名 (64字符随机) | ★ |
| ENCRYPTION_KEY | 数据加密 (32字符) | ★ |
| DEEPSEEK_API_KEY | AI 能力 | ★ |
| WECHAT_APP_ID + SECRET | 微信登录 | ★ |
| COS_BUCKET + KEYS | 文件存储 | ★ |
| IM_APP_ID + KEY | 即时通讯 | 核心功能需要 |
| WECHAT_PAY_* | 支付 | 商城功能需要 |
| SMS_* | 短信验证码 | 注册功能需要 |

---

## 3. 首次部署

### 3.1 一键部署（推荐）

```bash
# 先上传已经通过门禁、带提交 SHA 的完整固定发布包
# 然后在项目根目录执行；脚本不会自行拉取远程分支
sudo DOMAIN=api.example.com LETSENCRYPT_EMAIL=ops@example.com \
  DATABASE_MODE=prepare bash docker/setup-server.sh
```

脚本自动完成：系统优化 → Docker 安装 → 防火墙 → 固定发布包复核 → SSL 证书 → 按数据库模式构建启动 → 定时备份。

### 3.2 手动部署（逐步控制）

```bash
# 1. 将已通过发布门禁、带提交 SHA 的固定发布包上传到 /opt/guoxue
cd /opt/guoxue/docker

# 2. 配置环境变量
cp .env.production.example .env.production
vim .env.production   # 填入真实密钥

# 3. 生成强密码
openssl rand -base64 48   # 用于 JWT_SECRET
openssl rand -base64 24   # 用于 ENCRYPTION_KEY
openssl rand -base64 32   # 用于 DB_PASSWORD

# 4. 构建镜像
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# 5. 启动基础设施（先启动 DB 和 Redis）
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d postgres redis

# 6. 等待数据库就绪
until docker exec guoxue-postgres pg_isready -U guoxue; do sleep 2; done

# 7. 启动全部服务
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 8. 验证部署
./health-check.sh
```

### 3.3 首次部署验证清单

部署完成后逐项检查：

```
□ curl https://api.example.com/api/v1/health → status: "ok" 或 "degraded"
□ curl https://api.example.com/api/v1/health/ready → status: "ready"
□ curl https://api.example.com/api/v1/health/live → status: "alive"
□ docker compose ps → 所有容器 Up (healthy)
□ docker compose logs server --tail 50 → 无 ERROR 日志
□ SSL 证书有效 → curl -vI https://api.example.com 2>&1 | grep "subject:"
□ 定时备份已配置 → crontab -l | grep pg-backup
□ Grafana 可访问 → curl http://localhost:3001/api/health
```

---

## 4. 日常更新部署

### 4.1 标准部署流程

```bash
cd /opt/guoxue

# 1. 运维人员先把已通过门禁的固定提交发布包同步到当前目录
#    禁止在生产服务器直接拉取未验收分支

# 2. 执行自动化部署（含预检查 + 回滚保护）
./docker/deploy.sh
```

`deploy.sh` 会自动执行：
- 备份当前数据库
- 构建新镜像
- 滚动更新服务
- 默认不迁移数据库；只有双重确认后才执行已审查迁移
- 验证健康检查
- 失败时自动回滚

### 4.2 手动部署（需要精细控制时）

```bash
cd /opt/guoxue/docker

# 1. 预备份（必须！）
./pg-backup.sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec server sh -c "cat /app/apps/server/prisma/migrations/**/migration.sql" > /tmp/migration-state-before.sql

# 2. 记录当前版本（回滚用）
git rev-parse HEAD > /tmp/last-good-commit

# 3. 将已通过门禁的固定提交发布包同步到 /opt/guoxue
#    同步后必须确保已跟踪文件无未提交改动
cd /opt/guoxue
git status --short --untracked-files=no

# 4. 重新构建
cd docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml build server

# 5. 滚动更新（零停机）
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps server

# 6. 等待健康检查通过
sleep 10
./health-check.sh

# 7. 如果失败，立即回滚
# git checkout $(cat /tmp/last-good-commit)
# docker compose build server
# docker compose up -d --no-deps server
```

### 4.3 仅数据库迁移（不重建镜像）

生产迁移默认关闭。必须先完成备份、`prisma migrate status`、迁移 SQL 人工审查，再双重确认执行：

```bash
cd /opt/guoxue/docker
ALLOW_PROD_DB_MIGRATION=reviewed ./deploy.sh --migrate
```

普通 `./deploy.sh` 只更新应用，不修改数据库。严禁在生产使用 `prisma db push --accept-data-loss`。

### 4.4 部署窗口建议

| 时段 | 风险等级 | 适合操作 |
|------|---------|---------|
| 凌晨 2:00-6:00 | 低 | 数据库迁移、大版本更新 |
| 上午 10:00-12:00 | 中 | 功能更新、小版本迭代 |
| 下午 14:00-16:00 | 中 | 修复部署 |
| **晚间 18:00-22:00** | **高** | **避免部署** |

---

## 5. 回滚预案

### 5.1 代码回滚（最常用）

```bash
# 1. 查看最近的提交
git log --oneline -10

# 2. 回退到指定版本
git checkout <commit-hash>

# 3. 重新构建并部署
cd docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml build server
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps server

# 4. 验证
./health-check.sh
```

### 5.2 数据库迁移回滚

Prisma 不支持自动回滚，需要手动处理：

```bash
# 1. 查看迁移状态
docker compose exec server sh -c "cd /app/apps/server && npx prisma migrate status"

# 2. 如果最后一次迁移有问题，标记为已回滚
docker compose exec server sh -c "cd /app/apps/server && npx prisma migrate resolve --rolled-back <migration_name>"

# 3. 手动执行逆向 SQL（如果有）
docker exec -i guoxue-postgres psql -U guoxue -d guoxue < /tmp/rollback.sql

# 4. 重新部署旧版本代码
```

### 5.3 完整回滚（数据库恢复到备份点）

```bash
# 1. 停止服务
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop server

# 2. 恢复数据库
./pg-restore.sh ./backups/guoxue_YYYYMMDD_HHMMSS.sql.gz

# 3. 回退代码
git checkout <last-good-commit>

# 4. 重建并启动
docker compose -f docker-compose.yml -f docker-compose.prod.yml build server
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d server

# 5. 验证
./health-check.sh
```

---

## 6. 数据库运维

### 6.1 迁移安全规则

1. **每次部署前必须备份** — `deploy.sh` 已自动执行
2. **默认不迁移** — 只有已审查迁移才能用 `ALLOW_PROD_DB_MIGRATION=reviewed ./deploy.sh --migrate`
3. **不用 `migrate reset` / `db push --accept-data-loss`** — 生产环境只允许已审查的 `migrate deploy`
4. **大表 DDL 在低峰期执行** — 超过 100 万行的表加字段需要特殊处理
5. **添加索引用 CONCURRENTLY** — 在迁移 SQL 中使用 `CREATE INDEX CONCURRENTLY`

### 6.2 常用运维命令

```bash
# 进入数据库 CLI
docker exec -it guoxue-postgres psql -U guoxue -d guoxue

# 查看活跃连接
SELECT pid, state, query, now()-query_start AS duration FROM pg_stat_activity WHERE datname='guoxue' AND state='active';

# 查看慢查询
SELECT pid, now()-query_start AS duration, query FROM pg_stat_activity WHERE datname='guoxue' AND now()-query_start > interval '5 seconds';

# 终止卡死查询
SELECT pg_terminate_backend(<pid>);

# 查看表大小排行
SELECT tablename, pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) AS size FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(quote_ident(tablename)) DESC LIMIT 20;

# 查看索引使用率
SELECT relname, indexrelname, idx_scan, idx_tup_read FROM pg_stat_user_indexes ORDER BY idx_scan LIMIT 20;

# 执行 VACUUM ANALYZE（优化查询计划）
VACUUM ANALYZE;
```

### 6.3 pgvector 维护

```sql
-- 检查向量扩展
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- 重建向量索引（慢查询时使用）
REINDEX INDEX CONCURRENTLY idx_platform_knowledge_embedding;
```

---

## 7. 备份与恢复

### 7.1 自动备份策略

| 类型 | 频率 | 保留时间 | 脚本 |
|------|------|---------|------|
| 全量备份 | 每天凌晨 3 点 | 30 天 | `pg-backup.sh` |
| Docker 清理 | 每周日凌晨 4 点 | - | crontab |

```bash
# 确认 crontab 已配置
crontab -l | grep guoxue
# 应输出:
# 0 3 * * * /opt/guoxue/docker/pg-backup.sh 30 >> /var/log/guoxue-backup.log 2>&1
```

### 7.2 手动备份

```bash
./docker/pg-backup.sh      # 执行一次全量备份
```

### 7.3 恢复流程

```bash
# 列出可用备份
ls -lh docker/backups/

# 恢复指定备份（会提示确认）
./docker/pg-restore.sh docker/backups/guoxue_20260515_030000.sql.gz
```

### 7.4 备份验证（每月执行一次）

```bash
# 在测试环境恢复备份，验证数据完整性
docker exec -i guoxue-postgres-test psql -U guoxue -d guoxue_test < <(gunzip -c docker/backups/latest.sql.gz)
docker exec guoxue-postgres-test psql -U guoxue -d guoxue_test -c "SELECT count(*) FROM \"User\";"
```

---

## 8. 监控与告警

### 8.1 启动监控栈

```bash
cd /opt/guoxue/docker/monitoring
docker compose up -d
```

### 8.2 监控看板

| 看板 | 地址 | 用途 |
|------|------|------|
| API 总览 | Grafana → api-overview | 请求量/延迟/错误率 |
| Node.js 运行时 | Grafana → nodejs-runtime | 内存/GC/Event Loop |
| 支付监控 | Grafana → payment-overview | 支付成功率/回调延迟 |

### 8.3 关键告警规则

| 告警 | 级别 | 触发条件 | 通知方式 |
|------|------|---------|---------|
| API 5xx > 1% | Critical | 2 分钟持续 | 企业微信 |
| 支付回调延迟 > 30s | Critical | 立即 | 企业微信 |
| DB 连接池 > 80% | Warning | 5 分钟 | 企业微信 |
| Redis 宕机 | Critical | 30 秒 | 企业微信 |
| 磁盘 < 15% | Critical | 5 分钟 | 企业微信 |
| Event Loop > 100ms | Warning | 3 分钟 | 企业微信 |

### 8.4 健康检查端点

```bash
# 完整健康报告（含所有依赖状态）
curl https://api.example.com/api/v1/health | jq

# 就绪检查（仅 DB + Redis）
curl https://api.example.com/api/v1/health/ready | jq

# 存活检查（无依赖检查，仅确认进程存活）
curl https://api.example.com/api/v1/health/live | jq
```

---

## 9. 故障排查手册

### 9.1 服务无法启动

```bash
# 查看容器状态
docker compose ps

# 查看启动日志
docker compose logs server --tail 100

# 常见原因:
# - 数据库未就绪 → 检查 postgres 容器状态
# - 端口冲突 → lsof -i :3000
# - 环境变量缺失 → 检查 .env.production
# - 镜像构建失败 → docker compose build server 2>&1 | tail -50
```

### 9.2 数据库连接失败

```bash
# 检查 PostgreSQL 容器
docker exec guoxue-postgres pg_isready -U guoxue

# 查看连接数
docker exec guoxue-postgres psql -U guoxue -c "SELECT count(*) FROM pg_stat_activity;"

# 如果连接数满，终止空闲连接
docker exec guoxue-postgres psql -U guoxue -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle' AND now()-state_change > interval '10 minutes';"
```

### 9.3 Redis 连接失败

```bash
# 检查 Redis 容器
docker exec guoxue-redis redis-cli ping

# 查看内存状态
docker exec guoxue-redis redis-cli info memory | grep used_memory_human

# 查看慢日志
docker exec guoxue-redis redis-cli slowlog get 10
```

### 9.4 API 延迟高

```bash
# 1. 查看 Nginx 上游响应时间
docker exec guoxue-nginx tail -50 /var/log/nginx/access.log | awk '{print $NF}' | sort -rn | head -20

# 2. 查看应用日志中的慢查询
docker compose logs server --since 10m | grep -i "slow\|timeout\|WARN"

# 3. 查看 DB 慢查询
docker exec guoxue-postgres psql -U guoxue -c "SELECT pid, now()-query_start AS duration, query FROM pg_stat_activity WHERE datname='guoxue' AND now()-query_start > interval '1 second' ORDER BY duration DESC;"

# 4. 查看 Node.js 内存/GC
curl -s localhost:3000/metrics | grep -E "nodejs_(heap|gc|eventloop)"
```

### 9.5 磁盘空间不足

```bash
# 查看磁盘使用
df -h

# Docker 清理（安全操作，仅清理无用镜像/容器）
docker system prune -af --filter "until=72h"

# 查看日志占用
du -sh /var/log/guoxue/ docker/backups/

# 手动清理旧备份
find docker/backups/ -name "*.sql.gz" -mtime +30 -delete
```

### 9.6 SSL 证书过期

```bash
# 查看证书到期时间
openssl x509 -in docker/nginx/ssl/fullchain.pem -noout -enddate

# 手动续期
docker run --rm -v $(pwd)/docker/nginx/ssl:/etc/letsencrypt \
  -p 80:80 certbot/certbot:v3.2.0 renew

# 重启 Nginx 生效
docker compose restart nginx
```

### 9.7 微信支付回调失败

```bash
# 1. 检查 Nginx 是否接收到回调请求
docker exec guoxue-nginx grep "pay/notify" /var/log/nginx/access.log | tail -20

# 2. 检查应用是否处理
docker compose logs server --since 30m | grep -i "pay\|notify\|callback"

# 3. 确认回调 URL 配置正确
echo $WECHAT_PAY_NOTIFY_URL

# 4. 测试回调 URL 可达性
curl -X POST https://api.example.com/api/v1/shop/pay/notify -H "Content-Type: application/xml" -d "<test/>"
```

---

## 10. 安全加固清单

### 10.1 部署前必检（★ 表示必须通过）

```
★ JWT_SECRET 已更换为随机 64 字符串
★ DB_PASSWORD 已更换为强密码（≥16字符）
★ ENCRYPTION_KEY 已更换为随机 32 字符
★ 生产环境 NODE_ENV=production（关闭 Swagger）
★ 数据库/Redis 端口不对外暴露
★ Nginx 已配置 HTTPS 强制跳转
★ Nginx 已配置 HSTS 头
□ 防火墙仅开放 22/80/443
□ SSH 已禁用 root 密码登录，使用密钥
□ Docker daemon 未暴露 TCP 端口
□ Redis 已禁用 FLUSHALL/FLUSHDB/KEYS 命令
□ 定期更新基础镜像（node:20-alpine, nginx:1.27-alpine）
```

### 10.2 密钥轮换

```bash
# JWT 密钥轮换（支持双密钥平滑切换）
# 1. 将当前 JWT_SECRET 移到 JWT_PREVIOUS_SECRETS
# 2. 生成新的 JWT_SECRET
# 3. 重启服务，新签发用新密钥，旧 token 仍可验证
```

---

## 11. 性能调优指南

### 11.1 PostgreSQL

```sql
-- 生产环境推荐参数（已在 docker-compose.prod.yml 配置）
shared_buffers = 256MB          -- 系统内存的 25%
effective_cache_size = 768MB    -- 系统内存的 75%
work_mem = 4MB
maintenance_work_mem = 64MB
max_connections = 100
wal_buffers = 16MB
```

### 11.2 Redis

```
# 已在 redis.conf 配置
maxmemory 256mb
maxmemory-policy allkeys-lru    # LRU 淘汰
appendonly yes                   # AOF 持久化
```

### 11.3 Node.js / PM2

```
# ecosystem.config.js 已配置
instances: "max"       # 充分利用多核
max_memory_restart: "500M"
exec_mode: "cluster"
```

### 11.4 Nginx

```
# nginx.conf 已配置
worker_connections 4096
keepalive 32           # 后端长连接
gzip on                # 压缩
limit_req 60r/s        # API 限流
limit_req 5r/s         # 登录限流
```

---

## 12. 应急联系人

| 角色 | 职责 | 联系方式 |
|------|------|---------|
| 技术负责人 | 架构决策、回滚审批 | 微信/电话 |
| DBA | 数据库故障、数据恢复 | 微信 |
| 运维 | 服务器、网络、DNS | 微信 |
| Claude (CIO) | 自动化巡检、代码审查 | Claude Code |

---

## 附录: 常用命令速查

```bash
# ═══ 服务管理 ═══
systemctl status guoxue                                  # 查看服务状态
systemctl restart guoxue                                 # 重启全部
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f  # 实时日志
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps       # 容器状态

# ═══ 数据库 ═══
docker exec -it guoxue-postgres psql -U guoxue -d guoxue  # 进入 DB
./pg-backup.sh                                             # 手动备份
./pg-restore.sh backups/xxx.sql.gz                         # 恢复备份

# ═══ 监控 ═══
curl localhost:3000/api/v1/health | jq                    # 健康检查
curl localhost:3000/metrics                                # Prometheus 指标
docker compose -f monitoring/docker-compose.yml logs -f    # 监控栈日志

# ═══ 紧急操作 ═══
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart server  # 重启应用
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop            # 停止全部
./deploy.sh --rollback                                     # 紧急回滚
```
