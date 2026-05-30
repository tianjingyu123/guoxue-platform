# 国学平台后台六大模块深度审查报告

> 审查范围：多分站架构、FeatureFlag、System配置、风控、Identity身份认证、Member会员
> 审查日期：2026-05-21
> 审查人：Explore-2

---

## 一、总体架构评价

### 1.1 架构发现：Tenant vs Station 概念混淆

**严重级别：P0**

项目中有两个独立的概念体系，容易混淆：

- **Tenant 模块**（`apps/server/src/modules/tenant/`）：实际是 **SaaS API 租户管理**，用于外部第三方通过 API Key 调用，管理配额消耗和重置。与 PRD 要求的"多分站"完全无关。
- **Station 模块**（`apps/server/src/modules/station/`）：这才是 PRD 要求的多分站体系（站长、品牌、推广码等）。

两个概念未打通：Station 表中没有 tenantId 字段，Tenant 表中没有 stationId 字段。

---

## 二、各模块详细审查

### 2.1 多分站数据隔离——核心发现

#### P0：StationId 获取方式存在严重安全隐患

文件：`apps/server/src/common/station-id.decorator.ts`

```typescript
export const StationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const headerId = request.headers["x-station-id"] as string | undefined;
    if (headerId) return headerId;
    return (request.query as any)?.stationId || undefined;
  },
);
```

**问题**：StationId 完全依赖客户端传入的 Header `x-station-id` 或 Query 参数 `stationId`，无任何服务端校验。**任何用户可以通过修改请求头来访问任意分站的数据**。应从 JWT token 或数据库 user 关联中获取绑定的 stationId。

#### P0：数据隔离不完整，多模块缺失 stationId 过滤

通过 Prisma Schema 确认以下表有 stationId 字段：
- Content, Article, Circle, Course, Video, Product, ToolRecord（都声明了 `stationId String?`）

实际查询层覆盖分析：

| 模块 | stationId 过滤 | 文件 | 状态 |
|------|-----------|------|------|
| content.service.ts | 有 | 第68行 | ✅ 通过 |
| article.service.ts | 有 | 第139行 | ✅ 通过 |
| circle.service.ts | 有 | 第142行 | ✅ 通过 |
| course 模块 | **无** | — | ❌ P0 缺失 |
| product 模块 | **无** | — | ❌ P0 缺失 |
| live 模块 | **无** | — | ❌ P0 缺失 |

**结论**：课程(Course)、商品(Product)、直播(Live)三个核心模块完全没有 stationId 过滤。虽然 Schema 声明了字段，但查询代码中未使用。

### 2.2 UnionID 打通逻辑——基本正确但缺少分站绑定

**严重级别：P1**

文件：`apps/server/src/modules/auth/auth.service.ts`（第200-213行）

```typescript
// 通过 unionId 跨应用查找（小程序和 H5 之间的用户打通）
if (unionId) {
  const unionAuth = await this.prisma.auth.findFirst({
    where: { unionId },
    include: { user: true },
  });
  if (unionAuth) {
    await this.prisma.auth.create({
      data: { userId: unionAuth.userId, provider: "WECHAT", openId, unionId },
    });
    return this.buildLoginResult(unionAuth.userId);
  }
}
```

**评价**：UnionID 打通逻辑基本正确。但存在场景问题：当用户从分站A的小程序跳转到分站B的小程序时，用户身份虽然打通了，但 `stationId` 并未在用户表上绑定。跨小程序跳转后不知道该用户"属于"哪个分站。

### 2.3 跨小程序跳转——有基础但缺落地

文件：`apps/server/src/modules/station/station.service.ts`（第240-249行）

**P2 问题**：`resolveJumpTarget` 方法已实现跨小程序跳转逻辑，但仅在后端存在。前端实际跳转调用未在本仓库中找到，需确认前端是否实际使用此接口。

---

## 三、Feature-Flag 功能开关模块

文件：`apps/server/src/modules/feature-flag/`

### 3.1 模块实现评价
- ✅ **Good**：架构设计良好——Service + Controller + Guard + Decorator 四件套
- ✅ **Good**：支持百分比灰度（一致性 hash）、用户白名单
- ✅ **Good**：Redis 缓存 30 秒，高频读取性能有保障
- ✅ **Good**：FeatureFlagGuard 和 RequireFeature 装饰器已实现（`common/feature-flag.guard.ts`）

### 3.2 P0：功能开关未在实际业务中使用

