# 国学传统文化综合平台 — 技术方案与实施计划

## 项目概述
国学传统文化综合平台，涵盖经典阅读、诗词赏析、传统文化知识学习等功能。

## 技术架构

### 整体架构
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   UniApp     │  │   Vue3       │  │   未来的      │
│   移动端      │  │   管理后台    │  │   小程序      │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │ RESTful API
                  ┌──────▼────────┐
                  │   NestJS      │
                  │   后端服务     │
                  └──────┬────────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
     ┌──────▼──┐  ┌──────▼──┐  ┌──────▼──────┐
     │PostgreSQL│  │  Redis  │  │ 腾讯云 IM    │
     └──────────┘  └─────────┘  └─────────────┘
```

### 技术选型

| 层 | 技术 | 版本 | 说明 |
|----|------|------|------|
| 移动端 | UniApp (Vue3) | 最新 | 一套代码跨 iOS/Android/小程序 |
| 管理后台 | Vue3 + Vite + TS | 最新 | Element Plus UI |
| 后端 | NestJS | 10.x | 模块化 Node.js 框架 |
| ORM | Prisma | 最新 | 类型安全的数据库访问 |
| 数据库 | PostgreSQL | 16 | 主数据存储 |
| 缓存 | Redis | 7 | 会话缓存、热点数据 |
| 包管理 | pnpm workspace | 10.x | monorepo 管理 |
| IM | 腾讯云 IM | 最新 | 即时通讯 |
| 云服务 | 腾讯云 | - | IM、COS（文件存储）、短信 |

### 项目目录结构
```
guoxue-platform/
├── pnpm-workspace.yaml        # monorepo 配置
├── package.json                # 根 package.json
├── .gitignore
├── .github/
│   └── workflows/              # CI/CD
├── docker/
│   ├── docker-compose.yml      # 开发环境服务
│   └── Dockerfile              # 生产镜像
├── apps/
│   ├── mobile/                 # UniApp 移动端
│   │   ├── src/
│   │   │   ├── pages/          # 页面
│   │   │   ├── components/     # 组件
│   │   │   ├── api/            # 接口请求
│   │   │   ├── store/          # 状态管理 (pinia)
│   │   │   ├── utils/          # 工具函数
│   │   │   └── App.vue
│   │   ├── manifest.json
│   │   ├── pages.json
│   │   └── package.json
│   ├── admin/                  # Vue3 管理后台
│   │   ├── src/
│   │   │   ├── views/          # 页面
│   │   │   ├── components/     # 组件
│   │   │   ├── api/            # 接口
│   │   │   ├── router/         # 路由
│   │   │   ├── store/          # 状态
│   │   │   └── App.vue
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── server/                 # NestJS 后端
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/       # 认证模块
│       │   │   ├── user/       # 用户模块
│       │   │   ├── content/    # 内容模块
│       │   │   ├── im/         # IM 模块
│       │   │   └── upload/     # 文件上传
│       │   ├── common/         # 公共（守卫、拦截器、装饰器）
│       │   ├── config/         # 配置
│       │   ├── prisma/         # Prisma 服务+模型
│       │   └── main.ts
│       ├── prisma/
│       │   └── schema.prisma
│       ├── test/
│       └── package.json
└── packages/
    └── shared/                 # 共享类型、常量、工具
        ├── src/
        │   ├── types/          # TS 类型定义
        │   ├── constants/      # 常量
        │   └── utils/          # 通用工具
        └── package.json
