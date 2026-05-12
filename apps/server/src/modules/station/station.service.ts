import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CreateStationDto, UpdateStationDto, CreateOperatorDto } from "./station.dto";

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

  async updateStation(id: string, dto: UpdateStationDto) {
    const updated = await this.prisma.station.update({ where: { id }, data: dto });
    // 清除品牌缓存
    await this.redis.del(`station:brand:id:${id}`);
    await this.redis.del(`station:brand:code:${updated.code}`);
    return updated;
  }

  async deleteStation(id: string) {
    const station = await this.prisma.station.findUnique({ where: { id } });
    if (!station) throw new NotFoundException("分站不存在");
    await this.redis.del(`station:brand:id:${id}`);
    await this.redis.del(`station:brand:code:${station.code}`);
    return this.prisma.station.delete({ where: { id } });
  }

  async getStation(id: string) {
    const station = await this.prisma.station.findUnique({
      where: { id },
      include: { user: { select: { id: true, nickname: true } } },
    });
    if (!station) throw new NotFoundException("分站不存在");
    return station;
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
    if (!station) throw new NotFoundException("分站不存在");

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
    if (!station) throw new NotFoundException("分站不存在");

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
    if (!station) throw new NotFoundException("分站不存在");

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
    if (!station) throw new NotFoundException("分站不存在");

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
}
