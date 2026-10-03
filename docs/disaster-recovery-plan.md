# 热卜国学平台 — 灾备与备份方案

> 更新时间：2026-05-11 | SOP 级别文档
>
> 2026-07-31 现场恢复入口以
> `docs/operations/服务器数据库域名迁移手册-20260728.md` 和
> `docs/operations/新基础设施与正式凭据交接清单-20260731.md` 为准。本文描述策略目标；
> 任何旧路径、示例 Bucket 或直接恢复命令都必须在隔离环境演练后，按当前清单替换为真实受控值。

## 一、RPO / RTO 定义

| 指标                   | 目标值                | 说明                                                         |
| ---------------------- | --------------------- | ------------------------------------------------------------ |
| **RPO** (数据恢复点)   | < 1 小时              | 依赖托管数据库 PITR/WAL 连续归档；`pg_dump` 不能提供增量恢复 |
| **RTO** (服务恢复时间) | < 30 分钟             | 从发现故障到服务恢复的总时长                                 |
| **备份保留**           | 30 天本地 + 90 天异地 | 本地日备份保留 30 天，异地周备份保留 90 天                   |
| **恢复演练**           | 每季度 1 次           | 至少每 3 个月完整演练一次恢复流程                            |

## 二、数据库备份策略

### 2.1 备份层次

```
┌─────────────────────────────────────────────┐
│              数据库备份层次                    │
│                                              │
│  Level 1: 连续归档 (WAL Archiving)            │
│  ├─ 频率: 实时（每 5 分钟或 16MB WAL）         │
│  ├─ RPO: < 5 分钟                            │
│  └─ 用途: 时间点恢复 (PITR)                   │
│                                              │
│  Level 2: 临时小时级完整归档 (pg_dump custom) │
│  ├─ 频率: 每 1 小时（仅 PITR 未开通时）         │
│  ├─ RPO: < 1 小时                            │
│  └─ 用途: 过渡期恢复点，不等同于增量/PITR       │
│                                              │
│  Level 3: 全量备份 (pg_dump 完整)             │
│  ├─ 频率: 每日 03:00 (业务低峰)               │
│  ├─ RPO: < 24 小时                           │
│  └─ 用途: 完整灾难恢复                        │
│                                              │
│  Level 4: 异地备份 (COS / S3)                │
│  ├─ 频率: 每周日 04:00                        │
│  ├─ RPO: < 7 天                              │
│  └─ 用途: 机房级灾难恢复                      │
└─────────────────────────────────────────────┘
```

### 2.2 Crontab 调度配置

```bash
# 在服务器执行: crontab -e
# 每日全量备份 — 凌晨 3:00
0 3 * * * DEPLOY_TARGET=tencent ENV_FILE=/opt/guoxue/shared/.env.production BACKUP_DIR=/opt/guoxue/backups /opt/guoxue/current/docker/pg-backup.sh 30 >> /var/log/guoxue-backup.log 2>&1

# 无托管数据库 PITR 时的临时小时级全量归档 — 整点后 5 分钟
5 * * * * DEPLOY_TARGET=tencent ENV_FILE=/opt/guoxue/shared/.env.production BACKUP_DIR=/opt/guoxue/backups/hourly /opt/guoxue/current/docker/pg-backup.sh 3 >> /var/log/guoxue-backup-hourly.log 2>&1

# 每周日异地同步 — 凌晨 4:00
0 4 * * 0 /opt/guoxue/docker/sync-to-cos.sh >> /var/log/guoxue-sync.log 2>&1

# 备份空间清理 — 每日 05:00
0 5 * * * /opt/guoxue/docker/cleanup-backups.sh >> /var/log/guoxue-cleanup.log 2>&1
```

### 2.3 小时级恢复点

`pg_dump` 不提供真正的增量恢复能力，不能通过筛选带 `updatedAt` 的表来伪造增量备份；
那种文件无法重建数据库。生产环境优先开通数据库厂商的连续归档/PITR，并至少保留
7 天恢复窗口。PITR 尚未开通前，临时使用同一套 `pg-backup.sh` 每小时生成完整
custom archive，归档、manifest 和 SHA-256 边车文件共同保留 3 天。

每月必须在隔离数据库执行一次“下载 → 校验 → 恢复 → 行数与业务抽样”演练，
不能以控制台显示“备份成功”代替可恢复性验证。

### 2.4 异地备份同步脚本

