# 国学平台 — 数据库读写分离与连接池配置方案

## 1. 当前架构

```
                ┌───────────┐
                │   Nginx   │ (负载均衡)
                └─────┬─────┘
                      │
                ┌─────▼─────┐
                │  NestJS    │ (单实例)
                │  Prisma    │
                └─────┬─────┘
                      │
                ┌─────▼─────┐
                │ PostgreSQL │ (单节点)
                │  Read/Write│
                └───────────┘
```

**问题**：
- 读写共用同一实例，报表类聚合查询会影响在线业务
- 无故障转移能力
- 连接池未针对读/写分离配置

---

## 2. 目标架构（三期演进）

### 2.1 第一期：读写分离（PostgreSQL 流复制）

```
                ┌───────────┐
                │   Nginx   │
                └─────┬─────┘
                      │
                ┌─────▼──────┐
                │  NestJS × N │ (多实例)
                │  Prisma     │
                │  ┌───────┐  │
                │  │ Write  │──┐
                │  │ Read   │──┤
                │  └───────┘  │ │
                └─────────────┘ │
                      │         │
                ┌─────▼──┐ ┌───▼──────┐
                │ Primary │ │ Standby   │
                │ (Write) │ │ (Read)    │
                └─────────┘ └──────────┘
                      │
                  流复制 (async)
```

### 2.2 第二期：连接池中间层（PgBouncer）

```
    NestJS → PgBouncer (transaction pooling)
                ├── Primary:6432 (write)
                └── Standby:6432 (read)
```

### 2.3 第三期：高可用（Patroni + etcd）

```
    NestJS → HAProxy → PgBouncer → Patroni Cluster
                                       ├── Primary
                                       ├── Standby 1
                                       └── Standby 2
```

---

## 3. PostgreSQL 流复制配置

### 3.1 Primary 节点配置

```conf
# postgresql.conf — Primary
wal_level = replica
max_wal_senders = 5
wal_keep_size = 1024    # 1GB WAL 保留
hot_standby = on
synchronous_commit = off         # 异步复制，性能优先
max_connections = 200
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 64MB
maintenance_work_mem = 256MB
random_page_cost = 1.1          # SSD 环境
effective_io_concurrency = 200
```

```conf
# pg_hba.conf — Primary 允许 Standby 连接
host replication replicator standby_ip/32 md5
```

### 3.2 Standby 节点配置

```bash
# 1. 基础备份
pg_basebackup -h primary_host -U replicator -D /var/lib/postgresql/data -P -R

# 2. standby.signal 文件（自动创建）
# 3. 启动 Standby
pg_ctl start
```

```conf
# postgresql.conf — Standby
hot_standby = on
max_connections = 200
shared_buffers = 2GB
```

---

## 4. Prisma 读写分离配置

### 4.1 方案一：双 PrismaClient（推荐）

```typescript
// src/prisma/prisma-readwrite.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaReadWriteService implements OnModuleInit, OnModuleDestroy {
  private writeClient: PrismaClient;
  private readClient: PrismaClient;

  constructor() {
    // 写库 — Primary
    this.writeClient = new PrismaClient({
      datasources: {
        db: { url: process.env.DATABASE_URL },           // postgresql://primary:5432/guoxue
      },
    });

    // 读库 — Standby
    this.readClient = new PrismaClient({
      datasources: {
        db: { url: process.env.DATABASE_READ_URL },      // postgresql://standby:5432/guoxue
      },
    });
  }

  async onModuleInit() {
    await Promise.all([this.writeClient.$connect(), this.readClient.$connect()]);
  }

  async onModuleDestroy() {
    await Promise.all([this.writeClient.$disconnect(), this.readClient.$disconnect()]);
  }

  get write(): PrismaClient { return this.writeClient; }
  get read(): PrismaClient { return this.readClient; }
}
```

### 4.2 方案二：Prisma Client Extensions + 中间件路由（轻量）

```typescript
// 利用 Prisma 中间件自动路由
// 读操作 → Standby，写操作 → Primary
this.writeClient.$use(async (params, next) => {
  return next(params);
});
```

