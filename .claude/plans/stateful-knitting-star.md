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

### P0 基建（第 1-2 周）
- [ ] WSL2 + Docker 环境安装
- [ ] Git SSH Key + GitHub 私有仓库
- [ ] 项目 monorepo 结构初始化
- [ ] Docker Compose（PostgreSQL + Redis）
- [ ] Prisma schema 定义 + 迁移
- [ ] NestJS 基础搭建 +auth 模块
- [ ] UniApp 项目初始化
- [ ] Vue3 管理后台初始化

### P1 核心功能（第 3-6 周）
- [ ] 用户注册/登录（密码 + 微信 OAuth）
- [ ] 内容 CRUD API + 管理后台
- [ ] UniApp 首页 + 内容浏览
- [ ] 内容搜索 + 分类浏览
- [ ] 收藏功能
- [ ] 腾讯云 IM 接入

### P2 增强（后续）
- [ ] 内容推荐算法
- [ ] 评论系统
- [ ] 社区功能
- [ ] 音频朗读（TTS）
- [ ] 小程序发布
