# 热卜国学平台 — 用户画像与标签体系

> 更新时间：2026-05-11 | 基于现有 UserBehavior/UserInterest/User 模型扩展

## 一、标签体系总览

```
                          ┌────────────────────────┐
                          │     用户画像系统         │
                          └───────────┬────────────┘
                                      │
        ┌─────────────┬───────────────┼───────────────┬─────────────┐
        │             │               │               │             │
   ┌────▼────┐  ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐  ┌────▼────┐
   │ 基础属性 │  │  行为标签  │  │  兴趣标签  │  │  消费标签  │  │ 预测标签 │
   │ (人口)   │  │ (Behavior) │  │ (Interest) │  │ (Consume)  │  │ (AI)    │
   └─────────┘  └───────────┘  └───────────┘  └───────────┘  └─────────┘
        │             │               │               │             │
        ├─ 年龄        ├─ 日活度       ├─ 八字         ├─ 消费力      ├─ 流失概率
        ├─ 性别        ├─ 浏览偏好     ├─ 国学经典     ├─ 价格敏感    ├─ 复购意愿
        ├─ 地域        ├─ 搜索关键词   ├─ 在线课程     ├─ 品类偏好    ├─ LTV
        ├─ 手机型号    ├─ 功能路径     ├─ 视频/直播    ├─ 支付方式    └─ 推荐响应
        └─ 注册来源    ├─ 停留时长     ├─ 圈子/社交    ├─ 优惠券依赖
                       ├─ 分享行为     ├─ 线下活动     └─ 退款倾向
                       └─ 反馈/投诉    └─ 问答/咨询
```

### 1.1 标签分类

| 大类 | 标签类型 | 更新频率 | 数据来源 | 示例 |
|------|---------|---------|---------|------|
| **基础属性** | 静态/半静态 | 用户修改时 | 注册/微信/手动 | 性别、年龄段、城市、注册来源 |
| **行为标签** | 实时计算 | 每次行为后增量 | UserBehavior 表 | 近7日访问天数、日均浏览时长、搜索频次 |
| **兴趣标签** | T+1 离线计算 | 每日凌晨 | UserInterest + 行为聚合 | 八字命理、紫微斗数、论语解读 |
| **消费标签** | 实时累计 | 订单支付后 | Order 表 | 累计消费、客单价、品类偏好、优惠券依赖 |
| **预测标签** | T+1 AI预测 | 每周 | ML 模型 | 流失概率、LTV、复购意愿、推荐响应度 |

### 1.2 标签生命周期

```
标签创建 ──→ 标签命中 ──→ 标签衰减 ──→ 标签过期/删除
   │            │           │             │
  管理员定义   规则匹配    分数降低      长期不命中
  AI自动生成   行为触发    权重调整      用户注销
```

## 二、Prisma 模型设计

### 2.1 标签定义

```prisma
// ── 标签字典（全局标签库） ──
model TagDict {
  id          String   @id @default(uuid())
  name        String   @unique              // 标签名
  category    TagCategory                    // 标签大类
  subCategory String?                        // 子类
  description String?                        // 标签说明
  color       String?   @default("#666")    // 展示颜色
  isAuto      Boolean  @default(false)      // 是否自动生成
  status      String   @default("ACTIVE")   // ACTIVE/DISABLED
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userTags    UserTag[]

  @@index([category, status])
}

enum TagCategory {
  DEMOGRAPHIC      // 基础属性
  BEHAVIOR         // 行为
  INTEREST         // 兴趣
  CONSUME          // 消费
  PREDICTIVE       // AI预测
  CUSTOM           // 业务自定义
}

// ── 用户标签关联 ──
model UserTag {
  id        String   @id @default(uuid())
  userId    String
  tagId     String
  tagName   String?                        // 冗余字段加速查询
  value     Float    @default(1.0)         // 标签强度(0~1)
  source    String   @default("RULE")      // RULE/AI/BEHAVIOR/ADMIN
  firstHit  DateTime @default(now())       // 首次命中时间
  lastHit   DateTime @updatedAt            // 最近命中时间
  hitCount  Int      @default(1)           // 命中次数
  expireAt  DateTime?                      // 过期时间
  createdAt DateTime @default(now())

  tag  TagDict @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([userId, tagId])
  @@index([userId, value])
  @@index([tagId, value])
  @@index([tagName])
}
```

