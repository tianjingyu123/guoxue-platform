# 热卜国学平台 — 快速回滚预案

> 更新时间：2026-05-11

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

### 自动回滚触发条件

CI/CD 部署流水线在以下情况**自动触发回滚**：

1. 健康检查 90 秒内未通过（`deploy.yml` 内建）
2. `prisma migrate deploy` 执行失败
3. 容器启动失败 (CrashLoopBackOff)

### 手动回滚触发条件

运维人员应在以下情况手动执行回滚：

| 级别 | 现象 | 响应时间 |
|------|------|---------|
| **P0** | 用户无法登录、支付回调丢失、首页 5xx | **立即回滚** |
| **P1** | 某个模块不可用（IM消息发送失败等） | 15 分钟内决策 |
| **P2** | 非核心功能异常、性能轻微下降 | 评估后决定修复或回滚 |

---

## 二、回滚操作流程

### 2.1 代码回滚（Docker 镜像回滚）

```bash
#!/bin/bash
# 紧急回滚脚本 — 回滚到上一个稳定版本
set -e

# 配置
CONTAINER="guoxue-server"
ROLLBACK_TAG="${1}"  # 回滚目标版本 Tag 或 Commit SHA

if [ -z "$ROLLBACK_TAG" ]; then
  echo "用法: $0 <target-tag>"
  echo "示例: $0 v1.2.3"
  echo ""
  echo "最近的镜像版本:"
  docker images ghcr.io/*/guoxue-platform --format "{{.Tag}} {{.CreatedAt}}" | head -10
  exit 1
fi

REGISTRY="ghcr.io"
REPO="guoxue-platform"  # 替换为实际仓库名

echo "⚠️  即将回滚到版本: $ROLLBACK_TAG"
echo "按 Ctrl+C 取消，或等待 5 秒继续..."
sleep 5

# Step 1: 拉取目标版本镜像
echo "[rollback] 拉取镜像 $REGISTRY/$REPO:$ROLLBACK_TAG..."
docker pull "$REGISTRY/$REPO:$ROLLBACK_TAG"

# Step 2: 更新容器
echo "[rollback] 更新容器..."
cd /opt/guoxue
TAG=$ROLLBACK_TAG docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml \
  up -d --no-deps server

# Step 3: 等待健康检查
echo "[rollback] 等待健康检查..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/api/v1/health; then
    echo "[rollback] ✅ 回滚成功! 当前版本: $ROLLBACK_TAG"
    exit 0
  fi
  sleep 3
done

echo "[rollback] ❌ 回滚后健康检查仍失败，请介入排查!"
exit 1
```

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

echo "⚠️  即将从备份恢复数据库: $BACKUP_FILE"
echo "⚠️  此操作会覆盖当前数据库所有数据!"
echo "按 Ctrl+C 取消，或等待 10 秒继续..."
sleep 10

# Step 1: 停止应用（避免写入冲突）
echo "[restore] 暂停应用服务..."
docker compose -f /opt/guoxue/docker-compose.yml -f /opt/guoxue/docker-compose.prod.yml \
  stop server

# Step 2: 删除当前数据库并重建
echo "[restore] 重建数据库..."
docker exec guoxue-postgres psql -U guoxue -d postgres -c "DROP DATABASE IF EXISTS guoxue;"
docker exec guoxue-postgres psql -U guoxue -d postgres -c "CREATE DATABASE guoxue OWNER guoxue;"

# Step 3: 恢复备份
echo "[restore] 恢复数据..."
gunzip -c "$BACKUP_FILE" | docker exec -i guoxue-postgres psql -U guoxue -d guoxue

# Step 4: 重新执行当前代码级别的迁移
echo "[restore] 执行迁移..."
docker compose -f /opt/guoxue/docker-compose.yml -f /opt/guoxue/docker-compose.prod.yml \
  run --rm server \
  npx prisma migrate deploy --schema=apps/server/prisma/schema.prisma

# Step 5: 重启应用
echo "[restore] 重启应用..."
docker compose -f /opt/guoxue/docker-compose.yml -f /opt/guoxue/docker-compose.prod.yml \
  up -d server

# Step 6: 验证
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

| 变更类型 | 回滚策略 | 灰度要求 |
|---------|---------|---------|
| 新增页面/API | 代码回滚即可 | 不需要 |
| 数据库新增字段/表 | 代码回滚（新字段不影响旧代码） | 不需要 |
| 数据库修改字段类型/删字段 | 数据库回滚或补偿迁移 | **需要灰度** |
| 支付/财务相关 | 沙箱充分验证 | **需要灰度** |
| 权限/认证修改 | 代码回滚 | **需要灰度** |
| 第三方 SDK 升级 | 代码回滚 | 不需要 |

### 5.3 数据库变更安全原则

1. **扩展优先**：先 ADD COLUMN（可空），后 NOT NULL + DEFAULT
2. **不删字段**：废弃字段先标记 @deprecated，下个版本再清理
3. **不重命名**：重命名 = DROP + ADD，数据会丢失
4. **大表离线操作**：>100万行的表，用批处理而非直接 ALTER
