import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BaziInputDto, ZiweiInputDto, QimenInputDto, YangpanInputDto, LiuYaoInputDto, DaLiuRenInputDto, CreateGroupDto, RenameGroupDto, DeleteGroupDto, CaseQueryDto } from "./paipan.dto";
import { calcBazi, calcRiZhu, calcTrueSolarTime, type BaziInput, type BaziResult } from "@guoxue/bazi-engine";
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

    // 真太阳时校正
    let qimenHour = dto.hour, qimenMinute = dto.minute || 0;
    if (dto.useTrueSolar) {
      const solar = calcTrueSolarTime(qimenHour, qimenMinute, dto.month, dto.day, undefined, dto.lng);
      qimenHour = Math.floor(solar.adjustedHour);
      qimenMinute = Math.round((solar.adjustedHour - Math.floor(solar.adjustedHour)) * 60);
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
  async getUserQimenHistory(userId: string, page = 1, pageSize = 20) {
    const where = { userId, paipanType: "QIMEN" as const };
    const [records, total] = await Promise.all([
      this.prisma.paipanRecord.findMany({
        where,
        select: { id: true, clientName: true, clientBirth: true, createdAt: true },
        skip: (page - 1) * pageSize,
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
    if (dto.trueSolar !== false) {
      const solar = calcTrueSolarTime(ypHour, ypMinute, dto.month, dto.day, dto.place);
      ypHour = Math.floor(solar.adjustedHour);
      ypMinute = Math.round((solar.adjustedHour - Math.floor(solar.adjustedHour)) * 60);
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
  async getUserYangpanHistory(userId: string, page = 1, pageSize = 20) {
    const where = { userId, paipanType: "YANGPAN" as const };
    const [records, total] = await Promise.all([
      this.prisma.paipanRecord.findMany({
        where,
        select: { id: true, clientName: true, clientBirth: true, createdAt: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.paipanRecord.count({ where }),
    ]);
    return { records: this.decryptRecords(records), total, page, pageSize };
  }

  /** 构建杨盘命理信息（大运/流年等） */
  private buildYangpanMingli(dto: YangpanInputDto, _result: QimenResult): Record<string, unknown> {
    // 基于日柱推算大运 — 用 calcRiZhu 直接算日柱，而非 yongShi（时柱）
    const riZhu = calcRiZhu(dto.year, dto.month, dto.day);
    const riGan = riZhu.gan;
    const riZhi = riZhu.zhi;

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
    const page = q.page || 1;
    const pageSize = q.pageSize || 20;
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
        skip: (page - 1) * pageSize,
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

  async getUserLiuYaoHistory(userId: string, page = 1, pageSize = 20) {
    const where = { userId, paipanType: "LIUYAO" as const };
    const [records, total] = await Promise.all([
      this.prisma.paipanRecord.findMany({ where, select: { id: true, clientName: true, clientBirth: true, createdAt: true }, skip: (page-1)*pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
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

  async getUserDaLiuRenHistory(userId: string, page = 1, pageSize = 20) {
    const where = { userId, paipanType: "DALIUREN" as const };
    const [records, total] = await Promise.all([
      this.prisma.paipanRecord.findMany({ where, select: { id: true, clientName: true, clientBirth: true, createdAt: true }, skip: (page-1)*pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.paipanRecord.count({ where }),
    ]);
    return { records: this.decryptRecords(records), total, page, pageSize };
  }
}