### 2.2 自动打标规则

```prisma
// ── 打标规则定义 ──
model TagRule {
  id          String   @id @default(uuid())
  name        String                         // 规则名称
  tagId       String                         // 目标标签ID
  tagName     String?                        // 冗余
  ruleType    TagRuleType                    // 规则类型
  priority    Int      @default(0)

  // 规则配置（JSON）
  // 行为规则: { "behaviors": ["VIEW","SHARE"], "targetTypes": ["COURSE"], "minCount": 5, "withinDays": 30 }
  // 消费规则: { "minAmount": 10000, "categories": ["八字","紫微"], "withinDays": 90 }
  // SQL规则:   { "sql": "SELECT userId FROM ..." }
  // 时间规则:  { "inactiveDays": 30 }
  config      Json

  // 标签强度计算
  valueFormula String?  @default("count")    // count/fixed/decay/linear/weighted
  valueConfig  Json?                         // 权重配置

  // 衰减配置
  decayEnabled  Boolean @default(false)
  decayDays     Int?                         // 多少天后开始衰减
  decayRate     Float?  @default(0.5)        // 衰减率(0-1)

  isEnabled   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tagId, isEnabled])
  @@index([priority])
}

enum TagRuleType {
  BEHAVIOR     // 行为触发
  CONSUME      // 消费触发
  DEMOGRAPHIC  // 人口属性
  TIME_BASED   // 时间维度(沉睡/流失)
  SQL          // 自定义SQL
  COMBINATION  // 组合规则
}
```

### 2.3 用户画像快照

```prisma
// ── 用户画像快照（T+1 离线计算） ──
model UserProfile {
  id        String   @id @default(uuid())
  userId    String   @unique

  // ── 基础统计 ──
  totalOrders      Int      @default(0)
  totalSpent       Float    @default(0)     // 累计消费(元)
  avgOrderAmount   Float    @default(0)     // 客单价
  lastOrderAt      DateTime?
  firstOrderAt     DateTime?

  // ── 行为统计 ──
  totalVisits      Int      @default(0)     // 总访问次数
  activeDays7d     Int      @default(0)     // 近7天活跃天数
  activeDays30d    Int      @default(0)     // 近30天活跃天数
  avgSessionSeconds Float   @default(0)     // 平均会话时长
  lastVisitAt      DateTime?

  // ── 内容偏好 Top N ──
  topCategories    Json?                    // [{ category:"八字", score:0.9 }, ...]
  topTags          Json?                    // [{ tag:"命理进阶", score:0.8 }, ...]

  // ── 消费分层 ──
  consumeLevel     String?  @default("NEW") // NEW/LOW/MID/HIGH/WHALE
  priceSensitivity Float?                   // 0-1, 越高越敏感
  couponDependency Float?                   // 0-1, 越高越依赖优惠券

  // ── 风险指标 ──
  churnProbability Float?                   // 流失概率(0-1)
  ltv              Float?                   // 预测LTV(元)
  repurchaseIntent Float?                   // 复购意愿(0-1)

  // ── 扩展字段 ──
  extra            Json?                    // 业务自定义扩展

  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())

  @@index([consumeLevel])
  @@index([churnProbability])
  @@index([ltv])
}

// ── 用户行为事件流水（增强版，替换/补充现有 UserBehavior） ──
model UserEvent {
  id          String   @id @default(uuid())
  userId      String
  event       String                        // view/search/click/share/pay/enroll/comment/like/collect
  targetType  String?                       // COURSE/ARTICLE/PRODUCT/VIDEO/CIRCLE/LIVE/CLASSIC
  targetId    String?
  targetName  String?                       // 冗余，加速分析
  duration    Int?                          // 停留时长（秒）
  value       Float?                        // 业务值（金额/评分等）
  page        String?                       // 来源页面
  referrer    String?                       // 来源渠道
  deviceInfo  Json?                         // { os, model, network }
  ip          String?
  createdAt   DateTime @default(now())

  @@index([userId, event, createdAt])
  @@index([userId, createdAt])
  @@index([event, createdAt])
  @@index([targetType, createdAt])
}
```

## 三、自动打标引擎

### 3.1 实时打标流程

