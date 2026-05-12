# 国学平台 — Redis 缓存策略设计

## 1. Key 命名规范

### 1.1 命名格式

```
{domain}:{entity}:{identifier}
```

### 1.2 命名示例

| 分类 | 格式 | 示例 | 说明 |
|------|------|------|------|
| 排盘缓存 | `bazi:{md5}` | `bazi:a3f2c8...` | MD5(input) 24h |
| 紫微缓存 | `ziwei:{md5}` | `ziwei:b4e1d7...` | MD5(input) 24h |
| 用户会话 | `user:session:{userId}` | `user:session:u1` | 7d |
| 用户资料 | `user:profile:{userId}` | `user:profile:u1` | 1h |
| 内容详情 | `content:{type}:{id}` | `content:article:a1` | 10min |
| 首页聚合 | `home:{scene}:{stationId}` | `home:default:all` | 60s |
| 课程详情 | `course:detail:{courseId}` | `course:detail:c1` | 10min |
| 圈子信息 | `circle:info:{circleId}` | `circle:info:ci1` | 5min |
| 热门搜索 | `search:hot:{lang}` | `search:hot:zh` | 5min |
| 热搜种子 | `config:hotwords` | `config:hotwords` | 永久 |
| 限流计数 | `ratelimit:{action}:{userId}` | `ratelimit:sms:138...` | 60s |
| 验证码 | `sms:code:{phone}` | `sms:code:138...` | 300s |
| 白名单 | `admin:whitelist` | `admin:whitelist` | 永久 |
| 计数缓存 | `count:{entity}:{id}` | `count:like:article:a1` | 5min |
| 推荐结果 | `rec:{scene}:{userId}` | `rec:course_detail:u1` | 5min |
| A/B 实验 | `ab:{test}:{userId}` | `ab:home_v2:u1` | 30d |
| 分布式锁 | `lock:{resource}:{id}` | `lock:order:o1` | 30s |
| 行为去重 | `dedup:{action}:{userId}` | `dedup:like:u1:a1` | 5min |

### 1.3 禁止事项

- 禁止使用 `:` 以外的分隔符（`:` 是 Redis 官方推荐的层级分隔符）
- 禁止在 key 中包含空格、换行符
- 禁止 key 长度超过 256 字节
- 禁止使用 `KEYS *` 扫描（已通过 `SCAN` 替代）

---

## 2. TTL 分层策略

### 2.1 TTL 层级定义

| 层级 | TTL | 适用场景 | 示例 |
|------|-----|----------|------|
| **L0 — 瞬态** | 30s~60s | 首页聚合、实时计数、分布式锁 | home:default, lock:order, ratelimit |
| **L1 — 热数据** | 5min~10min | 内容详情、课程信息、圈子信息 | content:article, course:detail |
| **L2 — 温数据** | 1h~6h | 用户资料、推荐结果、统计聚合 | user:profile, rec:course_detail |
| **L3 — 冷数据** | 24h | 排盘结果、AI 分析、配置缓存 | bazi:*, ai:analysis |
| **L4 — 持久** | 7d~永久 | 用户会话、白名单、验证码 | user:session, admin:whitelist |

### 2.2 各模块 TTL 明细

| 模块 | Key 模式 | TTL | 更新策略 |
|------|----------|-----|----------|
| 排盘预览 | `bazi:{md5}` | 86400s (24h) | 计算时写入 |
| 紫微预览 | `ziwei:{md5}` | 86400s (24h) | 计算时写入 |
| 用户会话 | `user:session:{uid}` | 604800s (7d) | 登录时写入 |
| 用户资料 | `user:profile:{uid}` | 3600s (1h) | 修改时删除 |
| 用户统计 | `user:stats:{uid}` | 300s (5min) | 首次查询写入 |
| 文章详情 | `content:article:{id}` | 600s (10min) | 修改时删除 |
| 视频详情 | `content:video:{id}` | 600s (10min) | 修改时删除 |
| 课程详情 | `course:detail:{id}` | 600s (10min) | 修改时删除 |
| 课程章节 | `course:chapters:{id}` | 600s (10min) | 修改时删除 |
| 圈子信息 | `circle:info:{id}` | 300s (5min) | 修改时删除 |
| 商品详情 | `product:detail:{id}` | 600s (10min) | 修改时删除 |
| 首页推荐 | `home:rec:{station}` | 60s (1min) | 定时任务刷新 |
| 热门搜索 | `search:hot:{lang}` | 300s (5min) | 定时任务刷新 |
| 搜索建议 | `search:suggest:{prefix}` | 120s (2min) | 查询时写入 |
| 推荐结果 | `rec:{scene}:{uid}` | 300s (5min) | 用户行为后删 |
| 计数缓存 | `count:{type}:{id}` | 300s (5min) | 定时刷新 |
| 验证码 | `sms:code:{phone}` | 300s (5min) | 发送时写入 |
| 限流计数 | `ratelimit:{api}:{uid}` | 60s | 请求时递增 |
| 配置缓存 | `config:{key}` | 3600s (1h) | 配置变更时删 |
| A/B 分组 | `ab:{test}:{uid}` | 2592000s (30d) | 首次访问分配 |
| 分布式锁 | `lock:{res}:{id}` | 30s | 操作完释放 |

---

## 3. 缓存更新机制

### 3.1 Cache-Aside（旁路缓存，默认模式）

```
读取流程:
  1. 查 Redis → 命中则返回
  2. 未命中 → 查 DB → 写入 Redis（设 TTL）→ 返回

写入流程:
  1. 更新 DB
  2. 删除对应的 Redis key（使缓存失效）
  3. 下次读取时自动重建
```

**适用场景**：用户资料、内容详情、课程、圈子、商品等读多写少的数据。

