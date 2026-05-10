# 热卜国学平台 — 生态伙伴工作台设计

> 更新时间：2026-05-11 | 基于现有 Station/Operator/StationOffline/StationEarning/Withdrawal 模型扩展

## 一、生态角色总览

```
                    ┌──────────────────────────────┐
                    │       平台超级管理员           │
                    │   (admin.guoxue.ac.cn)        │
                    └──────────────┬───────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
    ┌─────▼─────┐          ┌──────▼──────┐          ┌──────▼──────┐
    │  圈子主     │          │   分站站长    │          │  线下场馆主   │
    │ (Circle    │          │ (Station     │          │ (Offline     │
    │  Owner)    │          │  Owner)      │          │  Venue)      │
    ├───────────┤          ├──────────────┤          ├──────────────┤
    │ 管理圈子    │          │ 独立品牌小程序 │          │ 线下课程排期  │
    │ 发布内容    │          │ 推广获客      │          │ 学员管理     │
    │ 成员管理    │          │ 分佣收益      │          │ 商品售卖     │
    │ 变现工具    │          │ 内容分发      │          │ 收益结算     │
    │ 数据分析    │          │ 数据分析      │          │ 预约管理     │
    └───────────┘          └──────────────┘          └──────────────┘
```

### 1.1 三大角色定位

| 角色 | 定位 | 核心诉求 | 变现方式 |
|------|------|---------|---------|
| **圈子主** | 内容创作者/社群运营者 | 内容发布、粉丝互动、知识变现 | 付费圈子、付费文章、问答 |
| **分站站长** | 区域推广代理 | 品牌定制、获客引流、裂变传播 | 分佣（课程/商品/会员） |
| **线下场馆主** | 线下教学空间运营 | 排课管理、学员管理、场地预约 | 线下课程、场地服务、商品 |

## 二、统一伙伴工作台架构

### 2.1 统一入口与路由

```
伙伴登录 → RoleSwitcher（多身份切换）
              │
    ┌─────────┼─────────┐
    │         │         │
  圈子主    分站站长   场馆主
  工作台    工作台     工作台
```

所有伙伴通过同一小程序/管理后台入口，根据 `UserRole` 中的角色类型展示对应工作台。同一用户可拥有多个角色，通过 RoleSwitcher 切换。

### 2.2 公共能力

三套工作台共享以下底层能力：

| 模块 | 说明 | 各角色差异化 |
|------|------|------------|
| **数据中心** | 访问量、转化率、收益趋势 | 口径不同（圈子/分站/线下） |
| **收益中心** | 收入明细、提现申请、账户管理 | 结算规则不同 |
| **内容管理** | 发布/编辑/下架内容 | 内容类型不同（文章/课程/活动） |
| **成员管理** | 用户列表、角色分配、黑名单 | 成员关系不同 |
| **消息中心** | 系统通知、告警、审核结果 | 通用 |
| **设置中心** | 基本信息、品牌配置、收款账户 | 配置项不同 |

## 三、圈子主工作台

### 3.1 功能全景

```
圈子主工作台
├── 📊 数据看板
│   ├── 圈子概况（成员数/内容数/活跃度）
│   ├── 内容表现（阅读/点赞/评论/转发）
│   ├── 变现数据（付费成员/收入趋势/转化漏斗）
│   └── 成员画像（地域分布/活跃时段/兴趣偏好）
│
├── ✍️ 内容中心
│   ├── 发布文章/动态
│   ├── 内容列表（草稿/已发布/审核中）
│   ├── 合集管理（系列文章组织）
│   └── 定时发布
│
├── 👥 成员管理
│   ├── 成员列表
│   ├── 入圈审核
│   ├── 成员角色（管理员/内容贡献者/普通成员）
│   ├── 黑名单
│   └── 成员导入/导出
│
├── 💰 变现工具
│   ├── 付费圈子设置（价格/试用期）
│   ├── 付费文章设置
│   ├── 问答定价
│   ├── 礼物/打赏设置
│   └── 优惠券发放
│
├── 📣 互动运营
│   ├── 话题管理
│   ├── 活动发布（线上/线下）
│   ├── 投票/问卷
│   ├── 公告发布
│   └── 精华内容置顶
│
└── ⚙️ 设置
    ├── 圈子信息（名称/头像/简介/标签）
    ├── 加入方式（免费/付费/邀请制/审核制）
    ├── 可见范围（公开/私密）
    ├── 收益账户
    └── 操作日志
```