```
用户行为发生
     │
     ▼
EventBus 发射事件
     │
     ▼
TagRuleEngine 匹配规则
     │
     ├─ 行为规则: 统计近N天行为次数 → 达阈值则打标
     ├─ 消费规则: 累计消费金额 → 达阈值则打标
     └─ 组合规则: 多条件 AND/OR → 满足则打标
     │
     ▼
更新 UserTag (upsert)
     │
     ▼
Redis 缓存更新 (实时查询用)
```

### 3.2 标签引擎核心服务

```typescript
// apps/server/src/modules/profile/tag-engine.service.ts

@Injectable()
export class TagEngineService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /** 处理用户事件，评估所有启用的行为/消费规则 */
  async processEvent(event: UserEvent): Promise<void> {
    const rules = await this.getActiveRules([
      TagRuleType.BEHAVIOR,
      TagRuleType.CONSUME,
    ]);

    for (const rule of rules) {
      const matched = await this.evaluateRule(rule, event.userId);
      if (matched) {
        const value = this.calculateTagValue(rule, event.userId);
        await this.upsertUserTag(event.userId, rule.tagId, rule.tagName!, value, 'RULE');
      }
    }
  }

  /** 评估单条规则 */
  private async evaluateRule(rule: TagRule, userId: string): Promise<boolean> {
    const config = rule.config as BehaviorRuleConfig;

    switch (rule.ruleType) {
      case TagRuleType.BEHAVIOR: {
        const count = await this.prisma.userBehavior.count({
          where: {
            userId,
            behavior: { in: config.behaviors },
            targetType: config.targetTypes ? { in: config.targetTypes } : undefined,
            createdAt: { gte: dayjs().subtract(config.withinDays, 'day').toDate() },
          },
        });
        return count >= config.minCount;
      }

      case TagRuleType.CONSUME: {
        const result = await this.prisma.order.aggregate({
          where: {
            userId,
            status: 'PAID',
            createdAt: { gte: dayjs().subtract(config.withinDays, 'day').toDate() },
          },
          _sum: { amount: true },
        });
        const total = Number(result._sum.amount || 0);
        return total >= config.minAmount;
      }

      case TagRuleType.TIME_BASED: {
        const lastVisit = await this.prisma.userEvent.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (!lastVisit) return false;
        const daysInactive = dayjs().diff(lastVisit.createdAt, 'day');
        return daysInactive >= config.inactiveDays;
      }

      case TagRuleType.COMBINATION: {
        const results = await Promise.all(
          config.rules.map((subRule: any) => this.evaluateSubRule(subRule, userId)),
        );
        return config.op === 'AND' ? results.every(Boolean) : results.some(Boolean);
      }
    }
    return false;
  }

  /** 计算标签强度 */
  private calculateTagValue(rule: TagRule, userId: string): number {
    switch (rule.valueFormula) {
      case 'count': return 1.0;
      case 'weighted': return this.computeWeightedValue(rule, userId);
      default: return 1.0;
    }
  }

  /** 标签衰减（每日定时任务） */
  @Cron('0 2 * * *') // 每日凌晨 2 点
  async decayTags(): Promise<void> {
    const decayRules = await this.prisma.tagRule.findMany({
      where: { decayEnabled: true, isEnabled: true },
    });

    for (const rule of decayRules) {
      const decayAfter = dayjs().subtract(rule.decayDays!, 'day').toDate();
      await this.prisma.userTag.updateMany({
        where: {
          tagId: rule.tagId,
          lastHit: { lt: decayAfter },
          value: { gt: 0.1 },
        },
        data: {
          value: { multiply: (1 - rule.decayRate!) },
        },
      });
    }

    // 删除值低于阈值的标签
    await this.prisma.userTag.deleteMany({
      where: { value: { lt: 0.05 } },
    });
  }
}

interface BehaviorRuleConfig {
  behaviors: string[];
  targetTypes?: string[];
  minCount: number;
  withinDays: number;
}
```

## 四、用户分群服务

### 4.1 分群 API

