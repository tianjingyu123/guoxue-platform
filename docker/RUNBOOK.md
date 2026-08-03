# 国学平台 — 生产组件运维参考

> 本手册覆盖首次部署、日常更新、故障排查、回滚、备份恢复全流程。
>
> **当前生产上线唯一现场入口（2026-07-31 起）**：
> `docs/operations/新基础设施与正式凭据交接清单-20260731.md`；完整迁移步骤见
> `docs/operations/服务器数据库域名迁移手册-20260728.md`。本文只保留组件级解释和
> 故障排查参考；若命令与上述两份文档冲突，必须以上述文档为准。生产禁止直接执行本文
> 历史章节中的 `git pull`、`git checkout`、裸 `docker compose` 或 `deploy.sh --rollback`
> 来替代固定发布包激活/回滚流程。
>
> 进入任何生产操作前先固定同一组现场参数，且整场变更不得切换架构：
>
> ```bash
> export DEPLOY_TARGET='standard' # 腾讯云托管 PostgreSQL/Redis 时改为 tencent
> export ENV_FILE='/opt/guoxue/shared/.env.production'
> ```

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

| 服务          | 端口   | 说明            |
| ------------- | ------ | --------------- |
| Nginx         | 80/443 | 外部唯一入口    |
| NestJS Server | 3000   | 内部，不对外    |
| PostgreSQL    | 5432   | 内部，不对外    |
| Redis         | 6379   | 内部，不对外    |
| Prometheus    | 9090   | 内部            |
| Grafana       | 3001   | 内部/Nginx 代理 |
| Alertmanager  | 9093   | 内部            |
| Loki          | 3100   | 内部            |
| Tempo         | 4318   | 内部，OTLP HTTP |

---

## 2. 环境要求

### 2.1 服务器最低配置

| 指标 | 最低要求     | 推荐配置           |
| ---- | ------------ | ------------------ |
| CPU  | 2 核         | 4 核               |
| 内存 | 4 GB         | 8 GB               |
| 磁盘 | 40 GB SSD    | 100 GB SSD         |
| 带宽 | 5 Mbps       | 10 Mbps            |
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

| 密钥                   | 用途                  | 必需         |
| ---------------------- | --------------------- | ------------ |
| DB_PASSWORD            | 数据库密码            | ★            |
| JWT_SECRET             | JWT 签名 (64字符随机) | ★            |
| ENCRYPTION_KEY         | 数据加密 (32字符)     | ★            |
| DEEPSEEK_API_KEY       | AI 能力               | ★            |
| WECHAT_APP_ID + SECRET | 微信登录              | ★            |
| COS_BUCKET + KEYS      | 文件存储              | ★            |
| IM_APP_ID + KEY        | 即时通讯              | 核心功能需要 |
| WECHAT*PAY*\*          | 支付                  | 商城功能需要 |
| SMS\_\*                | 短信验证码            | 注册功能需要 |

---

## 3. 首次部署

### 3.1 一键部署（推荐）

```bash
# 先上传已经通过门禁、带提交 SHA 的完整固定发布包，并按 .release-id
# 解压到 /opt/guoxue/releases/<release-id>；incoming 仅作传输暂存。
cd /opt/guoxue/releases/release-20260731-001
# 在这个唯一受管版本目录执行；脚本不会自行拉取远程分支
sudo DOMAIN=api.example.com LETSENCRYPT_EMAIL=ops@example.com \
  DEPLOY_TARGET=standard NODE_ROLE=operations DATABASE_MODE=prepare \
  ENV_FILE=/opt/guoxue/shared/.env.production bash docker/setup-server.sh

# 腾讯云托管数据库、Redis、CLB/TLS 模式（不会启动本机 PostgreSQL / Redis）
sudo DOMAIN=api.example.com DEPLOY_TARGET=tencent \
  NODE_ROLE=operations DATABASE_MODE=prepare ENV_FILE=/opt/guoxue/shared/.env.production \
  bash docker/setup-server.sh
```

