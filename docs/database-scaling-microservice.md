# 热卜国学平台 — 数据库扩展与微服务蓝图

> 更新时间：2026-05-11 | 适用阶段：DAU > 10万 / 数据量 > 100GB

## 一、当前状态评估

### 1.1 当前架构

```
                    ┌─────────────────┐
                    │  NestJS Monolith │
                    │  (apps/server)   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  PostgreSQL 16  │  ← 单机 55+ 表
                    │  (guoxue-db)    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐  ┌────▼────┐  ┌─────▼─────┐
        │  Redis     │  │  COS   │  │  ES(规划)  │
        │  缓存/队列  │  │  文件   │  │  搜索      │
        └───────────┘  └────────┘  └───────────┘
```

### 1.2 扩展触发条件

| 阶段 | DAU | 数据库大小 | 建议行动 |
|------|-----|-----------|---------|
| **Phase 0** (当前) | < 5千 | < 2GB | 单机 + 每日备份 |
| **Phase 1** | 5千-5万 | 2-10GB | 读写分离 + 索引优化 |
| **Phase 2** | 5万-50万 | 10-100GB | 垂直分表 + 冷热分离 |
| **Phase 3** | > 50万 | > 100GB | 水平分库 + 微服务拆分 |

## 二、数据库扩展策略

### 2.1 读写分离（Phase 1）

```
                         ┌──────────────────┐
                         │   应用层 (NestJS)  │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │   Prisma 读写分离中间件     │
                    │   @prisma/extension-read-replicas │
                    └─────────────┬─────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
        ┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐
        │  Master    │ ───► │  Replica 1 │ ───► │ Replica 2 │
        │  (写)      │ WAL  │  (读-1)    │      │  (读-2)    │
        └───────────┘      └───────────┘      └───────────┘
```

**实现方式：**

```typescript
// apps/server/src/prisma/prisma.service.ts
import { PrismaClient } from '@prisma/client';
import { readReplicas } from '@prisma/extension-read-replicas';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super();
    if (process.env.DB_REPLICA_URL) {
      this.$extends(
        readReplicas({
          replicas: [
            { url: process.env.DB_REPLICA_URL! },
            ...(process.env.DB_REPLICA_URL_2 ? [{ url: process.env.DB_REPLICA_URL_2 }] : []),
          ],
        }),
      );
    }
  }
}
```

### 2.2 垂直分表 — 冷热分离（Phase 2）

**热数据**（高频读写，留在主表）vs **冷数据**（低频访问，迁移到归档表）：

| 热数据表 | 冷数据表 | 归档策略 |
|---------|---------|---------|
| `User`（活跃字段） | `UserArchive`（扩展信息） | 最后活跃 > 90天 |
| `Order`（近3个月） | `OrderArchive`（历史） | 创建时间 > 3个月 |
| `PaipanRecord`（近1个月） | `PaipanRecordArchive` | 创建时间 > 1个月 |
| `UserBehaviorLog`（近7天） | `UserBehaviorLogArchive` | 创建时间 > 7天 |
| `MarketingLog`（近30天） | `MarketingLogArchive` | 创建时间 > 30天 |
| `BotChatLog`（近90天） | `BotChatLogArchive` | 创建时间 > 90天 |

```sql
-- 归档迁移示例（每日定时任务）
INSERT INTO "OrderArchive" SELECT * FROM "Order"
WHERE "createdAt" < NOW() - INTERVAL '90 days'
  AND status IN ('PAID', 'REFUNDED', 'COMPLETED');

DELETE FROM "Order"
WHERE "createdAt" < NOW() - INTERVAL '90 days'
  AND status IN ('PAID', 'REFUNDED', 'COMPLETED');
```

### 2.3 水平分库（Phase 3）

**分片键选型：**

| 分片维度 | 分片键 | 适用表 | 说明 |
|---------|--------|--------|------|
| 用户维度 | `userId` | User, Order, PaipanRecord, UserBehavior, BotChatLog | 按 userId hash 取模 |
| 内容维度 | `id` (UUID) | Content, Article, Course, Video, Product | UUID 天然均匀分布 |
| 时间维度 | `createdAt` | 日志类表 | 按月/按天分区 |

**分片策略（userId hash）：**

```
userId → hash(userId) % 4 → Shard 0 / Shard 1 / Shard 2 / Shard 3
```

