# 热卜国学平台 — 快速回滚预案

> 更新时间：2026-07-31
>
> 本文的生产标准入口是固定发布包回滚脚本。旧的镜像手工替换示例仅用于理解历史方案，不得用于当前生产。

## 一、回滚决策树

```
生产告警 / 部署后发现异常
         │
         ▼
  ┌─ 问题是否在部署后 30 分钟内出现？
  │    │
  │    ├─ 是 → 立即回滚（跳过详细诊断）
  │    │
  │    └─ 否 → 评估影响范围
  │              │
  │         ┌────┴────┐
  │      P0/P1      P2/P3
  │      (核心损毁)  (局部影响)
  │         │           │
  │      立即回滚    修复前进
  │         │      (hotfix 或下个版本)
  │         ▼
  │   执行回滚流程
  │
  └──────────────────────
```

### 部署失败保护条件

生产发布在以下情况会终止，且不会切换 `current`：

1. 固定发布包或逐文件清单验真失败。
2. `prisma migrate deploy` 执行失败。
3. 容器启动或健康检查失败。

生产环境不自动猜测回滚目标。值班人员必须选择一个有成功历史且保留包完整的目标版本，并执行同值确认。

### 手动回滚触发条件

运维人员应在以下情况手动执行回滚：

| 级别   | 现象                                 | 响应时间             |
| ------ | ------------------------------------ | -------------------- |
| **P0** | 用户无法登录、支付回调丢失、首页 5xx | **立即回滚**         |
| **P1** | 某个模块不可用（IM消息发送失败等）   | 15 分钟内决策        |
| **P2** | 非核心功能异常、性能轻微下降         | 评估后决定修复或回滚 |

---

## 二、回滚操作流程

### 2.1 应用版本回滚（当前标准流程）

```bash
TARGET_RELEASE_ID='release-20260731-001'
DEPLOY_TARGET='tencent' # 自建 PostgreSQL/Redis 时改为 standard；必须与初始化一致
sudo ROOT_DIR=/opt/guoxue \
  DEPLOY_TARGET="$DEPLOY_TARGET" \
  ENV_FILE=/opt/guoxue/shared/.env.production \
  bash /opt/guoxue/current/scripts/release/rollback-fixed-release.sh \
  "$TARGET_RELEASE_ID" "$TARGET_RELEASE_ID"
```

回滚脚本会复核保留固定包、已部署目录、成功发布历史、当前软链接和数据库迁移边界，并以
`--skip-migrate` 健康部署目标版本；成功后才原子切换唯一权威 `current`，兼容指针 `current-release-id` 始终跟随 `current/.release-id`。不得手工改软链接、从 Git 重建旧包，
也不得用目标目录内未经验证的脚本自证完整性。

健康部署必须同时满足存活接口返回 `alive` 和运行实例 `releaseId` 等于目标发布标识。旧容器仍可响应但版本不符时不得切换 `current`，应由部署脚本超时后恢复原镜像并保留现场证据。

目标版本早于最近数据库迁移时，必须先完成架构兼容评审；确认兼容后才允许设置
`ALLOW_SCHEMA_COMPATIBLE_ROLLBACK=reviewed`。发布历史、保留包或验真证据缺失时不得绕过。

### 2.2 数据库回滚

```bash
#!/bin/bash
# 数据库回滚 — 从备份恢复
set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "用法: $0 <backup-file>"
  echo "可用的备份文件:"
  ls -lht /opt/guoxue/docker/backups/ | head -10
  exit 1
fi

echo "⚠️  即将从备份恢复本机容器数据库: $BACKUP_FILE"
echo "⚠️  此操作会覆盖当前数据库所有数据；脚本将先验证校验和与归档并保存现场快照。"
echo "托管/独立数据库必须改用 scripts/migration/restore-postgres.sh。"

# Step 1: 停止应用（避免写入冲突）
echo "[restore] 暂停应用服务..."
docker compose -f /opt/guoxue/docker-compose.yml -f /opt/guoxue/docker-compose.prod.yml \
  stop server

# Step 2: 通过统一安全入口恢复
echo "[restore] 校验并恢复数据..."
RESTORE_CONFIRM=guoxue /opt/guoxue/docker/pg-restore.sh "$BACKUP_FILE"

# Step 3: 通过当前固定发布包和实际生产镜像重新执行迁移
echo "[restore] 执行迁移..."
export TARGET_DATABASE_URL="$DATABASE_URL"
export TARGET_RELEASE_ID="$(cat /opt/guoxue/current/.release-id)"
export PRISMA_COMPOSE_ENV_FILE=/opt/guoxue/shared/.env.production
export MIGRATION_DEPLOY_CONFIRM="migrate:${TARGET_RELEASE_ID}"
bash /opt/guoxue/current/scripts/migration/run-prisma-migrations.sh deploy
bash /opt/guoxue/current/scripts/migration/verify-postgres.sh

# Step 4: 重启应用
echo "[restore] 重启应用..."
docker compose -f /opt/guoxue/docker-compose.yml -f /opt/guoxue/docker-compose.prod.yml \
  up -d server

# Step 5: 验证
echo "[restore] 验证健康检查..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/api/v1/health; then
    echo "[restore] ✅ 数据库恢复成功"
    exit 0
  fi
  sleep 3
done
echo "[restore] ❌ 恢复后健康检查失败!"
exit 1
```