双节点部署时，节点 A 改用 `NODE_ROLE=app`，节点 B 使用 `NODE_ROLE=operations`；监控、告警、镜像清理和数据库定时备份只运行在 B。

如果两台节点仍运行临时预部署目录，这是“首次固定版本引导”，不是日常更新。必须按
`docs/operations/服务器数据库域名迁移手册-20260728.md` 第 2.1 节在 CLB 逐台摘除/恢复；首次引导
不设置 `EXPECTED_CURRENT_RELEASE_ID`，也不得把临时目录伪造成可回滚版本。A/B 首次形成同一固定版本后，
后续一律使用 GitHub 双节点滚动工作流。

脚本自动完成：系统优化 → Docker 安装 → 防火墙 → 固定发布包复核 → SSL 证书 → 按数据库模式构建启动 → 定时备份。

### 3.2 手动部署（逐步控制）

```bash
# 1. 将固定发布包解压到与 .release-id 同名的受管版本目录
cd /opt/guoxue/releases/release-20260731-001/docker

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
DEPLOY_TARGET="$DEPLOY_TARGET" ENV_FILE="$ENV_FILE" bash ./health-check.sh
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

> 本节仅适用于 A/B 已经运行同一个固定版本。触发生产工作流时必须把该版本填入
> `expected_current_release_id`。工作流会在更新 A 前同时验真两台节点的共同基线及其恢复链；若本次包含
> 数据库迁移，还必须完成旧应用向后兼容评审并填写
> `schema_compatibility_confirmation=schema-compatible:<新发布标识>`。任何后续步骤失败时先恢复 B、再恢复 A，
> 任务保持失败状态以便排查，不能把自动恢复误当成发布成功。

### 4.1 标准部署流程

```bash
cd /opt/guoxue

# 1. 运维人员先把已通过门禁的固定提交发布包同步到当前目录
#    禁止在生产服务器直接拉取未验收分支

# 2. 执行自动化部署（含预检查 + 回滚保护）
DEPLOY_TARGET="$DEPLOY_TARGET" ENV_FILE="$ENV_FILE" bash ./docker/deploy.sh
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
DEPLOY_TARGET="$DEPLOY_TARGET" ENV_FILE="$ENV_FILE" bash ./pg-backup.sh
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
DEPLOY_TARGET="$DEPLOY_TARGET" ENV_FILE="$ENV_FILE" bash ./health-check.sh

# 7. 如果失败，立即回滚
# git checkout $(cat /tmp/last-good-commit)
# docker compose build server
# docker compose up -d --no-deps server
```

### 4.3 仅数据库迁移（不重建镜像）

生产迁移默认关闭。必须先完成备份、`prisma migrate status`、迁移 SQL 人工审查，再双重确认执行：

```bash
cd /opt/guoxue/docker
RELEASE_ID='<固定发布标识>' \
MIGRATION_DEPLOY_CONFIRM='migrate:<固定发布标识>' \
DEPLOY_TARGET="$DEPLOY_TARGET" ENV_FILE="$ENV_FILE" \
ALLOW_PROD_DB_MIGRATION=reviewed bash ./deploy.sh --migrate
```

普通 `bash ./deploy.sh` 只更新应用，不修改数据库。严禁在生产使用 `prisma db push --accept-data-loss`。

### 4.4 部署窗口建议

| 时段                 | 风险等级 | 适合操作               |
| -------------------- | -------- | ---------------------- |
| 凌晨 2:00-6:00       | 低       | 数据库迁移、大版本更新 |
| 上午 10:00-12:00     | 中       | 功能更新、小版本迭代   |
| 下午 14:00-16:00     | 中       | 修复部署               |
| **晚间 18:00-22:00** | **高**   | **避免部署**           |

---

## 5. 回滚预案

### 5.1 应用固定版本回滚（当前唯一标准流程）

```bash
TARGET_RELEASE_ID='release-previous-stable'
sudo ROOT_DIR=/opt/guoxue \
  DEPLOY_TARGET="$DEPLOY_TARGET" \
  NODE_ROLE="${NODE_ROLE:?请指定 app 或 operations}" \
  ENV_FILE="$ENV_FILE" \
  bash /opt/guoxue/current/scripts/release/rollback-fixed-release.sh \
  "$TARGET_RELEASE_ID" "$TARGET_RELEASE_ID"
