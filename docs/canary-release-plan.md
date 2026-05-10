# 热卜国学平台 — 灰度发布与回滚方案

> 更新时间：2026-05-11 | 补充 `docs/rollback-plan.md` 的灰度发布细节

## 一、灰度发布架构

```
                     Nginx / Caddy (反向代理)
                            │
              ┌─────────────┴─────────────┐
              │  灰度路由 (map + split)    │
              │  $canary_header / $user_id │
              └─────────────┬─────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
    ┌─────▼─────┐    ┌──────▼──────┐    ┌─────▼─────┐
    │ 稳定版本    │    │  金丝雀版本  │    │  静态资源  │
    │ :3000      │    │  :3001      │    │  CDN      │
    │ v1.4.3     │    │  v1.5.0-rc  │    │           │
    │ 95% 流量   │    │  5% 流量    │    │           │
    └───────────┘    └─────────────┘    └───────────┘
```

## 二、用户白名单灰度策略

### 2.1 白名单配置（FeatureFlag 模型驱动）

通过已有的 `FeatureFlag` 表管理灰度范围：

| 灰度阶段 | percentage | targetUserIds | 持续观察 |
|---------|-----------|---------------|---------|
| **阶段 0**: 内部测试 | 0 | 开发/运营团队 ID 列表 | 1h |
| **阶段 1**: 白名单用户 | 0 | 种子用户 100 人 | 4h |
| **阶段 2**: 1% 流量 | 1 | [] | 6h |
| **阶段 3**: 10% 流量 | 10 | [] | 12h |
| **阶段 4**: 50% 流量 | 50 | [] | 12h |
| **阶段 5**: 全量 | 100 | [] | — |

### 2.2 灰度判断中间件

```typescript
// apps/server/src/common/canary.guard.ts
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

@Injectable()
export class CanaryGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    // 方式 1: 请求头灰度 — Nginx 根据 userId 哈希分流
    const canaryHeader = request.headers["x-canary"];
    if (canaryHeader === "true") return true;

    // 方式 2: FeatureFlag 驱动 — 应用层灰度
    if (userId) {
      const featureFlag = await this.redis.getOrSet(
        "feature_flag:canary",
        async () => {
          return this.prisma.featureFlag.findUnique({ where: { key: "canary_release" } });
        },
        60
      );

      if (!featureFlag || !featureFlag.enabled) return false;

      // 白名单优先
      if (featureFlag.targetUserIds.includes(userId)) return true;

      // 百分比灰度（基于 userId hash 确定性分流）
      const hash = this.hashUserId(userId);
      return hash % 100 < featureFlag.percentage;
    }

    return false;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
```

### 2.3 Nginx 灰度路由配置

```nginx
# /etc/nginx/sites-available/guoxue-api
upstream guoxue_stable {
    server 127.0.0.1:3000 weight=95;
}

upstream guoxue_canary {
    server 127.0.0.1:3001 weight=5;
}

# 基于 userId 的 Hash 路由（确定性分流，同一用户始终落在同一版本）
map $http_x_user_id $canary_backend {
    default "guoxue_stable";
}

# 根据 userId 哈希值决定分流
# 取 userId 首字符 ASCII 码 mod 100，<5 则走金丝雀
split_clients "${http_x_user_id}" $canary_version {
    5%   guoxue_canary;
    *    guoxue_stable;
}

server {
    listen 443 ssl http2;
    server_name api.guoxue.ac.cn;

    # 内部白名单 Cookie（运营人员手动测试金丝雀）
    set $backend "guoxue_stable";
    if ($cookie_canary = "opt-in") {
        set $backend "guoxue_canary";
    }

    # 金丝雀 Header（开发/测试专用）
    if ($http_x_canary = "true") {
        set $backend "guoxue_canary";
    }

    location /api/ {
        proxy_pass http://$backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Canary-Backend $backend;
        proxy_set_header X-User-Id $http_x_user_id;
    }
}
```

## 三、金丝雀观测面板

### 3.1 关键对比指标

| 指标 | 稳定版本 (95%) | 金丝雀版本 (5%) | 告警阈值 |
|------|-------------|-------------|---------|
| HTTP 5xx 错误率 | baseline | canary | canary > baseline × 2 |
| P95 延迟 | baseline | canary | canary > baseline × 1.5 |
| 支付成功率 | baseline | canary | canary < baseline × 0.95 |
| 登录成功率 | baseline | canary | canary < baseline × 0.99 |
| Crash 率 | baseline | canary | canary > 0 |

### 3.2 Prometheus 指标

```typescript
// 在 NestJS 中上报金丝雀标识
import { Counter, Histogram } from "prom-client";

const httpRequests = new Counter({
  name: "http_requests_total",
  help: "HTTP 请求总数",
  labelNames: ["method", "route", "status", "canary"],
});

// 使用示例（在 interceptor 中）
httpRequests.inc({
  method: request.method,
  route: request.route?.path || "unknown",
  status: response.statusCode,
  canary: process.env.CANARY_VERSION || "stable",
});
```

### 3.3 Grafana 查询

```promql
# 金丝雀 vs 稳定版 错误率对比
sum(rate(http_requests_total{canary="canary",status=~"5.."}[5m])) 
/ 
sum(rate(http_requests_total{canary="canary"}[5m]))

# 金丝雀 vs 稳定版 P95 延迟对比
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, canary)
)
```

