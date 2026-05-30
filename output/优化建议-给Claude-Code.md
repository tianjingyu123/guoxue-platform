# 热卜国学平台后端优化建议

> **阅读对象**：Claude Code（或其他 AI 编码助手）
> **来源**：两轮人工代码审计的合并结果（50+ 模块扫描 + 六大模块深度审查）
> **重要**：以下所有内容均为审计建议，非强制性指令。请结合你对项目的实际理解，选择性采纳和优化。不同项目有不同上下文和优先级，你的判断优先。

---

## 审计概况

| 轮次 | 范围 | 发现问题数 |
|------|------|-----------|
| 第一轮 | 全量模块扫描（排盘系列除外） | 25（P0=13, P1=10, P2=2） |
| 第二轮 | 六大模块深度专审 | 17（P0=7, P1=6, P2=4） |
| **去重合并后** | — | **约 35 个独立问题** |

审计未覆盖的部分：排盘系列模块（八字/奇门/六壬/梅花/easyearn），这些模块按项目要求排除在审查范围之外。

---

## 一、多分站数据隔离（安全根基）

### 1.1 StationId 装饰器信任客户端输入 — P0

**位置**：`apps/server/src/common/station-id.decorator.ts`

```typescript
// 当前实现：完全依赖客户端传入的 Header 或 Query 参数
export const StationId = createParamDecorator((data, ctx) => {
  const headerId = request.headers["x-station-id"];
  if (headerId) return headerId;
  return (request.query as any)?.stationId || undefined;
});
```

**问题**：任何用户修改 HTTP Header 即可越权访问其他分站数据。这是数据隔离的架构级漏洞。

**建议方向**：
- 从 JWT payload 或 `user` 对象中获取绑定的 stationId，而非信任客户端
- 或者至少将客户端传入的值与 JWT/user 中的值做交叉校验
- 如果用户尚未绑定分站（如跨小程序跳转场景），应有明确的 fallback 策略

### 1.2 三个核心模块完全无分站过滤 — P0

虽然 Prisma Schema 中 Course、Product、Live 表都声明了 `stationId String?`，但实际查询代码中完全没有在 WHERE 条件中使用。

| 模块 | 需添加过滤的位置 | 建议 |
|------|-----------------|------|
| course（课程） | 所有列表查询 | 统一在 Service 层加 `where.stationId` |
| product（商品） | 商品列表、分类查询 | 同上 |
| live（直播） | 直播列表、回放列表 | 同上 |

**已正确实现的参考模块**：`content.service.ts`（第68行）、`article.service.ts`（第139行）、`circle.service.ts`（第142行）——可直接参考这些模块的写法。

### 1.3 UnionID 打通后缺少分站绑定 — P1

**位置**：`apps/server/src/modules/auth/auth.service.ts`（第200-213行）

当前 UnionID 打通逻辑是正确的——通过 unionId 找到已有用户，为新 openId 创建 Auth 记录。但当用户从分站A的小程序跳转到分站B时，用户身份打通了，但缺少 stationId 的重新绑定或记录。跨分站场景下该用户"属于"哪个分站变得模糊。

### 1.4 跨小程序跳转逻辑后端已实现但前端落地待确认 — P2

**位置**：`apps/server/src/modules/station/station.service.ts`（第240-249行）

`resolveJumpTarget()` 已实现跨小程序跳转逻辑（解析 appId、路径、是否跨应用），但前端代码中未找到调用。建议确认前端是否已对接，如未对接则需补齐。

---

## 二、佣金与分润体系（核心业务）

### 2.1 运营商管理奖完全缺失 — P0

**位置**：`apps/server/src/modules/commission/commission.service.ts`

`calculateAndRecord()` 方法目前只计算直推佣金（一级），PRD 要求的运营商管理奖（下级代理的佣金分成）完全未实现，对应的"名额收入"也未落地。这是分润体系最核心的缺失。

### 2.2 PRD 配置参数缺失 — P0

以下 PRD 要求的可配置参数在 `ConfigSystem` 表中不存在：