### 3.2 数据看板 API

```
GET /api/v1/partner/circle/:circleId/dashboard

Response:
{
  "overview": {
    "memberCount": 1283,
    "newMembersToday": 12,
    "contentCount": 456,
    "activeRate": 0.34
  },
  "revenue": {
    "today": 128.50,
    "thisMonth": 3842.00,
    "totalRevenue": 58600.00,
    "trend": [/* 30天趋势 */]
  },
  "topContents": [
    { "title": "八字入门三讲", "views": 3200, "likes": 186, "revenue": 680 }
  ],
  "memberProfile": {
    "cityDistribution": { "北京": 28, "上海": 22, "广州": 18 },
    "activityHeatmap": [/* 24小时活跃分布 */],
    "topInterests": ["八字命理", "紫微斗数", "风水"]
  }
}
```

### 3.3 变现配置

```typescript
// apps/server/src/modules/partner/circle-monetization.service.ts

@Injectable()
export class CircleMonetizationService {
  constructor(private prisma: PrismaService) {}

  /**
   * 设置付费圈子
   */
  async setupPaidCircle(circleId: string, config: PaidCircleConfig): Promise<void> {
    await this.prisma.circle.update({
      where: { id: circleId },
      data: {
        isPaid: true,
        price: config.price,
        trialDays: config.trialDays || 0,
        // 分佣比例（平台抽成）
        platformCommissionRate: config.platformCommissionRate || 0.2,
      },
    });
  }

  /**
   * 设置单篇文章付费
   */
  async setArticlePrice(articleId: string, price: number): Promise<void> {
    await this.prisma.article.update({
      where: { id: articleId },
      data: { isPaid: true, price },
    });
  }
}

interface PaidCircleConfig {
  price: number;           // 加入价格（元）
  trialDays?: number;      // 免费试用天数
  platformCommissionRate?: number; // 平台抽成比例(0-1)
}
```

### 3.4 圈子成员管理 API

```
GET    /api/v1/partner/circle/:circleId/members          — 成员列表（分页/搜索/筛选）
POST   /api/v1/partner/circle/:circleId/members/:id/role — 设置成员角色
DELETE /api/v1/partner/circle/:circleId/members/:id      — 移出圈子
POST   /api/v1/partner/circle/:circleId/invitations       — 批量邀请
GET    /api/v1/partner/circle/:circleId/applications      — 入圈申请列表
POST   /api/v1/partner/circle/:circleId/applications/:id/approve — 通过申请
POST   /api/v1/partner/circle/:circleId/applications/:id/reject   — 拒绝申请
```

## 四、分站站长工作台

### 4.1 功能全景

```
分站站长工作台
├── 📊 数据看板
│   ├── 推广概况（曝光/点击/转化/新用户）
│   ├── 收益总览（今日/本月/累计/趋势）
│   ├── 转化漏斗（分享→访问→注册→付费）
│   └── 渠道分析（朋友圈/群聊/公众号/二维码）
│
├── 🎨 品牌配置
│   ├── 分站信息（名称/Logo/主题色/简介）
│   ├── 小程序配置（独立小程序 AppId/页面路径）
│   ├── 首页定制（模块排序/精选内容）
│   └── 分享设置（默认分享图/分享文案）
│
├── 📣 推广工具
│   ├── 推广海报生成
│   ├── 推广链接/二维码
│   ├── 优惠券分发（分站专属券）
│   ├── 素材库（海报/文案/视频模板）
│   └── 裂变活动（邀请有礼/排行榜）
│
├── 📦 内容分发
│   ├── 平台内容池（可分发课程/文章/视频）
│   ├── 已分发内容管理
│   ├── 专属内容创建
│   └── 内容排序/置顶
│
├── 💰 收益中心
│   ├── 收益明细（按课程/商品/会员分类）
│   ├── 佣金比例查看
│   ├── 提现申请
│   ├── 提现记录
│   └── 税票管理
│
├── 👥 用户管理
│   ├── 分站用户列表
│   ├── 用户来源追踪
│   └── 标签管理
│
└── ⚙️ 设置
    ├── 收款账户
    ├── 操作员管理（多管理员）
    ├── 公众号配置
    └── 操作日志
```