```typescript
// 分片路由中间件
@Injectable()
export class ShardRouter {
  private shards: PrismaClient[];

  constructor() {
    this.shards = [
      new PrismaClient({ datasources: { db: { url: process.env.DB_SHARD_0_URL! } } }),
      new PrismaClient({ datasources: { db: { url: process.env.DB_SHARD_1_URL! } } }),
      new PrismaClient({ datasources: { db: { url: process.env.DB_SHARD_2_URL! } } }),
      new PrismaClient({ datasources: { db: { url: process.env.DB_SHARD_3_URL! } } }),
    ];
  }

  getShardForUser(userId: string): PrismaClient {
    const shardIndex = this.hashUserId(userId) % this.shards.length;
    return this.shards[shardIndex];
  }

  private hashUserId(userId: string): number {
    return Math.abs(
      userId.split('').reduce((hash, c) => ((hash << 5) - hash) + c.charCodeAt(0), 0),
    );
  }
}
```

**跨分片查询限制：**

- 按 `userId` 路由的表：禁止跨用户全表扫描
- 全局查询（如管理后台用户列表）通过汇总服务（Aggregation Service）聚合各分片结果
- 搜索类需求移交 Elasticsearch

### 2.4 索引优化

```sql
-- 关键查询的复合索引（定期用 pg_stat_statements 分析慢查询）

-- 用户排盘记录查询（最频繁）
CREATE INDEX "PaipanRecord_userId_createdAt_idx" ON "PaipanRecord"("userId", "createdAt" DESC);

-- 订单查询
CREATE INDEX "Order_userId_status_createdAt_idx" ON "Order"("userId", "status", "createdAt" DESC);

-- 分站收益
CREATE INDEX "StationEarning_stationId_createdAt_idx" ON "StationEarning"("stationId", "createdAt" DESC);

-- 用户行为分析
CREATE INDEX "UserBehavior_userId_behavior_createdAt_idx" ON "UserBehavior"("userId", "behavior", "createdAt" DESC);

-- 全文搜索（替代 ES 的轻量方案）
ALTER TABLE "Content" ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('chinese', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('chinese', coalesce(summary, '')), 'B')
  ) STORED;
CREATE INDEX "Content_search_idx" ON "Content" USING GIN(search_vector);
```

## 三、微服务拆分蓝图

### 3.1 拆分边界

```
                    ┌──────────────────────────────────┐
                    │        API Gateway (Kong/Nginx)    │
                    └────────────────┬─────────────────┘
                                     │
        ┌────────┬────────┬─────────┼─────────┬────────┬────────┐
        │        │        │         │         │        │        │
   ┌────▼───┐┌──▼───┐┌───▼──┐┌────▼────┐┌───▼──┐┌────▼───┐┌──▼─────┐
   │ 用户服务 ││ 内容  ││ 交易  ││ 排盘引擎 ││ AI服务││ 营销服务 ││ 伙伴   │
   │ User    ││Content││ Trade ││ Paipan  ││  AI   ││Marketing││Partner │
   │ Service ││Service││Service││ Service ││Service││ Service ││Service │
   └────────┘└──────┘└──────┘└─────────┘└──────┘└─────────┘└────────┘
        │        │        │         │         │        │        │
   ┌────▼───┐┌──▼───┐┌───▼──┐┌────▼────┐┌───▼──┐┌────▼───┐┌──▼─────┐
   │ 独立DB  ││ 独立DB ││ 独立DB ││ 独立DB   ││ 独立DB ││ 独立DB   ││ 独立DB  │
   │user-db ││ct-db  ││trade-db││paipan-db ││ai-db  ││mkt-db   ││partner  │
   └────────┘└──────┘└──────┘└─────────┘└──────┘└─────────┘└─────────┘
```

### 3.2 服务职责与数据归属

| 服务 | 负责模块 | 数据归属 |
|------|---------|---------|
| **User Service** | auth, user, identity, role, notification | User, Auth, UserRole, Notification |
| **Content Service** | article, course, video, live, classic, circle, comment | Article, Course, Video, LiveRoom, ClassicBook, Circle, Comment, Like, Collect, Post |
| **Trade Service** | shop, order, coin, coupon, withdrawal, invoice | Product, ProductSku, Order, VirtualCoinAccount, VirtualCoinTransaction, CouponTemplate, CouponRecord, Withdrawal, Invoice |
| **Paipan Service** | paipan, ziwei, fengshui, name-score | PaipanRecord, AiAnalysisRecord |
| **AI Service** | ai, bot, tts, recommend, qa | BotConfig, BotChatLog, BotKnowledgeBase, RecommendRule, RecommendLog, Question |
| **Marketing Service** | flash-sale, group-buy, marketing-page, activity, risk-control | FlashSale, GroupBuy, MarketingPage, Activity, MarketingRule, MarketingLog, RiskRule, RiskAlert |
| **Partner Service** | station, offline, commission, institute | Station, StationEarning, StationOffline, CommissionConfig, InstituteMember |

