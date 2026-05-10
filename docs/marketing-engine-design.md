# 热卜国学平台 — 智能营销引擎设计

> 更新时间：2026-05-11 | 基于现有 FlashSale/GroupBuy/CouponTemplate/MarketingPage 模型扩展

## 一、总体架构

```
                            ┌──────────────────────────┐
                            │     营销引擎核心 (Orchestrator)  │
                            └──────────┬───────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
    ┌─────▼─────┐              ┌──────▼──────┐              ┌──────▼──────┐
    │  触发器层   │              │   规则引擎   │              │   动作执行   │
    │ (Trigger)  │──────────────│  (Rule DSL) │──────────────│  (Action)   │
    └───────────┘              └─────────────┘              └─────────────┘
         │                          │                            │
    ┌────┴────┐               ┌─────┴─────┐               ┌─────┴──────┐
    │ 事件总线  │               │ 条件表达式  │               │ 优惠券/推送  │
    │ 定时器   │               │ 用户筛选   │               │ 积分/短息   │
    │ Webhook │               │ A/B 分流  │               │ 标签/消息   │
    └─────────┘               └───────────┘               └────────────┘
```

### 1.1 核心设计原则

- **事件驱动**：所有营销行为由用户事件触发，异步处理，不阻塞主流程
- **规则可配置**：运营人员通过管理后台编排营销规则，无需开发介入
- **A/B 原生支持**：每条规则内置分流能力，自动归因效果
- **优先级+互斥**：规则按优先级匹配，同类型高优规则可互斥低优规则
- **预算控制**：每条规则设总预算，耗尽自动暂停

## 二、Prisma 模型扩展

### 2.1 营销规则引擎