### 4.2 品牌配置数据结构

```typescript
interface StationBrandConfig {
  name: string;
  logo: string;
  themeColor: string;        // 主题色 #8B4513
  intro?: string;
  // 多小程序配置
  miniProgram: {
    appId: string;           // 独立小程序 AppId
    pages: {
      home: string;          // 首页路径
      mine: string;          // 我的页面
      course: string;        // 课程列表
    };
  };
  // 公众号配置
  officialAccount?: {
    appId: string;
    name: string;
  };
  // 首页模块定制
  homeModules: HomeModuleConfig[];
}

interface HomeModuleConfig {
  type: 'banner' | 'course_grid' | 'article_list' | 'video_feed' | 'live_card' | 'recommend';
  title?: string;
  sortOrder: number;
  config: Record<string, unknown>;  // 模块特有配置
  isEnabled: boolean;
}
```

### 4.3 分站推广追踪

通过 `ReferralLink` 追踪每个分站的推广效果：

```typescript
// 分站专属推广链接
// GET /api/v1/partner/station/referral-stats

interface ReferralStats {
  stationId: string;
  period: { start: Date; end: Date };

  // 流量漏斗
  totalShares: number;       // 总分享次数
  totalClicks: number;        // 总点击次数
  totalRegistrations: number; // 注册转化数
  totalOrders: number;        // 下单转化数
  totalRevenue: number;       // 推广收入

  // 转化率
  clickRate: number;          // 分享→点击
  registerRate: number;       // 点击→注册
  orderRate: number;          // 注册→下单

  // 渠道拆解
  channels: {
    wechatTimeline: ReferralChannelStat;  // 朋友圈
    wechatGroup: ReferralChannelStat;     // 群聊
    wechatPrivate: ReferralChannelStat;   // 私聊
    qrcode: ReferralChannelStat;          // 二维码
    officialAccount: ReferralChannelStat;  // 公众号
  };

  // 日趋势
  dailyTrend: Array<{ date: string; clicks: number; registrations: number; orders: number }>;
}
```

### 4.4 分站收益计算

```typescript
@Injectable()
export class StationEarningService {

  /** 分站收益计算 */
  async calculateEarning(params: {
    stationId: string;
    orderId: string;
    orderAmount: number;
    productType: 'COURSE' | 'PRODUCT' | 'MEMBER' | 'CIRCLE' | 'BOT';
    productId: string;
  }): Promise<void> {
    const station = await this.prisma.station.findUnique({
      where: { id: params.stationId },
    });

    // 查询该商品的分佣比例（可配置到分站/商品粒度）
    const commissionConfig = await this.prisma.commissionConfig.findFirst({
      where: { stationId: params.stationId, productType: params.productType },
    });

    const rate = commissionConfig?.rate || 0.1; // 默认 10%
    const earned = params.orderAmount * rate;

    await this.prisma.stationEarning.create({
      data: {
        stationId: params.stationId,
        orderId: params.orderId,
        amount: params.orderAmount,
        rate,
        earned,
        type: params.productType,
      },
    });

    // 更新分站累计收益
    await this.prisma.station.update({
      where: { id: params.stationId },
      data: { totalEarning: { increment: earned } },
    });
  }

  /** 提现申请 */
  async requestWithdrawal(stationId: string, amount: number): Promise<void> {
    const station = await this.prisma.station.findUnique({ where: { id: stationId } });

    // 检查可提现余额
    const availableBalance = await this.getAvailableBalance(stationId);
    if (availableBalance < amount) {
      throw new BadRequestException('可提现余额不足');
    }

    await this.prisma.withdrawal.create({
      data: {
        userId: station!.userId,
        stationId,
        amount,
        status: 'PENDING',
      },
    });
  }
}
```

