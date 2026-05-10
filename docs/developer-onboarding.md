# 热卜国学平台 — 开发者 Onboarding 指南

> 更新时间：2026-05-11 | 面向新加入项目的后端/全栈开发者

## 一、快速开始（15 分钟）

### 1.1 环境要求

| 工具 | 最低版本 | 说明 |
|------|---------|------|
| Node.js | ≥ 20 | 运行时 |
| pnpm | ≥ 10 | 包管理器（强制，不可用 npm/yarn） |
| PostgreSQL | 16 | 数据库 |
| Redis | 7 | 缓存/队列 |
| Docker Desktop | 最新 | 本地运行基础设施 |
| Git | 2.40+ | 版本控制 |

### 1.2 一键启动

```bash
# 1. 克隆仓库
git clone https://github.com/<org>/guoxue-platform.git
cd guoxue-platform

# 2. 安装依赖
pnpm install

# 3. 启动基础设施（PostgreSQL + Redis）
docker compose -f docker/docker-compose.dev.yml up -d

# 4. 复制环境变量
cp .env.example .env.development

# 5. 初始化数据库
pnpm db:migrate
pnpm db:generate

# 6. 可选：填充种子数据
pnpm --filter @guoxue/server exec npx ts-node prisma/seed.ts

# 7. 启动开发服务器
pnpm dev:server      # http://localhost:3000
pnpm dev:admin       # http://localhost:5173 (可选)
```

### 1.3 验证启动

```bash
# 健康检查
curl http://localhost:3000/api/v1/health

# Swagger 文档
open http://localhost:3000/api/docs

# 类型检查
pnpm typecheck

# 单元测试
pnpm test:server
```

## 二、项目结构地图

```
guoxue-platform/
├── apps/
│   ├── server/             ← 后端 NestJS (核心)
│   │   ├── prisma/
│   │   │   ├── schema.prisma    ← 55+ 模型定义
│   │   │   ├── migrations/      ← Prisma 迁移文件
│   │   │   └── seed.ts          ← 种子数据
│   │   ├── src/
│   │   │   ├── main.ts          ← 入口
│   │   │   ├── common/          ← 公共工具、守卫、拦截器
│   │   │   ├── config/          ← 配置模块
│   │   │   ├── modules/         ← 46 个业务模块
│   │   │   │   ├── auth/        ← 认证授权
│   │   │   │   ├── user/        ← 用户
│   │   │   │   ├── shop/        ← 商城/支付
│   │   │   │   ├── paipan/      ← 八字排盘
│   │   │   │   ├── ai/          ← AI 服务
│   │   │   │   ├── course/      ← 课程
│   │   │   │   ├── circle/      ← 圈子
│   │   │   │   ├── live/        ← 直播
│   │   │   │   ├── station/     ← 分站
│   │   │   │   └── ... (其余 36 个)
│   │   │   ├── prisma/          ← PrismaService 封装
│   │   │   └── redis/           ← RedisService 封装
│   │   └── test/                ← E2E 测试
│   ├── admin/               ← 管理后台 (Vue 3 + Vite)
│   └── mobile/              ← 移动端 (uni-app)
├── packages/
│   ├── bazi-engine/         ← 八字排盘引擎 (核心算法)
│   ├── ziwei-engine/        ← 紫微斗数引擎
│   └── shared/              ← 共享工具/类型
├── docs/                    ← 设计文档/运维文档
├── docker/                  ← Docker 配置 (dev/test/prod)
├── .github/workflows/       ← CI/CD
│   ├── ci.yml               ← 持续集成（lint/typecheck/test/build）
│   └── deploy.yml           ← 部署流水线
└── scripts/                 ← 运维脚本
```

## 三、开发规范

### 3.1 代码规范

