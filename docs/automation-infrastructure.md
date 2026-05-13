# 自动化运营基建规范

## 概述

本文档定义国学传统文化综合平台的自动化运营架构约束。所有后台功能开发必须遵守此规范，确保 Claude（数字员工）可与真人员工无缝协作、互替、接管。

## 核心原则

1. **全功能 API 化** — 所有管理操作通过 API 暴露，不做纯网页点选式后台
2. **状态外置** — 任务状态存数据库，不存任何执行者脑内
3. **角色解耦** — 角色定义权限，执行者只是当前坐在角色上的人或 AI
4. **可撤销** — 所有关键操作可追溯、可回滚

---

## 一、任务池系统

### 数据模型

```prisma
enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TaskStatus {
  PENDING       // 待处理
  IN_PROGRESS   // 进行中
  COMPLETED     // 已完成
  NEEDS_REVIEW  // 需人工审核
  CANCELLED     // 已取消
}

enum TaskType {
  CODE_DEVELOP    // 代码开发
  BUG_FIX         // Bug 修复
  DATA_ANALYSIS   // 数据分析
  USER_FEEDBACK   // 用户反馈处理
  CONTENT_REVIEW  // 内容审核
  FINANCE_CHECK   // 财务核对
  SYSTEM_HEALTH   // 系统巡检
  SCHEDULED_TASK  // 定时任务
}

model Task {
  id            String       @id @default(uuid())
  type          TaskType
  priority      TaskPriority @default(MEDIUM)
  status        TaskStatus   @default(PENDING)
  title         String
  description   String?
  executorType  String       // "CLAUDE" | "HUMAN"
  executorId    String?      // Claude 实例 ID 或 用户 ID
  snapshot      Json?        // 任务数据快照（切换执行者时恢复现场）
  result        Json?        // 执行结果
  errorLog      String?      // 失败原因
  rollbackData  Json?        // 回滚所需数据
  rollbackUrl   String?      // 回滚 API 路径
  needsApproval Boolean      @default(false) // 高风险操作标记
  approvedBy    String?      // 审批人 ID
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  completedAt   DateTime?

  @@index([status])
  @@index([executorType, status])
  @@index([priority])
}

// 任务流转日志
model TaskTransferLog {
  id         String   @id @default(uuid())
  taskId     String
  fromType   String   // "CLAUDE" | "HUMAN"
  fromId     String?
  toType     String   // "CLAUDE" | "HUMAN"
  toId       String?
  reason     String   // 转交原因
  snapshot   Json?    // 转交时的任务状态快照
  createdAt  DateTime @default(now())

  @@index([taskId])
}
```

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/tasks | 任务列表（分页、筛选） |
| POST | /api/v1/tasks | 创建任务 |
| GET | /api/v1/tasks/:id | 任务详情 |
| PUT | /api/v1/tasks/:id | 更新任务状态 |
| POST | /api/v1/tasks/:id/claim | 认领任务 |
| POST | /api/v1/tasks/:id/transfer | 转交任务 |
| POST | /api/v1/tasks/:id/force-reclaim | 强制收回（管理员） |
| POST | /api/v1/tasks/:id/approve | 审批通过 |
| POST | /api/v1/tasks/:id/reject | 审批拒绝 |
| POST | /api/v1/tasks/:id/rollback | 回滚操作 |

### 任务流转规则

```
Claude → needs_review → 在线真人
真人   → transfer     → Claude（自动处理）
管理员 → force_reclaim → 无论当前谁持有，强制踢回池子
人工   → 下班/离线     → 自动标记 needs_review，Claude 接管
```

---

## 二、统一角色权限体系

### 设计原则

- 角色不分"人工角色"和"AI角色"
- 每个角色定义权限集，执行者可以是 Claude 实例或真人用户
- Claude 与真人平级，不设超级权限

### 数据模型

```prisma
model Role {
  id          String       @id @default(uuid())
  name        String       @unique  // "运营主管", "客服专员", "数字员工"
  description String?
  permissions Permission[] // 角色拥有的权限列表
  users       UserRole[]   // 分配到该角色的用户
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model UserRole {
  id        String   @id @default(uuid())
  userId    String
  roleId    String
  role      Role     @relation(fields: [roleId], references: [id])
  isActive  Boolean  @default(true)  // 可临时冻结
  createdAt DateTime @default(now())

  @@unique([userId, roleId])
}

model Permission {
  id        String @id @default(uuid())
  roleId    String
  resource  String // "task", "user", "content", "finance", "system"
  action    String // "read", "write", "delete", "approve", "manage"
  role      Role   @relation(fields: [roleId], references: [id])

  @@unique([roleId, resource, action])
}
```