```

目标必须存在于成功发布历史中，保留包和已部署目录都要逐文件验真。禁止从 Git 重建旧包、
手工修改 `current` 软链接或自行选择未留存证据的镜像标签。

### 5.2 数据库迁移后的应用回退

Prisma 不支持自动逆向迁移，生产回退默认只切回应用版本，**不执行逆向 SQL、不修改
`_prisma_migrations`、不用旧库覆盖当前库**。目标应用早于最近一次数据库迁移时，先完成
向后兼容评审，再按 5.1 设置 `ALLOW_SCHEMA_COMPATIBLE_ROLLBACK=reviewed`。若架构不兼容，
采取修复前进（补偿迁移），不得在事故现场临时手写破坏性 SQL。

### 5.3 数据灾难恢复

恢复必须创建新的隔离空库，使用已验真的 custom archive、清单和 SHA-256 边车文件，完成
逐表行数、业务完整性、序列和 Prisma 状态核验后，再切换应用连接。标准入口是
`scripts/migration/restore-postgres.sh` 和 `scripts/migration/verify-postgres.sh`；不得直接覆盖
仍在承接写入的正式库。切流窗口已经产生新数据时，旧备份只能用于重建/核查，不能作为
应用回滚的一部分覆盖新数据。

---

## 6. 数据库运维

### 6.1 迁移安全规则

1. **每次部署前必须备份** — `deploy.sh` 已自动执行
2. **默认不迁移** — 只有已审查迁移才能同时提供固定 `RELEASE_ID`、同值的 `MIGRATION_DEPLOY_CONFIRM=migrate:<release-id>`、`ALLOW_PROD_DB_MIGRATION=reviewed` 和 `--migrate`
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

| 类型        | 频率            | 保留时间 | 脚本           |
| ----------- | --------------- | -------- | -------------- |
| 全量备份    | 每天凌晨 3 点   | 30 天    | `pg-backup.sh` |
| Docker 清理 | 每周日凌晨 4 点 | -        | crontab        |

```bash
# 确认 crontab 已配置
crontab -l | grep guoxue
# 应输出:
# 0 3 * * * DEPLOY_TARGET=standard ENV_FILE=/opt/guoxue/shared/.env.production /usr/bin/env bash /opt/guoxue/current/docker/pg-backup.sh 30 >> /var/log/guoxue-backup.log 2>&1
```

### 7.2 手动备份

```bash
DEPLOY_TARGET=standard ENV_FILE="$ENV_FILE" bash ./docker/pg-backup.sh # 自建数据库全量备份
DEPLOY_TARGET=tencent ENV_FILE="$ENV_FILE" bash ./docker/pg-backup.sh # 托管数据库全量备份，使用宿主机 PostgreSQL 客户端
```

### 7.3 恢复流程

```bash
# 列出可用备份
ls -lh docker/backups/

# 恢复指定备份到本机 guoxue-postgres（会要求输入精确数据库名）
bash ./docker/pg-restore.sh docker/backups/guoxue_20260515T030000Z.dump

# 托管/独立数据库不要使用上述本机容器恢复脚本；
# 使用 scripts/migration/restore-postgres.sh 并在隔离目标库完成恢复演练。
# 该脚本只接受新建空库，并使用单事务恢复；任一步失败都会整体回滚。
```

### 7.4 备份验证（每月执行一次）

```bash
# 先验证归档与清单的 SHA-256，再在隔离测试库恢复
cd docker/backups
sha256sum --check guoxue_20260515T030000Z.dump.sha256
docker exec -i guoxue-postgres-test pg_restore -U guoxue -d guoxue_test \
  --exit-on-error --no-owner --no-privileges \
  < guoxue_20260515T030000Z.dump