### 3.3 通信方案

```
服务间通信方式选择:

同步调用 ──→ gRPC (性能敏感) 或 HTTP/REST (一般)
异步事件 ──→ Redis Pub/Sub 或 Kafka (高吞吐)
分布式事务 → Saga Pattern (编排/编排)
配置中心 ──→ 环境变量 → Nacos/Consul (多环境管理)
```

```typescript
// gRPC 服务间调用示例（User Service → Trade Service 查询用户订单数）
@Injectable()
export class UserService {
  constructor(
    @Inject('TRADE_SERVICE') private tradeClient: ClientGrpc,
  ) {}

  async getUserProfile(userId: string) {
    const tradeService = this.tradeClient.getService<TradeService>('TradeService');
    const orderCount = await firstValueFrom(
      tradeService.getOrderCount({ userId }),
    );
    return { userId, orderCount };
  }
}
```

### 3.4 Saga 分布式事务

```typescript
// 创建订单 + 扣减库存 + 发优惠券 的 Saga 编排
@Injectable()
export class OrderSagaService {

  async execute(orderDto: CreateOrderDto): Promise<void> {
    // Step 1: 创建订单
    const order = await this.tradeService.createOrder(orderDto);
    try {
      // Step 2: 扣减库存
      await this.tradeService.deductStock(orderDto.productId, orderDto.quantity);

      // Step 3: 使用优惠券
      if (orderDto.couponId) {
        await this.marketingService.useCoupon(orderDto.couponId, order.userId);
      }

      // Step 4: 标记订单已支付
      await this.tradeService.markOrderPaid(order.id);
    } catch (error) {
      // 补偿操作
      await this.tradeService.markOrderFailed(order.id);
      await this.tradeService.restoreStock(orderDto.productId, orderDto.quantity);
      if (orderDto.couponId) {
        await this.marketingService.restoreCoupon(orderDto.couponId, order.userId);
      }
      throw error;
    }
  }
}
```

## 四、缓存策略

### 4.1 多级缓存架构

```
请求
  │
  ▼
L1: 本地内存缓存 (MemoryCache, TTL: 30s)
  │ Miss
  ▼
L2: Redis 分布式缓存 (TTL: 5min)
  │ Miss
  ▼
L3: 数据库 (PostgreSQL)
```

### 4.2 缓存策略矩阵

| 数据类型 | L1 TTL | L2 TTL | 更新策略 |
|---------|--------|--------|---------|
| 用户信息 | 30s | 5min | 用户更新时主动失效 |
| 排盘结果 | 无 | 1h | 写入即缓存，结果不变 |
| 内容详情 | 30s | 10min | 内容更新时主动失效 |
| 首页推荐 | 无 | 5min | 定时刷新 |
| 配置数据 | 1min | 30min | 配置变更时主动失效 |
| 搜索热词 | 无 | 15min | 定时统计刷新 |
| 营销规则 | 30s | 3min | 规则变更时主动失效 |

### 4.3 缓存击穿/穿透/雪崩防护

```typescript
// 缓存空值（防穿透）+ 互斥锁（防击穿）+ 随机 TTL（防雪崩）
@Injectable()
export class CacheService {
  constructor(private redis: RedisService) {}

  async getOrSet<T>(key: string, loader: () => Promise<T | null>, ttl: number): Promise<T | null> {
    // 1. 尝试读取
    const cached = await this.redis.get(key);
    if (cached !== null) {
      return cached === '__NULL__' ? null : JSON.parse(cached);
    }

    // 2. 互斥锁（防击穿）
    const lockKey = `lock:${key}`;
    const locked = await this.redis.set(lockKey, '1', 'NX', 'EX', 5);
    if (!locked) {
      await new Promise(r => setTimeout(r, 100)); // 等待 100ms 重试
      return this.getOrSet(key, loader, ttl);
    }

    try {
      // 3. 加载数据
      const data = await loader();

      // 4. 缓存空值（防穿透）
      const cacheValue = data === null ? '__NULL__' : JSON.stringify(data);

      // 5. 随机 TTL ± 10%（防雪崩）
      const jitter = Math.floor(ttl * 0.1 * (Math.random() * 2 - 1));
      await this.redis.set(key, cacheValue, 'EX', ttl + jitter);

      return data;
    } finally {
      await this.redis.del(lockKey);
    }
  }
}
```

## 五、数据库迁移策略

### 5.1 零停机迁移步骤