## 四、一键回滚脚本

```bash
#!/bin/bash
# scripts/canary-rollback.sh — 金丝雀一键回滚

set -e

STABLE_PORT=3000
CANARY_PORT=3001

echo "=== 金丝雀回滚 ==="
echo "当前金丝雀容器:"
docker ps --filter "name=guoxue-server-canary" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

# Step 1: 立即将 Nginx 切回稳定版
if [ -f /etc/nginx/sites-enabled/guoxue-api ]; then
  echo "[rollback] 将流量切回稳定版..."
  # 将金丝雀 upstream 权重设为 0
  sudo sed -i 's/server 127.0.0.1:3001 weight=.*;/server 127.0.0.1:3001 weight=0;/' /etc/nginx/sites-enabled/guoxue-api
  sudo nginx -s reload
  echo "[rollback] Nginx 已切回稳定版"
fi

# Step 2: 停止金丝雀容器
if docker ps -q --filter "name=guoxue-server-canary" | grep -q .; then
  echo "[rollback] 停止金丝雀容器..."
  docker stop guoxue-server-canary
  docker rm guoxue-server-canary
  echo "[rollback] 金丝雀容器已停止"
fi

# Step 3: 关闭灰度 FeatureFlag
# (通过 API 调用)
echo "[rollback] 关闭灰度开关..."
curl -s -X PUT "http://localhost:3000/api/v1/admin/feature-flags/canary_release" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false, "percentage": 0, "targetUserIds": []}'

# Step 4: 健康检查
echo "[rollback] 验证稳定版健康..."
for i in $(seq 1 10); do
  if curl -sf http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo "[rollback] ✅ 稳定版健康检查通过"
    exit 0
  fi
  sleep 2
done

echo "[rollback] ❌ 稳定版健康检查失败，请立即人工介入!"
exit 1
```

## 五、灰度发布 SOP

### 5.1 灰度前准备

- [ ] 新版本镜像已推送到 GHCR
- [ ] `canary_release` FeatureFlag 已创建（enabled=false, percentage=0）
- [ ] 金丝雀容器环境变量已配置（`.env.staging`）
- [ ] Grafana 金丝雀对比面板已就绪
- [ ] 回滚脚本已验证可执行
- [ ] 告警规则已配置（金丝雀错误率阈值）

### 5.2 灰度执行

```bash
# Step 1: 启动金丝雀实例
docker run -d \
  --name guoxue-server-canary \
  --restart unless-stopped \
  --network guoxue-net \
  -p 3001:3000 \
  --env-file /opt/guoxue/.env.production \
  -e CANARY_VERSION=true \
  ghcr.io/repo/guoxue-platform:v1.5.0-rc

# Step 2: 等待金丝雀就绪
for i in $(seq 1 15); do
  if curl -sf http://localhost:3001/api/v1/health; then
    echo "金丝雀已就绪"
    break
  fi
  sleep 2
done

# Step 3: 开启内部白名单测试
curl -X PUT "http://localhost:3000/api/v1/admin/feature-flags/canary_release" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "percentage": 0, "targetUserIds": ["admin-001","admin-002"]}'

echo "请在 1 小时内完成内部测试，确认无异常后进入下一阶段"

# Step 4: 逐步放量（每个阶段观察后执行）
# 1% → 10% → 50% → 100%
for pct in 1 10 50 100; do
  echo "放量至 ${pct}%，回车继续..."
  read
  curl -X PUT "http://localhost:3000/api/v1/admin/feature-flags/canary_release" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"enabled\": true, \"percentage\": $pct, \"targetUserIds\": []}"
done
```

### 5.3 灰度期间规则

1. **禁止数据库迁移**：灰度期间不做破坏性 schema 变更
2. **向后兼容**：新版本 API 必须兼容旧版本客户端
3. **15 分钟观察**：每次放量后至少观察 15 分钟
4. **随时可回滚**：任何指标异常立即执行回滚脚本

## 六、金丝雀发布检查清单

```
阶段 0 — 内部测试 (0%)
├── ✅ 金丝雀容器启动成功
├── ✅ 健康检查通过
├── ✅ 管理后台各项功能正常
├── ✅ 日志无 ERROR/FATAL
└── ✅ 内存/CPU 使用正常

阶段 1 — 白名单 (种子用户)
├── ✅ 小程序首页加载正常
├── ✅ 八字排盘计算结果一致
├── ✅ 微信登录/支付可用
├── ✅ 用户反馈无异常

阶段 2 — 1% 流量
├── ✅ 错误率不高于稳定版
├── ✅ P95 延迟不高于稳定版 × 1.2
├── ✅ 数据库连接池正常

阶段 3 — 10% 流量
├── ✅ 支付回调成功率 ≥ 95%
├── ✅ 企业微信无告警

阶段 4 — 50% 流量
├── ✅ 各项指标与稳定版无显著差异
├── ✅ 无用户投诉增加

阶段 5 — 100% 全量
├── ✅ 平滑切换，无 5xx 峰值
├── ✅ 旧容器停止 → 清理
└── ✅ 关闭灰度开关
```