```bash
#!/bin/bash
# docker/sync-to-cos.sh — 将本地备份同步到腾讯云 COS
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/backups"
COS_BUCKET="${COS_BUCKET:-guoxue-backup}"
COS_REGION="${COS_REGION:-ap-guangzhou}"
COS_PATH="backups/$(date +%Y/%m)/"

# 安装 COS CLI（如未安装）
if ! command -v coscli &> /dev/null; then
  echo "安装 coscli..."
  wget -q https://github.com/tencentyun/coscli/releases/latest/download/coscli-linux-amd64 -O /usr/local/bin/coscli
  chmod +x /usr/local/bin/coscli
fi

echo "[$(date)] 开始异地备份同步..."

# 同步最近 7 天的全量备份
find "$BACKUP_DIR" -type f \
  \( -name "guoxue_*.dump" -o -name "guoxue_*.dump.sha256" -o -name "guoxue_*.dump.manifest" \) \
  -mtime -7 -print0 | while IFS= read -r -d '' f; do
  BASENAME=$(basename "$f")
  # 上传前加密
  gpg --symmetric --batch --passphrase "${BACKUP_ENCRYPTION_KEY}" "$f"
  ENCRYPTED="${f}.gpg"

  coscli cp "$ENCRYPTED" "cos://${COS_BUCKET}/${COS_PATH}${BASENAME}.gpg" --region "$COS_REGION"

  # 校验上传完整性
  LOCAL_MD5=$(md5sum "$ENCRYPTED" | cut -d' ' -f1)
  REMOTE_MD5=$(coscli hash "cos://${COS_BUCKET}/${COS_PATH}${BASENAME}.gpg" --type md5 2>/dev/null || echo "unknown")

  if [ "$LOCAL_MD5" = "$REMOTE_MD5" ]; then
    echo "✅ $BASENAME — MD5 校验通过"
    rm -f "$ENCRYPTED"
  else
    echo "❌ $BASENAME — MD5 校验失败! 本地=$LOCAL_MD5, 远程=$REMOTE_MD5"
  fi
done

echo "[$(date)] 异地备份同步完成"
```

## 三、Redis 备份策略

```bash
#!/bin/bash
# docker/backup-redis.sh — Redis 备份
set -e

BACKUP_DIR="/opt/guoxue/docker/backups/redis"
CONTAINER_NAME="${CONTAINER_NAME:-guoxue-redis}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M)
BACKUP_FILE="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"

# 触发 BGSAVE
docker exec "$CONTAINER_NAME" redis-cli BGSAVE

# 等待 BGSAVE 完成
for i in $(seq 1 30); do
  STATUS=$(docker exec "$CONTAINER_NAME" redis-cli LASTSAVE 2>/dev/null)
  if [ "$STATUS" != "$LAST_SAVE" ]; then
    break
  fi
  sleep 1
done

# 复制 RDB 文件
docker cp "$CONTAINER_NAME:/data/dump.rdb" "$BACKUP_FILE"

# 同时复制 AOF 文件
docker cp "$CONTAINER_NAME:/data/appendonly.aof" "${BACKUP_FILE%.rdb}.aof" 2>/dev/null || true

echo "[$(date)] Redis 备份完成: $BACKUP_FILE"

# 保留最近 7 天
find "$BACKUP_DIR" -name "redis_*.rdb" -mtime +7 -delete
```

## 四、对象存储（COS）灾备

### 4.1 COS 跨地域复制

腾讯云 COS 控制台配置：

1. **存储桶复制**：`guoxue-prod`（广州）→ `guoxue-prod-dr`（上海）
2. **复制规则**：所有对象（包含历史数据）
3. **存储类型**：目标桶使用低频存储（降低成本）

### 4.2 关键静态资源清单

| 资源类型         | 存储位置                   | 备份策略              |
| ---------------- | -------------------------- | --------------------- |
| 用户上传图片     | COS `guoxue-prod/images/`  | 跨地域复制 + 版本控制 |
| 视频文件         | COS `guoxue-prod/videos/`  | 跨地域复制            |
| 电子书 PDF       | COS `guoxue-prod/ebooks/`  | 跨地域复制 + 版本控制 |
| 系统导出的 Excel | COS `guoxue-prod/exports/` | 7 天生命周期自动过期  |
| 备份文件         | COS `guoxue-backup/`       | 跨地域复制            |

## 五、灾难恢复流程

### 5.1 恢复决策树

```
故障发生
    │
    ├─ 数据库损坏/误删
    │   ├─ 单个表 → pg_restore 从最近增量备份恢复单表
    │   └─ 整个库 → 停止服务 → 从全量备份恢复 → 应用 WAL 到目标时间
    │
    ├─ 服务器宕机
    │   ├─ 30 分钟内可恢复 → 迁移到备用服务器 + 恢复备份
    │   └─ 无法短期恢复 → 启用异地灾备 + DNS 切换
    │
    ├─ COS 存储故障
    │   └─ 切换到灾备地域 bucket + 更新 COS_CDN_BASE
    │
    └─ 应用级故障（代码 Bug）
        └─ 回滚到上一稳定版本（参见 docs/rollback-plan.md）
```

