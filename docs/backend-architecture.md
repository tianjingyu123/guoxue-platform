# 热卜国学平台 — 后端架构文档

> 更新时间：2026-05-10

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | NestJS | 10.x |
| ORM | Prisma Client | 5.20 |
| 数据库 | PostgreSQL | 16 |
| 缓存 | Redis (ioredis, 支持降级内存) | 5.x |
| 语言 | TypeScript | 5.5 |
| 测试 | Jest + Supertest | 29.x / 7.x |
| API 文档 | Swagger (OpenAPI) | 7.4 |
| GraphQL | Apollo Server + NestJS Apollo | 4.13 / 12.2 |
| WebSocket | Socket.IO | 4.8 |
| 任务调度 | @nestjs/schedule | 6.1 |
| 认证 | Passport (JWT) + bcryptjs | 0.7 / 2.4 |
| 可观测性 | OpenTelemetry (OTLP导出, 链路追踪) | 0.217 |
| 日志 | Pino | 10.3 |
| 指标 | prom-client (Prometheus) | 15.1 |
| 消息推送 | 微信/企业微信 |
| 支付 | 微信支付 / 支付宝 / 银联 |
| 即时通讯 | 腾讯云 IM (TLS Sig) |
| 音视频 | 腾讯云 TRTC |
| 存储 | 腾讯云 COS / 本地文件 |

## 项目结构

```
apps/server/src/
├── main.ts                      # 应用入口 (NestFactory, Swagger, Helmet, CORS, 优雅关闭)
├── app.module.ts                # 根模块 (导入所有业务模块, 46个)
├── app-graphql.module.ts        # GraphQL 桥接模块
├── tracing.ts                   # OpenTelemetry 链路追踪初始化
├── common/                      # 公共组件 (28个文件)
│   ├── guards/                  # JWT认证 / 角色权限 / 限流 / 特性开关
│   ├── decorators/              # @Roles / @Audit / @StationId / @SkipFormat
│   ├── filters/                 # 全局异常过滤器
│   ├── interceptors/            # 响应格式化 / 日志 / 链路追踪 / 指标
│   ├── pipes/                   # 参数校验 / 输入清理
│   └── utilities/               # 分页 / 加密 / 缓存 / 错误码 / 请求上下文
├── prisma/                      # Prisma 数据库服务
│   ├── prisma.module.ts
│   └── prisma.service.ts        # 继承PrismaClient, 慢查询监控
├── redis/                       # Redis 缓存服务
│   ├── redis.module.ts
│   └── redis.service.ts         # 支持降级内存Map, 分布式锁, 限流
├── graphql/                     # GraphQL 模块
│   ├── graphql.module.ts
│   ├── models/                  # Content, Circle, Shop, User, Live, Common
│   ├── dto/
│   └── resolvers/               # Content, Shop, Circle, Live
└── modules/                     # 业务模块 (46个)
```

## 分层架构

### common/ — 公共组件 (28个文件)

| 分类 | 文件 | 用途 |
|------|------|------|
| **Guards** | `jwt-auth.guard.ts` | JWT 认证守卫 |
| | `roles.guard.ts` | 角色权限守卫 |
| | `throttle.guard.ts` | 基础限流守卫 |
| | `redis-throttle.guard.ts` | 基于 Redis 的分布式限流守卫 |
| | `feature-flag.guard.ts` | 特性开关守卫 |
| **Decorators** | `roles.decorator.ts` | @Roles() 角色装饰器 |
| | `audit.decorator.ts` | @Audit() 审计日志装饰器 |
| | `station-id.decorator.ts` | @StationId() 站点ID装饰器 |
| | `skip-format.decorator.ts` | @SkipFormat() 跳过响应格式化 |
| | `feature-flag.decorator.ts` | @FeatureFlag() 特性开关装饰器 |
| **Filters** | `http-exception.filter.ts` | 全局异常过滤器 |
| **Interceptors** | `response.interceptor.ts` | 统一响应格式包装 |
| | `logging.interceptor.ts` | 请求日志拦截器 (Pino) |
| | `tracing.interceptor.ts` | OpenTelemetry 链路追踪 |
| | `metrics.interceptor.ts` | Prometheus 指标采集 |
| | `audit.interceptor.ts` | 审计日志拦截器 |
| **Pipes** | `sanitize.pipe.ts` | 输入清理管道 |
| **Utilities** | `pagination.ts` | 分页工具函数 |
| | `crypto.util.ts` | 加密工具 (bcryptjs) |
| | `cache.util.ts` | 缓存工具函数 |
| | `error-codes.ts` | 错误码常量 |
| | `business.exception.ts` | 业务异常类 |
| | `request-context.ts` | 请求上下文 (AsyncLocalStorage) |

### prisma/ — 数据库层