**不适配 Prisma 5.x 架构，不推荐。**

### 4.3 Repository 层改造（渐进式迁移）

```typescript
// src/common/base.repository.ts
export abstract class BaseRepository {
  constructor(protected prisma: PrismaReadWriteService) {}

  // 子类在写操作时使用 this.prisma.write
  // 读操作时使用 this.prisma.read
}

// 示例：UserRepository
@Injectable()
export class UserRepository extends BaseRepository {
  async findById(id: string) {
    return this.prisma.read.user.findUnique({ where: { id } });  // 读 Standby
  }

  async updateProfile(id: string, data: any) {
    return this.prisma.write.user.update({ where: { id }, data }); // 写 Primary
  }
}
```

### 4.4 路由规则

| 操作类型 | 路由目标 | 说明 |
|----------|----------|------|
| `findUnique` / `findFirst` / `findMany` | Standby (Read) | 无事务要求的查询 |
| `count` / `aggregate` / `groupBy` | Standby (Read) | 统计类查询 |
| `create` / `update` / `delete` / `upsert` | Primary (Write) | 所有写操作 |
| `$transaction` | Primary (Write) | 事务必须走主库 |
| `$queryRaw` (SELECT) | Standby (Read) | 原始查询 |
| `$queryRaw` (INSERT/UPDATE/DELETE) | Primary (Write) | 原始变更 |

> **注意**：写完立刻读（如 `create` 后立即 `findUnique`）的场景必须走 Primary，
> 因为异步复制有延迟（通常 < 100ms）。

---

## 5. 连接池配置

### 5.1 Prisma 连接池参数

```env
# .env 生产环境

# Primary 写库连接池
DATABASE_URL="postgresql://user:pass@primary:5432/guoxue?connection_limit=20&pool_timeout=10&socket_timeout=60"

# Standby 读库连接池
DATABASE_READ_URL="postgresql://user:pass@standby:5432/guoxue?connection_limit=30&pool_timeout=10&socket_timeout=30"
```

| 参数 | 写库 | 读库 | 说明 |
|------|------|------|------|
| `connection_limit` | 20 | 30 | 读库承担更多查询，连接数更多 |
| `pool_timeout` | 10s | 10s | 等待连接的超时时间 |
| `socket_timeout` | 60s | 30s | 查询超时（写操作允许更长） |

### 5.2 PostgreSQL 服务端连接配置

```conf
# postgresql.conf
max_connections = 200           # 总连接数上限
superuser_reserved_connections = 5

# 计算公式：
# max_connections = (NestJS实例数 × connection_limit) + PgBouncer + 管理连接 + 缓冲
# 示例：2实例 × 50 + 10(PgBouncer) + 5(管理) + 35(缓冲) = 150
```

### 5.3 PgBouncer 配置（推荐生产环境使用）

```ini
# pgbouncer.ini
[databases]
guoxue_write = host=primary port=5432 dbname=guoxue
guoxue_read  = host=standby port=5432 dbname=guoxue

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# 事务级连接池（Prisma 兼容）
pool_mode = transaction
default_pool_size = 25
max_client_conn = 200
max_db_connections = 50

# 超时配置
client_idle_timeout = 600      # 客户端空闲 10min 断开
server_idle_timeout = 300      # 服务端空闲 5min 断开
query_timeout = 30             # 查询超时 30s

# 日志
log_connections = 1
log_disconnections = 1
stats_period = 60
```

### 5.4 连接数计算

```
日活 100k 场景连接数估算：

假设：
- NestJS 实例数：2 ~ 4
- 每实例 Prisma connection_limit：20 (write) + 30 (read) = 50
- PgBouncer 到 PostgreSQL：50 连接（事务池，实际少很多）
- 总 PG 连接：~150 安全范围内

峰值 QPS：~200
每查询平均耗时：50ms（缓存命中）/ 200ms（DB 查询）
每连接可承载：1000ms / 50ms = 20 QPS
需并发连接：200 / 20 = 10（PG 直接连接）
PgBouncer 事务池下仅需 5-10 实际 PG 连接
```

---

## 6. 环境变量配置