```prisma
// ── 营销规则定义 ──
model MarketingRule {
  id            String   @id @default(uuid())
  name          String                          // 规则名称
  description   String?
  trigger       TriggerType                     // 触发时机
  priority      Int      @default(0)            // 优先级(越大越优先)
  isEnabled     Boolean  @default(false)
  cooldownMinutes Int?                          // 同一用户冷却时间（分钟）

  // 触发条件 (JSON DSL)
  // 示例: { "userTags": ["high_value"], "minOrderCount": 3, "timeRange": ["09:00","22:00"] }
  conditions    Json     @default("{}")

  // 目标人群
  audience      Audience?

  // 执行动作配置
  actionType    ActionType                       // 动作类型
  actionConfig  Json                              // 动作参数

  // A/B 测试
  abEnabled     Boolean  @default(false)
  abBuckets     Int      @default(2)             // 实验分桶数（2-10）
  abWinnerRule  String?                           // AUTO/MANUAL，自动选赢家策略

  // 预算控制
  budgetType    String?                           // TOTAL/DAILY/WEEKLY/MONTHLY
  budgetLimit   Int?                              // 预算上限（分）
  budgetSpent   Int      @default(0)             // 已消耗预算

  // 生命周期
  startAt       DateTime?
  endAt         DateTime?
  status        String   @default("DRAFT")        // DRAFT/ACTIVE/PAUSED/ENDED/EXHAUSTED
  createdBy     String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  logs          MarketingLog[]
  abResults     AbTestResult[]

  @@index([trigger, status, priority])
  @@index([status, startAt, endAt])
  @@index([isEnabled, priority])
}

// ── 触发时机枚举 ──
enum TriggerType {
  USER_REGISTER          // 注册完成
  USER_FIRST_PURCHASE    // 首单支付成功
  ORDER_PAID             // 订单支付成功（任意）
  ORDER_AMOUNT_REACHED   // 累计消费达标
  COURSE_ENROLLED        // 报名课程
  COURSE_COMPLETED       // 完成课程
  CIRCLE_JOINED          // 加入圈子
  USER_INACTIVE_7D       // 7天未访问
  USER_INACTIVE_30D      // 30天未访问
  BIRTHDAY_APPROACHING   // 生日临近
  LIVE_STARTED           // 关注的直播开始
  COUPON_EXPIRING        // 优惠券即将过期
  VIRTUAL_COIN_LOW       // 虚拟币余额不足
  CUSTOM_EVENT           // 自定义事件
  SCHEDULED              // 定时触发（指定时间）
}

// ── 动作类型枚举 ──
enum ActionType {
  SEND_COUPON            // 发优惠券
  SEND_VIRTUAL_COIN      // 送虚拟币
  SEND_NOTIFICATION      // 推送通知
  SEND_SMS               // 发短信
  SEND_EMAIL             // 发邮件
  SHOW_POPUP             // 弹窗（小程序内）
  REDIRECT_PAGE          // 跳转指定页面
  ADD_USER_TAG           // 打用户标签
  ENROLL_AUTO_CAMPAIGN   // 加入自动化运营序列
  WEBHOOK                // 回调第三方
}

// ── 人群定义 ──
model Audience {
  id            String   @id @default(uuid())
  ruleId        String   @unique
  name          String
  // 用户标签筛选: { "include": ["付费用户","高活跃"], "exclude": ["已流失"] }
  userTags      Json     @default("{}")
  // 会员等级筛选
  memberLevels  String[] @default([])
  // 注册时间范围
  registerBefore DateTime?
  registerAfter  DateTime?
  // 消费条件
  minTotalSpent Int?
  maxTotalSpent Int?
  // 地域筛选
  cities        String[] @default([])
  // 自定义 SQL/JSON 条件
  advancedFilter Json?

  rule MarketingRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)
}

// ── 营销执行日志 ──
model MarketingLog {
  id          String   @id @default(uuid())
  ruleId      String
  userId      String
  triggerType TriggerType
  actionType  ActionType
  actionResult String?                           // SUCCESS/FAILED/COOLDOWN/BUDGET_EXHAUSTED
  abBucket    Int?                               // 所属A/B桶(0=对照组)
  cost        Int      @default(0)              // 消耗预算（分）
  detail      Json?                              // 详细信息
  createdAt   DateTime @default(now())

  rule MarketingRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)

  @@index([ruleId, createdAt])
  @@index([userId, createdAt])
  @@index([triggerType, actionResult, createdAt])
}

// ── A/B 测试结果 ──
model AbTestResult {
  id              String   @id @default(uuid())
  ruleId          String
  bucket          Int                            // 分桶编号(0=对照组)
  config          Json                           // 该桶的参数配置
  totalUsers      Int      @default(0)          // 命中用户数
  targetConversions Int    @default(0)          // 目标转化数
  conversionRate  Float?                         // 转化率
  avgOrderValue   Float?                         // 平均订单价值
  totalRevenue    Float?                         // 总收入
  isWinner        Boolean  @default(false)       // 是否为优胜桶
  confidenceLevel Float?                         // 统计置信度

  rule MarketingRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)

  @@unique([ruleId, bucket])
  @@index([ruleId, isWinner])
}

// ── 自动化运营序列 ──
model AutoCampaign {
  id          String   @id @default(uuid())
  name        String
  description String?
  steps       AutoCampaignStep[]
  status      String   @default("DRAFT")        // DRAFT/ACTIVE/ENDED
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model AutoCampaignStep {
  id          String   @id @default(uuid())
  campaignId  String
  sortOrder   Int                               // 步骤序号
  delayHours  Int      @default(0)              // 上一步完成后延迟小时数
  actionType  ActionType
  actionConfig Json
  conditions  Json?                              // 进入此步骤的额外条件
  createdAt   DateTime @default(now())

  campaign AutoCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@index([campaignId, sortOrder])
}

// ── 用户营销接触记录 ──
model UserMarketingContact {
  id          String   @id @default(uuid())
  userId      String
  ruleId      String?
  campaignId  String?
  touchType   String                          // COUPON/NOTIFICATION/SMS/EMAIL/POPUP
  content     String?
  isOpened    Boolean  @default(false)
  isClicked   Boolean  @default(false)
  convertedAt DateTime?
  createdAt   DateTime @default(now())

  @@index([userId, createdAt])
  @@index([userId, touchType])
}
```

### 2.2 营销规则条件 DSL

条件表达式设计为 JSON 树，支持 AND/OR/NOT 组合：