### 5.2 完整恢复 SOP

```bash
#!/bin/bash
# docker/disaster-recovery.sh — 完整灾难恢复操作手册（脚本化）
set -e

echo "============================================"
echo "  国学平台 — 灾难恢复操作手册"
echo "  请按步骤执行，每步确认后再继续"
echo "============================================"

# === 阶段 0: 确认故障范围 ===
echo ""
echo "阶段 0: 故障确认"
echo "---"
echo "1. 确认故障类型 (DB/COS/Server/Network)"
echo "2. 确认影响范围 (全部用户/部分功能)"
echo "3. 记录故障时间点 (用于 PITR)"
read -p "确认故障时间和范围? (y/n): " CONFIRM
[ "$CONFIRM" != "y" ] && exit 0

# === 阶段 1: 通知与告警 ===
echo ""
echo "阶段 1: 通知"
curl -X POST "${WEWORK_WEBHOOK_ALERT_URL}" \
  -H "Content-Type: application/json" \
  -d '{"msgtype":"text","text":{"content":"【紧急】国学平台启动灾难恢复流程，预计影响 30 分钟"}}' || true

# === 阶段 2: 准备恢复环境 ===
echo ""
echo "阶段 2: 准备恢复环境"
echo "2.1 列出可用的全量备份:"
ls -lht /opt/guoxue/docker/backups/ | head -10

echo ""
echo "2.2 可用的 COS 异地备份:"
# coscli ls cos://guoxue-backup/backups/ 2>/dev/null || echo "(coscli 不可用，请手动检查)"

read -p "输入要恢复的备份文件名: " BACKUP_FILE
if [ ! -f "/opt/guoxue/docker/backups/$BACKUP_FILE" ]; then
  echo "从 COS 下载备份..."
  # 需要对应的 .gpg 加密文件
  coscli cp "cos://guoxue-backup/backups/${BACKUP_FILE}.gpg" "/tmp/${BACKUP_FILE}.gpg"
  gpg --decrypt --batch --passphrase "${BACKUP_ENCRYPTION_KEY}" "/tmp/${BACKUP_FILE}.gpg" > "/opt/guoxue/docker/backups/$BACKUP_FILE"
  rm -f "/tmp/${BACKUP_FILE}.gpg"
fi

# === 阶段 3: 停止服务 ===
echo ""
echo "阶段 3: 停止服务"
docker compose -f /opt/guoxue/docker-compose.yml -f /opt/guoxue/docker-compose.prod.yml stop server
echo "应用已停止"

# === 阶段 4: 数据库恢复 ===
echo ""
echo "阶段 4: 数据库恢复"
read -p "⚠️  即将覆盖当前数据库，确认? (输入 'YES' 继续): " FINAL_CONFIRM

if [ "$FINAL_CONFIRM" = "YES" ]; then
  # 统一恢复入口会先校验 SHA-256 与 custom archive、要求精确库名确认，
  # 并在销毁目标库前生成现场快照。
  RESTORE_CONFIRM=guoxue \
    /opt/guoxue/docker/pg-restore.sh \
    "/opt/guoxue/docker/backups/$BACKUP_FILE"

  # 应用迁移（复用当前固定发布包与实际生产 server 镜像）
  export TARGET_DATABASE_URL="$DATABASE_URL"
  export TARGET_RELEASE_ID="$(cat /opt/guoxue/current/.release-id)"
  export PRISMA_COMPOSE_ENV_FILE=/opt/guoxue/shared/.env.production
  export MIGRATION_DEPLOY_CONFIRM="migrate:${TARGET_RELEASE_ID}"
  bash /opt/guoxue/current/scripts/migration/run-prisma-migrations.sh deploy
  bash /opt/guoxue/current/scripts/migration/verify-postgres.sh

  echo "数据库恢复完成"
else
  echo "已取消"
  exit 1
fi

# === 阶段 5: 启动服务 ===
echo ""
echo "阶段 5: 启动服务"
docker compose -f /opt/guoxue/docker-compose.yml -f /opt/guoxue/docker-compose.prod.yml up -d server

# === 阶段 6: 验证 ===
echo ""
echo "阶段 6: 恢复验证"
sleep 10
echo "6.1 健康检查..."
curl -sf http://localhost:3000/api/v1/health && echo "✅" || { echo "❌ 健康检查失败!"; exit 1; }

echo "6.2 小程序首页..."
curl -sf http://localhost:3000/api/v1/mini/home > /dev/null && echo "✅" || echo "❌"

echo "6.3 验证关键数据..."
docker exec guoxue-postgres psql -U guoxue -d guoxue -c "
  SELECT 'User' AS table_name, COUNT(*) AS rows FROM \"User\"
  UNION ALL SELECT 'Order', COUNT(*) FROM \"Order\"
  UNION ALL SELECT 'VirtualCoinAccount', COUNT(*) FROM \"VirtualCoinAccount\";
"

# === 阶段 7: 恢复通知 ===
echo ""
echo "阶段 7: 恢复完成通知"
curl -X POST "${WEWORK_WEBHOOK_ALERT_URL}" \
  -H "Content-Type: application/json" \
  -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"【恢复完成】国学平台已从 $BACKUP_FILE 恢复，服务正常\"}}" || true

echo ""
echo "============================================"
echo "  灾难恢复完成"
echo "  RTO: $(date)"
echo "============================================"
```