```env
# ═══════════ 数据库读写分离 ═══════════

# Primary 写库
DATABASE_URL="postgresql://guoxue:password@primary-db.internal:5432/guoxue?connection_limit=20&pool_timeout=10"

# Standby 读库（若无则回退到 DATABASE_URL）
DATABASE_READ_URL="postgresql://guoxue:password@standby-db.internal:5432/guoxue?connection_limit=30&pool_timeout=10"

# PgBouncer 模式（连接池前置，替换直连）
# DATABASE_URL="postgresql://guoxue:password@pgbouncer.internal:6432/guoxue_write?connection_limit=20"
# DATABASE_READ_URL="postgresql://guoxue:password@pgbouncer.internal:6432/guoxue_read?connection_limit=30"

# 连接池监控
PRISMA_SLOW_QUERY_MS="500"
```

---

## 7. Docker Compose 生产部署示例

```yaml
# docker-compose.prod.yml（读写分离部分）
services:
  postgres-primary:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: guoxue
      POSTGRES_USER: guoxue
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pg_primary_data:/var/lib/postgresql/data
      - ./config/pg-primary.conf:/etc/postgresql/postgresql.conf
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G

  postgres-standby:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: guoxue
      POSTGRES_USER: guoxue
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pg_standby_data:/var/lib/postgresql/data
      - ./config/pg-standby.conf:/etc/postgresql/postgresql.conf
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    depends_on:
      - postgres-primary

  pgbouncer:
    image: edoburu/pgbouncer:latest
    environment:
      DB_HOST: postgres-primary
      DB_HOST_RO: postgres-standby
      DB_NAME: guoxue
      DB_USER: guoxue
      DB_PASSWORD: ${DB_PASSWORD}
      POOL_MODE: transaction
      DEFAULT_POOL_SIZE: 25
    ports:
      - "6432:6432"

volumes:
  pg_primary_data:
  pg_standby_data:
```

---

## 8. 实施路线图

| 阶段 | 内容 | 时间 | 风险 |
|------|------|------|------|
| **第 1 周** | 搭建 Standby 节点、配置流复制 | 1-2 天 | 低 — 仅新增节点 |
| **第 2 周** | PrismaReadWriteService 实现、修改核心 Repository | 2-3 天 | 中 — 需回归测试 |
| **第 3 周** | PgBouncer 部署、连接池调优 | 1-2 天 | 低 — 中间件透明 |
| **第 4 周** | 压力测试验证、灰度上线 | 2 天 | 中 — 需监控 |

### 前置条件

- [ ] PostgreSQL 版本 ≥ 14（支持 `pg_stat_statements` 等监控扩展）
- [ ] Primary 和 Standby 之间网络延迟 < 5ms
- [ ] 启用 `pg_stat_statements` 扩展用于慢查询分析
- [ ] 配置 WAL 归档（或使用 `pg_basebackup` 定期全量备份）

---

## 9. 监控与告警

### 9.1 关键指标

| 指标 | 查询 | 告警阈值 |
|------|------|----------|
| 复制延迟 | `SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) FROM pg_stat_replication;` | > 100MB 或 > 5s |
| Standby 状态 | `SELECT pg_is_in_recovery();` | 非 t 即异常 |
| 连接数使用率 | `SELECT count(*) / current_setting('max_connections')::float FROM pg_stat_activity;` | > 80% |
| 慢查询数 | `SELECT count(*) FROM pg_stat_statements WHERE mean_exec_time > 500;` | > 50/小时 |
| 死锁数 | `SELECT deadlocks FROM pg_stat_database WHERE datname = 'guoxue';` | > 0 |

### 9.2 健康检查端点

```typescript
// 应用内健康检查
@Get('health/db')
async checkDbHealth() {
  const readOk = await this.prisma.read.$queryRaw`SELECT 1`;
  const writeOk = await this.prisma.write.$queryRaw`SELECT 1`;
  const replicationLag = await this.prisma.read.$queryRaw`
    SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) as lag
    FROM pg_stat_replication
  `;
  return { read: !!readOk, write: !!writeOk, replicationLag };
}
```