| 缺失参数 | 用途 | 建议 |
|---------|------|------|
| 站长标准价格 | 分站定价 | 加入 `station_master_price` |
| 运营商各级价格/名额 | 代理体系 | 加入 `operator_level_*` |
| 运营商管理奖比例 | 分润比例 | 加入 `management_bonus_rate` |
| 驿站加盟门槛 | 加盟条件 | 加入 `station_join_threshold` |
| 智能体免费调用次数 | AI 配额 | 加入 `agent_free_quota` |
| 临时推荐有效期 | 场景化推荐 | 已有 key 但未初始化 |

**建议**：不是所有配置都需要立即实现，但核心的分润比例和加盟门槛建议优先放进可配置体系，避免硬编码导致每次调参都要发版。

### 2.3 提现门槛配置割裂 — P2

**位置**：`apps/server/src/modules/commission/commission.service.ts`（第186-194行）

```typescript
const cfg = await this.prisma.commissionConfig.findUnique({ where: { configKey: "withdrawal_min" } });
const minAmount = cfg ? Number(cfg.rateA) : 100; // 硬编码默认100元
```

提现门槛存储在 `CommissionConfig` 表，不在统一的 `ConfigSystem` 体系内，且默认值硬编码。建议收归到 `ConfigSystem`。

---

## 三、推荐算法（内容分发）

### 3.1 推荐算法未达到 PRD 权重配比 — P0

当前推荐算法缺少 PRD 要求的三个关键维度：

| 缺失项 | PRD 要求 | 影响 |
|--------|---------|------|
| 类型多样性控制 | 推荐结果应包含多品类内容 | 结果单一化 |
| 新鲜度衰减 | 旧内容权重随时间下降 | 老内容持续霸榜 |
| 排盘固定槽 | 推荐流预留一个固定位置展示排盘入口 | 排盘入口无固定曝光 |

### 3.2 推荐模块缺少 FeatureFlag 保护 — P0

推荐算法上线后无法按分站或按用户灰度切换新旧算法。建议利用现有的 FeatureFlag 基础设施为推荐模块挂载开关。

---

## 四、支付与幂等性

### 4.1 支付回调幂等性仅依赖 Redis 锁 — P0

**位置**：支付回调处理相关代码

当前幂等性保证仅靠 Redis 锁。如果 Redis 不可用或锁未正确释放，可能出现重复处理。建议增加一层数据库级别的保护：
- 支付记录表增加唯一约束（如 `tradeNo` + `status`）
- 或使用数据库乐观锁（version 字段）

---

## 五、AI Gateway 容错

### 5.1 缺少熔断器 — P0

**位置**：AI Gateway 模块

当主力 AI 模型故障时，每次请求都会等待完整 timeout 后才失败，无熔断机制。建议添加断路器模式——连续失败 N 次后快速失败，定期探测恢复。

---

## 六、运营安全

### 6.1 运营机器人与审核边界 — P0

运营机器人（automation 模块）可直接修改内容的点赞数、评论数等计数。这绕过了正常的内容审核流程。建议：
- 机器人操作增加审计日志
- 敏感操作（修改计数）需二次确认或走审核流

---

## 七、权限守卫体系

### 7.1 会员权限守卫（MemberGuard）完全缺失 — P0

**这是本轮审计发现的最严重安全漏洞之一。**

`apps/server/src/common/` 目录下现有 Guard 列表：
- jwt-auth.guard.ts / optional-auth.guard.ts
- redis-throttle.guard.ts / roles.guard.ts
- station-master.guard.ts / feature-flag.guard.ts
- automation.guard.ts / tencent-callback.guard.ts

**没有 MemberGuard 或 VipGuard。**

当前仅在 `ebook.service.ts` 中发现一处内联会员判断，其他模块（课程、商品折扣、会员专享内容等）的权限检查完全缺失。

**建议**：
- 创建统一的 `MemberGuard`（建议参考 `RolesGuard` 的写法，支持多种会员等级）
- 配合 `@RequireMember(MemberLevel.VIP)` 装饰器使用
- 考虑过期时间校验统一在 Guard 层完成

