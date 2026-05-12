# 国学平台 — 核心接口性能基准

## 1. 基准目标

| 接口分组 | 接口 | P50 | P95 | P99 | 目标 |
|----------|------|-----|-----|-----|------|
| **首页** | `GET /content/home` | 300ms | 800ms | 1500ms | **≤1.5s** |
| **排盘** | `POST /paipan/bazi/preview` | 500ms | 1500ms | 2000ms | **≤2s** |
| **排盘** | `POST /paipan/ziwei/preview` | 500ms | 1500ms | 2000ms | **≤2s** |
| **搜索** | `GET /search?q=xxx` | 50ms | 150ms | 200ms | **≤200ms** |
| **搜索** | `GET /search/suggest?keyword=xxx` | 30ms | 100ms | 150ms | **≤150ms** |
| **内容** | `GET /article/:id` | 50ms | 200ms | 500ms | ≤500ms |
| **内容** | `GET /article?page=1&pageSize=20` | 80ms | 300ms | 500ms | ≤500ms |
| **课程** | `GET /course/:id` | 50ms | 200ms | 500ms | ≤500ms |
| **课程** | `GET /course?page=1&pageSize=12` | 80ms | 300ms | 500ms | ≤500ms |
| **圈子** | `GET /circle/:id` | 50ms | 200ms | 500ms | ≤500ms |
| **圈子** | `GET /circle?page=1&pageSize=12` | 80ms | 300ms | 500ms | ≤500ms |
| **商城** | `GET /shop/products?page=1&pageSize=12` | 80ms | 300ms | 500ms | ≤500ms |
| **订单** | `GET /shop/orders?page=1` | 80ms | 300ms | 500ms | ≤500ms |
| **用户** | `GET /user/profile` | 30ms | 150ms | 300ms | ≤300ms |
| **用户** | `POST /auth/login` | 100ms | 500ms | 1000ms | ≤1s |
| **古籍** | `GET /classic/:id` | 50ms | 200ms | 500ms | ≤500ms |

## 2. 测量方法

### 2.1 本地测量

```bash
# 使用 autocannon 测量单个接口
npx autocannon -c 10 -d 30 http://localhost:3000/api/content/home

# 输出示例:
# ┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬──────────┐
# │ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max      │
# ├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼──────────┤
# │ Latency │ 15ms │ 45ms │ 120ms │180ms │ 52.3 ms │ 35.7 ms │ 245 ms   │
# └─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴──────────┘
```

### 2.2 k6 压测

```bash
# 日常负载
k6 run k6/load-test.js

# 排盘专项
k6 run k6/paipan-bench.js

# 自定义并发
k6 run --vus 100 --duration 5m k6/load-test.js

# 导出 JSON 结果
k6 run --out json=results.json k6/load-test.js
```

### 2.3 生产环境测量

```sql
-- 启用 pg_stat_statements 扩展
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 查询最慢的 20 个查询
SELECT
  queryid,
  LEFT(query, 150) AS query_preview,
  calls,
  mean_exec_time::numeric(10,2) AS avg_ms,
  stddev_exec_time::numeric(10,2) AS stddev_ms,
  min_exec_time::numeric(10,2) AS min_ms,
  max_exec_time::numeric(10,2) AS max_ms
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

```bash
# 应用日志中的慢查询
grep "慢查询" app.log | awk '{print $NF}' | sort -rn | head -20
```

## 3. 压测场景设计

### 3.1 100k DAU 流量模型

```
日活用户:     100,000
日均 PV:      20 /人（约 2,000,000 PV/天）
日均请求:     30 /人（约 3,000,000 API 调用/天）
峰值时段:     20:00-22:00（占全天 30% 流量）
峰值 QPS:     3,000,000 × 0.3 / 7200 ≈ 125 QPS

