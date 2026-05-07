import { Injectable, NotFoundException } from "@nestjs/common";
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
}
