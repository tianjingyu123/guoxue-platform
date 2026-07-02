import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CreateStationDto, UpdateStationDto, CreateOperatorDto, SetStationTemplateDto, UpdateOperatorBrandDto, ApplyStationDto } from "./station.dto";

/** 模版定义 */
export const STATION_TEMPLATES = {
  default: {
    id: "default",
    name: "通用型",
    desc: "全内容瀑布流混排，适合综合类分站",
    hero: null,
    tabs: ["推荐", "关注", "热门", "直播"],
    modules: ["article", "course", "circle", "product", "video", "live"],
    showSections: ["recommend", "circle", "course", "product", "live", "paipan"],
  },
  paipan: {
    id: "paipan",
    name: "排盘型",
    desc: "排盘入口置顶，适合命理师/预测师",
    hero: "paipan_entry",
    tabs: ["排盘", "课程", "文章", "圈子"],
    modules: ["paipan", "course", "article", "circle"],
    showSections: ["paipan", "course", "circle"],
  },
  lecturer: {
    id: "lecturer",
    name: "讲师型",
    desc: "课程网格置顶，适合培训讲师",
    hero: "course_grid",
    tabs: ["课程", "圈子", "文章"],
    modules: ["course", "circle", "article"],
    showSections: ["course", "circle", "article"],
  },
  ecommerce: {
    id: "ecommerce",
    name: "电商型",
    desc: "商品瀑布流+直播+秒杀，适合商品卖家",
    hero: "featured_products",
    tabs: ["商城", "直播", "秒杀"],
    modules: ["product", "live", "marketing"],
    showSections: ["product", "live", "marketing", "circle"],
  },
  minimal: {
    id: "minimal",
    name: "极简型",
    desc: "只保留圈子+排盘+主页，适合新手站长",
    hero: null,
    tabs: ["圈子", "排盘"],
    modules: ["circle", "paipan"],
    showSections: ["circle", "paipan"],
  },
} as const;

export type StationTemplateId = keyof typeof STATION_TEMPLATES;