```typescript
// 条件 DSL 类型定义
type ConditionOperator = "AND" | "OR" | "NOT";

interface ConditionNode {
  op?: ConditionOperator;
  children?: ConditionNode[];
  // 叶子节点
  field?: string;       // 字段名: userTag, orderCount, totalSpent, etc.
  operator?: string;    // EQ/NEQ/GT/GTE/LT/LTE/IN/NOT_IN/CONTAINS/BETWEEN
  value?: unknown;
}

// 示例：付费用户 AND (消费>500 OR 会员等级>=VIP2)
const exampleCondition: ConditionNode = {
  op: "AND",
  children: [
    { field: "userTag", operator: "IN", value: ["paid_user", "high_value"] },
    {
      op: "OR",
      children: [
        { field: "totalSpent", operator: "GTE", value: 50000 },
        { field: "memberLevel", operator: "GTE", value: "VIP2" },
      ],
    },
  ],
};
```

### 2.3 支持的触发事件类型

```typescript
// 事件类型（与现有 WebhookEvent 互补，补齐营销所需）
interface MarketingEvent {
  eventType: TriggerType;
  userId: string;
  timestamp: Date;
  payload: {
    // 按事件类型不同包含不同字段
    orderId?: string;
    orderAmount?: number;
    productId?: string;
    courseId?: string;
    circleId?: string;
    couponId?: string;
    customEventName?: string;
    customData?: Record<string, unknown>;
  };
}
```

## 三、核心服务设计

### 3.1 MarketingEngineService

```typescript
// apps/server/src/modules/marketing/marketing-engine.service.ts

@Injectable()
export class MarketingEngineService {
  constructor(
    private prisma: PrismaService,
    private eventBus: EventEmitter2,
    private couponService: CouponService,
    private notificationService: PushService,
    private smsService: SmsService,
    private coinService: CoinService,
  ) {}

  /**
   * 事件入口：外部系统通过 EventBus 发射事件，引擎消费并匹配规则
   */
  @OnEvent('marketing.*', { async: true })
  async onMarketingEvent(event: MarketingEvent): Promise<void> {
    // 1. 查找匹配的启用的规则
    const rules = await this.findMatchingRules(event);

    // 2. 逐个评估条件
    for (const rule of rules) {
      if (!(await this.evaluateConditions(rule, event))) continue;
      if (!(await this.checkCooldown(rule, event.userId))) continue;
      if (!(await this.checkBudget(rule))) continue;

      // 3. A/B 分流
      const bucket = this.assignAbBucket(rule, event.userId);

      // 4. 执行动作（对照组 bucket=0 不执行）
      if (bucket > 0) {
        await this.executeAction(rule, event, bucket);
      }

      // 5. 记录日志
      await this.logExecution(rule, event, bucket);

      // 6. 扣减预算
      if (bucket > 0 && rule.budgetType) {
        await this.deductBudget(rule);
      }
    }
  }

  /** 查找匹配触发类型和状态的规则 */
  private async findMatchingRules(event: MarketingEvent): Promise<MarketingRule[]> {
    return this.prisma.marketingRule.findMany({
      where: {
        trigger: event.eventType,
        status: 'ACTIVE',
        isEnabled: true,
        OR: [
          { startAt: null },
          { startAt: { lte: new Date() } },
        ],
        AND: [
          { endAt: null },
          { endAt: { gte: new Date() } },
        ],
      },
      include: { audience: true },
      orderBy: { priority: 'desc' },
    });
  }

  /** 评估条件 DSL */
  async evaluateConditions(rule: MarketingRule, event: MarketingEvent): Promise<boolean> {
    const conditions = rule.conditions as ConditionNode;
    if (!conditions || Object.keys(conditions).length === 0) return true;
    const ctx = await this.buildEvalContext(event);
    return this.evaluateNode(conditions, ctx);
  }

  /** 确定性 A/B 分桶（userId hash） */
  assignAbBucket(rule: MarketingRule, userId: string): number {
    if (!rule.abEnabled) return 1; // 未开启A/B则全部进实验组
    const hash = this.hashUserId(userId);
    return hash % rule.abBuckets; // 0 = 对照组
  }

  /** 执行具体动作 */
  private async executeAction(rule: MarketingRule, event: MarketingEvent, bucket: number): Promise<void> {
    const config = this.mergeAbConfig(rule.actionConfig as any, rule, bucket);
    switch (rule.actionType) {
      case 'SEND_COUPON':
        await this.couponService.claimForUser(config.couponId, event.userId);
        break;
      case 'SEND_VIRTUAL_COIN':
        await this.coinService.grantBonus(event.userId, config.amount, `营销规则:${rule.name}`);
        break;
      case 'SEND_NOTIFICATION':
        await this.notificationService.sendToUser(event.userId, {
          title: config.title,
          body: config.body,
          path: config.redirectPath,
        });
        break;
      case 'SEND_SMS':
        await this.smsService.send(event.userId, config.templateId, config.params);
        break;
      case 'ADD_USER_TAG':
        await this.tagService.addTag(event.userId, config.tag, 'MARKETING');
        break;
      case 'ENROLL_AUTO_CAMPAIGN':
        await this.enrollCampaign(config.campaignId, event.userId);
        break;
      // ...其余动作类型
    }
  }

  // 递归评估条件树
  private evaluateNode(node: ConditionNode, ctx: EvalContext): boolean {
    if (node.op) {
      const results = (node.children || []).map(c => this.evaluateNode(c, ctx));
      switch (node.op) {
        case 'AND': return results.every(Boolean);
        case 'OR':  return results.some(Boolean);
        case 'NOT': return !results[0];
      }
    }
    if (node.field && node.operator) {
      const fieldValue = ctx[node.field];
      return this.compareValues(fieldValue, node.operator, node.value);
    }
    return false;
  }
}
```

