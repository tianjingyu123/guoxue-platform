# 热卜国学平台 — 后端项目目录结构与分层说明

## 顶层结构

```
guoxue-platform/
├── apps/server/          # NestJS 后端服务
├── apps/admin/           # Vue3 管理后台（Trae）
├── apps/mobile/          # UniApp 多端（Trae）
├── packages/
│   ├── bazi-engine/      # 八字排盘计算引擎
│   ├── ziwei-engine/     # 紫微斗数计算引擎
│   └── shared/           # 共享类型/常量 (@guoxue/shared)
├── docker/               # Docker Compose + Dockerfile
├── tests/performance/    # k6 性能压测
├── prisma/               # 数据库 Schema 与迁移
└── docs/                 # 文档与需求
```

## apps/server/src/ 分层

```
src/
├── main.ts                    # 应用入口：Bootstrap + 全局配置
├── app.module.ts              # 根模块：注册所有 41 个业务模块
├── app-graphql.module.ts      # GraphQL 入口（AppModule + GqlModule）
├── tracing.ts                 # OpenTelemetry 分布式追踪
│
├── common/                    # 全局公共层（横切关注点）
│   ├── jwt-auth.guard.ts          # JWT 认证守卫
│   ├── jwt.strategy.ts            # Passport JWT 策略
│   ├── roles.guard.ts             # 角色权限守卫
│   ├── roles.decorator.ts         # @Roles 装饰器
│   ├── throttle.guard.ts          # 内存限流守卫（旧）
│   ├── redis-throttle.guard.ts    # Redis 分布式限流守卫（新）
│   ├── feature-flag.decorator.ts  # @RequireFeature 装饰器
│   ├── feature-flag.guard.ts      # 功能开关守卫
│   ├── logging.interceptor.ts     # 请求日志拦截器（traceId）
│   ├── response.interceptor.ts    # 统一响应格式 { code, msg, data }
│   ├── metrics.service.ts         # Prometheus 指标采集
│   ├── metrics.interceptor.ts     # HTTP 指标拦截器
│   ├── http-exception.filter.ts   # 全局异常过滤器
│   ├── business.exception.ts      # 业务异常类
│   ├── error-codes.ts             # 错误码定义
│   ├── pagination.ts              # 分页工具
│   ├── request-context.ts         # AsyncLocalStorage 请求上下文
│   ├── sanitize.pipe.ts           # XSS 净化 Pipe
│   ├── station-id.decorator.ts    # @StationId 分站数据隔离
│   ├── audit.decorator.ts         # @Audit 审计日志
│   ├── audit.interceptor.ts       # 审计拦截器
│   ├── crypto.util.ts             # AES 加解密工具
│   └── cache.util.ts              # 缓存工具
│
├── config/                    # 配置层
│   ├── app.config.ts              # 应用配置（端口、CORS 等）
│   ├── tencent-cloud.config.ts    # 腾讯云各产品凭证
│   ├── coze.config.ts             # Coze 智能体平台配置
│   └── payment.config.ts          # 微信/支付宝/银联支付配置
│
├── prisma/                    # 数据访问层
│   ├── prisma.service.ts          # Prisma 客户端封装（慢查询日志）
│   └── prisma.module.ts           # 全局 Prisma 模块
│
├── redis/                     # 缓存层
│   ├── redis.service.ts           # Redis 服务（ioredis + 内存降级）
│   └── redis.module.ts            # 全局 Redis 模块
│
├── graphql/                   # GraphQL 层
│   └── graphql.module.ts          # @nestjs/graphql 配置
│
└── modules/                   # 业务模块层（42 个模块）
    ├── auth/                 # 认证（手机/微信/小程序登录）
    ├── user/                 # 用户（资料/角色/关注/统计）
    ├── circle/               # 圈子（CRUD/成员/帖子/达人）
    ├── article/              # 文章（CRUD/审核/首页推送/推荐卡）
    ├── content/              # 内容管理（批量审核/统计/精选）
    ├── course/               # 课程（章节/进度/作业/评价/购买）
    ├── classic/              # 古籍（书籍/章节/进度/书签）
    ├── shop/                 # 商城（商品/SKU/订单/支付/优惠券/物流）
    ├── live/                 # 直播（房间/推拉流/麦位/秒杀/课件）
    ├── video/                # 短视频（CRUD/VOD/商品关联）
    ├── bot/                  # 智能体（Coze 集成/知识库/流式对话）
    ├── paipan/               # 排盘（八字/紫微 + AI 解盘）
    ├── recommend/            # 推荐引擎（场景路由/规则/打分/A/B实验）
    ├── search/               # 搜索（全局/热门/建议/历史）
    ├── notification/         # 通知（推送/批量/偏好/企业微信）
    ├── im/                   # 即时通讯（腾讯云 IM/群组/好友）
    ├── call/                 # 连麦（TRTC 音视频/按分钟扣费）
    ├── question/             # 付费问答（提问/回答/围观）
    ├── coin/                 # 虚拟币（充值/消费/礼物/流水）
    ├── station/              # 分站（品牌/运营/跨小程序）
    ├── commission/           # 分佣（配置/收益/提现/推荐链接）
    ├── revenue/              # 收益分账（汇总/趋势/平台总览）
    ├── offline/              # 线下驿站（课程/报名/商品/师资/结算）
    ├── institute/            # 研究院（成员/任务/活动排期）
    ├── interaction/          # 互动（点赞/收藏/关注/举报）
    ├── comment/              # 评论（CRUD/审核/批量管理）
    ├── dashboard/            # 运营看板（收入/实时数据）
    ├── system/               # 系统配置（KV/维护/Banner/导出导入）
    ├── audit/                # 审核（审计日志/CMS 内容审核/敏感词）
    ├── upload/               # 文件上传（COS/校验）
    ├── sms/                  # 短信服务（发送/校验）
    ├── email/                # 邮件服务（SMTP/模板）
    ├── tts/                  # 语音合成（文本→音频）
    ├── ai/                   # AI 能力（ASR/OCR/NLP/翻译）
    ├── identity/             # 实名认证（身份证 OCR/人脸核身）
    ├── map/                  # 地图 LBS（POI 搜索/路线/地理编码）
    ├── mini/                 # 小程序专供（首页聚合/内容流）
    ├── websocket/            # WebSocket（AppGateway + 连接鉴权）
    ├── webhook/              # Webhook（订阅/分发/重试）
    ├── health/               # 健康检查（DB + Redis）
    ├── metrics/              # Prometheus 指标
    ├── feature-flag/         # 功能开关管理
    └── ─── (待建: ebook/)    # 电子书模块
```