### 3.2 Write-Through（写穿透）

```
写入流程:
  1. 更新 DB
  2. 同步更新 Redis（或直接删 key）
  3. 返回结果

适用场景：订单状态变更、计数更新等需要实时一致性的场景。
```

### 3.3 定时预热（Scheduled Refresh）

```
适用场景：首页聚合、热门搜索、热搜榜单
实现方式：@Cron 定时任务定期计算并写入 Redis

@Interval(60000)   // 每60秒刷新首页推荐
refreshHomeRecommend() {
  const data = await this.buildHomeData();
  await this.redis.setJson('home:rec:all', data, 120);
}

@Interval(300000)  // 每5分钟刷新热门搜索
refreshHotSearch() {
  const hot = await this.searchService.getHotSearches(20);
  await this.redis.setJson('search:hot:zh', hot, 360);
}
```

### 3.4 缓存穿透防护

```typescript
// 空值缓存：缓存 null 结果，设较短 TTL 防止穿透
async getWithNullGuard<T>(key: string, ttl: number, fetcher: () => Promise<T | null>): Promise<T | null> {
  const cached = await this.redis.get(key);
  if (cached !== null) {
    return cached === '__NULL__' ? null : JSON.parse(cached) as T;
  }
  const result = await fetcher();
  const value = result === null ? '__NULL__' : JSON.stringify(result);
  await this.redis.set(key, value, result === null ? 60 : ttl); // null 只缓存 60s
  return result;
}
```

### 3.5 缓存雪崩防护

```typescript
// TTL 加随机偏移，避免大量 key 同时过期
function jitteredTTL(baseTTL: number): number {
  const jitter = Math.floor(Math.random() * baseTTL * 0.2); // ±20%
  return baseTTL + jitter;
}
```

### 3.6 缓存击穿防护（热点 key 互斥锁）

```typescript
async getWithMutex<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = await this.redis.getJson<T>(key);
  if (cached) return cached;

  const lockKey = `lock:${key}`;
  const locked = await this.redis.setNX(lockKey, '1', 10); // 10s 锁
  if (!locked) {
    // 其他进程正在重建，等待后重试
    await new Promise(r => setTimeout(r, 100));
    return this.getWithMutex(key, ttl, fetcher);
  }

  try {
    const result = await fetcher();
    await this.redis.setJson(key, result, jitteredTTL(ttl));
    return result;
  } finally {
    await this.redis.del(lockKey);
  }
}
```

---

## 4. 缓存预热脚本

```typescript
// src/common/cache-warmer.ts — 应用启动时预热核心缓存
@Injectable()
export class CacheWarmer implements OnModuleInit {
  async onModuleInit() {
    // 预热首页推荐
    await this.recommendService.getHomeRecommend();
    // 预热配置
    await this.systemService.getAllConfigs();
    // 预热热搜
    await this.searchService.getHotSearches(20);
    this.logger.log('核心缓存预热完成');
  }
}
```

---

## 5. 缓存监控指标

| 指标 | 计算方式 | 告警阈值 |
|------|----------|----------|
| 缓存命中率 | `keyspace_hits / (hits + misses)` | < 80% |
| 内存使用率 | `used_memory / maxmemory` | > 80% |
| 驱逐 key 数 | `evicted_keys` 增量 | > 100/min |
| 连接数 | `connected_clients` | > 500 |
| 慢查询 | `slowlog` 长度 | > 10 条/min |

### 监控命令

```bash
# 实时命中率
redis-cli INFO stats | grep keyspace

# 内存使用
redis-cli INFO memory | grep used_memory_human

# 慢查询
redis-cli SLOWLOG GET 10

# 大 key 扫描
redis-cli --bigkeys -i 0.1
```

---

## 6. Redis 实例配置建议

```conf
# redis.conf 生产环境关键配置
maxmemory 2gb
maxmemory-policy allkeys-lru     # LRU 淘汰，适合缓存场景
save 900 1                        # 15分钟内至少1个key变更则RDB
save 300 10                       # 5分钟内至少10个key变更
save 60 10000
appendonly yes                    # 开启AOF持久化
appendfsync everysec              # 每秒fsync，平衡性能与安全
slowlog-log-slower-than 10000     # 记录超过10ms的命令
slowlog-max-len 128
timeout 300                       # 空闲连接5分钟超时
tcp-keepalive 60
```

---

## 7. 当前已接入缓存的模块

| 模块 | 状态 | 缓存方式 |
|------|------|----------|
| PaipanService | 已接入 | Redis Cache-Aside，24h TTL |
| RedisService.incrWithTtl | 已接入 | 分布式限流，Lua 原子操作 |
| RedisService.setNX | 已接入 | 分布式锁原语 |
| UserService (白名单) | 已接入 | Redis Set/Get JSON |

## 8. 待接入缓存的模块（优先级排序）

| 优先级 | 模块 | 缓存内容 | 预期收益 |
|--------|------|----------|----------|
| P0 | SearchService.getHotSearches | 热门搜索词 | 减少 99% groupBy 查询 |
| P0 | ContentService.getHomeData | 首页聚合数据 | 首页 <1.5s |
| P1 | CourseService.getCourseDetail | 课程详情+章节 | 课程页加载提速 50% |
| P1 | ArticleService.getArticleDetail | 文章详情 | 内容页加载提速 50% |
| P1 | CircleService.getCircleInfo | 圈子信息 | 圈子页加载提速 50% |
| P2 | ProductService.getProductDetail | 商品详情 | 商城页加载提速 50% |
| P2 | SearchService.suggest | 搜索建议 | 减少 FTS 查询 |
| P2 | CommentService.getComments | 评论列表 | 评论加载提速 |
| P3 | UserService.getUserStats | 用户统计数据 | 减少 7 次 count 查询 |