docker exec guoxue-postgres-test psql -U guoxue -d guoxue_test -c "SELECT count(*) FROM \"User\";"
```

---

## 8. 监控与告警

### 8.1 启动监控栈

以下命令只允许在 `NODE_ROLE=operations` 的节点 B 执行；业务节点 A 不运行监控栈。

```bash
cd /opt/guoxue/docker/monitoring
docker compose up -d
```

### 8.2 监控看板

| 看板           | 地址                       | 用途                |
| -------------- | -------------------------- | ------------------- |
| API 总览       | Grafana → api-overview     | 请求量/延迟/错误率  |
| Node.js 运行时 | Grafana → nodejs-runtime   | 内存/GC/Event Loop  |
| 支付监控       | Grafana → payment-overview | 支付成功率/回调延迟 |

### 8.3 关键告警规则

| 告警               | 级别     | 触发条件   | 通知方式 |
| ------------------ | -------- | ---------- | -------- |
| API 5xx > 1%       | Critical | 2 分钟持续 | 企业微信 |
| 支付回调延迟 > 30s | Critical | 立即       | 企业微信 |
| DB 连接池 > 80%    | Warning  | 5 分钟     | 企业微信 |
| Redis 宕机         | Critical | 30 秒      | 企业微信 |
| 磁盘 < 15%         | Critical | 5 分钟     | 企业微信 |
| Event Loop > 100ms | Warning  | 3 分钟     | 企业微信 |

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

# Docker 安全清理：保留所有有标签的发布镜像，避免破坏回滚能力
docker image prune -f
docker builder prune -f --filter "until=168h"

# 禁止在生产机执行 docker system prune -a；它会删除当前未运行的旧版回滚镜像

# 查看日志占用
du -sh /var/log/guoxue/ docker/backups/

# 按统一保留策略清理归档及其校验/清单边车文件
DEPLOY_TARGET=standard BACKUP_DIR="$(pwd)/docker/backups" bash ./docker/pg-backup.sh 30
```

### 9.6 SSL 证书过期

```bash
# 查看证书到期时间
openssl x509 -in docker/nginx/ssl/fullchain.pem -noout -enddate

# 手动续期
docker run --rm -v $(pwd)/docker/nginx/ssl:/etc/letsencrypt \
  -p 80:80 certbot/certbot:v3.2.0@sha256:3ad1eb352f6b2ae3f359dce4b262f699cc178be0ab9d9f375210e8741404720e renew

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
□ 定期复核基础镜像锁定版本与摘要（Node.js 24 LTS、Nginx 1.27）
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

| 角色         | 职责                 | 联系方式    |
| ------------ | -------------------- | ----------- |
| 技术负责人   | 架构决策、回滚审批   | 微信/电话   |
| DBA          | 数据库故障、数据恢复 | 微信        |
| 运维         | 服务器、网络、DNS    | 微信        |
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
DEPLOY_TARGET=standard bash ./pg-backup.sh                 # 自建数据库手动备份（托管库改为 tencent）
RESTORE_CONFIRM=guoxue bash ./pg-restore.sh backups/xxx.dump # 恢复本机容器备份

# ═══ 监控 ═══
curl localhost:3000/api/v1/health | jq                    # 健康检查
curl localhost:3000/metrics                                # Prometheus 指标
docker compose -f monitoring/docker-compose.yml logs -f    # 监控栈日志

# ═══ 紧急操作 ═══
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart server  # 重启应用
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop            # 停止全部
# 紧急回滚必须使用第 5.1 节的 rollback-fixed-release.sh 固定包入口
```