## 六、恢复演练计划

### 6.1 季度演练 SOP

```
演练频率: 每季度一次 (1月/4月/7月/10月 第一个周六 10:00)
演练时长: 2 小时
参与人员: 运维 + 1 名后端开发

流程:
09:50 — 演练前通知（企业微信）
10:00 — 模拟数据库故障（在 staging 环境执行）
10:05 — 启动灾难恢复脚本
10:25 — 恢复完成，执行验证
10:30 — 全体参与人员验证功能
10:45 — 记录发现的问题和改进点
11:00 — 恢复演练复盘会议
11:30 — 更新灾备文档（如需要）
12:00 — 演练结束通知
```

### 6.2 演练检查清单

- [ ] 备份文件在预期路径且未损坏
- [ ] `coscli` 可正常访问异地备份
- [ ] 加密备份可正常解密
- [ ] 恢复脚本各步骤均执行成功
- [ ] 服务恢复后可正常处理请求
- [ ] 数据库关键表行数符合预期
- [ ] 恢复总时长 < RTO 目标 (30 分钟)
- [ ] 记录实际 RTO: **\_\_\_**

## 七、灾备监控与告警

### 7.1 备份健康检查

```bash
#!/bin/bash
# docker/check-backup-health.sh — 备份健康检查（建议 crontab 每小时执行）

BACKUP_DIR="/opt/guoxue/docker/backups"
LATEST=$(find "$BACKUP_DIR" -name "guoxue_*.dump" -mmin -1440 -print0 \
  | xargs -0 -r ls -1t | head -1)

if [ -z "$LATEST" ]; then
  # 最近 24 小时无备份 → 告警
  curl -X POST "${WEWORK_WEBHOOK_ALERT_URL}" \
    -H "Content-Type: application/json" \
    -d '{"msgtype":"text","text":{"content":"【告警】国学平台数据库备份超过24小时未执行！"}}'
  exit 1
fi

# 检查备份文件大小（至少 1KB）
SIZE=$(stat -c%s "$LATEST")
if [ "$SIZE" -lt 1024 ]; then
  curl -X POST "${WEWORK_WEBHOOK_ALERT_URL}" \
    -H "Content-Type: application/json" \
    -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"【告警】国学平台备份文件异常小: $LATEST ($SIZE bytes)\"}}"
  exit 1
fi

(
  cd "$(dirname "$LATEST")"
  sha256sum --check "$(basename "${LATEST}.sha256")"
)
docker exec -i guoxue-postgres pg_restore --list <"$LATEST" >/dev/null

echo "✅ 备份健康: $LATEST ($SIZE bytes)"
```

### 7.2 告警规则汇总

| 告警项              | 条件                     | 级别   | 通知方式        |
| ------------------- | ------------------------ | ------ | --------------- |
| 备份超过 24h 未执行 | 最新备份文件 mtime > 24h | **P0** | 企业微信 + 电话 |
| 备份文件异常小      | 文件 < 1KB               | **P0** | 企业微信        |
| 异地同步失败        | coscli 返回非 0          | **P1** | 企业微信        |
| Redis RDB 损坏      | redis-check-rdb 失败     | **P1** | 企业微信        |
| 磁盘使用 > 80%      | df -h                    | **P1** | 企业微信        |

## 八、备份加密策略

所有备份文件在写入 COS 前使用 GPG 对称加密：

```bash
# 首次配置（生成加密密钥）
BACKUP_ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "BACKUP_ENCRYPTION_KEY=$BACKUP_ENCRYPTION_KEY" >> /opt/guoxue/.env.production

# 密钥必须离线保存：
# 1. 写在纸上锁入保险柜
# 2. 保存到 1Password/LastPass
# 3. 打印交给 CTO/技术负责人
```