安全系数 ×2:  250 QPS（目标承载能力）
```

### 3.2 请求分布模拟

| 接口 | 占比 | 峰值 QPS | 并发 VUs（8s 间隔） |
|------|------|----------|---------------------|
| 首页 | 30% | 38 | 300 |
| 文章列表/详情 | 20% | 25 | 200 |
| 课程列表/详情 | 15% | 19 | 150 |
| 搜索 | 10% | 13 | 100 |
| 排盘 | 10% | 13 | 100 |
| 圈子 | 5% | 6 | 50 |
| 商城 | 5% | 6 | 50 |
| 个人中心 | 5% | 6 | 50 |

### 3.3 压测等级

| 等级 | 并发数 | 持续时间 | 目的 |
|------|--------|----------|------|
| **冒烟测试** | 10 VUs | 2 min | 验证基准可用性 |
| **日常负载** | 100 VUs | 10 min | 模拟日常峰值 |
| **压力测试** | 500 VUs | 10 min | 找性能拐点 |
| **浸泡测试** | 100 VUs | 60 min | 检测内存泄漏/连接泄漏 |
| **突发测试** | 50→500 VUs | 5 min | 验证自动扩容效果 |

## 4. 数据库查询性能基准

```sql
-- 验证关键查询执行计划
-- 1. 首页推荐文章（需走 idx_isPushHome_auditStatus 索引）
EXPLAIN ANALYZE
SELECT id, title, cover, excerpt FROM "Article"
WHERE "isPushHome" = true AND "auditStatus" = 'APPROVED'
ORDER BY "createdAt" DESC LIMIT 10;

-- 2. 搜索（需走 GIN FTS 索引）
EXPLAIN ANALYZE
SELECT id, title FROM "Article"
WHERE to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(excerpt,''))
      @@ plainto_tsquery('simple', '易经')
ORDER BY ts_rank(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(excerpt,'')),
                 plainto_tsquery('simple', '易经')) DESC
LIMIT 10;

-- 3. 排盘历史（需走 idx_userId_paipanType_createdAt 索引）
EXPLAIN ANALYZE
SELECT id, "clientName", "createdAt" FROM "PaipanRecord"
WHERE "userId" = 'u1' AND "paipanType" = 'BAZI'
ORDER BY "createdAt" DESC LIMIT 20;
```

## 5. CI/CD 性能回归检测

```yaml
# .github/workflows/perf-check.yml
name: Performance Check
on:
  pull_request:
    paths:
      - 'apps/server/src/**'
      - 'prisma/**'

jobs:
  perf-baseline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start services
        run: docker compose up -d postgres redis
      - name: Run benchmark
        run: |
          npx autocannon -c 10 -d 30 http://localhost:3000/api/content/home > home-bench.txt
          npx autocannon -c 5 -d 30 http://localhost:3000/api/search?q=test > search-bench.txt
      - name: Check thresholds
        run: |
          node scripts/check-benchmarks.js home-bench.txt search-bench.txt
```

## 6. 监控面板配置

### 6.1 推荐的 Grafana 面板

| 面板名称 | 指标 | 数据源 |
|----------|------|--------|
| API P95 延迟 | `http_request_duration_seconds` (histogram) | Prometheus |
| API QPS | `rate(http_requests_total[1m])` | Prometheus |
| DB 慢查询数 | `prisma_slow_query_count` | Custom metric |
| DB 连接池利用率 | `pg_stat_activity count / max_connections` | PostgreSQL |
| Redis 命中率 | `redis_keyspace_hits / (hits + misses)` | Redis INFO |
| 缓存内存使用 | `redis_used_memory_bytes` | Redis INFO |
| 错误率 | `rate(http_requests_total{status=~"5.."}[1m])` | Prometheus |

### 6.2 告警规则

```yaml
# Prometheus 告警规则
groups:
  - name: guoxue-api
    rules:
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API P95 延迟超过 1.5s"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "5xx 错误率超过 5%"

      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_activity_count / pg_settings_max_connections > 0.9
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "数据库连接池使用率超过 90%"
```