通过全局搜索确认，**FeatureFlagService 仅在以下位置被引用**：
1. `merchant/merchant.guard.ts`——商家后台开关
2. `merchant/merchant.service.ts`——商家入驻服务
3. `common/feature-flag.guard.ts`——通用守卫（存在但未见使用）

**以下 PRD 要求需功能开关控制的敏感功能完全没有 feature-flag 保护**：
- 提现功能（`finance/`、`commission/`）——无开关
- 内容发布（`content/`、`article/`）——无开关
- 直播开播（`live/`）——无开关
- 课程上架（`course/`）——无开关
- 会员购买（`member/`）——无开关

### 3.3 P1：FeatureFlag 模型不支持分站级别开关

FeatureFlag 表只有全局开关，缺少 `stationId` 字段。如果 PRD 要求"分站B可以关闭提现但分站A允许提现"，当前架构无法实现。

---

## 四、System 系统配置模块

### 4.1 P0：PRD 要求的关键配置参数缺失

文件：`apps/server/src/modules/system/system.service.ts`

系统配置存储在 `ConfigSystem` 表中，是简单的 KV 存储。当前已使用的配置 Key：

| 配置Key | 用途 | 状态 |
|---------|------|------|
| `home_banners` | 首页Banner | 已有 |
| `home:layout` | 首页布局 | 已有 |
| `home:paipan_slot` | 排盘入口位置 | 已有 |
| `home:featured_tags` | 推荐标签 | 已有 |
| `maintenance_mode` | 维护模式 | 已有 |
| `automation_enabled` | 自动化开关 | 已有 |
| `category_tree` | 品类标签树 | 已有 |
| `course_category_tree` | 课程品类树 | 已有 |
| `audit_block_keywords` | 审核屏蔽词 | 已有 |
| `merchant_commission_rate` | 商家佣金比例 | 已有 |
| `merchant_deposit_base` | 商家保证金基数 | 已有 |
| `merchant_deposit_per_category` | 商家按品类保证金 | 已有 |
| `merchant_settlement_cycle` | 商家结算周期 | 已有 |
| `ai_model_routing` | AI模型路由 | 已有 |

**PRD 要求的但未找到对应配置**：

| PRD要求 | 状态 | 备注 |
|---------|------|------|
| 站长标准价格 | ❌ 缺失 P0 | 未在 system config 或 commission config 中找到 |
| 运营商各级价格/名额 | ❌ 缺失 P0 | operator 表有 containQuota 但无价格配置 |
| 运营商管理奖比例 | ❌ 缺失 P0 | 无对应 config |
| 临时推荐有效期 | ❌ 缺失 P1 | CommissionConfig 表有 temp_referral key 但未见实际配置 |
| 临时佣金比例 | ❌ 缺失 P1 | 同上 |
| 驿站加盟门槛 | ❌ 缺失 P0 | CommissionConfig 有 station 相关 key 但不完整 |
| 提现门槛 | ⚠️ 部分实现 P2 | commission.service.ts 硬编码默认 100 元 |
| 智能体免费调用次数 | ❌ 缺失 P0 | 完全未找到 |

---

## 五、Risk-Control 风控模块

文件：`apps/server/src/modules/risk-control/`

### 5.1 模块实现评价
- ✅ **Good**：功能齐全——预警规则管理、预警列表、刷单识别、用户行为时间线、申诉处理、设备指纹
- ✅ **Good**：使用原生 SQL 进行同设备多账号、同IP高频下单检测
- ✅ **Good**：设备指纹支持可疑设备识别（7天窗口）

### 5.2 P1：没有分站级别的风控隔离

RiskRule、RiskAlert、FraudDetection 表都没有 `stationId` 字段。管理员查看风控数据时无法按分站筛选。

### 5.3 P1：刷单扫描未自动执行

`scanFraud()` 方法实现了多维度检测，但仅在管理员手动点击时触发。没有在 `system.task.ts` 中将刷单扫描加入定时任务。

### 5.4 P1：风控动作与 FeatureFlag 无联动

当检测到刷单风险用户时，只记录到 FraudDetection 表，没有自动触发 FeatureFlag 为用户或分站关闭相关功能（如提现、发布）。

---

## 六、Identity 身份认证模块

文件：`apps/server/src/modules/identity/`

### 6.1 模块实现评价
- ✅ **Good**：腾讯云认证链路完整——OCR → 二要素核验 → 人脸核身
- ✅ **Good**：审核管理有通过/拒绝操作