## 单模块内部结构（以 course 为例）

```
modules/course/
├── course.module.ts      # NestJS Module 定义
├── course.controller.ts  # 路由控制器（@Get/@Post/@Put/@Delete）
├── course.service.ts     # 业务逻辑层
├── course.dto.ts         # 请求/响应 DTO（class-validator）
└── *.spec.ts             # 单元测试
```

## NestJS 分层职责

| 层 | 职责 | 示例 |
|:---|:---|:---|
| **Controller** | 路由绑定、参数校验、权限装饰器、响应序列化 | `@Post()`, `@UseGuards(JwtAuthGuard)` |
| **Service** | 业务逻辑、数据库操作、缓存策略、第三方 API 调用 | `this.prisma.course.findMany(...)` |
| **DTO** | 请求体验证（class-validator 装饰器）、Swagger 类型 | `@IsString()`, `@ApiProperty()` |
| **Guard** | 认证/鉴权/限流/功能开关 | `JwtAuthGuard`, `RoleGuard`, `ThrottleGuard` |
| **Interceptor** | 日志、指标、响应包装、审计 | `LoggingInterceptor`, `MetricsInterceptor` |
| **Filter** | 异常捕获、错误格式化 | `AllExceptionsFilter` |
| **Pipe** | 数据转换、净化、校验 | `ValidationPipe`, `SanitizePipe` |
| **Decorator** | 元数据标记 | `@Roles`, `@StationId`, `@RequireFeature` |

## 数据流（请求→响应）

```
HTTP Request
  → Compression Middleware
  → CORS Check
  → Security Headers Middleware
  → TracingInterceptor (OpenTelemetry span)
  → RedisThrottleGuard (限流)
  → LoggingInterceptor (traceId 注入)
  → JwtAuthGuard (认证)
  → RoleGuard (鉴权)
  → FeatureFlagGuard (功能开关)
  → ValidationPipe (参数校验)
  → Controller (路由匹配)
  → Service (业务逻辑)
    → PrismaService (数据库)
    → RedisService (缓存)
  → ResponseInterceptor (统一格式包装)
  → HTTP Response
```