## 五、线下场馆主工作台

### 5.1 功能全景

```
线下场馆主工作台
├── 📊 数据看板
│   ├── 场馆概况（课程数/学员数/满座率）
│   ├── 收入概览（课程收入/商品收入/场地收入）
│   ├── 学员分析（来源/复购/满意度）
│   └── 排课日历
│
├── 📅 课程管理
│   ├── 课程列表（线上课/线下课/混合课）
│   ├── 排课排期（时间/场地/教师）
│   ├── 课表视图（日/周/月）
│   ├── 课程定价
│   └── 课程模板
│
├── 👨‍🏫 教师管理
│   ├── 教师列表
│   ├── 教师排期
│   ├── 课时统计
│   └── 教师评分
│
├── 👥 学员管理
│   ├── 学员列表
│   ├── 报名审核
│   ├── 签到管理
│   ├── 学员分组
│   ├── 学习记录
│   └── 学员导出
│
├── 🛒 商品管理
│   ├── 场馆商品（教材/文创/茶饮）
│   ├── 库存管理
│   ├── 订单管理
│   └── 扫码下单
│
├── 💰 收益中心
│   ├── 收入明细
│   ├── 结算对账
│   ├── 提现申请
│   └── 退款处理
│
└── ⚙️ 设置
    ├── 场馆信息（名称/地址/电话/封面）
    ├── 场地管理（多教室/容量）
    ├── 营业时间
    ├── 收款账户
    └── 操作日志
```

### 5.2 排课管理 API

```typescript
// apps/server/src/modules/partner/offline-course.service.ts

@Injectable()
export class OfflineCourseService {

  /** 创建线下课程排期 */
  async createSchedule(dto: CreateOfflineScheduleDto): Promise<OfflineCourse> {
    // 检查场地冲突
    const conflict = await this.checkVenueConflict(
      dto.stationId,
      dto.startTime,
      dto.endTime,
      dto.venueRoom,
    );

    if (conflict) {
      throw new ConflictException('该时段场地已被占用');
    }

    return this.prisma.offlineCourse.create({
      data: {
        stationId: dto.stationId,
        title: dto.title,
        teacherId: dto.teacherId,
        type: dto.type,
        price: dto.price,
        maxStudents: dto.maxStudents,
        startTime: dto.startTime,
        endTime: dto.endTime,
        location: dto.venueRoom,
        status: 'PUBLISHED',
      },
    });
  }

  /** 学员签到 */
  async checkIn(courseId: string, userId: string, code: string): Promise<void> {
    const registration = await this.prisma.offlineCourseRegistration.findFirst({
      where: { courseId, userId, status: 'CONFIRMED' },
    });
    if (!registration) {
      throw new NotFoundException('未找到报名记录');
    }

    await this.prisma.offlineCourseRegistration.update({
      where: { id: registration.id },
      data: { checkedInAt: new Date(), checkInMethod: code ? 'QR' : 'MANUAL' },
    });
  }
}

interface CreateOfflineScheduleDto {
  stationId: string;
  title: string;
  teacherId?: string;
  type: 'OFFLINE' | 'HYBRID';
  price: number;
  maxStudents: number;
  startTime: string;
  endTime: string;
  venueRoom: string;
}
```

### 5.3 收益结算