```typescript
// apps/server/src/modules/profile/segment.service.ts

@Injectable()
export class SegmentService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建用户分群（圈人）
   * 返回匹配的用户数量，超出 10000 时截断返回估算值
   */
  async createSegment(dto: CreateSegmentDto): Promise<Segment> {
    const segment = await this.prisma.userSegment.create({
      data: {
        name: dto.name,
        description: dto.description,
        conditions: dto.conditions as any,
        status: 'CALCULATING',
      },
    });

    // 异步计算分群用户
    this.computeSegmentUsers(segment.id, dto.conditions).catch(console.error);

    return segment;
  }

  /** 分群条件翻译为 Prisma Where */
  private buildSegmentWhere(conditions: SegmentCondition): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    // 标签筛选
    if (conditions.includeTags?.length) {
      where.tags = {
        some: {
          tagName: { in: conditions.includeTags },
          value: { gte: conditions.tagMinValue || 0.5 },
        },
      };
    }

    // 排除标签
    if (conditions.excludeTags?.length) {
      where.tags = {
        ...where.tags,
        none: { tagName: { in: conditions.excludeTags } },
      };
    }

    // 消费筛选
    if (conditions.minTotalSpent) {
      where.profile = { totalSpent: { gte: conditions.minTotalSpent } };
    }

    // 活跃度筛选
    if (conditions.minActiveDays) {
      where.profile = { ...where.profile, activeDays30d: { gte: conditions.minActiveDays } };
    }

    // 注册时间
    if (conditions.registerAfter) {
      where.createdAt = { gte: new Date(conditions.registerAfter) };
    }

    return where;
  }
}

interface CreateSegmentDto {
  name: string;
  description?: string;
  conditions: SegmentCondition;
}

interface SegmentCondition {
  includeTags?: string[];
  excludeTags?: string[];
  tagMinValue?: number;
  minTotalSpent?: number;
  maxTotalSpent?: number;
  consumeLevel?: string[];
  minActiveDays?: number;
  registerAfter?: string;
  registerBefore?: string;
  cities?: string[];
  memberLevels?: string[];
}

// ── 分群存储模型 ──
model UserSegment {
  id          String   @id @default(uuid())
  name        String
  description String?
  conditions  Json                              // 分群条件
  userCount   Int      @default(0)             // 匹配用户数
  lastComputedAt DateTime?                      // 最近计算时间
  status      String   @default("DRAFT")       // DRAFT/CALCULATING/READY/EXPIRED
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status])
}

// ── 分群用户明细 ──
model SegmentUser {
  id        String   @id @default(uuid())
  segmentId String
  userId    String
  addedAt   DateTime @default(now())

  @@unique([segmentId, userId])
  @@index([userId])
}
```

## 五、预设标签清单

### 5.1 基础属性标签

| 标签 | 来源 | 说明 |
|------|------|------|
| `gender_male` / `gender_female` | 微信授权/用户填写 | 性别 |
| `age_18_24` / `age_25_34` / `age_35_44` / `age_45_plus` | 微信/推算 | 年龄段 |
| `city_tier1` / `city_tier2` / `city_tier3` | 微信/手机号归属 | 城市等级 |
| `reg_source_wechat` / `reg_source_phone` | 注册方式 | 注册来源 |
| `device_ios` / `device_android` | 小程序环境 | 设备类型 |

### 5.2 行为标签

| 标签 | 规则 | 强度 |
|------|------|------|
| `high_active` | 近7天活跃≥5天 | 0.8 |
| `mid_active` | 近7天活跃2-4天 | 0.6 |
| `low_active` | 近7天活跃≤1天 | 0.3 |
| `search_heavy` | 近30天搜索≥10次 | 0.7 |
| `social_active` | 近30天评论/点赞/分享≥20次 | 0.6 |
| `night_owl` | 近30天 22:00-06:00 访问≥5次 | 0.5 |
| `content_creator` | 已发布内容≥3篇 | 0.9 |
| `video_lover` | 近30天观看视频≥10次 | 0.6 |
| `course_learner` | 近90天报名课程≥1门 | 0.8 |

### 5.3 兴趣标签（国学垂直）

| 标签组 | 标签 | 来源 |
|--------|------|------|
| **八字** | `bazi_beginner`, `bazi_intermediate`, `bazi_advanced` | 排盘次数+购买八字课程 |
| **紫微** | `ziwei_beginner`, `ziwei_intermediate`, `ziwei_advanced` | 排盘次数+购买紫微课程 |
| **经典** | `classic_yijing`, `classic_lunyu`, `classic_daodejing` | 阅读经典时长+收藏 |
| **风水** | `fengshui_home`, `fengshui_office` | 浏览风水内容+使用风水工具 |
| **中医** | `tcm_basic`, `tcm_herb`, `tcm_acupuncture` | 浏览中医内容 |
| **诗词** | `poetry_tang`, `poetry_song`, `poetry_creator` | 浏览诗词+创作 |
| **修行** | `meditation`, `qigong`, `taiji` | 浏览修行内容+加入修行圈子 |