@Injectable()
export class StationService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private readonly BRAND_TTL = 600; // 品牌配置缓存10分钟

  // ───────── 分站管理 ─────────

  async createStation(userId: string, dto: CreateStationDto) {
    return this.prisma.station.create({
      data: {
        userId,
        name: dto.name,
        code: dto.code,
        intro: dto.intro,
        logo: dto.logo,
        themeColor: dto.themeColor,
        miniAppId: dto.miniAppId,
        mpAppId: dto.mpAppId,
        miniPages: dto.miniPages as any,
      },
    });
  }

  /** 用户自助申请开通分站 */
  async applyStation(userId: string, dto: ApplyStationDto) {
    // 检查是否已有分站
    const existing = await this.prisma.station.findFirst({ where: { userId } });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "你已开通分站，无需重复申请");

    // 检查推广码是否已被占用
    const codeExists = await this.prisma.station.findUnique({ where: { code: dto.code } });
    if (codeExists) throw new BusinessException(ErrorCode.BAD_REQUEST, "推广码已被占用，请更换");

    return this.prisma.station.create({
      data: {
        userId,
        name: dto.name,
        code: dto.code,
        intro: dto.intro,
        logo: dto.logo,
        status: "PENDING",
      },
    });
  }

  async updateStation(id: string, dto: UpdateStationDto) {
    const existing = await this.prisma.station.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.STATION_NOT_FOUND, "分站不存在");
    const updated = await this.prisma.station.update({ where: { id }, data: dto as any });
    // 清除品牌缓存
    await this.redis.del(`station:brand:id:${id}`);
    await this.redis.del(`station:brand:code:${updated.code}`);
    await this.redis.del(`station:brand:template:code:${updated.code}`);
    return updated;
  }

  async deleteStation(id: string) {
    const station = await this.prisma.station.findUnique({ where: { id } });
    if (!station) throw new BusinessException(ErrorCode.STATION_NOT_FOUND, "分站不存在");
    await this.redis.del(`station:brand:id:${id}`);
    await this.redis.del(`station:brand:code:${station.code}`);
    await this.redis.del(`station:brand:template:code:${station.code}`);
    return this.prisma.station.delete({ where: { id } });
  }

  async getStation(id: string) {
    const station = await this.prisma.station.findUnique({
      where: { id },
      include: { user: { select: { id: true, nickname: true } } },
    });
    if (!station) throw new BusinessException(ErrorCode.STATION_NOT_FOUND, "分站不存在");
    return station;
  }

  /** 通过用户ID获取分站（自服务用） */
  async getStationByUserId(userId: string) {
    return this.prisma.station.findFirst({
      where: { userId },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
    });
  }

  /** 统计分站锁定的用户数 */
  async countLockedUsers(stationId: string) {
    const station = await this.prisma.station.findUnique({ where: { id: stationId }, select: { userId: true } });
    if (!station) return 0;
    return this.prisma.referralRelation.count({ where: { referrerId: station.userId, referrerType: "STATION_MASTER" } });
  }

  /** 统计分站当月订单数 */
  async countMonthOrders(stationId: string, monthStart: Date) {
    return this.prisma.stationEarning.count({ where: { stationId, createdAt: { gte: monthStart } } });
  }

  /** 统计分站当月佣金总和 */
  async sumMonthEarnings(stationId: string, monthStart: Date) {
    const agg = await this.prisma.stationEarning.aggregate({
      where: { stationId, createdAt: { gte: monthStart } },
      _sum: { earned: true },
    });
    return agg._sum.earned || 0;
  }

  /** 站长自购累计已省（下单立减金额之和，仅统计已支付订单，退款单不计） */
  async sumSelfPurchaseSaved(userId: string) {
    const agg = await this.prisma.order.aggregate({
      where: { userId, selfDiscount: { gt: 0 }, status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
      _sum: { selfDiscount: true },
    });
    return agg._sum.selfDiscount || 0;
  }

  // ───────── 客户洞察（T2 增强·智能名片）─────────
  // 合规边界：仅站长本人可查其归属关系（ReferralRelation）内的用户；聚合兴趣画像为主，
  // 不返回手机号等敏感字段；行为时间线仅限归属客户且供经营分析使用。

  /** 浏览路径 → 兴趣模块标签（page_view 只有模块级路径；内容级兴趣由 view_content 事件提供） */
  private static readonly MODULE_LABELS: Array<[string, string]> = [
    ["pkg-shop", "商城"], ["course", "课程"], ["pkg-circle", "圈子"], ["pkg-live", "直播"],
    ["classic", "古籍"], ["poetry", "诗词"], ["ebook", "电子书"], ["paipan", "命理工具"],
    ["fortune", "命理工具"], ["pkg-video", "短视频"], ["competition", "赛事"], ["offline", "线下驿站"],
  ];

  private pathToModuleLabel(path?: string | null): string | null {
    if (!path) return null;
    for (const [prefix, label] of StationService.MODULE_LABELS) {
      if (path.includes(prefix)) return label;
    }
    return null;
  }

  /** 归属客户画像列表：最近活跃/30天行为量/消费力/兴趣标签（搜索词+浏览模块+内容标题聚合） */
  async listCustomers(ownerUserId: string, page = 1, pageSize = 20) {
    const where = { referrerId: ownerUserId, referrerType: "STATION_MASTER" as const, relationStatus: "ACTIVE" };
    const [relations, total] = await Promise.all([
      this.prisma.referralRelation.findMany({
        where, select: { userId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      this.prisma.referralRelation.count({ where }),
    ]);
    const userIds = relations.map((r) => r.userId);
    if (userIds.length === 0) return { customers: [], total };

    const since30 = new Date(Date.now() - 30 * 86_400_000);
    const [users, activity, purchases, interestEvents] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, nickname: true, avatar: true },
      }),
      this.prisma.trackEvent.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, occurredAt: { gte: since30 } },
        _count: true,
        _max: { occurredAt: true },
      }),
      this.prisma.order.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.trackEvent.findMany({
        where: { userId: { in: userIds }, action: { in: ["search", "view_content", "page_view"] }, occurredAt: { gte: since30 } },
        select: { userId: true, action: true, path: true, payload: true },
        orderBy: { occurredAt: "desc" },
        take: 1500,
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const actMap = new Map(activity.map((a) => [a.userId, a]));
    const buyMap = new Map(purchases.map((p) => [p.userId, p]));

    // 兴趣聚合：搜索词权重3 > 内容标题权重2 > 浏览模块权重1，取 TOP3
    const interestMap = new Map<string, Map<string, number>>();
    const bump = (uid: string, tag: string, w: number) => {
      if (!tag) return;
      const m = interestMap.get(uid) ?? new Map<string, number>();
      m.set(tag, (m.get(tag) || 0) + w);
      interestMap.set(uid, m);
    };
    for (const e of interestEvents) {
      if (!e.userId) continue;
      const payload = (e.payload ?? {}) as Record<string, unknown>;
      if (e.action === "search" && typeof payload.keyword === "string") {
        bump(e.userId, String(payload.keyword).slice(0, 12), 3);
      } else if (e.action === "view_content" && typeof payload.title === "string") {
        bump(e.userId, String(payload.title).slice(0, 12), 2);
      } else {
        const label = this.pathToModuleLabel(e.path ?? (payload.path as string | undefined));
        if (label) bump(e.userId, label, 1);
      }
    }

    const customers = relations.map((r) => {
      const act = actMap.get(r.userId);
      const buy = buyMap.get(r.userId);
      const tags = [...(interestMap.get(r.userId) ?? new Map())]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag);
      return {
        userId: r.userId,
        nickname: userMap.get(r.userId)?.nickname || "用户",
        avatar: userMap.get(r.userId)?.avatar || null,
        boundAt: r.createdAt,
        lastActiveAt: act?._max.occurredAt || null,
        events30d: act?._count || 0,
        orderCount: buy?._count || 0,
        totalSpent: Number(buy?._sum.amount || 0),
        interests: tags,
      };
    });
    // 最近活跃优先展示，便于站长优先跟进「热」客户
    customers.sort((a, b) => (b.lastActiveAt?.getTime?.() || 0) - (a.lastActiveAt?.getTime?.() || 0));
    return { customers, total };
  }

  /** 单个归属客户的最近行为时间线（先校验归属关系，防越权窥探） */
  async getCustomerTimeline(ownerUserId: string, customerId: string, limit = 30) {
    const relation = await this.prisma.referralRelation.findFirst({
      where: { referrerId: ownerUserId, userId: customerId, referrerType: "STATION_MASTER", relationStatus: "ACTIVE" },
      select: { id: true },
    });
    if (!relation) throw new BusinessException(ErrorCode.FORBIDDEN, "该用户不是您的归属客户");

    const events = await this.prisma.trackEvent.findMany({
      where: { userId: customerId },
      select: { action: true, path: true, payload: true, occurredAt: true },
      orderBy: { occurredAt: "desc" },
      take: Math.min(50, limit),
    });
    return {
      events: events.map((e) => ({
        action: e.action,
        path: e.path,
        // 只透出经营分析所需的轻量字段，不透传完整 payload
        summary: this.summarizeEvent(e.action, (e.payload ?? {}) as Record<string, unknown>, e.path),
        occurredAt: e.occurredAt,
      })),
    };
  }

  /** 行为事件 → 人话摘要 */
  private summarizeEvent(action: string, payload: Record<string, unknown>, path?: string | null): string {
    if (action === "search" && payload.keyword) return `搜索了「${String(payload.keyword).slice(0, 20)}」`;
    if (action === "view_content" && payload.title) {
      const typeLabel = payload.type === "course" ? "课程" : payload.type === "product" ? "商品" : "内容";
      return `浏览了${typeLabel}「${String(payload.title).slice(0, 24)}」`;
    }
    if (action === "purchase") return "完成了一笔购买";
    if (action === "share") return "分享了内容";
    if (action === "ref_click") return "点开了一条分享链接";
    const label = this.pathToModuleLabel(path ?? (payload.path as string | undefined));
    return label ? `逛了逛${label}` : "浏览了页面";
  }

  /** 通过推广码获取分站品牌配置（公开接口，千人千面渲染，10分钟缓存） */
  async getBrandByCode(code: string) {
    const cacheKey = `station:brand:code:${code}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const station = await this.prisma.station.findUnique({
      where: { code },
      select: {
        id: true,
        name: true,
        logo: true,
        themeColor: true,
        code: true,
        intro: true,
      },
    });
    if (!station) throw new BusinessException(ErrorCode.STATION_NOT_FOUND, "分站不存在");

    await this.redis.setJson(cacheKey, station, this.BRAND_TTL);
    return station;
  }

  /** 通过ID获取分站品牌配置（10分钟缓存） */
  async getBrand(id: string) {
    const cacheKey = `station:brand:id:${id}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const station = await this.prisma.station.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        logo: true,
        themeColor: true,
        code: true,
        intro: true,
      },
    });
    if (!station) throw new BusinessException(ErrorCode.STATION_NOT_FOUND, "分站不存在");

    await this.redis.setJson(cacheKey, station, this.BRAND_TTL);
    return station;
  }

  async listStations(page = 1, pageSize = 20) {
    const [stations, total] = await Promise.all([
      this.prisma.station.findMany({
        include: { user: { select: { id: true, nickname: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.station.count(),
    ]);
    return { stations, total, page, pageSize };
  }

  async getStationEarnings(stationId: string, page = 1, pageSize = 20) {
    const where = { stationId };
    const [earnings, total] = await Promise.all([
      this.prisma.stationEarning.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.stationEarning.count({ where }),
    ]);
    return { earnings, total, page, pageSize };
  }

  // ───────── 运营商 ─────────

  async createOperator(userId: string, dto: CreateOperatorDto) {
    return this.prisma.operator.create({
      data: {
        userId,
        level: dto.level as any,
        containQuota: dto.containQuota ?? 0,
        parentOperatorId: dto.parentOperatorId,
        expireAt: dto.expireAt ? new Date(dto.expireAt) : undefined,
      },
    });
  }

  async listOperators(page = 1, pageSize = 20) {
    const [operators, total] = await Promise.all([
      this.prisma.operator.findMany({
        include: { user: { select: { id: true, nickname: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.operator.count(),
    ]);
    return { operators, total, page, pageSize };
  }

  // ───────── 多小程序配置 ─────────

  /** 获取分站小程序配置（含跨跳转规则） */
  async getMiniConfig(stationId: string) {
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: {
        id: true, name: true, code: true,
        miniAppId: true, mpAppId: true, miniPages: true,
        logo: true, themeColor: true,
      },
    });
    if (!station) throw new BusinessException(ErrorCode.STATION_NOT_FOUND, "分站不存在");

    const platformMiniAppId = process.env.WECHAT_MINI_APP_ID || process.env.WECHAT_APP_ID || "";
    // 如果分站有独立小程序则用分站的，否则用平台主小程序
    const appId = station.miniAppId || platformMiniAppId;
    // 如果有公众号 AppId 则用分站的，否则用平台默认
    const mpAppId = station.mpAppId || process.env.WECHAT_MP_APP_ID || process.env.WECHAT_APP_ID || "";

    return {
      stationId: station.id,
      stationName: station.name,
      stationCode: station.code,
      brand: { logo: station.logo, themeColor: station.themeColor },
      miniAppId: appId,
      mpAppId,
      pages: (station.miniPages || {}) as Record<string, string>,
      // 平台主小程序 AppId（用于跨小程序跳转）
      platformMiniAppId,
    };
  }

  async resolveJumpTarget(stationId: string, targetPath: string) {
    const config = await this.getMiniConfig(stationId);
    const pagePath = config.pages[targetPath] || targetPath;
    return {
      appId: config.miniAppId,
      path: pagePath,
      crossApp: config.miniAppId !== config.platformMiniAppId,
      platformAppId: config.platformMiniAppId,
    };
  }

  // ───────── 分站发现（用户端公开） ─────────

  async discoverStations(params: { keyword?: string; page?: number; pageSize?: number }) {
    const { keyword, page = 1, pageSize = 20 } = params;
    const where: Prisma.StationWhereInput = { status: "ACTIVE" };
    if (keyword) where.name = { contains: keyword };

    const [stations, total] = await Promise.all([
      this.prisma.station.findMany({
        where,
        select: {
          id: true, name: true, code: true, logo: true,
          themeColor: true, intro: true,
        },
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.station.count({ where }),
    ]);
    return { stations, total, page, pageSize };
  }

  async getRevenueDashboard(stationId: string) {
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { id: true, name: true, totalEarning: true },
    });
    if (!station) throw new BusinessException(ErrorCode.STATION_NOT_FOUND, "分站不存在");

    const [earningsAgg, earningBreakdown] = await Promise.all([
      this.prisma.stationEarning.aggregate({
        where: { stationId },
        _sum: { amount: true, earned: true },
        _count: true,
      }),
      this.prisma.stationEarning.groupBy({
        by: ["type"],
        where: { stationId },
        _sum: { earned: true },
        _count: true,
      }),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEarnings = await this.prisma.stationEarning.aggregate({
      where: { stationId, createdAt: { gte: monthStart } },
      _sum: { earned: true, amount: true },
      _count: true,
    });

    return {
      stationName: station.name,
      totalEarning: station.totalEarning,
      totalOrders: earningsAgg._count,
      totalAmount: earningsAgg._sum.amount || 0,
      totalEarned: earningsAgg._sum.earned || 0,
      monthOrders: monthEarnings._count,
      monthEarned: monthEarnings._sum.earned || 0,
      monthAmount: monthEarnings._sum.amount || 0,
      breakdown: earningBreakdown.map(b => ({
        type: b.type,
        count: b._count,
        earned: b._sum.earned,
      })),
    };
  }

  // ───────── 模版系统 ─────────

  /** 获取可用模版列表 */
  getTemplateOptions() {
    return Object.values(STATION_TEMPLATES).map(t => ({
      id: t.id,
      name: t.name,
      desc: t.desc,
      preview: {
        hero: t.hero,
        tabs: t.tabs,
        modules: t.modules,
      },
    }));
  }

  /** 获取模版完整配置（含默认值） */
  getTemplateConfig(templateId: string) {
    const tpl = STATION_TEMPLATES[templateId as StationTemplateId];
    if (!tpl) throw new BusinessException(ErrorCode.NOT_FOUND, `模版 ${templateId} 不存在`);
    return { ...tpl };
  }

  /** 为分站设置模版 */
  async setStationTemplate(stationId: string, dto: SetStationTemplateDto) {
    const tpl = STATION_TEMPLATES[dto.templateId as StationTemplateId];
    if (!tpl) throw new BusinessException(ErrorCode.NOT_FOUND, `模版 ${dto.templateId} 不存在`);

    const config = dto.templateConfig ?? {};
    const mergedConfig = { ...tpl, ...config };

    const existing = await this.prisma.station.findUnique({ where: { id: stationId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "分站不存在");

    const updated = await this.prisma.station.update({
      where: { id: stationId },
      data: {
        templateId: dto.templateId,
        templateConfig: mergedConfig as any,
      },
    });

    // 清除缓存
    await this.redis.del(`station:brand:id:${stationId}`);
    await this.redis.del(`station:brand:code:${updated.code}`);
    await this.redis.del(`station:brand:template:code:${updated.code}`);

    return {
      stationId,
      templateId: dto.templateId,
      config: mergedConfig,
    };
  }

  /** 获取分站品牌+模版配置（含缓存） */
  async getBrandWithTemplate(code: string) {
    const cacheKey = `station:brand:template:code:${code}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const station = await this.prisma.station.findUnique({
      where: { code },
      select: {
        id: true, name: true, logo: true, themeColor: true,
        code: true, intro: true,
        templateId: true, templateConfig: true,
      },
    });
    if (!station) throw new BusinessException(ErrorCode.STATION_NOT_FOUND, "分站不存在");

    const tplId = station.templateId || "default";
    const baseTpl = STATION_TEMPLATES[tplId as StationTemplateId] ?? STATION_TEMPLATES.default;
    const tplConfig = (station.templateConfig as Record<string, unknown>) ?? {};
    const merged = { ...baseTpl, ...tplConfig, templateId: tplId };

    const result = {
      id: station.id,
      name: station.name,
      logo: station.logo,
      themeColor: station.themeColor,
      code: station.code,
      intro: station.intro,
      template: merged,
    };

    await this.redis.setJson(cacheKey, result, this.BRAND_TTL);
    return result;
  }

  /** 通过推广码获取分站【已发布】微页面（公开·用户侧渲染）。无已发布页返回 null → 前端回退模板默认楼层 */
  async getPublishedMicroPage(code: string) {
    const station = await this.prisma.station.findUnique({ where: { code }, select: { id: true } });
    if (!station) return null;
    return this.prisma.marketingPage.findFirst({
      where: { stationId: station.id, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      include: { components: { orderBy: { sortOrder: "asc" } } },
    });
  }

  // ───────── 运营商品牌与小程序 ─────────

  async updateOperatorBrand(operatorId: string, dto: UpdateOperatorBrandDto) {
    const data: any = {};
    if (dto.brandName) data.brandName = dto.brandName;
    if (dto.brandLogo !== undefined) data.brandLogo = dto.brandLogo;
    if (dto.brandThemeColor) data.brandThemeColor = dto.brandThemeColor;
    if (dto.miniAppId !== undefined) data.miniAppId = dto.miniAppId;
    if (dto.mpAppId !== undefined) data.mpAppId = dto.mpAppId;
    if (dto.miniPages) data.miniPages = dto.miniPages as any;
    const existing = await this.prisma.operator.findUnique({ where: { id: operatorId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "运营商不存在");
    return this.prisma.operator.update({ where: { id: operatorId }, data });
  }

  async getOperatorMiniConfig(operatorId: string) {
    const op = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      select: { id: true, brandName: true, brandLogo: true, brandThemeColor: true, miniAppId: true, mpAppId: true, miniPages: true },
    });
    if (!op) throw new BusinessException(ErrorCode.NOT_FOUND, "运营商不存在");
    return {
      operatorId: op.id,
      brandName: op.brandName,
      brand: { logo: op.brandLogo, themeColor: op.brandThemeColor },
      miniAppId: op.miniAppId || process.env.WECHAT_APP_ID || "",
      mpAppId: op.mpAppId || process.env.WECHAT_MP_APP_ID || "",
      pages: (op.miniPages || {}) as Record<string, string>,
    };
  }

  async getOperatorBrandByCode(code: string) {
    const cacheKey = `operator:brand:code:${code}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const op = await this.prisma.operator.findFirst({
      where: {
        user: { station: { code } },
      },
      select: {
        id: true, brandName: true, brandLogo: true, brandThemeColor: true,
        miniAppId: true, mpAppId: true,
      },
    });
    if (!op) throw new BusinessException(ErrorCode.NOT_FOUND, "运营商不存在");

    const result = { ...op };
    await this.redis.setJson(cacheKey, result, this.BRAND_TTL);
    return result;
  }

  // ───────── 团队管理 ─────────

  async getTeamMembers(userId: string, page = 1, pageSize = 20) {
    const where: Prisma.StationWhereInput = { userId };
    const [stations, total] = await Promise.all([
      this.prisma.station.findMany({
        where,
        select: { id: true, name: true, code: true, logo: true, totalEarning: true, createdAt: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.station.count({ where }),
    ]);
    return { members: stations, total, page, pageSize };
  }

  async getTeamLeaderboard(page = 1, pageSize = 20, sortBy?: string) {
    const orderField = sortBy === "revenue" ? "totalEarning" : sortBy === "orderCount" ? "totalOrders" : "totalEarning";
    const [stations, total] = await Promise.all([
      this.prisma.station.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, code: true, logo: true, totalEarning: true, createdAt: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [orderField]: "desc" },
      }),
      this.prisma.station.count({ where: { status: "ACTIVE" } }),
    ]);
    return { items: stations, total, page, pageSize };
  }

  async getTeamActivity(userId: string) {
    const stations = await this.prisma.station.findMany({
      where: { userId },
      select: { id: true, name: true, totalEarning: true },
    });
    const totalEarning = stations.reduce((sum, s) => sum + Number(s.totalEarning || 0), 0);

    return {
      stationCount: stations.length,
      weekNewOrders: 0, // Order 模型无 stationId 字段，由 commission 模块统计
      weekActiveUsers: 0,
      stations: stations.map((s) => ({ id: s.id, name: s.name })),
      totalEarning,
    };
  }

  async getSuccessCases(page = 1, pageSize = 20) {
    const where: Prisma.StationWhereInput = { status: "ACTIVE", totalEarning: { gt: 0 } };
    const [stations, total] = await Promise.all([
      this.prisma.station.findMany({
        where,
        select: { id: true, name: true, logo: true, intro: true, totalEarning: true, createdAt: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { totalEarning: "desc" },
      }),
      this.prisma.station.count({ where }),
    ]);
    return { items: stations, total, page, pageSize };
  }
}