```typescript
@Injectable()
export class StationSettlementService {

  /** 生成结算单 */
  async generateSettlement(stationId: string): Promise<StationSettlement> {
    const lastSettlement = await this.prisma.stationSettlement.findFirst({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
    });

    const sinceDate = lastSettlement?.createdAt || new Date(0);

    // 查询未结算的收益
    const earnings = await this.prisma.stationEarning.groupBy({
      by: ['type'],
      where: {
        stationId,
        createdAt: { gt: sinceDate },
      },
      _sum: { earned: true },
    });

    const totalAmount = earnings.reduce((sum, e) => sum + Number(e._sum.earned || 0), 0);

    if (totalAmount < 10) {
      throw new BadRequestException('结算金额需 ≥ 10 元');
    }

    const settlement = await this.prisma.stationSettlement.create({
      data: {
        stationId,
        totalAmount,
        platformCommission: totalAmount * 0.2, // 平台 20%
        netAmount: totalAmount * 0.8,
        periodStart: sinceDate,
        periodEnd: new Date(),
        status: 'PENDING_REVIEW',
      },
    });

    return settlement;
  }

  /** 场馆结算对账 */
  async reconcileSettlement(settlementId: string): Promise<void> {
    const settlement = await this.prisma.stationSettlement.findUnique({
      where: { id: settlementId },
      include: { station: true },
    });

    // 逐笔核对收益明细
    const details = await this.prisma.stationEarning.findMany({
      where: {
        stationId: settlement!.stationId,
        createdAt: { gte: settlement!.periodStart, lte: settlement!.periodEnd },
      },
    });

    const calculatedTotal = details.reduce((sum, d) => sum + Number(d.earned), 0);
    const diff = Math.abs(calculatedTotal - Number(settlement!.totalAmount));

    // 对账差异 < 0.01 元视为通过
    await this.prisma.stationSettlement.update({
      where: { id: settlementId },
      data: {
        status: diff < 0.01 ? 'RECONCILED' : 'DISCREPANCY',
        calculatedAmount: calculatedTotal,
        difference: diff,
      },
    });
  }
}
```

## 六、权限与鉴权

### 6.1 角色权限矩阵

| 接口前缀 | 圈子主 | 分站站长 | 场馆主 | 平台管理员 |
|---------|--------|---------|--------|-----------|
| `/partner/circle/:id/*` | ✅ (仅拥有者) | ❌ | ❌ | ✅ |
| `/partner/station/:id/*` | ❌ | ✅ (仅拥有者) | ❌ | ✅ |
| `/partner/offline/:id/*` | ❌ | ❌ | ✅ (仅拥有者) | ✅ |
| `/partner/common/*` | ✅ | ✅ | ✅ | ✅ |
| `/admin/*` | ❌ | ❌ | ❌ | ✅ |

### 6.2 权限守卫

```typescript
// apps/server/src/common/partner-role.guard.ts

@Injectable()
export class PartnerRoleGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const partnerId = request.params.circleId || request.params.stationId || request.params.offlineId;

    if (!partnerId) return true; // 列表类接口由 controller 层过滤

    const requiredRole = this.reflector.get<PartnerRole>('partnerRole', context.getHandler());

    switch (requiredRole) {
      case 'CIRCLE_OWNER': {
        const circle = await this.prisma.circle.findUnique({ where: { id: partnerId } });
        return circle?.ownerId === userId;
      }
      case 'STATION_OWNER': {
        const station = await this.prisma.station.findUnique({ where: { id: partnerId } });
        return station?.userId === userId;
      }
      case 'OFFLINE_OWNER': {
        const offline = await this.prisma.stationOffline.findUnique({ where: { id: partnerId } });
        return offline?.ownerUserId === userId;
      }
    }
    return false;
  }
}

type PartnerRole = 'CIRCLE_OWNER' | 'STATION_OWNER' | 'OFFLINE_OWNER';

// 使用示例
@Controller('partner/circle/:circleId')
export class CirclePartnerController {
  @Get('dashboard')
  @UseGuards(PartnerRoleGuard)
  @SetMetadata('partnerRole', 'CIRCLE_OWNER')
  async getDashboard(@Param('circleId') circleId: string) {
    // ...
  }
}
```

## 七、Prisma 扩展模型