```
Phase A: 双写
  应用同时写入旧库和新库（新库失败不影响主流程）
  ↓ 数据校验（运行迁移校验脚本）

Phase B: 数据追平
  全量迁移 + 增量同步（CDC/binlog 监听）
  ↓ 数据校验通过

Phase C: 灰度切读
  1% → 10% → 50% → 100% 读流量切到新库
  ↓ 观察无异常

Phase D: 单写新库
  停写旧库，全部流量切到新库
  ↓ 观察 24 小时无异常

Phase E: 清理
  旧库保作为冷备库保留 7 天，然后下线
```

### 5.2 数据迁移命令参考

```bash
# 全量迁移
pg_dump -h old-host -U guoxue -d guoxue --no-owner --no-acl | psql -h new-host -U guoxue -d guoxue

# CDC 增量同步（使用 pglogical 或 Debezium）
# 或使用 PostgreSQL 内置逻辑复制
CREATE PUBLICATION guoxue_pub FOR ALL TABLES;
CREATE SUBSCRIPTION guoxue_sub CONNECTION 'host=old-host dbname=guoxue' PUBLICATION guoxue_pub;
```

## 六、监控与告警

### 6.1 数据库监控指标

| 指标 | 收集方式 | 告警阈值 |
|------|---------|---------|
| 连接数 | `pg_stat_activity` | > 80% max_connections |
| 慢查询 | `pg_stat_statements` | > 500ms |
| 锁等待 | `pg_locks` | > 5s |
| 死锁 | 日志监控 | > 0 次/小时 |
| 复制延迟 | `pg_stat_replication` | > 5s |
| 磁盘使用 | `df -h` | > 75% |
| 缓存命中率 | `pg_stat_database` | < 95% |

### 6.2 应用层指标

```typescript
// 数据库查询耗时监控
@Injectable()
export class PrismaMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - start;
        if (elapsed > 500) {
          logger.warn(`慢查询: ${context.getHandler().name} ${elapsed}ms`);
        }
      }),
    );
  }
}
```

## 七、容量规划

### 7.1 数据库资源预估

| 阶段 | 服务器规格 | 存储 | 连接数 | 预估月费 |
|------|-----------|------|--------|---------|
| Phase 0 (当前) | 2C4G | 50GB SSD | 50 | ¥200 |
| Phase 1 | 4C8G + 2C4G(只读) | 100GB SSD | 200 | ¥600 |
| Phase 2 | 8C16G × 2 | 500GB SSD | 500 | ¥2000 |
| Phase 3 | 按需水平扩展 | 1TB+ | 1000+ | ¥5000+ |

### 7.2 微服务资源预估

| 服务 | 实例数 | 每实例规格 | 说明 |
|------|--------|-----------|------|
| API Gateway | 2 | 2C2G | 无状态可水平扩展 |
| User Service | 2 | 2C4G | 高频读写 |
| Content Service | 2 | 2C4G | 读多写少 |
| Trade Service | 2 | 2C4G | 事务密集 |
| Paipan Service | 2 | 4C8G | 计算密集（八字引擎） |
| AI Service | 3 | 4C8G | 高延迟，需更多实例 |
| Marketing Service | 1 | 1C2G | 低频异步 |
| Partner Service | 1 | 1C2G | 低频访问 |

## 八、演进路线图

```
2026 Q3 ──── Phase 0: 当前状态（单机 PostgreSQL）
  │
2026 Q4 ──── Phase 1: 读写分离 + Redis 缓存层加固
  │          ├─ 添加只读副本
  │          ├─ Prisma read-replicas 扩展
  │          └─ 慢查询优化 + 索引审计
  │
2027 Q1 ──── Phase 2: 冷热分离 + 垂直拆分
  │          ├─ 日志/行为表归档
  │          ├─ 搜索迁移至 Elasticsearch
  │          └─ 大表分区（Order/PaipanRecord）
  │
2027 Q3 ──── Phase 3: 微服务拆分 + 水平分库
  │          ├─ 核心服务独立部署（User/Trade/Paipan）
  │          ├─ API Gateway 上线
  │          └─ Saga 分布式事务
  │
2027 Q4+ ─── Phase 4: 全面微服务化
             ├─ 剩余模块拆分
             ├─ 服务网格（可选）
             └─ 全链路监控（Tracing）
```

## 九、风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 分库后跨分片查询性能差 | 管理后台功能受损 | 用 ES 聚合替代跨库 JOIN |
| 微服务拆分导致数据一致性 | 订单/支付出错 | Saga + 补偿 + 对账 |
| 分布式事务复杂度 | 开发效率降低 | 优先避免跨服务事务，用最终一致性 |
| 运维成本增加 | 服务器费用上升 | 按需拆分，不做过度设计 |