### Claude 默认权限集（数字员工角色）

| 资源 | 权限 |
|------|------|
| task | read, write（不包含 delete） |
| content | read, write（创建/更新，不包含删除） |
| user | read（只读） |
| system | read（只读监控数据） |
| finance | read（只读报表） |

> 删除、退款、价格变更等高危操作不在 Claude 默认权限内，需走审批流。

---

## 三、一键接管开关

### API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/system/automation/status | 查询当前自动化状态 |
| POST | /api/v1/system/automation/toggle | 开/关自动化 |

### 行为定义

```
开关 ON  → Claude 全权限工作（读写）
开关 OFF → Claude 权限降为只读，所有写操作拒绝
           已在进行中的任务自动标记为 needs_review
           真人可逐任务接管
```

### 实现

- `AutomationGuard` — 全局守卫，检查 `system_config` 表中的 `automation_enabled` 字段（Redis 缓存）
- 权限降级逻辑封装在 `PermissionService.canWrite()` 中

---

## 四、操作审计与回滚

### 审计日志模型

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  executor   String   // "CLAUDE" | 用户 ID
  action     String   // 操作类型
  resource   String   // 操作对象 "task:123", "user:456"
  detail     Json     // 操作详情
  ip         String?
  rollbackId String?  // 对应的回滚记录 ID
  createdAt  DateTime @default(now())

  @@index([executor])
  @@index([resource])
  @@index([createdAt])
}
```

### 回滚机制

- 关键操作（删除、批量修改、财务变更）执行前自动保存快照到 `AuditLog.detail.beforeSnapshot`
- 回滚接口：`POST /api/v1/system/rollback/:auditLogId`
- Claude 执行的操作均可一键回滚

---

## 五、定时任务框架

### 架构

```
定时触发（Vercel Cron / 阿里云函数计算）
  → 调用后台 Webhook：POST /api/v1/webhook/cron/:jobName
    → Claude 分析 + 决策
      → 通过 API 执行操作
        → 写入 AuditLog
```

### 预定义任务

| 任务名 | 频率 | 说明 |
|--------|------|------|
| health_check | 每 5 分钟 | 数据库连接、Redis、API 响应时间 |
| daily_report | 每天 8:00 | 前一日运营简报（用户、收入、内容、异常） |
| content_audit | 每 30 分钟 | 新发布内容自动审核 |
| user_growth | 每天 9:00 | 用户增长趋势分析 |
| feedback_process | 每 10 分钟 | 未处理用户反馈自动回复/分类 |
| db_backup_check | 每天 3:00 | 验证数据库备份完整性 |

### 简报输出格式

```
━━━━━━━━━━━━━━━━━━━━
国学平台运营日报 (2026-05-13)
━━━━━━━━━━━━━━━━━━━━
📊 核心指标
  日活: 1,234 ↑12%
  新增用户: 56
  付费订单: 23 笔，¥1,234
  内容发布: 12 篇

⚠️ 异常告警
  · API /api/v1/paipan 响应时间 3.2s（阈值 2s）
  · Redis 内存使用 87%（接近上限）

🔧 自动处理
  · 内容审核通过 10 篇，驳回 2 篇
  · 回复用户反馈 8 条

👤 待人工处理
  · 退款申请 #2345 — 金额 ¥299
  · 内容争议 #3456 — 用户投诉
━━━━━━━━━━━━━━━━━━━━
```

---

## 六、高可用部署架构

```
┌─────────────────────────────────┐
│           PostgreSQL            │
│     任务池 + 配置 + 审计         │
└──────────┬──────────────────────┘
           │
    ┌──────┴──────┐
    ▼              ▼
┌─────────┐  ┌─────────┐
│ 阿里云 ECS  │  │ 本地 PC   │
│ Claude 主   │  │ Claude 备 │
│ 7×24 在线   │  │ 随启随用   │
└──────┬─────┘ └──────┬─────┘
       │              │
       └──────┬───────┘
              ▼
      ┌──────────────┐
      │  GitHub 仓库   │
      │ 代码+配置+计划 │
      └──────────────┘

启动流程：git clone → npm install → claude → 自动读 CLAUDE.md → 苏醒干活
```

---

## 实施优先级

| 阶段 | 内容 | 关键交付物 |
|------|------|-----------|
| **P0 基建后期** | 任务池数据模型 + API、角色权限模型 | 3 张新表 + 10+ 端点 |
| **P1 上线前** | 审计日志、一键接管开关 | AutomationGuard + Toggle API |
| **P2 上线后** | 定时任务框架、运营简报 | Cron Webhook + 报表 |
| **P3 运营期** | 高可用双活、自动回滚 | 云服务器部署 + 监控告警 |
