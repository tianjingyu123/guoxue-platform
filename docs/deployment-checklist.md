# 热卜国学平台 — 线上部署检查清单

> 更新时间：2026-05-11

## 一、部署前检查 (Pre-Deploy)

### 1.1 代码质量

- [ ] CI 流水线全部通过（lint / typecheck / test / build / e2e）
- [ ] Code Review 已完成，至少 1 人 Approve
- [ ] PR 已合并到 `main` 分支
- [ ] 已打版本 Tag（格式 `vX.Y.Z`）或使用 main 分支最新 commit

### 1.2 数据库变更

- [ ] 检查 `prisma/migrations/` 目录，确认本次包含的迁移文件
- [ ] 迁移文件已通过 CI `prisma migrate deploy` 验证（CI test-server/e2e 步骤会执行）
- [ ] 确认迁移无破坏性操作（DROP TABLE、DROP COLUMN、修改字段类型）
- [ ] 如有大表 DDL（>10万行），已评估锁表时间并安排在低峰期
- [ ] 如有数据回填脚本，已准备并在预发布验证

### 1.3 依赖与配置

- [ ] 新增的 npm 依赖已通过安全审计 (`pnpm audit --prod`)
- [ ] `.env.example` 已更新新增的环境变量
- [ ] 生产环境变量已在服务器 `.env` 文件中配置
- [ ] GitHub Secrets 中的敏感配置已更新（如有新增）

### 1.4 回滚准备

- [ ] 已确认上一个稳定版本的 Docker 镜像 Tag
- [ ] 数据库备份脚本可正常执行
- [ ] 回滚方案已确认（参考 `docs/rollback-plan.md`）

---

## 二、部署中检查 (During Deploy)

### 2.1 自动部署（GitHub Actions `deploy.yml`）

- [ ] Build & Push 镜像成功
- [ ] 数据库自动备份完成（生产环境自动执行）
- [ ] `prisma migrate deploy` 执行成功
- [ ] 容器启动成功，无 CrashLoop

### 2.2 手动部署

```bash
# 1. 拉取最新代码
cd /opt/guoxue && git pull origin main

# 2. 数据库备份（生产强制）
./docker/pg-backup.sh 30

# 3. 拉取/构建镜像
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml build server

# 4. 执行迁移
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml \
  run --rm server \
  npx prisma migrate deploy --schema=apps/server/prisma/schema.prisma

# 5. 启动/更新服务
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d server
```

### 2.3 实时监控

```bash
# 查看容器状态
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml ps

# 查看启动日志
docker logs -f guoxue-server --tail 50

# 持续监控内存/CPU
docker stats guoxue-server
```

---

## 三、部署后验证 (Post-Deploy)

### 3.1 健康检查

- [ ] `GET /api/v1/health` 返回 200
- [ ] `GET /api/v1/system/health` 返回数据库/Redis/磁盘状态均为 `ok`
- [ ] Docker healthcheck 状态为 `healthy`
- [ ] 服务启动时间 < 60s（entrypoint 含数据库等待）

```bash
# 健康检查命令
curl -s http://localhost:3000/api/v1/health | jq .

# 容器健康状态
docker inspect guoxue-server --format '{{.State.Health.Status}}'
```

### 3.2 服务连通性

- [ ] 后端 → 数据库：正常读写
- [ ] 后端 → Redis：缓存读写正常
- [ ] 后端 → 腾讯云 COS：上传/下载正常
- [ ] 后端 → 微信支付：证书加载正常
- [ ] 后端 → 企业微信：告警 Webhook 可送达

```bash
# 连通性快速检查
curl -s http://localhost:3000/api/v1/system/health | jq '.data'
# 预期返回: { "db": "ok", "redis": "ok", "disk": "ok" }
```

### 3.3 核心业务流程冒烟测试

- [ ] 用户注册/登录（微信登录 + 手机号登录）
- [ ] 小程序首页加载（`GET /api/v1/mini/home`）
- [ ] 内容列表/详情正常展示
- [ ] 八字排盘计算正常（`POST /api/v1/paipan/bazi/preview`）
- [ ] 支付下单流程（微信支付/支付宝，测试环境用沙箱）
- [ ] 文件上传（图片 → COS 正常返回 URL）
- [ ] IM UserSig 生成正常
- [ ] AI 翻译/OCR 等云服务调用正常