```

## 数据模型（核心表）

### User 用户
- id, phone, email, nickname, avatar, role(USER/ADMIN), status, createdAt, updatedAt

### Auth 认证
- id, userId, provider(WECHAT/PASSWORD), openId?, passwordHash?, createdAt

### Content 内容
- id, title, type(ARTICLE/POEM/CLASSIC), body, excerpt, author, dynasty?, tags[], coverUrl, status(DRAFT/PUBLISHED), viewCount, createdAt, updatedAt

### Favorite 收藏
- id, userId, contentId, createdAt

## API 设计（v1 核心接口）

### 认证
- POST /api/v1/auth/login — 密码登录
- POST /api/v1/auth/wechat-login — 微信登录
- POST /api/v1/auth/register — 注册
- POST /api/v1/auth/refresh — 刷新 token
- GET  /api/v1/auth/me — 当前用户信息

### 内容
- GET    /api/v1/contents — 内容列表（分页、搜索、筛选）
- GET    /api/v1/contents/:id — 内容详情
- POST   /api/v1/contents — 创建内容（管理端）
- PUT    /api/v1/contents/:id — 更新内容（管理端）
- DELETE /api/v1/contents/:id — 删除内容（管理端）

### 用户
- GET  /api/v1/users/profile — 个人信息
- PUT  /api/v1/users/profile — 更新个人信息
- GET  /api/v1/users/favorites — 我的收藏

### IM
- POST /api/v1/im/user-sig — 获取腾讯云 IM UserSig

## 实施阶段

### P0 基建（第 1-2 周）✅
- [x] WSL2 + Docker 环境安装
- [x] Git SSH Key + GitHub 私有仓库
- [x] 项目 monorepo 结构初始化
- [x] Docker Compose（PostgreSQL + Redis）
- [x] Prisma schema 定义 + 迁移
- [x] NestJS 基础搭建 +auth 模块
- [x] UniApp 项目初始化
- [x] Vue3 管理后台初始化

### P1 核心功能（第 3-6 周）✅
- [x] 用户注册/登录（密码 + 微信 OAuth）
- [x] 内容 CRUD API + 管理后台
- [x] UniApp 首页 + 内容浏览
- [x] 内容搜索 + 分类浏览
- [x] 收藏功能
- [x] 腾讯云 IM 接入

### P2 增强 ✅
- [x] 内容推荐算法
- [x] 评论系统
- [x] 社区功能
- [x] 音频朗读（TTS）
- [x] 小程序发布
- [x] E2E 测试覆盖（16 suites / 163 tests）
- [x] 数据库播种 + 重置脚本
- [x] CI/CD 流水线（ci.yml + deploy.yml + perf.yml）
- [x] 性能压测基础设施（k6 + 5种场景）

### P3 生产就绪
- [x] 可观测性 — Pino 结构化日志 + traceId + Prometheus /metrics
- [x] 限流与防护 — Redis 分布式限流 + 内存降级
- [x] API 文档完善 — 100% Swagger 覆盖（42 控制器 / 439 端点）
- [x] 安全加固 — CSP / HSTS / CORS / 安全头 / ValidationPipe
- [x] 灰度发布与功能开关 — FeatureFlag 模型 + Redis 缓存 + @RequireFeature 装饰器 + 百分比灰度
- [x] E2E 测试 Docker 环境 — docker-compose.test.yml + Dockerfile.test
- [x] OpenTelemetry 链路追踪（OTLP → Jaeger/Tempo，tracing.ts + TracingInterceptor）
- [ ] 管理后台核心页面（Trae 负责 — Claude 不涉及）
- [x] 生产部署文档 + Runbook（apps/server/docs/DEPLOYMENT.md）

### P4 自动化运营基建
- [x] CLAUDE.md 数字员工角色 + 自动化规范
- [x] 自动化基建规范文档（docs/automation-infrastructure.md）
- [x] 任务池数据模型 + API（Prisma schema + TaskModule）
- [x] 统一角色权限体系（Permission/Role 模型 + PermissionGuard）
- [x] 一键接管开关（AutomationGuard + Toggle API + Redis 缓存）
- [x] 操作审计与回滚（AuditLog 模型 + AuditInterceptor 已存在，补充 rollback API）
- [x] 定时任务框架（Cron Webhook + 运营简报生成）
- [x] 高可用部署（云服务器初始化脚本 + GitHub Actions CI/CD + 健康检查 + 自动回滚 + 监控栈 + systemd 自启动）
- [ ] Vercel + GitHub 自动部署（等前端就绪）

### P4 增强基础设施 ✅ (2026-05-13)
- [x] BullMQ 消息队列 + PostgreSQL 读副本 + Redis Sentinel HA
- [x] 数据库复合索引优化（3 个 migration）
- [x] AI Gateway 模块（多模型路由/RAG/向量服务/客服）
- [x] 圈子智能体 + 知识库 + 经典问答 + Smart Feed
- [x] 监控栈：Tempo OTLP + Blackbox Exporter + 2 仪表盘

### P5 代码质量 ✅ (2026-05-13)
- [x] CI/CD 全链路修复 + 测试覆盖率 V8 provider
- [x] ErrorCode 全面迁移（33 service）+ ESLint 收紧 + Prettier
- [x] pnpm overrides 安全补丁 + SECURITY.md

### P6 开发体验 ✅ (2026-05-13)
- [x] quick-start.sh + dev-setup.sh + 种子营销数据 + 管理后台审查

### P7 运维 + 移动端 ✅ (2026-05-13)
- [x] db-ops.sh（备份/恢复/校验/调度）+ k6-run.sh（6场景+HTML报告）
- [x] 移动端 API 补充 5 模块（营销/AI/会员/同城）

### 当前统计 (2026-05-13)
- 后端：50+ 模块，400+ API，171 suites，2318 tests
- 管理后台：97 视图，vue-tsc 零错误
- 监控：Prometheus + Loki + Tempo + Grafana（7 仪表盘）
- 运维：6 脚本 | CI/CD：3 流水线 + k6 五场景
