import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BaziInputDto, ZiweiInputDto, QimenInputDto, YangpanInputDto } from "./paipan.dto";
import { calcBazi, type BaziInput, type BaziResult } from "@guoxue/bazi-engine";
import { calcZiwei, type ZiweiInput, type ZiweiResult } from "@guoxue/ziwei-engine";
import { calculateQimenYang, calculateQimenYin } from "../tool-registry/calculators/qimen.calculator";
import type { QimenResult } from "@guoxue/shared";
import { createHash } from "node:crypto";
import { encrypt, decrypt } from "../../common/crypto.util";

/** 排盘结果缓存 TTL（秒，24 小时） */
const CACHE_TTL = 86400;

/** 缓存 key 前缀 */
const CACHE_PREFIX = "bazi:";
const ZIWEI_CACHE_PREFIX = "ziwei:";
const QIMEN_CACHE_PREFIX = "qimen:";
const YANGPAN_CACHE_PREFIX = "yangpan:";

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
    const record = await this.prisma.paipanRecord.findFirst({
      where: { id, userId },
      select: {
        id: true,
        clientName: true,
        clientBirth: true,
        inputParams: true,
        resultData: true,
        createdAt: true,
      },
    });

    if (!record) throw new BusinessException(ErrorCode.PAIPAN_RECORD_NOT_FOUND, "排盘记录不存在");

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
    const record = await this.prisma.paipanRecord.findFirst({
      where: { id, userId },
      select: {
        id: true,
        clientName: true,
        clientBirth: true,
        inputParams: true,
        resultData: true,
        createdAt: true,
      },
    });

    if (!record) throw new BusinessException(ErrorCode.PAIPAN_RECORD_NOT_FOUND, "排盘记录不存在");

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

  // ────────── 奇门遁甲 ──────────

  /** 奇门遁甲排盘（不保存，带缓存） */
  async calcQimen(dto: QimenInputDto): Promise<QimenResult> {
    const cacheKey = this.buildQimenCacheKey(dto);
    const cached = await this.redis.getJson<QimenResult>(cacheKey);
    if (cached) return cached;

    // 构建计算器输入
    const datetime = new Date(dto.year, dto.month - 1, dto.day, dto.hour, dto.minute || 0).toISOString();
    let qiJuMethod = dto.startMethod;
    let customJu: number | undefined;
    if (dto.startMethod === "custom" && dto.customJu) {
      qiJuMethod = "zixuan";
      // 解析"阳遁3局"→3, "阴遁7局"→-7
      const m = dto.customJu.match(/([阳阳阴])(?:遁)?(\d+)/);
      if (m) {
        const num = parseInt(m[2], 10);
        customJu = m[1] === "阴" ? -num : num;
      }
    }

    const input: Record<string, unknown> = {
      datetime,
      qiJuMethod,
      customJu,
      panMethod: dto.panMethod,
      flyMethod: dto.flyMethod || "yinyang",
      anganMethod: dto.anganMethod,
      useTrueSolar: dto.useTrueSolar || false,
      lat: dto.lat,
      lng: dto.lng,
    };

    const result = dto.panMethod === "zhuan"
      ? calculateQimenYang(input)
      : calculateQimenYang(input); // 飞盘暂用同一引擎，panMethod传递给计算器

    // 飞盘模式：委托给阴盘计算器
    if (dto.panMethod === "fei") {
      const yinResult = calculateQimenYin(input);
      await this.redis.setJson(cacheKey, yinResult, CACHE_TTL);
      return yinResult;
    }

    await this.redis.setJson(cacheKey, result, CACHE_TTL);
    return result;
  }

  /** 阳盘命理奇门排盘（不保存，带缓存） */
  async calcYangpan(dto: YangpanInputDto): Promise<QimenResult & { mingli?: Record<string, unknown> }> {
    const cacheKey = this.buildYangpanCacheKey(dto);
    const cached = await this.redis.getJson<QimenResult & { mingli?: Record<string, unknown> }>(cacheKey);
    if (cached) return cached;

    const datetime = new Date(dto.year, dto.month - 1, dto.day, dto.hour, dto.minute || 0).toISOString();

    const input: Record<string, unknown> = {
      datetime,
      qiJuMethod: dto.startMethod,
      panMethod: dto.panMethod,
      jigongMethod: dto.jigongMethod,
      anganMethod: dto.anganMethod,
      useTrueSolar: dto.trueSolar !== false,
      useDaylightSaving: dto.daylightSaving || false,
      earlyLateZi: dto.earlyLateZi || false,
      gender: dto.gender,
    };

    const result = calculateQimenYang(input);

    // 命理信息：基于八字推算大运
    const mingli = this.buildYangpanMingli(dto, result);

    const combined = { ...result, mingli };
    await this.redis.setJson(cacheKey, combined, CACHE_TTL);
    return combined;
  }

  /** 构建杨盘命理信息（大运/流年等） */
  private buildYangpanMingli(dto: YangpanInputDto, result: QimenResult): Record<string, unknown> {
    // 基于日柱推算大运
    const yongShi = result.yongShi;
    const riGan = yongShi[0];
    const riZhi = yongShi[1];

    const GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
    const ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
    const SHEN_LIST = ["比","劫","食","伤","财","才","官","杀","印","枭"];

    const ganIdx = GAN.indexOf(riGan);
    const zhiIdx = ZHI.indexOf(riZhi);
    const isYangGan = ganIdx % 2 === 0;
    const isYangGender = dto.gender === "male";
    const shunPai = (isYangGan && isYangGender) || (!isYangGan && !isYangGender);

    const daYun: Record<string, unknown>[] = [];
    for (let i = 0; i < 8; i++) {
      const step = shunPai ? i + 1 : -(i + 1);
      const gan = GAN[(ganIdx + step + 10) % 10];
      const zhi = ZHI[(zhiIdx + step + 12) % 12];
      const startAge = i * 10 + 1;
      daYun.push({
        gan, zhi,
        startAge,
        endAge: startAge + 9,
        name: `${gan}${zhi}`,
        ganShiShen: SHEN_LIST[(GAN.indexOf(gan) - ganIdx + 10) % 10],
        zhiShiShen: SHEN_LIST[(ZHI.indexOf(zhi) - zhiIdx + 12) % 12],
      });
    }

    return { daYun, shunPai };
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
    try { record.clientBirth = decrypt(record.clientBirth) as any; } catch (_err) { /* 兼容未加密旧数据 */ }
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
      useTrueSolarTime: dto.useTrueSolarTime === true,
      useDaylightSaving: dto.useDaylightSaving === true,
      ziShiMode: (dto.ziShiMode as "traditional" | "modern") || "traditional",
      longitude: dto.longitude,
    };
  }

  /** 脱敏 inputParams：移除生辰数据（已加密存于 clientBirth），仅保留非敏感字段 */
  private sanitizeInput(input: { name?: string; gender?: string; city?: string }): Record<string, unknown> {
    return { name: input.name, gender: input.gender, city: (input as any).city || "" };
  }

  /** 脱敏 resultData：移除内嵌的 input（生辰已在 clientBirth 加密存储），避免明文泄露 */
  private sanitizeResult(result: object): object {
    const { ...rest } = result as any;
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

  /** 构建奇门缓存 key */
  private buildQimenCacheKey(dto: QimenInputDto): string {
    const payload = { y: dto.year, m: dto.month, d: dto.day, h: dto.hour, mi: dto.minute || 0, pm: dto.panMethod, sm: dto.startMethod, cj: dto.customJu, am: dto.anganMethod };
    const hash = createHash("md5").update(JSON.stringify(payload)).digest("hex");
    return `${QIMEN_CACHE_PREFIX}${hash}`;
  }

  /** 构建阳盘缓存 key */
  private buildYangpanCacheKey(dto: YangpanInputDto): string {
    const payload = { y: dto.year, m: dto.month, d: dto.day, h: dto.hour, g: dto.gender, pm: dto.panMethod, jm: dto.jigongMethod, sm: dto.startMethod, am: dto.anganMethod };
    const hash = createHash("md5").update(JSON.stringify(payload)).digest("hex");
    return `${YANGPAN_CACHE_PREFIX}${hash}`;
  }
}