```prisma
// ── 分佣配置（增强现有 CommissionConfig） ──
model CommissionConfig {
  id          String  @id @default(uuid())
  stationId   String?
  productType String                         // COURSE/PRODUCT/MEMBER/CIRCLE/BOT/GLOBAL
  productId   String?                        // 留空=该类型全局
  rate        Decimal @db.Decimal(5, 4)     // 分佣比例(0-1)
  level2Rate  Decimal? @db.Decimal(5, 4)    // 二级分销比例
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([stationId, productType, productId])
  @@index([productType])
}

// ── 推广素材库 ──
model PromoMaterial {
  id          String   @id @default(uuid())
  stationId   String
  name        String
  type        String                         // IMAGE/VIDEO/ARTICLE_LINK/LANDING_PAGE
  url         String?                        // 素材地址
  config      Json?                          // 素材参数
  viewCount   Int      @default(0)
  shareCount  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([stationId, type])
}

// ── 线下课程报名 ──
model OfflineCourseRegistration {
  id           String   @id @default(uuid())
  courseId     String
  userId       String
  status       String   @default("CONFIRMED") // CONFIRMED/CANCELLED/ATTENDED
  checkedInAt  DateTime?
  checkInMethod String?                       // QR/MANUAL
  orderId      String?                        // 关联支付订单
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([courseId, userId])
  @@index([userId, createdAt])
}

// ── 场馆结算单 ──
model StationSettlement {
  id                 String   @id @default(uuid())
  stationId           String
  totalAmount         Decimal  @db.Decimal(12, 2)
  platformCommission  Decimal  @db.Decimal(12, 2)
  netAmount           Decimal  @db.Decimal(12, 2)
  calculatedAmount    Decimal? @db.Decimal(12, 2)
  difference          Float?   // 对账差异
  periodStart         DateTime
  periodEnd           DateTime
  status              String   @default("PENDING_REVIEW")
                        // PENDING_REVIEW → RECONCILED → PAID / DISCREPANCY
  paidAt              DateTime?
  remark              String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  station StationOffline @relation(fields: [stationId], references: [id])

  @@index([stationId, createdAt])
  @@index([status])
}

// ── 圈子变现配置扩展 ──
model CircleMonetization {
  id                    String  @id @default(uuid())
  circleId              String  @unique
  isPaid                Boolean @default(false)
  price                 Decimal @default(0) @db.Decimal(10, 2)
  trialDays             Int     @default(0)
  platformCommissionRate Float  @default(0.2)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

## 八、通知与消息

### 8.1 伙伴通知分类

| 通知类型 | 触发场景 | 通知方式 |
|---------|---------|---------|
| 新成员通知 | 用户加入圈子/分站/报名课程 | 小程序消息 + 模板消息 |
| 收益到账 | 分佣结算/课程收入 | 小程序消息 |
| 提现状态 | 提现申请通过/驳回/到账 | 小程序消息 + 短信 |
| 内容审核 | 内容审核通过/驳回 | 小程序消息 |
| 结算通知 | 月度结算单生成 | 小程序消息 + 邮件 |
| 系统公告 | 平台规则变更/功能更新 | 小程序消息 + 邮件 |

### 8.2 伙伴消息中心 API

```
GET  /api/v1/partner/inbox                    — 消息列表(分页)
GET  /api/v1/partner/inbox/unread-count       — 未读计数
POST /api/v1/partner/inbox/:id/read           — 标记已读
POST /api/v1/partner/inbox/read-all           — 全部已读
```

## 九、实现优先级

| 阶段 | 范围 | 预估 |
|------|------|------|
| V1 | 圈子主工作台：数据看板 + 内容管理 + 成员管理 + 变现设置 | 2周 |
| V2 | 分站站长工作台：品牌配置 + 推广工具 + 收益中心 + 用户追踪 | 2周 |
| V3 | 线下场馆主工作台：排课管理 + 签到 + 教师管理 + 结算对账 | 1.5周 |
| V4 | 统一伙伴消息中心 + 操作日志 + 多操作员管理 | 1周 |
