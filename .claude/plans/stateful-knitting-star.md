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
- [x] 管理后台核心页面（2026-06-14 从Trae重新分配给Claude完成）
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
- [x] 前端自托管部署（2026-06-17 自建服务器 Nginx + GitHub Actions rsync 方案 + Actions 固定到 commit SHA，零额外费用）

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

### P8 AI智能体技术选型与搭建 ✅ 规划完成 (2026-05-14)

**需求文档：** `docs/requirements/智能选型与搭建方案.txt`

#### 8.1 统一AI网关增强 ✅ 全部完成
- [x] 多模型可配置路由（每个场景独立配置主/备模型）
- [x] 主备自动切换（超时>5秒AiTimeoutError触发，记录日志）
- [x] 灰度切换（按流量比例测试新模型）
- [x] 成本预算控制（按场景月度Token预算，超支降级）
- [x] 全量AI调用日志（场景/模型/Token/延迟/费用/状态）

#### 8.2 圈主助理RAG完善 ✅ 全部完成
- [x] 圈子专属知识库（pgvector，按circle_id隔离）
- [x] 6种内容来源入库（文章/课程/精华帖/热门帖/文件/手动投喂）
- [x] 三级去重机制（MD5哈希 + 向量相似度≥90% + 圈主确认）
- [x] 圈主审核后台（知识库管理模块 — 已入库/待确认/设置）
- [x] "添加到知识库"按钮（前端UI，Claude完成 2026-06-14）
- [x] RAG检索 + Prompt模板引擎 + 来源标注

#### 8.3 其他AI场景 ✅ 部分完成
- [x] 智能客服自研RAG（平台公共知识库 + 转人工 + 内容推荐卡片）
- [x] 智能搜索AI总结（Elasticsearch + DeepSeek生成总结）
- [x] 智能体广场（marketplace聚合API + Coze Bot管理）
- [x] AI封面图（腾讯云AI绘画 + fallback）/ 审核 / TTS（Edge TTS真实音频）/ ASR（腾讯云语音识别）

#### 8.4 数据库补充 ✅ 完成
- [x] circle_knowledge 表（知识库内容）
- [x] circle_knowledge_manual 表（圈主手动操作记录）
- [x] circle_knowledge_candidate 表（候选内容待确认）

### P9 战略升级与AI辅助运营 ✅ 规划完成 (2026-05-14)

**需求文档：** `docs/requirements/战略升级与AI辅助运营需求.txt`

#### 9.1 平台定位升级（P0）✅ 后端完成
- [x] 品类标签体系（10大一级品类 + 二级分类，config_system动态维护）
- [x] course/circle/product/article/post/video/ebook 表新增 category_level1/category_level2
- [x] 用户注册兴趣品类选择 + 个性化推荐（后端API已完成，前端待Trae）
- [x] 首页模块化配置（运营后台增删改模块）
- [x] 发现页品类导航 + "专栏"化展示（后端API已完成）
- [ ] 内容审核标准更新（运营政策任务，非代码）

#### 9.2 AI辅助内容运营（P0）✅ 全部完成
- [x] AI自动生成基础知识库（3-5篇/品类）
- [x] AI自动生成经典精华库（5-10条/品类）
- [x] AI自动生成玩法教程库（2-3篇/品类）
- [x] 内容自动存入草稿箱 + 运营审核后发布
- [x] 空板块检测与自动提醒

#### 9.3 虚拟运营机器人（P1）✅ 全部完成
- [x] 内容点赞机器人（新内容1-3赞）
- [x] 评论互动机器人（AI生成评论，标注"AI互动"）
- [x] 圈子签到机器人（低活跃圈每日话题帖）
- [x] 问题提问机器人（付费问答高质量问题）
- [x] 所有AI行为标注"AI生成"标签 + 后台独立开关

#### 9.4 自动化运营引擎（P1）✅ 全部完成
- [x] 内容轮换推荐（每日/每周定时更新首页）
- [x] 热门内容自动标记 + 推荐池
- [x] 关联推荐（浏览品类→推荐相关课程/圈子）
- [x] 新品填充（新品类上线自动填充内容）

#### 9.5 运营后台新增（P2）✅ 全部完成
- [x] 内容品类管理（标签CRUD + 健康度仪表盘）
- [x] AI运营引擎控制台（内容生成任务 + 机器人开关）
- [x] 内容推荐配置（首页模块 + 发现页专栏 + 权重）
- [x] 运营数据看板（品类数据 + AI运营效果追踪）

#### 9.6 三阶段运营策略
- [ ] 第一阶段（1-2周）：AI全权运营（上线后执行）
- [ ] 第二阶段（3-4周）：定向邀请创作者（上线后执行）
- [ ] 第三阶段（1-2月）：真人逐步接管（上线后执行）

### P10 智能化战略升级 📋 规划完成 (2026-05-15)

**战略文档：** `docs/ai-strategy-blueprint.md`

#### 10.1 现有技术最大化应用（P0）
- [x] AI Gateway 语义缓存上线（相似问题直接返回，降本50%+）
- [x] 流式响应全端统一（SSE → 前端一套代码适配所有模型）
- [x] 推荐引擎向量化升级（LLM 语义打标 + 每2小时自动打标任务）
- [x] AI 质量评分体系 V1（准确性/完整性/可读性/专业性 四维评分）
- [x] RAG 知识库第一层建设（30+部经典种子数据 + 智能分块 + 向量化管理端点）

#### 10.2 未来技术架构预留（P1）
- [x] 可插拔模型适配器完善（Claude/Qwen/本地模型 adapter 接口预留）
- [x] 多Agent协作框架预留（编排器 + 消息总线 + 工具调用协议）
- [x] 多模态API预留（语音识别/图片理解/图片生成/视频理解接口）
- [x] 端侧AI架构预留（小程序端智能重排 + 离线推理接口）

#### 10.3 智能化前后台规范（P0）
- [x] 前端 ChatUI 统一组件（气泡/流式输出/引用标注/AI标记水印，2026-06-14完成）
- [x] 所有AI调用统一走 AI Gateway（鉴权/限流/计费/日志/降级/缓存）
- [x] AI能力接口化标准（scene-based 路由 + Swagger标注 + 优雅降级链）
- [x] 数据飞轮指标埋点（8个 AI Prometheus 指标 + AiInsightService 聚合分析）

#### 10.4 RAG 知识引擎分层建设（P1-P2）
- [x] 第一层：经典原文库（30+部经典全文分块+向量化）
- [x] 第二层：学术解释库（名家注解/白话翻译/现代解读）
- [x] 第三层：八字命理专业知识库（古籍+算法+案例）
- [x] 第四层：UGC知识萃取（圈子精华帖/专家问答 → AI摘要入库）

### 当前统计 (2026-05-19)
- 后端：50+ 模块，420+ API，259 suites，3273 tests
- 管理后台：113 视图，vue-tsc 零错误，server tsc 零错误，ESLint 0 errors
- P8/P9 AI辅助运营体系完整闭环：内容生成→草稿审核→质量评估→运营引擎→机器人互动→发现页API
- P10 智能化战略规划完成：现有技术最大化→未来兼容扩展→三阶段演进路线图
- 监控：Prometheus + Loki + Tempo + Grafana（7 仪表盘）
- 运维：6 脚本 | CI/CD：3 流水线 + k6 五场景