### 6.2 P1：认证结果未更新用户表

文件：`apps/server/src/modules/identity/identity.service.ts`（第217-252行）

```typescript
async approveIdentity(id: string, remark?: string) {
  // 仅记录 AuditLog，未更新 user 表的认证状态
  await this.prisma.auditLog.create({
    data: { userId: log.userId, action: "IDENTITY_APPROVE", ... },
  });
  return { success: true, message: "实名认证已通过" };
}
```

**问题**：通过/拒绝实名认证仅写 AuditLog，未更新 User 表的 `isVerified` 或类似字段。这意味着**即使通过了实名认证，其他模块无法通过查 User 表来判断用户是否已认证**。

### 6.3 P2：缺少分站关联

实名认证审核列表不支持按分站筛选，分站站长无法查看自己分站内用户的认证情况。

---

## 七、Member 会员模块

文件：`apps/server/src/modules/member/`

### 7.1 P0：会员守卫完全缺失——最严重的安全漏洞之一

搜索 `apps/server/src/common/` 目录，Guards 列表为：
- jwt-auth.guard.ts
- optional-auth.guard.ts
- redis-throttle.guard.ts
- roles.guard.ts
- station-master.guard.ts
- feature-flag.guard.ts
- automation.guard.ts
- tencent-callback.guard.ts

**没有任何 MemberGuard 或 VipGuard。**

当前会员权限检查完全靠各业务模块内联代码手动判断，例如：

```typescript
// apps/server/src/modules/ebook/ebook.service.ts（第167-168行）
if (user?.memberLevel && user.memberLevel !== "NONE"
    && (!user.memberExpire || user.memberExpire > new Date())) {
```

**问题**：
1. 每个需要会员权限的地方都要重复写判断逻辑
2. 容易遗漏（当前仅在 ebook.service.ts 中发现内联检查）
3. 无法统一修改（如增加会员等级权限）
4. 课程、商品折扣、会员专享内容等场景可能完全未检查

### 7.2 会员到期检查——服务端时间 ✅

**Good**：会员过期检查全部使用 `new Date()`（服务端时间），不依赖客户端时间。

### 7.3 P2：手动授予会员缺少审计

`grantMember()` 方法中只有 `this.logger.log()` 记录，没有使用审计服务进行审计记录。撤销操作也同样缺少审计。

---

## 八、综合风险矩阵

| 严重级别 | 数量 | 关键问题 |
|---------|------|---------|
| P0 | 7 | 数据隔离不完整、StationId 安全、MemberGuard 缺失、FeatureFlag 未落地、PRD 配置缺失 |
| P1 | 6 | UnionID+分站绑定、认证状态未同步、风控无分站隔离、风控未自动执行 |
| P2 | 4 | 跨跳转落地未确认、提现门槛硬编码、grantMember 无审计、缺实时风控拦截 |

### P0 问题清单（必须修复）

1. **`station-id.decorator.ts`**——StationId 依赖不受信客户端输入，需从 JWT/user 获取
2. **`course` 模块**——所有查询缺少 `where.stationId` 过滤
3. **`product` 模块**——商品查询缺少分站隔离
4. **`live` 模块**——直播查询缺少分站隔离
5. **缺少 `MemberGuard`**——需创建统一会员权限守卫
6. **FeatureFlag 未落地**——提现、发布、直播需加 RequireFeature 装饰器
7. **PRD 关键配置缺失**——站长价格、运营商价格、管理奖比例、驿站加盟门槛、智能体免费次数

### P1 问题清单（近期修复）

1. **auth.service.ts**——UnionID 打通后缺少 stationId 绑定
2. **identity.service.ts**——认证通过后未更新 user.isVerified 字段
3. **risk-control 模块**——RiskAlert/RiskRule 缺少 stationId 字段
4. **risk-control 模块**——scanFraud 未加入定时任务
5. **commission 模块**——提现门槛不在 system config 体系内
6. **FeatureFlag 模型**——缺少 stationId 支持分站级开关

### P2 问题清单（改进项）

1. **station.service.ts**——resolveJumpTarget 前端落地确认
2. **commission.service.ts**——提现门槛硬编码 100 元
3. **member.service.ts**——grantMember/revokeMember 缺少 AuditService 审计
4. **risk-control**——缺少用户端实时风控拦截

---

> 审查完成时间：2026-05-21