- **PrismaService**: 继承 `PrismaClient`，实现 `OnModuleInit` / `OnModuleDestroy`
- 慢查询监控：默认阈值 500ms (环境变量 `PRISMA_SLOW_QUERY_MS`)
- 连接池管理：通过 PrismaClient 内置连接池
- 事件监听：`query` 事件检测慢查询，`warn` / `error` 级别日志

### redis/ — 缓存层

- **RedisService**: 封装 ioredis 客户端
- 连接降级：Redis 不可用时自动降级为内存 `Map`
- 支持操作：get/set/del/ttl, JSON 序列化, 批量 mget, 分布式锁 (setNX), Set 操作, 限流 (incrWithTtl Lua 脚本)
- 缓存清理：`delByPattern` 使用 SCAN 迭代删除

### 全局中间件链 (在 main.ts 中注册)

```
Request
  → Helmet (安全头)
  → Compression (响应压缩)
  → TracingInterceptor (链路追踪)
  → LoggingInterceptor (请求日志)
  → ResponseInterceptor (统一响应格式)
  → RedisThrottleGuard (分布式限流)
  → AllExceptionsFilter (全局异常)
  → ValidationPipe (参数校验: whitelist + transform + forbidNonWhitelisted)
  → Controller
```

## 模块目录 (46 个业务模块)

### 核心业务模块

| 模块 | Controller | Service | DTO | 职责 |
|------|-----------|---------|-----|------|
| mini | ✓ | ✓ | ✓ | 小程序首页聚合 |
| content | ✓ | ✓ | ✓ | 内容管理 (图文/音频) |
| classic | ✓ | ✓ | ✓ | 古籍阅读 |
| course | ✓ | ✓ | ✓ | 课程系统 |
| circle | ✓ | ✓ | ✓ | 圈子社区 |
| shop | ✓ | ✓ + 支付/物流 | ✓ | 商城/支付 (微信/支付宝/银联) |
| paipan | ✓ | ✓ | ✓ | 八字排盘 (接入 BaziEngine) |
| article | ✓ | ✓ | ✓ | 文章 |
| ebook | ✓ | ✓ | ✓ | 电子书 |
| live | ✓ | ✓ | ✓ | 直播 |
| video | ✓ | ✓ + vod | ✓ | 短视频 |
| interaction | ✓ | ✓ | ✓ | 互动 (点赞/评论/收藏) |
| search | ✓ | ✓ | - | 全局搜索 |
| recommend | ✓ + rule + ab-test | 8个service + 7种策略 | ✓ | 推荐引擎 |
| ai | ✓ | ✓ | ✓ | AI 能力 (翻译/情感分析) |
| bot | ✓ | ✓ + coze | ✓ | 机器人/Coze 集成 |
| comment | ✓ | ✓ | ✓ | 评论系统 |
| tts | ✓ | ✓ | ✓ | 语音合成 |
| question | ✓ | ✓ | ✓ | 问答系统 |
| call | ✓ | ✓ + trtc | ✓ | 音视频通话 |
| upload | ✓ | ✓ + COS | - | 文件上传 |
| offline | ✓ | ✓ | ✓ | 线下活动 |

### 用户与权限

| 模块 | Controller | Service | DTO | 职责 |
|------|-----------|---------|-----|------|
| auth | ✓ | ✓ + wechat | ✓ | 认证 (微信登录/手机号) |
| user | ✓ | ✓ | ✓ | 用户管理 |
| identity | ✓ | ✓ | ✓ | 实名认证 |

### 运营与管理

| 模块 | Controller | Service | DTO | 职责 |
|------|-----------|---------|-----|------|
| dashboard | ✓ | ✓ | - | 数据看板 |
| marketing | ✓ | ✓ | ✓ | 营销管理 |
| risk-control | ✓ | ✓ | ✓ | 风控中心 |
| finance | ✓ | ✓ | ✓ | 财务管理 |
| revenue | ✓ | ✓ | - | 收入管理 |
| commission | ✓ | ✓ | ✓ | 佣金分账 |
| system | ✓ + import | ✓ + export + import | ✓ | 系统配置 |
| audit | ✓ | ✓ + 敏感词 + 举报 | ✓ | 审计日志 |
| notification | ✓ | ✓ + push + 企微 | ✓ | 消息推送 |

### 基础支撑模块

| 模块 | Controller | Service | DTO | 职责 |
|------|-----------|---------|-----|------|
| coin | ✓ | ✓ | ✓ | 虚拟币充值 |
| im | ✓ | ✓ | ✓ | 即时通讯 |
| institute | ✓ | ✓ | ✓ | 机构管理 |
| map | ✓ | ✓ | - | 地图定位 |
| email | ✓ | ✓ | ✓ | 邮件服务 |
| sms | ✓ | ✓ | ✓ | 短信服务 |
| station | ✓ | ✓ | ✓ | 多站点管理 |
| health | ✓ | - | - | 健康检查 |
| webhook | ✓ | ✓ | - | Webhook 回调 |
| websocket | gateway | ws-auth | - | WebSocket 网关 |
| metrics | ✓ | ✓ (common/) | - | Prometheus 指标暴露 |
| feature-flag | ✓ | ✓ | ✓ | 特性开关管理 |