| 规则 | 说明 |
|------|------|
| **语言** | TypeScript strict，禁止 `any`（特殊情况用 `unknown`） |
| **命名** | 文件名：kebab-case (`user-profile.service.ts`) |
| | 类名：PascalCase (`UserProfileService`) |
| | 函数/变量：camelCase (`getUserById`) |
| | 常量：UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`) |
| | 数据库字段：camelCase (`createdAt`, `userId`) |
| **格式化** | ESLint + Prettier (编辑器自动)，提交前自动执行 `precommit` |
| **导入顺序** | ① NestJS 核心 → ② 第三方库 → ③ 项目模块 (`../../common/`) → ④ 相对导入 (`./`) |
| **注释** | 用中文，仅解释为什么这么做（而非做了什么），不写废话注释 |
| **Swagger** | 所有 controller 端点必须用 `@ApiTags("中文名")` + `@ApiOperation({ summary: "中文描述" })` |

### 3.2 模块开发模板

```typescript
// ── 1. DTO ──
// apps/server/src/modules/feature/feature.dto.ts
import { IsString, IsOptional, IsInt } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateFeatureDto {
  @ApiProperty({ description: "名称" })
  @IsString()
  name: string;
}

export class FeatureQueryDto {
  @ApiPropertyOptional({ description: "页码" })
  @IsOptional()
  @IsInt()
  page?: number;
}

// ── 2. Service ──
// apps/server/src/modules/feature/feature.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class FeatureService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFeatureDto) {
    return this.prisma.feature.create({ data: dto });
  }
}

// ── 3. Controller ──
// apps/server/src/modules/feature/feature.controller.ts
import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { FeatureService } from "./feature.service";
import { CreateFeatureDto, FeatureQueryDto } from "./feature.dto";

@ApiTags("功能管理")
@Controller("api/v1/feature")
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Post()
  @ApiOperation({ summary: "创建功能" })
  create(@Body() dto: CreateFeatureDto) {
    return this.featureService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "功能列表" })
  findAll(@Query() query: FeatureQueryDto) {
    return this.featureService.findAll(query);
  }
}

// ── 4. Module ──
// apps/server/src/modules/feature/feature.module.ts
import { Module } from "@nestjs/common";
import { FeatureController } from "./feature.controller";
import { FeatureService } from "./feature.service";

@Module({
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],
})
export class FeatureModule {}

// ── 5. 测试 ──
// apps/server/src/modules/feature/feature.service.spec.ts
import { Test } from "@nestjs/testing";
import { FeatureService } from "./feature.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("FeatureService", () => {
  let service: FeatureService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FeatureService,
        { provide: PrismaService, useValue: { feature: { create: jest.fn() } } },
      ],
    }).compile();
    service = module.get(FeatureService);
    prisma = module.get(PrismaService);
  });

  it("应创建功能", async () => {
    const dto = { name: "测试" };
    (prisma.feature.create as jest.Mock).mockResolvedValue({ id: "1", ...dto });
    const result = await service.create(dto);
    expect(result.name).toBe("测试");
  });
});
```

### 3.3 单一 API 响应格式

```typescript
// 所有接口返回统一格式
{
  "code": 0,        // 0=成功, 非0=错误码
  "msg": "ok",
  "data": { ... }   // 业务数据
}

// 分页响应
{
  "code": 0,
  "msg": "ok",
  "data": {
    "list": [...],
    "total": 200,
    "page": 1,
    "pageSize": 20
  }
}
```

### 3.4 Git 提交规范

```
feat: 新功能
fix: 修复 Bug
docs: 文档变更
refactor: 重构
test: 测试
chore: 构建/工具
style: 格式（不影响代码逻辑）

示例：
feat: 补全电子书系统7个Prisma模型
fix: 修复 UnionPay SDK require() 导致 ESLint 报错
```

**分支命名：** `feat/<功能名>` / `fix/<问题描述>` / `docs/<内容>`

## 四、常用操作速查

### 4.1 数据库操作

```bash
# 创建迁移（修改 schema.prisma 后）
pnpm --filter @guoxue-server exec npx prisma migrate dev --name "描述变更内容"