### 3.2 事件发射接入点

在现有业务代码中嵌入事件发射，不超过 3 行代码：

```typescript
// 示例：订单支付完成后发射事件
// apps/server/src/modules/shop/shop.service.ts
async handlePaymentSuccess(order: Order) {
  // ...现有支付成功逻辑...
  this.eventBus.emit('marketing.ORDER_PAID', {
    eventType: 'ORDER_PAID',
    userId: order.userId,
    timestamp: new Date(),
    payload: { orderId: order.id, orderAmount: order.amount },
  });
}
```

## 四、A/B 测试框架

### 4.1 分桶策略

```
用户 ID hash → mod N  →  0: 对照组（无干预/原方案）
                        →  1: 实验组 A（方案 A）
                        →  2: 实验组 B（方案 B）
                        →  ...
```

- 同一用户始终落在同一桶，保证体验一致
- 每组占比 = 100% / N（等量分配）
- 对照组永远为桶 0，不做任何营销动作

### 4.2 自动选优策略

```typescript
/**
 * 每 6 小时校验一次实验数据，满足条件自动选优
 */
async autoSelectWinner(rule: MarketingRule): Promise<void> {
  const results = await this.prisma.abTestResult.findMany({
    where: { ruleId: rule.id },
  });

  const control = results.find(r => r.bucket === 0);
  const experiments = results.filter(r => r.bucket > 0 && r.totalUsers >= 100);

  for (const exp of experiments) {
    if (!control) continue;
    // 转化率提升 > 5% 且 置信度 > 95%
    const lift = (exp.conversionRate! - control.conversionRate!) / control.conversionRate!;
    if (lift > 0.05 && (exp.confidenceLevel || 0) > 0.95) {
      await this.prisma.abTestResult.update({
        where: { id: exp.id },
        data: { isWinner: true },
      });
      // 将优胜配置应用到全量
      await this.promoteWinner(rule, exp);
      break;
    }
  }
}
```

### 4.3 统计置信度计算

```typescript
/**
 * 使用 Welch's t-test 计算两组转化率的统计显著性
 */
function calculateConfidence(
  controlConversions: number, controlTotal: number,
  expConversions: number, expTotal: number,
): number {
  const p1 = controlConversions / controlTotal;
  const p2 = expConversions / expTotal;
  const se = Math.sqrt(p1 * (1 - p1) / controlTotal + p2 * (1 - p2) / expTotal);
  const z = Math.abs(p2 - p1) / se;
  // Z-score → p-value → confidence (近似)
  // |z|=1.96 → 95%, |z|=2.58 → 99%
  return 1 - 2 * (1 - normalCDF(z));
}
```

## 五、效果归因追踪

### 5.1 归因模型

```
用户触达 ──→ 点击 ──→ 浏览 ──→ 下单
   │           │         │         │
  曝光归因   点击归因  浏览归因   转化归因
```

### 5.2 归因窗口配置

| 触点类型 | 归因窗口 | 说明 |
|---------|---------|------|
| 推送通知 | 24 小时 | 点击推送后 24 小时内下单计为转化 |
| 优惠券 | 有效期 | 优惠券有效期内使用计为转化 |
| 短信 | 48 小时 | 短信发送后 48 小时内下单计为转化 |
| 弹窗 | 1 小时 | 弹窗展示后 1 小时内下单计为转化 |