## 推荐引擎架构 (recommend 模块)

```
recommend/
├── recommend.controller.ts       # 主推荐接口
├── recommend-rule.controller.ts  # 推荐规则管理
├── ab-test.controller.ts         # A/B 测试接口
├── recommend.service.ts          # 推荐主服务 (编排各策略)
├── strategies/                   # 推荐策略 (7种)
│   ├── base.strategy.ts          # 策略基类
│   ├── collaborative.strategy.ts # 协同过滤
│   ├── user-profile.strategy.ts  # 用户画像
│   ├── tag-match.strategy.ts     # 标签匹配
│   ├── vector-recall.strategy.ts # 向量召回 (OpenAI Embedding)
│   ├── search-hot.strategy.ts    # 搜索热点
│   ├── cross-sell.strategy.ts    # 交叉销售
│   └── mixed.strategy.ts         # 混合策略
├── services/                     # 支撑服务
│   ├── behavior.service.ts       # 用户行为
│   ├── cold-start.service.ts     # 冷启动
│   ├── context-builder.service.ts# 上下文构建
│   ├── dedup.service.ts          # 去重
│   ├── rule.service.ts           # 规则
│   ├── scoring.service.ts        # 评分
│   └── ab-test.service.ts        # A/B 测试
├── cache/
│   └── recommend-cache.service.ts
└── tasks/                        # 定时任务
    ├── trend-calc.task.ts        # 趋势计算
    ├── ctr-calc.task.ts          # CTR 计算
    ├── user-interest.task.ts     # 用户兴趣挖掘
    └── collab-matrix.task.ts     # 协同矩阵更新
```

## 数据流

```
Request
  → Helmet (安全头) + Compression (压缩)
  → TracingInterceptor (OpenTelemetry 链路追踪)
  → LoggingInterceptor (Pino 请求日志)
  → ResponseInterceptor (统一响应格式: { code, data, message })
  → RedisThrottleGuard (分布式限流, incrWithTtl Lua脚本)
  → AllExceptionsFilter (全局异常 → 统一错误响应)
  → ValidationPipe (class-validator: whitelist + transform + forbidNonWhitelisted)
  → Controller
    → @UseGuards: JwtAuthGuard (JWT验证) / RolesGuard (角色权限) / FeatureFlagGuard (特性开关)
    → @Decorators: @Roles() / @Audit() / @StationId()
    → Service (业务逻辑)
      → PrismaService (PostgreSQL)
      → RedisService (缓存/限流)
      → 外部服务 (微信/支付宝/银联/腾讯云/OpenAI/Coze)
```

## GraphQL 层

独立的 GraphQL 模块 (`graphql/`)，提供内容/圈子/商城/用户/直播的 GraphQL 查询。通过 `app-graphql.module.ts` 桥接，可根据部署需求选择 REST 或 GraphQL 模式启动。

## 可观测性

- **日志**: Pino (结构化 JSON 日志), LoggingInterceptor 记录请求/响应
- **链路追踪**: OpenTelemetry SDK, 自动埋点 (HTTP, Express, ioredis, pg)
- **指标**: Prometheus (prom-client), `/metrics` 端点暴露
- **审计**: AuditInterceptor + @Audit() 装饰器记录敏感操作

## 测试策略

- **单元测试**: `*.spec.ts` (Jest), 每个模块有对应的 spec 文件
- **DTO 测试**: `*.dto.spec.ts` 验证 class-validator 装饰器
- **E2E 测试**: `test/*.e2e-spec.ts` (Supertest)
- **性能测试**: `tests/performance/k6/` (k6, 52+ 端点覆盖)

## 关键依赖 (外部服务)

| 服务 | 用途 | 集成方式 |
|------|------|---------|
| 微信开放平台 | 微信登录/支付/消息推送 | SDK + API |
| 支付宝 | 支付 | alipay-sdk |
| 银联 | 支付 | unionpay-sdk |
| 腾讯云 COS | 对象存储 | cos-nodejs-sdk-v5 |
| 腾讯云 IM | 即时通讯 | tls-sig-api-v2 |
| 腾讯云 TRTC | 音视频通话 | trtc-sdk |
| 腾讯云 VOD | 视频点播 | 原生 API (TC3签名) |
| 腾讯云 FaceID | 实名认证 | 原生 API (TC3签名) |
| OpenAI / DeepSeek | Embedding / AI 能力 | API |
| Coze | 机器人 | API |