# 仅重新生成 Prisma Client（不改迁移）
pnpm db:generate

# 在 Staging/Production 执行迁移
npx prisma migrate deploy --schema=apps/server/prisma/schema.prisma

# 打开 Prisma Studio（可视化数据库）
pnpm --filter @guoxue-server exec npx prisma studio

# 重置数据库（仅开发环境！）
pnpm --filter @guoxue-server exec npx ts-node prisma/reset.ts
```

### 4.2 测试

```bash
# 全部单元测试
pnpm test:server

# 单个文件
pnpm --filter @guoxue/server exec jest --config jest.config.ts src/modules/shop/shop.service.spec.ts

# 带覆盖率
pnpm test:coverage

# E2E 测试（需要 Docker 基础设施运行中）
pnpm test:e2e

# 仅运行特定 E2E 文件
pnpm --filter @guoxue/server exec jest --config jest.config.ts test/video.e2e-spec.ts --runInBand
```

### 4.3 代码质量

```bash
# 类型检查
pnpm typecheck

# Lint（报告问题）
pnpm lint

# Lint（自动修复）
pnpm lint:fix

# 提交前检查（自动执行 lint + typecheck）
pnpm precommit
```

### 4.4 Docker

```bash
# 启动开发基础设施
docker compose -f docker/docker-compose.dev.yml up -d

# 启动测试基础设施
docker compose -f docker/docker-compose.test.yml up -d

# 构建生产镜像
docker build -f docker/Dockerfile -t guoxue-platform .

# 查看日志
docker logs -f guoxue-postgres
docker logs -f guoxue-server
```

## 五、关键技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | NestJS 10+ | 后端框架 |
| ORM | Prisma 5.22 | 数据库 ORM |
| 数据库 | PostgreSQL 16 | 主数据库 |
| 缓存 | Redis 7 (ioredis) | 缓存 + BullMQ 队列 |
| 认证 | JWT + 微信 OAuth | Passport 策略 |
| API 文档 | Swagger (NestJS) | 自动生成 |
| 支付 | 微信支付 V3 + 银联 | 原生 API 对接 |
| AI | DeepSeek API + 腾讯云 AI | OpenAI 兼容 + TC3 签名 |
| 对象存储 | 腾讯云 COS | 文件/备份存储 |
| 消息推送 | 企业微信 Webhook + 微信模板消息 | 通知体系 |
| 实时通信 | WebSocket + 腾讯云 IM | 聊天/直播互动 |
| CI/CD | GitHub Actions | 自动化流水线 |
| 容器化 | Docker + GHCR | 构建/部署 |
| 监控 | Prometheus (prom-client) | 指标收集 |

## 六、关键业务概念

### 6.1 八字排盘

- **排盘引擎** (`packages/bazi-engine/`)：纯算法，输入生辰八字，输出四柱/十神/大运/流年
- **AI 解析** (`paipan-ai.service.ts`)：用 DeepSeek 对排盘结果做命理分析
- **分析维度**：GENERAL（综合）/ CAREER（事业）/ LOVE（感情）/ WEALTH（财运）/ HEALTH（健康）

### 6.2 分站体系

- **运营商 (Operator)**：总代理，按级别（SILVER/GOLD/DIAMOND/BLACK_GOLD）享不同分佣比例
- **分站 (Station)**：运营商下的独立品牌站点，可绑定独立小程序，推课/卖货赚佣金
- **线下场馆 (StationOffline)**：实体教学空间，排线下课程、管理学员

### 6.3 虚拟币体系

- 平台内部货币，用户充值/消费/奖励均走虚拟币
- 关键表：`VirtualCoinAccount`（账户余额）、`VirtualCoinTransaction`（流水）

### 6.4 FeatureFlag

- 灰度发布的核心机制（`FeatureFlag` 表）
- 按 `percentage` + `targetUserIds` 控制功能对谁可见
- 运营可在管理后台直接开关，无需重新部署

## 七、常见任务指南

### 7.1 新增一个 API 端点

1. 在对应模块的 `dto.ts` 中新增 DTO 类
2. 在 `service.ts` 中新增业务方法
3. 在 `controller.ts` 中新增路由 + Swagger 装饰器
4. 在 `service.spec.ts` 中新增测试用例
5. `pnpm typecheck && pnpm test:server` 验证

### 7.2 新增数据库表

1. 在 `prisma/schema.prisma` 末尾新增 model（参考现有模型风格）
2. `pnpm --filter @guoxue-server exec npx prisma migrate dev --name "描述"`
3. `pnpm db:generate`
4. 在 `prisma/reset.ts` 中添加表名（可选，用于开发重置）
5. 在 `prisma/seed.ts` 中添加种子数据（可选）

### 7.3 调试技巧

```bash
# 启动时附加调试器
pnpm --filter @guoxue/server exec nest start --debug --watch