### 2.3 Prisma 迁移回滚

**警告：Prisma 不支持自动回滚迁移。** 如需回滚 schema 变更，有两种方式：

#### 方式 A：创建补偿迁移（推荐）

```bash
# 1. 创建一个新的迁移来撤销之前的变更
# 例如：之前的迁移添加了字段，现在创建一个删除该字段的迁移

# 2. 手动编辑 schema.prisma，移除变更
# 3. 生成补偿迁移
npx prisma migrate dev --name rollback_xxx --create-only

# 4. 部署补偿迁移
npx prisma migrate deploy
```

#### 方式 B：数据库时间点恢复（PITR）

如果使用云数据库（如腾讯云 PostgreSQL），利用时间点恢复功能：

1. 在云控制台选择恢复到部署前的时间点
2. 获取新的数据库连接地址
3. 更新 `.env` 中的 `DATABASE_URL`
4. 重启应用

---

## 三、回滚验证清单

回滚完成后，必须验证以下项目：

### 3.1 基础验证

- [ ] `GET /api/v1/health` 返回 200
- [ ] `GET /api/v1/system/health` 全部 `ok`
- [ ] Docker 容器状态 `healthy`
- [ ] 服务日志无 FATAL/ERROR

### 3.2 业务验证（冒烟测试）

- [ ] 小程序首页加载正常
- [ ] 用户可正常登录
- [ ] 八字排盘计算结果正确
- [ ] 支付流程可走通（沙箱或 1 分钱测试）
- [ ] 内容列表/详情正常
- [ ] 文件上传正常

### 3.3 数据一致性验证

- [ ] 回滚后的数据与备份一致
- [ ] 回滚期间（约 10 分钟）的数据丢失可接受
- [ ] 支付订单状态已手动核对（如有回滚期间的支付）

---

## 四、回滚通知模板

回滚操作完成后，通过企业微信群发送通知：

```
【国学平台回滚通知】
时间: 2026-05-11 14:30
操作人: 张三
回滚前版本: v1.5.0
回滚至版本: v1.4.3
原因: 支付回调处理异常导致订单状态不同步
影响范围: 约 5 分钟内创建了 12 笔待支付订单（已手动同步状态）
验证结果: ✅ 全部验证通过
后续: 修复后将以 v1.5.1 重新发布
```

---

## 五、预防措施

### 5.1 金丝雀发布（灰度）

高风险变更建议先灰度发布：

```bash
# 启动新版本实例（不同端口）
docker run -d --name guoxue-server-canary \
  --network guoxue-net \
  -p 3001:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=... \
  ghcr.io/repo/guoxue-platform:canary

# Nginx 配置 10% 流量到金丝雀
# upstream guoxue {
#     server 127.0.0.1:3000 weight=9;
#     server 127.0.0.1:3001 weight=1;
# }

# 观察 15 分钟后无异常，全量切换
```

### 5.2 变更分级

| 变更类型                  | 回滚策略                       | 灰度要求     |
| ------------------------- | ------------------------------ | ------------ |
| 新增页面/API              | 代码回滚即可                   | 不需要       |
| 数据库新增字段/表         | 代码回滚（新字段不影响旧代码） | 不需要       |
| 数据库修改字段类型/删字段 | 数据库回滚或补偿迁移           | **需要灰度** |
| 支付/财务相关             | 沙箱充分验证                   | **需要灰度** |
| 权限/认证修改             | 代码回滚                       | **需要灰度** |
| 第三方 SDK 升级           | 代码回滚                       | 不需要       |

### 5.3 数据库变更安全原则

1. **扩展优先**：先 ADD COLUMN（可空），后 NOT NULL + DEFAULT
2. **不删字段**：废弃字段先标记 @deprecated，下个版本再清理
3. **不重命名**：重命名 = DROP + ADD，数据会丢失
4. **大表离线操作**：>100万行的表，用批处理而非直接 ALTER