### 5.3 归因数据查询

```typescript
interface AttributionQuery {
  ruleId: string;
  startDate: Date;
  endDate: Date;
}

interface AttributionReport {
  ruleName: string;
  totalTouches: number;         // 总触达
  totalOpens: number;           // 总打开/点击
  totalConversions: number;     // 总转化
  touchToOpenRate: number;      // 触达→打开率
  openToConversionRate: number; // 打开→转化率
  totalRevenue: number;         // 归因收入
  roi: number;                  // 投入产出比
  avgDaysToConvert: number;     // 平均转化天数
}
```

## 六、管理后台配置界面

### 6.1 规则编辑器页面结构

```
┌─────────────────────────────────────────────────────────┐
│  营销规则编辑器                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  基本信息                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 规则名称: [________________]  优先级: [__]        │   │
│  │ 触发时机: [ORDER_PAID ▼]     冷却: [__] 分钟     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  触发条件（JSON 编辑器 或 可视化构建器）                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  AND                                            │   │
│  │  ├─ 用户标签 IN ["高价值","付费用户"]              │   │
│  │  └─ OR                                         │   │
│  │      ├─ 累计消费 ≥ ¥500                          │   │
│  │      └─ 会员等级 ≥ VIP2                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  目标人群（不填 = 全部用户）                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 会员等级: ☑ VIP1 ☑ VIP2 ☐ VIP3                  │   │
│  │ 地域: [广州] [深圳] [___]                         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  执行动作                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 动作类型: [SEND_COUPON ▼]                        │   │
│  │ 优惠券ID: [coupon_welcome_10 ▼]                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  A/B 测试 (可选)                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ☑ 启用A/B  分桶数: [3]  选优策略: [AUTO ▼]      │   │
│  │ 桶0(对照): 不发券                                │   │
│  │ 桶1: 满200-20                                    │   │
│  │ 桶2: 满300-30                                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [保存草稿]  [启用规则]                                   │
└─────────────────────────────────────────────────────────┘
```

## 七、预设营销规则模板

| 模板名称 | 触发条件 | 动作 | 适用场景 |
|---------|---------|------|---------|
| 新用户欢迎礼 | USER_REGISTER | SEND_COUPON + SEND_VIRTUAL_COIN | 注册即送 |
| 首单激励 | USER_FIRST_PURCHASE | SEND_COUPON(满减) | 促进复购 |
| 沉睡唤醒 | USER_INACTIVE_7D | SEND_NOTIFICATION | 7天未访问 |
| 流失召回 | USER_INACTIVE_30D | SEND_COUPON(大额) + SEND_SMS | 30天未访问 |
| 生日关怀 | BIRTHDAY_APPROACHING | SEND_COUPON + SEND_NOTIFICATION | 生日前3天 |
| 大促预热 | SCHEDULED | SEND_NOTIFICATION | 活动开始前提醒 |
| 支付挽留 | ORDER_PAID | SEND_COUPON(下次可用) | 支付成功后发券 |
| 课程复购 | COURSE_COMPLETED | SEND_COUPON(同类课程) | 学完推荐下一门 |
| 券到期提醒 | COUPON_EXPIRING | SEND_NOTIFICATION | 券过期前24h |

## 八、性能考量

- 规则评估使用 Redis 缓存（1分钟 TTL），减少 DB 查询
- 事件消费使用 BullMQ 队列，峰值削峰填谷
- A/B 分桶使用 userId hash，无额外存储开销
- 预算扣减使用 Redis INCR，定时同步回 DB（每5分钟）
- 营销日志异步批量写入，每 100 条或 10 秒刷一次盘

## 九、实现优先级

| 阶段 | 范围 | 预估 |
|------|------|------|
| V1 | 规则引擎核心 + SEND_COUPON/SEND_NOTIFICATION + 简单条件 | 2周 |
| V2 | A/B 测试 + 自动选优 + 归因报告 | 1周 |
| V3 | 自动化运营序列 + SMS/EMAIL 通道 + 可视化条件构建器 | 1.5周 |
| V4 | 高级归因（多触点）+ 预算自动优化 | 1周 |