### 7.2 FeatureFlag 基础设施完善但未落地 — P0

FeatureFlag 模块本身设计良好（Service + Guard + Decorator + 百分比灰度 + Redis 缓存），但以下敏感功能完全没有挂载开关：

| 功能 | 风险 | 建议 |
|------|------|------|
| 提现（finance/commission） | 资金安全 | 最高优先级挂载 |
| 内容发布（content/article） | 内容安全 | 建议灰度上线 |
| 直播开播（live） | 运营风险 | 建议按分站控制 |
| 课程上架（course） | 内容质量 | 建议灰度上线 |
| 会员购买（member） | 资金安全 | 与提现同优先级 |

**另外**：当前 FeatureFlag 仅支持全局开关，缺少 `stationId` 字段。如果 PRD 需要分站级别开关（如"A 分站可提现、B 分站不可提现"），需要扩展 FeatureFlag 模型。

---

## 八、风控模块

### 8.1 缺少分站级别风控隔离 — P1

**位置**：`apps/server/src/modules/risk-control/`

RiskRule、RiskAlert、FraudDetection 表均无 `stationId` 字段，分站管理员无法按分站查看风控数据。

### 8.2 刷单扫描未自动执行 — P1

`scanFraud()` 实现了完整的多维度检测逻辑，但仅在后台手动触发，未加入 `system.task.ts` 定时任务。建议加入定时扫描（如每小时一次）。

### 8.3 风控与 FeatureFlag 无联动 — P1

检测到刷单风险后仅记录到 FraudDetection 表，未自动触发 FeatureFlag 为用户或分站关闭相关功能（如提现、发布）。建议风控结果驱动 FeatureFlag 自动熔断。

### 8.4 缺少用户端实时风控拦截 — P2

当前风控仅在后台检测，缺少请求链路上的实时拦截（如在提现接口中检查用户是否在风控黑名单）。

---

## 九、身份认证模块

### 9.1 认证通过后未同步 User 表状态 — P1

**位置**：`apps/server/src/modules/identity/identity.service.ts`（第217-252行）

`approveIdentity()` 通过实名认证后只写 AuditLog，不更新 User 表的 `isVerified` 字段。这导致其他模块无法通过查 User 表来判断用户是否已认证。

**建议**：在 approve/revoke 操作中同步更新 User 表的认证状态字段。

### 9.2 审核列表缺分站筛选 — P2

实名认证审核列表不支持分站维度筛选，分站站长无法看到自己分站内用户的认证情况。

---

## 十、会员模块

### 10.1 手动授予/撤销会员缺少审计 — P2

**位置**：`apps/server/src/modules/member/member.service.ts`（第144-169行）

`grantMember()` 和 `revokeMember()` 仅使用 `this.logger.log()`，未使用 `AuditService` 进行审计记录。

---

## 十一、综合优先级建议

以下优先级仅供参考，请根据项目实际阶段和资源自行调整：

### 第一优先：安全根基（建议先修）
1. StationId 装饰器改为服务端获取
2. course/product/live 添加 stationId 过滤
3. 创建 MemberGuard 并保护会员专属端点
4. 支付回调增加 DB 层幂等保护

### 第二优先：核心业务
5. 实现运营商管理奖
6. 初始化 PRD 关键配置参数
7. 推荐算法达到 PRD 权重配比

### 第三优先：运营体系
8. FeatureFlag 挂载到提现/发布等敏感功能
9. 风控扫描自动化 + 与 FeatureFlag 联动
10. Identity 认证状态同步

### 第四优先：体验完善
11. FeatureFlag 支持分站级开关
12. 风控添加分站维度
13. 完善审计日志

---

## 使用说明

以上建议基于约 2 小时的代码审查，可能：
- 遗漏了项目的历史决策上下文（如某些"缺失"可能是有意设计）
- 对 PRD 的理解可能有偏差（审计依赖的是 PRD 文档摘要而非全文）
- 修复成本估算未考虑代码耦合度和回归测试范围

**最终决定权在你手中。** 你是这个项目的 best authority。以上只是帮助你发现盲区的参考。
