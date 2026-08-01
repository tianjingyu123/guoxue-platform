import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { InsightService } from "../track/insight.service";
import { CreateStationDto, UpdateStationDto, CreateOperatorDto, SetStationTemplateDto, UpdateOperatorBrandDto, ApplyStationDto } from "./station.dto";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";
import { StationPinnedService } from "./station-pinned.service";

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
    private insight: InsightService,
    private stationPinned: StationPinnedService,
  ) {}

  private readonly BRAND_TTL = 600; // 品牌配置缓存10分钟
  private readonly PINNED_TTL = 120; // 站长主推位公开缓存2分钟（兼顾新鲜度与公开访问性能·挡懒失活高频写）

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
    try {
      return await this.prisma.$transaction(async (tx) => {
        // userId/code 都有唯一索引；事务内先给出可读错误，数据库唯一约束继续做最终兜底。
        const existing = await tx.station.findFirst({ where: { userId } });
        if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "你已有分站，可直接继续支付或续费");

        const codeExists = await tx.station.findUnique({ where: { code: dto.code } });
        if (codeExists) throw new BusinessException(ErrorCode.BAD_REQUEST, "推广码已被占用，请更换");

        let operatorId: string | undefined;
        if (dto.operatorId) {
          const operator = await tx.operator.findUnique({
            where: { id: dto.operatorId },
            select: { id: true, status: true, expireAt: true, containQuota: true, usedQuota: true },
          });
          const now = new Date();
          if (!operator || operator.status !== "ACTIVE" || (operator.expireAt && operator.expireAt <= now)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "运营商邀请码无效或已过期");
          }

          // 真实 Station.operatorId 数量是配额真源；usedQuota 只作 CAS 镜像，创建时顺手校准历史漂移。
          const actualUsed = await tx.station.count({ where: { operatorId: operator.id } });
          const currentUsed = actualUsed;
          if (operator.containQuota <= 0 || currentUsed >= operator.containQuota) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "该运营商的分站名额已用完");
          }
          const reserved = await tx.operator.updateMany({
            where: { id: operator.id, status: "ACTIVE", usedQuota: operator.usedQuota },
            data: { usedQuota: currentUsed + 1 },
          });
          if (reserved.count === 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "运营商名额状态已变化，请刷新后重试");
          }
          operatorId = operator.id;
        }

        return tx.station.create({
          data: {
            userId,
            name: dto.name,
            code: dto.code,
            intro: dto.intro,
            logo: dto.logo,
            status: "PENDING",
            operatorId,
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "你已有分站或推广码已被占用，请刷新后重试");
      }
      throw error;
    }
  }

  /** 公开站长方案：展示金额与支付订单读取同一个 CommissionConfig 真源。 */
  async getStationPlan() {
    const [plan, period] = await Promise.all([
      this.prisma.commissionConfig.findUnique({
        where: { configKey: "station_master_price" },
        select: { rateA: true },
      }),
      this.prisma.configSystem.findUnique({
        where: { configKey: "station.billing_period_months" },
        select: { configValue: true },
      }),
    ]);
    const price = Number(plan?.rateA ?? 0);
    const configuredMonths = Number(period?.configValue ?? 12);
    const serviceMonths = Number.isFinite(configuredMonths) && configuredMonths > 0
      ? Math.floor(configuredMonths)
      : 12;
    if (!plan || !(price > 0)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "站长方案暂不可用，请联系平台客服");
    }
    return {
      price: Math.round(price * 100) / 100,
      serviceMonths,
    };
  }

  /** 公开运营商方案：价格、名额与服务期均读取支付链同一真源。 */
  async getOperatorPlan() {
    const [plan, period] = await Promise.all([
      this.prisma.commissionConfig.findUnique({
        where: { configKey: "operator_SILVER" },
        select: { rateA: true, rateB: true },
      }),
      this.prisma.configSystem.findUnique({
        where: { configKey: "station.billing_period_months" },
        select: { configValue: true },
      }),
    ]);
    const price = Number(plan?.rateA ?? 0);
    const quotaTotal = Math.max(0, Math.floor(Number(plan?.rateB ?? 0)));
    const configuredMonths = Number(period?.configValue ?? 12);
    const serviceMonths = Number.isFinite(configuredMonths) && configuredMonths > 0
      ? Math.floor(configuredMonths)
      : 12;
    if (!plan || !(price > 0) || quotaTotal <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "运营商方案暂不可用，请联系平台客服");
    }
    return {
      level: "SILVER",
      price: Math.round(price * 100) / 100,
      quotaTotal,
      serviceMonths,
      managementRate: 0.1,
      allocationMode: "INVITE",
    };
  }

  /** 公开校验运营商邀请，不返回用户身份或联系方式。 */
  async getOperatorInvite(operatorId: string) {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      select: { id: true, brandName: true, status: true, expireAt: true, containQuota: true, usedQuota: true },
    });
    const now = new Date();
    if (!operator || operator.status !== "ACTIVE" || (operator.expireAt && operator.expireAt <= now)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "运营商邀请码无效或已过期");
    }
    const actualUsed = await this.prisma.station.count({ where: { operatorId: operator.id } });
    const used = actualUsed;
    if (operator.containQuota <= 0 || used >= operator.containQuota) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该运营商的分站名额已用完");
    }
    return {
      operatorId: operator.id,
      operatorName: operator.brandName || "平台运营商",
      availableQuota: operator.containQuota - used,
    };
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
  // 画像聚合/时间线摘要已下沉公共 InsightService（驿站/圈主复用同一套）。

  /** 归属客户画像列表：最近活跃/30天行为量/消费力/兴趣标签（搜索词+浏览模块+内容标题聚合） */
  async listCustomers(ownerUserId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where = { referrerId: ownerUserId, referrerType: "STATION_MASTER" as const, relationStatus: "ACTIVE" };
    const [relations, total] = await Promise.all([
      this.prisma.referralRelation.findMany({
        where, select: { userId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        skip, take: pageSize,
      }),
      this.prisma.referralRelation.count({ where }),
    ]);
    const customers = await this.insight.buildCustomerProfiles(
      relations.map((r) => ({ userId: r.userId, boundAt: r.createdAt })),
    );
    return { customers, total, page, pageSize };
  }

  /** 单个归属客户的最近行为时间线（先校验归属关系，防越权窥探） */
  async getCustomerTimeline(ownerUserId: string, customerId: string, limit = 30) {
    const relation = await this.prisma.referralRelation.findFirst({
      where: { referrerId: ownerUserId, userId: customerId, referrerType: "STATION_MASTER", relationStatus: "ACTIVE" },
      select: { id: true },
    });
    if (!relation) throw new BusinessException(ErrorCode.FORBIDDEN, "该用户不是您的归属客户");
    return this.insight.getTimeline(customerId, limit);
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

  async listStations(rawPage = 1, rawPageSize = 20, keyword?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    // keyword 服务端筛选（分站名/推广码/站长昵称）·不传即全量，向后兼容
    const where: Prisma.StationWhereInput = {};
    if (keyword?.trim()) {
      const k = keyword.trim();
      where.OR = [
        { name: { contains: k, mode: "insensitive" } },
        { code: { contains: k, mode: "insensitive" } },
        { user: { nickname: { contains: k, mode: "insensitive" } } },
      ];
    }
    const [stations, total] = await Promise.all([
      this.prisma.station.findMany({
        where,
        include: { user: { select: { id: true, nickname: true } } },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.station.count({ where }),
    ]);
    return { stations, total, page, pageSize };
  }

  async getStationEarnings(stationId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where = { stationId };
    const [earnings, total] = await Promise.all([
      this.prisma.stationEarning.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
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

  async listOperators(rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const [operators, total] = await Promise.all([
      this.prisma.operator.findMany({
        include: { user: { select: { id: true, nickname: true } } },
        skip,
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
    const { keyword } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.StationWhereInput = { status: "ACTIVE" };
    if (keyword) where.name = { contains: keyword };

    const [stations, total] = await Promise.all([
      this.prisma.station.findMany({
        where,
        select: {
          id: true, name: true, code: true, logo: true,
          themeColor: true, intro: true,
        },
        skip, take: pageSize,
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

  /**
   * 通过推广码获取分站【站长主推位】（公开·用户侧渲染）。
   * 站长在 pinned-manage 锁定的 9 板块×6 位主推内容 → C 端"站长精选"分区真实露出。
   * 只返回有已锁内容的板块（filled>0）；无分站/无内容返回空数组（前端诚实降级不渲染）。
   */
  async getPublishedPinnedBoards(code: string) {
    const cacheKey = `station:pinned-public:${code}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const station = await this.prisma.station.findUnique({ where: { code }, select: { id: true } });
    if (!station) return [];
    const boards = await this.stationPinned.getBoards(station.id);
    const result = (boards as Array<{ filled: number }>).filter((b) => b.filled > 0);
    await this.redis.setJson(cacheKey, result, this.PINNED_TTL);
    return result;
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

  async getTeamMembers(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where: Prisma.StationWhereInput = { userId };
    const [stations, total] = await Promise.all([
      this.prisma.station.findMany({
        where,
        select: { id: true, name: true, code: true, logo: true, totalEarning: true, createdAt: true },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.station.count({ where }),
    ]);
    return { members: stations, total, page, pageSize };
  }

  async getTeamLeaderboard(rawPage = 1, rawPageSize = 20, sortBy?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const orderField = sortBy === "revenue" ? "totalEarning" : sortBy === "orderCount" ? "totalOrders" : "totalEarning";
    const [stations, total] = await Promise.all([
      this.prisma.station.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, code: true, logo: true, totalEarning: true, createdAt: true },
        skip,
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

  async getSuccessCases(rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where: Prisma.StationWhereInput = { status: "ACTIVE", totalEarning: { gt: 0 } };
    const [stations, total] = await Promise.all([
      this.prisma.station.findMany({
        where,
        select: { id: true, name: true, logo: true, intro: true, totalEarning: true, createdAt: true },
        skip,
        take: pageSize,
        orderBy: { totalEarning: "desc" },
      }),
      this.prisma.station.count({ where }),
    ]);
    return { items: stations, total, page, pageSize };
  }
}