# Chrome DevTools: chrome://inspect

# 查看 Prisma 生成的 SQL
export DEBUG="prisma:*"
pnpm dev:server
```

### 7.4 环境变量参考

| 变量 | 用途 | 必填 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 | ✅ |
| `REDIS_URL` | Redis 连接串 | ✅ |
| `JWT_SECRET` | JWT 签名密钥 | ✅ |
| `TENCENT_SECRET_ID/KEY` | 腾讯云 API 密钥 | ✅ |
| `DEEPSEEK_API_KEY` | DeepSeek AI API 密钥 | AI 功能需要 |
| `WECHAT_APP_ID/SECRET` | 微信小程序配置 | 微信登录需要 |
| `WECHAT_PAY_*` | 微信支付配置 | 支付功能需要 |
| `UNIONPAY_*` | 银联支付配置 | 银联支付需要 |

## 八、问题排查

### 8.1 CI 失败了怎么办

1. 查看 GitHub Actions 运行日志，定位失败的 job/step
2. 本地运行对应命令：`pnpm lint` / `pnpm typecheck` / `pnpm test:server`
3. 修复后 `git commit --allow-empty` 重新触发 CI

### 8.2 数据库迁移冲突

1. `pnpm --filter @guoxue-server exec npx prisma migrate status` 检查状态
2. 若迁移文件冲突：回退到主线迁移，重新 `migrate dev`
3. 若数据冲突：联系团队负责人，不要手动修改迁移文件

### 8.3 端口被占用

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

## 九、参考文档索引

| 文档 | 位置 | 适用场景 |
|------|------|---------|
| PRD | `docs/PRD.md` | 了解全部功能需求 |
| API 参考 | `docs/api-reference.md` | 查找接口路径/参数 |
| 后端架构 | `docs/backend-architecture.md` | 了解模块结构 |
| 部署检查清单 | `docs/deployment-checklist.md` | 上线前逐项确认 |
| 回滚预案 | `docs/rollback-plan.md` | 上线出问题时的操作 |
| 灾备方案 | `docs/disaster-recovery-plan.md` | 数据库损坏/机房故障 |
| CI/CD | `.github/workflows/` | 了解构建/部署流程 |
| 环境配置 | `docs/environment-config.md` | 多环境变量配置 |
| Swagger | http://localhost:3000/api/docs | 在线 API 浏览器 |

## 十、团队协作

- **后端/架构**：Claude (AI 辅助) — 核心后端开发、模块设计、架构文档
- **前端/小程序**：Trae — Vue 管理后台 + uni-app 移动端
- **UI 原型**：v0 — 快速 UI 原型生成

**协作规则**：
- 后端和前端开发者不操作同一文件，通过 API 契约协作
- 架构/公共代码变更（prisma/redis/common）需串行执行，禁止并行
- Claude 负责后端和架构，Trae 负责前端，v0 负责 UI，越界操作需要提醒
