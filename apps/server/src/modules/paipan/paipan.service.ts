import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BaziInputDto } from "./paipan.dto";
import { calcBazi, type BaziInput, type BaziResult } from "@guoxue/bazi-engine";
import { createHash } from "node:crypto";

/** 排盘结果缓存 TTL（秒，24 小时） */
const CACHE_TTL = 86400;

/** 缓存 key 前缀 */
const CACHE_PREFIX = "bazi:";

@Injectable()
export class PaipanService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /** 八字排盘计算（不保存，用于预览，带缓存） */
  async calcBaziPreview(dto: BaziInputDto): Promise<BaziResult> {
    const input = this.buildInput(dto);
    const cacheKey = this.buildCacheKey(input);

    // 尝试从缓存读取
    const cached = await this.redis.getJson<BaziResult>(cacheKey);
    if (cached) return cached;

    // 计算并缓存
    const result = calcBazi(input);
    await this.redis.setJson(cacheKey, result, CACHE_TTL);
    return result;
  }

  /** 八字排盘并保存记录（带缓存） */
  async calcBaziAndSave(userId: string, dto: BaziInputDto) {
    const input = this.buildInput(dto);
    const cacheKey = this.buildCacheKey(input);

    // 尝试从缓存读取排盘结果
    let result = await this.redis.getJson<BaziResult>(cacheKey);
    if (!result) {
      result = calcBazi(input);
      await this.redis.setJson(cacheKey, result, CACHE_TTL);
    }

    const record = await this.prisma.paipanRecord.create({
      data: {
        userId,
        clientName: dto.name || "",
        clientBirth: `${dto.year}-${dto.month}-${dto.day} ${dto.hour}:${dto.minute || 0}`,
        paipanType: "BAZI",
        inputParams: input as any,
        resultData: result as any,
      },
    });

    // 保存后使缓存失效，确保下次重新计算
    await this.redis.del(cacheKey);

    return {
      id: record.id,
      input,
      result,
    };
  }

  /** 获取单条排盘记录 */
  async getBaziRecord(id: string, userId: string) {
    const record = await this.prisma.paipanRecord.findUnique({
      where: { id },
      select: {
        id: true,
        clientName: true,
        clientBirth: true,
        inputParams: true,
        resultData: true,
        createdAt: true,
      },
    });

    if (!record) throw new NotFoundException("排盘记录不存在");

    return record;
  }

  /** 获取用户排盘历史 */
  async getUserBaziHistory(
    userId: string,
    page = 1,
    pageSize = 20,
  ) {
    const where = { userId, paipanType: "BAZI" as const };

    const [records, total] = await Promise.all([
      this.prisma.paipanRecord.findMany({
        where,
        select: {
          id: true,
          clientName: true,
          clientBirth: true,
          createdAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.paipanRecord.count({ where }),
    ]);

    return { records, total, page, pageSize };
  }

  // ────────── 私有辅助方法 ──────────

  /** 构建 BaziInput */
  private buildInput(dto: BaziInputDto): BaziInput {
    return {
      name: dto.name || "",
      gender: dto.gender as "男" | "女",
      year: dto.year,
      month: dto.month,
      day: dto.day,
      hour: dto.hour,
      minute: dto.minute || 0,
      city: dto.city || "",
    };
  }

  /** 根据输入构建缓存 key（bazi:{md5(inputJson)}） */
  private buildCacheKey(input: BaziInput): string {
    const hash = createHash("md5")
      .update(JSON.stringify(input))
      .digest("hex");
    return `${CACHE_PREFIX}${hash}`;
  }
}
