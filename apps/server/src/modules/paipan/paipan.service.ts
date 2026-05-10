import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BaziInputDto, ZiweiInputDto } from "./paipan.dto";
import { calcBazi, type BaziInput, type BaziResult } from "@guoxue/bazi-engine";
import { calcZiwei, type ZiweiInput, type ZiweiResult } from "@guoxue/ziwei-engine";
import { createHash } from "node:crypto";
import { encrypt, decrypt } from "../../common/crypto.util";

/** 排盘结果缓存 TTL（秒，24 小时） */
const CACHE_TTL = 86400;

/** 缓存 key 前缀 */
const CACHE_PREFIX = "bazi:";
const ZIWEI_CACHE_PREFIX = "ziwei:";

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
        clientBirth: encrypt(`${dto.year}-${dto.month}-${dto.day} ${dto.hour}:${dto.minute || 0}`),
        paipanType: "BAZI",
        inputParams: this.sanitizeInput(input) as any,
        resultData: this.sanitizeResult(result) as any,
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

    return this.decryptRecord(record);
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

    return { records: this.decryptRecords(records), total, page, pageSize };
  }

  // ────────── 紫微斗数 ──────────

  /** 紫微斗数排盘预览（不保存，带缓存） */
  async calcZiweiPreview(dto: ZiweiInputDto): Promise<ZiweiResult> {
    const input = this.buildZiweiInput(dto);
    const cacheKey = this.buildZiweiCacheKey(input);

    const cached = await this.redis.getJson<ZiweiResult>(cacheKey);
    if (cached) return cached;

    const result = calcZiwei(input);
    await this.redis.setJson(cacheKey, result, CACHE_TTL);
    return result;
  }

  /** 紫微斗数排盘并保存记录（带缓存） */
  async calcZiweiAndSave(userId: string, dto: ZiweiInputDto) {
    const input = this.buildZiweiInput(dto);
    const cacheKey = this.buildZiweiCacheKey(input);

    let result = await this.redis.getJson<ZiweiResult>(cacheKey);
    if (!result) {
      result = calcZiwei(input);
      await this.redis.setJson(cacheKey, result, CACHE_TTL);
    }

    const record = await this.prisma.paipanRecord.create({
      data: {
        userId,
        clientName: dto.name || "",
        clientBirth: encrypt(`${dto.year}-${dto.month}-${dto.day} ${dto.hour}`),
        paipanType: "ZIWEI",
        inputParams: this.sanitizeInput(input) as any,
        resultData: this.sanitizeResult(result) as any,
      },
    });

    await this.redis.del(cacheKey);

    return {
      id: record.id,
      input,
      result,
    };
  }

  /** 获取单条紫微排盘记录 */
  async getZiweiRecord(id: string, userId: string) {
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

    return this.decryptRecord(record);
  }

  /** 获取用户紫微排盘历史 */
  async getUserZiweiHistory(
    userId: string,
    page = 1,
    pageSize = 20,
  ) {
    const where = { userId, paipanType: "ZIWEI" as const };

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

    return { records: this.decryptRecords(records), total, page, pageSize };
  }

  // ────────── 管理员方法 ──────────

  /** 管理员查看所有排盘记录 */
  async getAllRecords(params: {
    page: number
    pageSize: number
    type?: string
    keyword?: string
  }) {
    const { page, pageSize, type, keyword } = params
    const where: Prisma.PaipanRecordWhereInput = {}

    if (type && type !== "ALL") {
      where.paipanType = type
    }

    if (keyword) {
      where.OR = [
        { clientName: { contains: keyword } },
        { clientBirth: { contains: keyword } },
      ]
    }

    const [records, total] = await Promise.all([
      this.prisma.paipanRecord.findMany({
        where,
        select: {
          id: true,
          clientName: true,
          clientBirth: true,
          paipanType: true,
          createdAt: true,
          user: { select: { nickname: true, phone: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.paipanRecord.count({ where }),
    ])

    return { records: this.decryptRecords(records), total, page, pageSize }
  }

  // ────────── 私有辅助方法 ──────────

  /** 解密记录中的 clientBirth 字段 */
  private decryptRecord<T extends { clientBirth: string }>(record: T): T {
    try { record.clientBirth = decrypt(record.clientBirth) as any; } catch { /* 兼容未加密旧数据 */ }
    return record;
  }

  private decryptRecords<T extends { clientBirth: string }>(records: T[]): T[] {
    return records.map(r => this.decryptRecord(r));
  }

  /** 构建 BaziInput（计算用完整参数） */
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

  /** 脱敏 inputParams：移除生辰数据（已加密存于 clientBirth），仅保留非敏感字段 */
  private sanitizeInput(input: { name?: string; gender?: string; city?: string }): Record<string, unknown> {
    return { name: input.name, gender: input.gender, city: (input as any).city || "" };
  }

  /** 脱敏 resultData：移除内嵌的 input（生辰已在 clientBirth 加密存储），避免明文泄露 */
  private sanitizeResult(result: object): object {
    const { input, ...rest } = result as any;
    return rest;
  }

  /** 根据输入构建缓存 key（bazi:{md5(inputJson)}） */
  private buildCacheKey(input: BaziInput): string {
    const hash = createHash("md5")
      .update(JSON.stringify(input))
      .digest("hex");
    return `${CACHE_PREFIX}${hash}`;
  }

  /** 构建 ZiweiInput */
  private buildZiweiInput(dto: ZiweiInputDto): ZiweiInput {
    return {
      name: dto.name,
      gender: dto.gender as "男" | "女",
      year: dto.year,
      month: dto.month,
      day: dto.day,
      hour: dto.hour,
      lunarMonth: dto.lunarMonth,
      lunarDay: dto.lunarDay,
      lunarHour: dto.lunarHour as any,
      lunarYearGan: dto.lunarYearGan as any,
      lunarYearZhi: dto.lunarYearZhi as any,
    };
  }

  /** 根据输入构建紫微缓存 key */
  private buildZiweiCacheKey(input: ZiweiInput): string {
    const hash = createHash("md5")
      .update(JSON.stringify(input))
      .digest("hex");
    return `${ZIWEI_CACHE_PREFIX}${hash}`;
  }
}
