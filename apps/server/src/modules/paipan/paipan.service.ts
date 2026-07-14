import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BaziInputDto, ZiweiInputDto, QimenInputDto, YangpanInputDto, LiuYaoInputDto, DaLiuRenInputDto, CreateGroupDto, RenameGroupDto, DeleteGroupDto, CaseQueryDto } from "./paipan.dto";
import { calcBazi, calcSiZhu, calcTrueSolarTime, calcAllJieQi, type BaziInput, type BaziResult } from "@guoxue/bazi-engine";
import { calcZiwei, type ZiweiInput, type ZiweiResult } from "@guoxue/ziwei-engine";
import { calculateQimenYang, calculateQimenYin } from "../tool-registry/calculators/qimen.calculator";
import type { QimenResult } from "@guoxue/shared";
import { createHash } from "node:crypto";
import { encrypt, decrypt, maskPhone } from "../../common/crypto.util";
import { safePagination } from "../../common/pagination";

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
    rawPage = 1,
    rawPageSize = 20,
  ) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
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
        skip,
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
    rawPage = 1,
    rawPageSize = 20,
  ) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
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
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.paipanRecord.count({ where }),
    ]);

    return { records: this.decryptRecords(records), total, page, pageSize };
  }

  // ────────── 奇门遁甲 ──────────

  /** 奇门遁甲排盘（不保存，带缓存） */
  async calcQimen(dto: QimenInputDto): Promise<QimenResult & { meta?: Record<string, unknown> }> {
    const cacheKey = this.buildQimenCacheKey(dto);
    const cached = await this.redis.getJson<QimenResult & { meta?: Record<string, unknown> }>(cacheKey);
    if (cached) return cached;

    // 真太阳时校正
    let qimenHour = dto.hour, qimenMinute = dto.minute || 0;
    let trueSolarInfo: { hour: number; minute: number; offsetMin: number } | undefined;
    if (dto.useTrueSolar) {
      const solar = calcTrueSolarTime(qimenHour, qimenMinute, dto.month, dto.day, undefined, dto.lng);
      qimenHour = Math.floor(solar.adjustedHour);
      qimenMinute = Math.round((solar.adjustedHour - Math.floor(solar.adjustedHour)) * 60);
      trueSolarInfo = { hour: qimenHour, minute: qimenMinute, offsetMin: solar.totalOffset };
    }
    // 构建计算器输入
    const datetime = `${dto.year}-${String(dto.month).padStart(2, '0')}-${String(dto.day).padStart(2, '0')}T${String(qimenHour).padStart(2, '0')}:${String(qimenMinute).padStart(2, '0')}:00`;
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

    // 占时四柱 + 马星（信息表用，真实算法）—— 用真太阳时校正后的时刻
    const siZhuFull = calcSiZhu({ name: "", gender: "男", year: dto.year, month: dto.month, day: dto.day, hour: qimenHour, minute: qimenMinute });
    const MA_GROUPS: Record<string, string> = {
      "申":"寅","子":"寅","辰":"寅", "寅":"申","午":"申","戌":"申",
      "巳":"亥","酉":"亥","丑":"亥", "亥":"巳","卯":"巳","未":"巳",
    };
    // 每柱旬空：旬首支=(支序-干序+12)%12，旬空=旬首支后第10、11位两支
    const GAN10 = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
    const ZHI12 = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
    const xunKong = (gan: string, zhi: string): string => {
      const gi = GAN10.indexOf(gan), zi = ZHI12.indexOf(zhi);
      if (gi < 0 || zi < 0) return "";
      const head = (zi - gi + 12) % 12;
      return ZHI12[(head + 10) % 12] + ZHI12[(head + 11) % 12];
    };
    const meta = {
      siZhu: {
        nian: { gan: siZhuFull.nian.gan, zhi: siZhuFull.nian.zhi },
        yue: { gan: siZhuFull.yue.gan, zhi: siZhuFull.yue.zhi },
        ri: { gan: siZhuFull.ri.gan, zhi: siZhuFull.ri.zhi },
        shi: { gan: siZhuFull.shi.gan, zhi: siZhuFull.shi.zhi },
      },
      kongWang: {
        nian: xunKong(siZhuFull.nian.gan, siZhuFull.nian.zhi),
        yue: xunKong(siZhuFull.yue.gan, siZhuFull.yue.zhi),
        ri: xunKong(siZhuFull.ri.gan, siZhuFull.ri.zhi),
        shi: xunKong(siZhuFull.shi.gan, siZhuFull.shi.zhi),
      },
      maXingZhi: MA_GROUPS[siZhuFull.ri.zhi] ?? "",
      jieQi: this.buildJieQiRange(dto.year, dto.month, dto.day, qimenHour, qimenMinute),
      trueSolar: trueSolarInfo,
    };

    // 2026-07-14 修：此前「飞盘」被委托给 calculateQimenYin（阴盘奇门）——
    // 飞盘/转盘是同一套时家奇门的两种布盘法，阴盘是王凤麟另一流派（以月柱推局），起局法根本不同，
    // 属流派错配。后端 calculateQimenYang 仅实现转盘法，故此处一律按转盘算；
    // 飞盘由前端 pkg-paipan/lib/qimen-engine 本地排（转盘/飞盘俱全，84/84 黄金测试通过），
    // 本端点仅用于记录保存与 AI 解读的数据底稿。
    const baseResult = calculateQimenYang(input);
    const result = { ...baseResult, meta };

    await this.redis.setJson(cacheKey, result, CACHE_TTL);
    return result;
  }

  /** 奇门遁甲排盘并保存记录（带缓存） */
  async calcQimenAndSave(userId: string, dto: QimenInputDto) {
    const cacheKey = this.buildQimenCacheKey(dto);
    let result = await this.redis.getJson<QimenResult>(cacheKey);
    if (!result) {
      result = await this.calcQimen(dto);
    }

    const record = await this.prisma.paipanRecord.create({
      data: {
        userId,
        clientName: dto.matter || "",
        clientBirth: encrypt(`${dto.year}-${dto.month}-${dto.day} ${dto.hour}:${dto.minute || 0}`),
        paipanType: "QIMEN",
        inputParams: this.sanitizeQimenInput(dto) as any,
        resultData: this.sanitizeResult(result) as any,
      },
    });

    await this.redis.del(cacheKey);
    return { id: record.id, result };
  }

  /** 获取单条奇门排盘记录 */
  async getQimenRecord(id: string, userId: string) {
    const record = await this.prisma.paipanRecord.findFirst({
      where: { id, userId },
      select: { id: true, clientName: true, clientBirth: true, inputParams: true, resultData: true, createdAt: true },
    });
    if (!record) throw new BusinessException(ErrorCode.PAIPAN_RECORD_NOT_FOUND, "排盘记录不存在");
    return this.decryptRecord(record);
  }

  /** 获取用户奇门排盘历史 */
  async getUserQimenHistory(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { userId, paipanType: "QIMEN" as const };
    const [records, total] = await Promise.all([
      this.prisma.paipanRecord.findMany({
        where,
        select: { id: true, clientName: true, clientBirth: true, createdAt: true },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.paipanRecord.count({ where }),
    ]);
    return { records: this.decryptRecords(records), total, page, pageSize };
  }

  /** 阳盘命理奇门排盘（不保存，带缓存） */
  async calcYangpan(dto: YangpanInputDto): Promise<QimenResult & { mingli?: Record<string, unknown> }> {
    const cacheKey = this.buildYangpanCacheKey(dto);
    const cached = await this.redis.getJson<QimenResult & { mingli?: Record<string, unknown> }>(cacheKey);
    if (cached) return cached;

    let ypHour = dto.hour, ypMinute = dto.minute || 0;
    let trueSolarInfo: { hour: number; minute: number; offsetMin: number } | undefined;
    if (dto.trueSolar !== false) {
      const solar = calcTrueSolarTime(ypHour, ypMinute, dto.month, dto.day, dto.place);
      ypHour = Math.floor(solar.adjustedHour);
      ypMinute = Math.round((solar.adjustedHour - Math.floor(solar.adjustedHour)) * 60);
      trueSolarInfo = { hour: ypHour, minute: ypMinute, offsetMin: solar.totalOffset };
    }
    const datetime = `${dto.year}-${String(dto.month).padStart(2, '0')}-${String(dto.day).padStart(2, '0')}T${String(ypHour).padStart(2, '0')}:${String(ypMinute).padStart(2, '0')}:00`;

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
    if (trueSolarInfo) (mingli as Record<string, unknown>).trueSolar = trueSolarInfo;

    const combined = { ...result, mingli };
    await this.redis.setJson(cacheKey, combined, CACHE_TTL);
    return combined;
  }

  /** 阳盘命理奇门排盘并保存记录（带缓存） */
  async calcYangpanAndSave(userId: string, dto: YangpanInputDto) {
    const cacheKey = this.buildYangpanCacheKey(dto);
    let result = await this.redis.getJson<QimenResult & { mingli?: Record<string, unknown> }>(cacheKey);
    if (!result) {
      result = await this.calcYangpan(dto);
    }

    const record = await this.prisma.paipanRecord.create({
      data: {
        userId,
        clientName: dto.name || "",
        clientBirth: encrypt(`${dto.year}-${dto.month}-${dto.day} ${dto.hour}:${dto.minute || 0}`),
        paipanType: "YANGPAN",
        inputParams: this.sanitizeYangpanInput(dto) as any,
        resultData: this.sanitizeResult(result) as any,
      },
    });

    await this.redis.del(cacheKey);
    return { id: record.id, result };
  }

  /** 获取单条阳盘排盘记录 */
  async getYangpanRecord(id: string, userId: string) {
    const record = await this.prisma.paipanRecord.findFirst({
      where: { id, userId },
      select: { id: true, clientName: true, clientBirth: true, inputParams: true, resultData: true, createdAt: true },
    });
    if (!record) throw new BusinessException(ErrorCode.PAIPAN_RECORD_NOT_FOUND, "排盘记录不存在");
    return this.decryptRecord(record);
  }

  /** 获取用户阳盘排盘历史 */
  async getUserYangpanHistory(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { userId, paipanType: "YANGPAN" as const };
    const [records, total] = await Promise.all([
      this.prisma.paipanRecord.findMany({
        where,
        select: { id: true, clientName: true, clientBirth: true, createdAt: true },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.paipanRecord.count({ where }),
    ]);
    return { records: this.decryptRecords(records), total, page, pageSize };
  }

  /** 节气区间：当前节气(名+时刻) 与 下一节气(名+时刻)，用于信息表「用事区间」显示 */
  private buildJieQiRange(year: number, month: number, day: number, hour: number, minute: number) {
    const ORDER = ["立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至","小寒","大寒"];
    const enc = (y: number, m: number, d: number, h: number, mi: number) => (((y * 12 + m) * 31 + d) * 1440) + h * 60 + mi;
    const entries: { name: string; y: number; m: number; d: number; h: number; mi: number; val: number }[] = [];
    for (const yOff of [-1, 0, 1]) {
      const map = calcAllJieQi(year + yOff);
      for (const name of ORDER) {
        const jq = map.get(name);
        if (jq) {
          const y = year + yOff;
          entries.push({ name, y, m: jq.month, d: jq.day, h: jq.hour, mi: jq.minute, val: enc(y, jq.month, jq.day, jq.hour, jq.minute) });
        }
      }
    }
    entries.sort((a, b) => a.val - b.val);
    const targetVal = enc(year, month, day, hour, minute);
    const fmt = (e: { y: number; m: number; d: number; h: number; mi: number }) =>
      `${e.y}.${String(e.m).padStart(2, "0")}.${String(e.d).padStart(2, "0")} ${String(e.h).padStart(2, "0")}:${String(e.mi).padStart(2, "0")}`;
    for (let i = 0; i < entries.length; i++) {
      if (targetVal < entries[i].val) {
        if (i === 0) break;
        const cur = entries[i - 1], nxt = entries[i];
        return { name: cur.name, start: fmt(cur), nextName: nxt.name, end: fmt(nxt) };
      }
    }
    return undefined;
  }

  /** 构建阳盘命理信息（大运/流年等）— 复用 bazi-engine 真实起运算法 */
  private buildYangpanMingli(dto: YangpanInputDto, _result: QimenResult): Record<string, unknown> {
    // 用 calcBazi 走真实四柱+起运（节气距离/3 折岁），而非手搓简化大运
    const bz = calcBazi({
      name: "",
      gender: dto.gender === "female" ? "女" : "男",
      year: dto.year,
      month: dto.month,
      day: dto.day,
      hour: dto.hour,
      minute: dto.minute || 0,
      city: dto.place || undefined,
      useTrueSolarTime: dto.trueSolar !== false,
      useDaylightSaving: dto.daylightSaving || false,
    });

    const shunPai = bz.qiYun.desc.includes("顺");
    const currentYear = new Date().getFullYear();

    // 四柱（真实，用于信息表格）
    const siZhu = {
      nian: { gan: bz.siZhu.nian.gan, zhi: bz.siZhu.nian.zhi },
      yue: { gan: bz.siZhu.yue.gan, zhi: bz.siZhu.yue.zhi },
      ri: { gan: bz.siZhu.ri.gan, zhi: bz.siZhu.ri.zhi },
      shi: { gan: bz.siZhu.shi.gan, zhi: bz.siZhu.shi.zhi },
    };
    // 驿马：按日支三合局取马星地支（申子辰马在寅，寅午戌马在申，巳酉丑马在亥，亥卯未马在巳）
    const MA_GROUPS: Record<string, string> = {
      "申":"寅","子":"寅","辰":"寅", "寅":"申","午":"申","戌":"申",
      "巳":"亥","酉":"亥","丑":"亥", "亥":"巳","卯":"巳","未":"巳",
    };
    const maXingZhi = MA_GROUPS[bz.siZhu.ri.zhi] ?? "";

    // 大运（每步含 10 流年），标注当前所处大运/流年为 active
    const daYun = bz.qiYun.daYun.map((step) => {
      const stepActive = currentYear >= step.startYear && currentYear <= step.endYear;
      const liuNian = (step.liuNian ?? []).map((ln) => ({
        year: ln.year,
        gan: ln.ganZhi[0],
        zhi: ln.ganZhi[1],
        ganShiShen: ln.ganShiShen,
        zhiShiShen: ln.zhiShiShen,
        age: ln.age,
        active: ln.year === currentYear,
      }));
      return {
        gan: step.tianGan,
        zhi: step.diZhi,
        name: step.ganZhi,
        startAge: step.startAge,
        endAge: step.endAge,
        startYear: step.startYear,
        endYear: step.endYear,
        ganShiShen: step.ganShiShen,
        zhiShiShen: step.zhiShiShen,
        active: stepActive,
        liuNian,
      };
    });

    return {
      shunPai,
      siZhu,
      kongWang: bz.kongWang,
      maXingZhi,
      jieQi: this.buildJieQiRange(dto.year, dto.month, dto.day, dto.hour, dto.minute || 0),
      qiYun: { startAge: bz.qiYun.startAge, startYear: bz.qiYun.startYear, desc: bz.qiYun.desc },
      daYun,
    };
  }

  // ────────── 管理员方法 ──────────

  /** 管理员查看所有排盘记录 */
  async getAllRecords(params: {
    page: number
    pageSize: number
    type?: string
    keyword?: string
  }) {
    const { type, keyword } = params
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize)
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
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.paipanRecord.count({ where }),
    ])

    // PII 脱敏：管理端批量列表脱敏用户手机号(生辰为审核核心数据故保留)
    const decrypted = this.decryptRecords(records).map((r: any) =>
      r.user?.phone ? { ...r, user: { ...r.user, phone: maskPhone(r.user.phone) } } : r,
    )
    return { records: decrypted, total, page, pageSize }
  }

  /** 管理员查看单条排盘记录详情（不限所有者，已解密 clientBirth，覆盖全部类型） */
  async getRecordByIdForAdmin(id: string) {
    const record = await this.prisma.paipanRecord.findUnique({
      where: { id },
      select: {
        id: true,
        clientName: true,
        clientBirth: true,
        paipanType: true,
        inputParams: true,
        resultData: true,
        createdAt: true,
        user: { select: { nickname: true, phone: true } },
      },
    })

    if (!record) throw new BusinessException(ErrorCode.PAIPAN_RECORD_NOT_FOUND, "排盘记录不存在")

    const decrypted: any = this.decryptRecord(record)
    // PII 脱敏：管理端脱敏用户手机号(生辰为审核核心数据故保留)
    if (decrypted.user?.phone) decrypted.user = { ...decrypted.user, phone: maskPhone(decrypted.user.phone) }
    return decrypted
  }

  // ────────── 案例库 ──────────

  /** 初始化案例库种子数据 */
  async seedCases() {
    const count = await this.prisma.celebrityCase.count();
    if (count > 0) return { message: `案例库已有 ${count} 条数据，跳过`, count };

    const cases = [
      { name: '崇祯', gender: 'male', description: '明朝', subtitle: '末位皇帝', primaryCat: '名人案例', secondaryCat: '君主', bazi: ['辛','庚','乙','己','亥','寅','未','卯'], letter: 'C', zodiac: '猪', sortOrder: 1 },
      { name: '曹操', gender: 'male', description: '东汉末年', subtitle: '魏武帝', primaryCat: '名人案例', secondaryCat: '君主', bazi: ['乙','丁','庚','甲','丑','亥','戌','申'], letter: 'C', zodiac: '牛', sortOrder: 2 },
      { name: '忽必烈', gender: 'male', description: '元朝', subtitle: '开国皇帝', primaryCat: '名人案例', secondaryCat: '君主', bazi: ['乙','乙','乙','乙','亥','酉','酉','酉'], letter: 'H', zodiac: '猪', sortOrder: 3 },
      { name: '康熙', gender: 'male', description: '清朝', subtitle: '圣祖皇帝', primaryCat: '名人案例', secondaryCat: '君主', bazi: ['甲','丙','戊','庚','午','寅','申','子'], letter: 'K', zodiac: '马', sortOrder: 4 },
      { name: '李白', gender: 'male', description: '唐朝', subtitle: '诗仙', primaryCat: '名人案例', secondaryCat: '文艺', bazi: ['辛','庚','甲','壬','丑','寅','子','申'], letter: 'L', zodiac: '牛', sortOrder: 5 },
      { name: '武则天', gender: 'female', description: '唐朝', subtitle: '唯一女皇帝', primaryCat: '名人案例', secondaryCat: '君主', bazi: ['甲','丙','甲','甲','申','寅','午','戌'], letter: 'W', zodiac: '猴', sortOrder: 6 },
      { name: '朱元璋', gender: 'male', description: '明朝', subtitle: '开国皇帝', primaryCat: '名人案例', secondaryCat: '君主', bazi: ['戊','壬','丁','丁','辰','戌','丑','未'], letter: 'Z', zodiac: '龙', sortOrder: 7 },
      { name: '马云', gender: 'male', description: '当代', subtitle: '阿里巴巴创始人', primaryCat: '名人案例', secondaryCat: '商界', bazi: ['甲','丙','甲','壬','辰','寅','子','申'], letter: 'M', zodiac: '龙', sortOrder: 8 },
      { name: '案例A01', gender: 'male', description: '白手起家', subtitle: '从打工到身家过亿', primaryCat: '大众案例', secondaryCat: '财运', bazi: ['甲','丙','戊','庚','子','寅','辰','午'], letter: 'A', zodiac: '鼠', sortOrder: 101 },
      { name: '案例B02', gender: 'female', description: '职场晋升', subtitle: '30岁成为上市公司高管', primaryCat: '大众案例', secondaryCat: '事业', bazi: ['乙','丁','己','辛','丑','卯','巳','未'], letter: 'B', zodiac: '牛', sortOrder: 102 },
      { name: '案例C03', gender: 'female', description: '幸福婚姻', subtitle: '晚婚却遇良人', primaryCat: '大众案例', secondaryCat: '婚姻', bazi: ['丙','戊','庚','壬','寅','辰','午','申'], letter: 'C', zodiac: '虎', sortOrder: 103 },
      { name: '案例D04', gender: 'male', description: '健康长寿', subtitle: '90岁依然健步如飞', primaryCat: '大众案例', secondaryCat: '长寿', bazi: ['丁','己','辛','癸','卯','巳','未','酉'], letter: 'D', zodiac: '兔', sortOrder: 104 },
      { name: '案例E05', gender: 'male', description: '学业有成', subtitle: '寒门出贵子考入清华', primaryCat: '大众案例', secondaryCat: '学业', bazi: ['戊','庚','壬','甲','辰','午','申','戌'], letter: 'E', zodiac: '龙', sortOrder: 105 },
    ];

    for (const c of cases) {
      await this.prisma.celebrityCase.create({ data: c });
    }
    return { message: `成功导入 ${cases.length} 条案例`, count: cases.length };
  }

  /** 获取八字案例库（公开） */
  async getCases(q: CaseQueryDto) {
    const { page, pageSize, skip } = safePagination(q.page, q.pageSize);
    const where: Prisma.CelebrityCaseWhereInput = {};

    if (q.primaryCat) where.primaryCat = q.primaryCat;
    if (q.secondaryCat) where.secondaryCat = q.secondaryCat;
    if (q.keyword) {
      where.OR = [
        { name: { contains: q.keyword } },
        { description: { contains: q.keyword } },
      ];
    }

    const [records, total] = await Promise.all([
      this.prisma.celebrityCase.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.celebrityCase.count({ where }),
    ]);

    return { records, total, page, pageSize };
  }

  // ────────── 分组管理 ──────────

  /** 获取用户分组列表（含排盘记录计数） */
  async getGroups(userId: string, paipanType: string) {
    const groups = await this.prisma.paipanGroup.findMany({
      where: { userId, paipanType },
      orderBy: { createdAt: "asc" },
    });

    // 统计每个分组下的记录数
    const counts = await this.prisma.paipanRecord.groupBy({
      by: ["groupName"],
      where: {
        userId,
        paipanType,
        groupName: { not: null },
      },
      _count: { id: true },
    });
    const countMap = new Map<string, number>();
    for (const c of counts) {
      if (c.groupName) countMap.set(c.groupName, c._count.id);
    }

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      count: countMap.get(g.name) || 0,
    }));
  }

  /** 新建分组 */
  async createGroup(userId: string, dto: CreateGroupDto) {
    const exists = await this.prisma.paipanGroup.findFirst({
      where: { userId, paipanType: dto.paipanType, name: dto.name },
    });
    if (exists) throw new BusinessException(ErrorCode.CONFLICT, "分组已存在");

    return this.prisma.paipanGroup.create({
      data: { userId, paipanType: dto.paipanType, name: dto.name, color: dto.color },
    });
  }

  /** 重命名分组 */
  async renameGroup(userId: string, dto: RenameGroupDto) {
    const group = await this.prisma.paipanGroup.findFirst({
      where: { userId, paipanType: dto.paipanType, name: dto.oldName },
    });
    if (!group) throw new BusinessException(ErrorCode.NOT_FOUND, "分组不存在");

    const conflict = await this.prisma.paipanGroup.findFirst({
      where: { userId, paipanType: dto.paipanType, name: dto.newName, id: { not: group.id } },
    });
    if (conflict) throw new BusinessException(ErrorCode.CONFLICT, "分组名已存在");

    // 同步更新排盘记录
    await Promise.all([
      this.prisma.paipanGroup.update({ where: { id: group.id }, data: { name: dto.newName } }),
      this.prisma.paipanRecord.updateMany({
        where: { userId, paipanType: dto.paipanType, groupName: dto.oldName },
        data: { groupName: dto.newName },
      }),
    ]);

    return { success: true };
  }

  /** 删除分组 */
  async deleteGroup(userId: string, dto: DeleteGroupDto) {
    const group = await this.prisma.paipanGroup.findFirst({
      where: { userId, paipanType: dto.paipanType, name: dto.name },
    });
    if (!group) throw new BusinessException(ErrorCode.NOT_FOUND, "分组不存在");

    // 清除排盘记录的分组标记
    await Promise.all([
      this.prisma.paipanGroup.delete({ where: { id: group.id } }),
      this.prisma.paipanRecord.updateMany({
        where: { userId, paipanType: dto.paipanType, groupName: dto.name },
        data: { groupName: null },
      }),
    ]);

    return { success: true };
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

  /** 脱敏 QimenInput：仅保留非敏感字段 */
  private sanitizeQimenInput(dto: QimenInputDto): Record<string, unknown> {
    return { matter: dto.matter, panMethod: dto.panMethod, startMethod: dto.startMethod, anganMethod: dto.anganMethod };
  }

  /** 脱敏 YangpanInput：仅保留非敏感字段 */
  private sanitizeYangpanInput(dto: YangpanInputDto): Record<string, unknown> {
    return { name: dto.name, gender: dto.gender, panMethod: dto.panMethod, jigongMethod: dto.jigongMethod, startMethod: dto.startMethod, anganMethod: dto.anganMethod };
  }

  /** 脱敏 inputParams：移除生辰数据（已加密存于 clientBirth），仅保留非敏感字段 */
  private sanitizeInput(input: { name?: string; gender?: string; city?: string }): Record<string, unknown> {
    return { name: input.name, gender: input.gender, city: (input as any).city || "" };
  }

  /** 脱敏 resultData：移除内嵌的 input（生辰已在 clientBirth 加密存储），避免明文泄露 */
  private sanitizeResult(result: object): object {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  /** 构建奇门缓存 key */
  private buildQimenCacheKey(dto: QimenInputDto): string {
    const payload = { y: dto.year, m: dto.month, d: dto.day, h: dto.hour, mi: dto.minute || 0, pm: dto.panMethod, fm: dto.flyMethod || "", sm: dto.startMethod, cj: dto.customJu, am: dto.anganMethod, ts: dto.useTrueSolar || false, lng: dto.lng ?? null };
    const hash = createHash("md5").update(JSON.stringify(payload)).digest("hex");
    return `${QIMEN_CACHE_PREFIX}${hash}`;
  }

  /** 构建阳盘缓存 key */
  private buildYangpanCacheKey(dto: YangpanInputDto): string {
    const payload = { y: dto.year, m: dto.month, d: dto.day, h: dto.hour, mi: dto.minute || 0, g: dto.gender, pm: dto.panMethod, jm: dto.jigongMethod, sm: dto.startMethod, am: dto.anganMethod, ts: dto.trueSolar !== false, pl: dto.place || "", elz: dto.earlyLateZi || false, dls: dto.daylightSaving || false };
    const hash = createHash("md5").update(JSON.stringify(payload)).digest("hex");
    return `${YANGPAN_CACHE_PREFIX}${hash}`;
  }

  // ────────── 六爻排盘 ──────────

  async calcLiuYao(dto: LiuYaoInputDto) {
    const { calculateLiuYao } = await import("../tool-registry/calculators/liuyao.calculator");
    return calculateLiuYao({
      datetime: `${dto.year}-${String(dto.month).padStart(2,'0')}-${String(dto.day).padStart(2,'0')}T${String(dto.hour||12).padStart(2,'0')}:00:00`,
      method: dto.method || 'time',
      manualYao: dto.manualYao,
      matter: dto.matter,
    });
  }

  async calcLiuYaoAndSave(userId: string, dto: LiuYaoInputDto) {
    const result = await this.calcLiuYao(dto);
    const record = await this.prisma.paipanRecord.create({
      data: {
        userId,
        paipanType: "LIUYAO",
        clientName: dto.matter || "",
        clientBirth: `${dto.year}-${dto.month}-${dto.day}`,
        inputParams: dto as any,
        resultData: result as any,
      },
    });
    return { id: record.id, result };
  }

  async getLiuYaoRecord(id: string, userId: string) {
    const record = await this.prisma.paipanRecord.findFirst({
      where: { id, userId },
      select: { id: true, clientName: true, clientBirth: true, inputParams: true, resultData: true, createdAt: true },
    });
    if (!record) throw new BusinessException(ErrorCode.PAIPAN_RECORD_NOT_FOUND, "排盘记录不存在");
    return this.decryptRecord(record);
  }

  async getUserLiuYaoHistory(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { userId, paipanType: "LIUYAO" as const };
    const [records, total] = await Promise.all([
      this.prisma.paipanRecord.findMany({ where, select: { id: true, clientName: true, clientBirth: true, createdAt: true }, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.paipanRecord.count({ where }),
    ]);
    return { records: this.decryptRecords(records), total, page, pageSize };
  }

  // ────────── 大六壬排盘 ──────────

  async calcDaLiuRen(dto: DaLiuRenInputDto) {
    const { calculateDaLiuRen } = await import("../tool-registry/calculators/daliuren.calculator");
    return calculateDaLiuRen({
      datetime: `${dto.year}-${String(dto.month).padStart(2,'0')}-${String(dto.day).padStart(2,'0')}T${String(dto.hour||12).padStart(2,'0')}:00:00`,
      method: dto.method || 'chushi',
      matter: dto.matter,
    });
  }

  async calcDaLiuRenAndSave(userId: string, dto: DaLiuRenInputDto) {
    const result = await this.calcDaLiuRen(dto);
    const record = await this.prisma.paipanRecord.create({
      data: {
        userId,
        paipanType: "DALIUREN",
        clientName: dto.matter || "",
        clientBirth: `${dto.year}-${dto.month}-${dto.day}`,
        inputParams: dto as any,
        resultData: result as any,
      },
    });
    return { id: record.id, result };
  }

  async getDaLiuRenRecord(id: string, userId: string) {
    const record = await this.prisma.paipanRecord.findFirst({
      where: { id, userId },
      select: { id: true, clientName: true, clientBirth: true, inputParams: true, resultData: true, createdAt: true },
    });
    if (!record) throw new BusinessException(ErrorCode.PAIPAN_RECORD_NOT_FOUND, "排盘记录不存在");
    return this.decryptRecord(record);
  }

  async getUserDaLiuRenHistory(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { userId, paipanType: "DALIUREN" as const };
    const [records, total] = await Promise.all([
      this.prisma.paipanRecord.findMany({ where, select: { id: true, clientName: true, clientBirth: true, createdAt: true }, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.paipanRecord.count({ where }),
    ]);
    return { records: this.decryptRecords(records), total, page, pageSize };
  }
}