### 3.4 性能基线

- [ ] 首页聚合接口响应 < 200ms
- [ ] 八字排盘计算 < 2s
- [ ] 数据库查询无慢查询告警 (>500ms)
- [ ] Redis 命中率 > 90%
- [ ] 容器内存使用 < 400MB（512MB 限制内）
- [ ] CPU 使用率 < 50%（空闲时）

```bash
# 快速性能检查
curl -w "\n耗时: %{time_total}s\n" -s -o /dev/null http://localhost:3000/api/v1/mini/home
```

### 3.5 日志检查

- [ ] 无 `ERROR` 级别日志（启动后 5 分钟内）
- [ ] 无 `FATAL` 或 `unhandledRejection`
- [ ] 第三方 API 调用正常（无超时/限频错误）

```bash
docker logs guoxue-server --since 5m | grep -i error
```

### 3.6 监控告警确认

- [ ] Prometheus 指标正常暴露 (`/metrics`)
- [ ] Grafana 面板数据正常
- [ ] 企业微信告警通道无异常触发

---

## 四、发布后观察

### 4.1 黄金 30 分钟

部署后 30 分钟内密切关注：

- [ ] 用户活跃度无异常下降
- [ ] 错误率无突增（对比发布前基线）
- [ ] 支付回调成功率无下降
- [ ] 数据库连接数无异常飙升
- [ ] Redis 内存使用无异常增长

### 4.2 24 小时观测

- [ ] 无 P0/P1 级别告警
- [ ] 小程序审核通过（如有前端更新）
- [ ] 用户反馈无新增 Bug 报告
- [ ] 定时任务执行正常（收入统计/推荐计算/数据同步）

---

## 五、数据库迁移特别检查

### 5.1 迁移前

```bash
# 查看待执行的迁移
npx prisma migrate status --schema=apps/server/prisma/schema.prisma

# 预览迁移 SQL（不实际执行）
npx prisma migrate deploy --schema=apps/server/prisma/schema.prisma --dry-run
```

### 5.2 迁移后

```bash
# 确认迁移已应用
npx prisma migrate status --schema=apps/server/prisma/schema.prisma
# 预期: "Database is up to date"

# 检查新增表/字段
docker exec guoxue-postgres psql -U guoxue -d guoxue -c "\dt"
```

---

## 六、缓存预热

部署重启后 Redis 缓存清空，需预热：

```bash
# 预热首页聚合缓存
curl -s http://localhost:3000/api/v1/mini/home > /dev/null

# 预热热门搜索
curl -s "http://localhost:3000/api/v1/search/hot" > /dev/null

# 预热系统配置
curl -s http://localhost:3000/api/v1/system/configs -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null

# 预热推荐缓存（主要场景）
for scene in "home" "course_detail" "payment_success" "search_empty"; do
  curl -s "http://localhost:3000/api/v1/recommend/$scene" > /dev/null
done
```

---

## 七、检查清单快速执行脚本

```bash
#!/bin/bash
# scripts/deploy-verify.sh — 部署后一键验证

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local expect="${3:-200}"
  local code
  
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$code" = "$expect" ]; then
    echo "✅ $name"
    PASS=$((PASS + 1))
  else
    echo "❌ $name (期望 $expect, 实际 $code)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== 部署验证: $BASE_URL ==="

check "健康检查"       "$BASE_URL/api/v1/health"
check "系统健康"       "$BASE_URL/api/v1/system/health"
check "小程序首页"     "$BASE_URL/api/v1/mini/home"
check "内容列表"       "$BASE_URL/api/v1/contents"
check "八字排盘预览"   "$BASE_URL/api/v1/paipan/bazi/preview" 201
check "热门推荐"       "$BASE_URL/api/v1/recommend/trending"
check "热门搜索"       "$BASE_URL/api/v1/search/hot"
check "商品列表"       "$BASE_URL/api/v1/shop/products"

echo "=== 总计: $((PASS + FAIL)) 项, 通过 $PASS, 失败 $FAIL ==="
[ $FAIL -eq 0 ] || exit 1
```