### 5.4 消费标签

| 标签 | 规则 | 强度 |
|------|------|------|
| `whale` | 累计消费≥5000元 | 1.0 |
| `high_spender` | 累计消费1000-4999元 | 0.8 |
| `mid_spender` | 累计消费200-999元 | 0.6 |
| `low_spender` | 累计消费<200元 | 0.3 |
| `new_user` | 注册<30天且无消费 | 1.0 |
| `price_sensitive` | 使用优惠券订单占比>60% | 0.8 |
| `coupon_hunter` | 近30天领券≥5张 | 0.9 |
| `refund_risky` | 退款率>20% | 0.7 |
| `bazi_paid` | 购买过八字服务 | 0.9 |
| `course_paid` | 购买过课程 | 0.9 |
| `circle_paid` | 加入付费圈子 | 0.9 |

## 六、画像查询 API

### 6.1 单用户画像

```
GET /api/v1/admin/profile/:userId

Response:
{
  "userId": "xxx",
  "tags": [
    { "name": "bazi_advanced", "value": 0.92, "lastHit": "2026-05-10" },
    { "name": "high_spender", "value": 0.85, "lastHit": "2026-05-08" }
  ],
  "stats": {
    "totalSpent": 3280,
    "totalOrders": 15,
    "avgOrderAmount": 218.7,
    "activeDays7d": 5,
    "activeDays30d": 22,
    "lastVisit": "2026-05-11T09:23:00Z"
  },
  "interests": [
    { "tag": "八字命理", "score": 0.95 },
    { "tag": "紫微斗数", "score": 0.78 },
    { "tag": "易经", "score": 0.62 }
  ],
  "consumeTendency": {
    "preferCategory": "八字排盘",
    "preferTimeSlot": "20:00-22:00",
    "avgDecisionMinutes": 45
  },
  "churnRisk": 0.12,
  "ltv": 5800
}
```

### 6.2 分群查询

```
POST /api/v1/admin/segments/query
Body: { "conditions": { "includeTags": ["bazi_advanced"], "minTotalSpent": 500 } }

Response:
{ "matchedCount": 342, "segmentId": "seg_xxx" }
```

## 七、性能与存储方案

### 7.1 标签查询缓存

```
用户标签 → Redis Set:  user:tags:{userId} → { tagId:value, ... }
标签用户 → Redis Set:  tag:users:{tagId}  → { userId1, userId2, ... }
画像快照 → Redis Hash:  user:profile:{userId} → { totalSpent, activeDays, ... }
```

- 标签数据 TTL: 1 小时（用户实时标签变化时主动刷新）
- 画像快照 TTL: 6 小时（T+1 离线任务更新）

### 7.2 离线计算（T+1）

通过 NestJS Schedule 定时任务：

```
03:00 — 行为聚合 → 更新 UserProfile 统计字段
04:00 — 标签规则的 TIME_BASED/COMBINATION 类型评估
05:00 — AI 预测标签计算（流失概率/LTV）
06:00 — 标签衰减 + 清理过期标签
07:00 — 分群重算（标记 CALCULATING 的分群）
```

### 7.3 数据生命周期

```
UserEvent: 保留 90 天热数据 + 归档到冷存储
UserBehavior: 保留 180 天（与现有表合并）
UserProfile: 永久保留
UserTag: 永久保留（过期标签标记而非删除）
```

## 八、实现优先级

| 阶段 | 范围 | 预估 |
|------|------|------|
| V1 | TagDict + UserTag 模型 + 基础行为打标（active_level/consume_level） | 1周 |
| V2 | 消费标签 + 兴趣标签 + 用户画像快照 + 查询 API | 1.5周 |
| V3 | 分群服务 + 组合规则 + 标签衰减 | 1周 |
| V4 | AI 预测标签（流失/LTV）+ 离线计算任务 + 冷热数据分离 | 2周 |
