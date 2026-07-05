import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { safePagination } from "../../common/pagination";

interface FortuneContent {
  direction: string;
  color: string;
  number: number;
  advice: string;
  overall: number;
  career: number;
  love: number;
  wealth: number;
  health: number;
}

function formatDate(d: Date, fmt: string): string {
  const o: Record<string, number> = {
    "Y": d.getFullYear(),
    "M": d.getMonth() + 1,
    "D": d.getDate(),
    "h": d.getHours(),
    "m": d.getMinutes(),
    "s": d.getSeconds(),
  };
  return fmt.replace(/YYYY|MM|DD|hh|mm|ss/g, (m) => String(o[m] || o[m.slice(0,1)] || 0).padStart(m.length, "0"));
}

function getWeekPeriod(d: Date): string {
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

// ───────── 干支历法基础 ─────────

/** 天干 */
const TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
/** 地支 */
const DI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
/** 五行对应天干 */
const WU_XING_TG: Record<string, string> = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
/** 五行对应地支 */
const WU_XING_DZ: Record<string, string> = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" };

/**
 * 计算公历日期的日干支（基于已知基点：1900-01-01 = 甲戌日，日干支序号=11）
 * 使用精确的日差计算，完全确定性的——同一日期永远得出同一干支。
 */
function dayGanZhi(date: Date): { gan: string; zhi: string; ganZhi: string; ganIndex: number; zhiIndex: number } {
  const base = new Date(1900, 0, 1);
  const diffDays = Math.floor((date.getTime() - base.getTime()) / 86400000);
  // 1900-01-01 是甲戌日: 天干甲=0, 地支戌=10
  const ganIndex = ((diffDays % 10) + 10) % 10; // 甲=0 → 1900-01-01 diff=0, ganIndex=0 ✓
  const zhiIndex = ((diffDays % 12) + 10) % 12; // 戌=10 → diff=0, zhiIndex=10 ✓
  return {
    gan: TIAN_GAN[ganIndex],
    zhi: DI_ZHI[zhiIndex],
    ganZhi: TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex],
    ganIndex,
    zhiIndex,
  };
}

/**
 * 基于日干支和用户ID，确定性生成运势内容（无 Math.random()）。
 *
 * 算法说明：
 * - 五行分（事业/财运/健康等）基于日干支五行属性 + 用户ID hash 做微调（65-95分，正常范围）
 * - 幸运方位/颜色/数字基于日地支推导
 * - 同一天同一用户的运势永远相同，不同天/不同用户有差异
 * - 待后续接入完整八字引擎后替换此过渡算法
 */
function generateFortune(date: Date, userId: string): FortuneContent {
  const gz = dayGanZhi(date);

  // 用户hash用于微调（同一用户同一天结果一致）
  const userHash = Array.from(userId).reduce((s, c) => s + c.charCodeAt(0), 0);

  // 基于日天干五行的基准分
  const wuXing = WU_XING_TG[gz.gan];
  const baseMap: Record<string, number> = { 木: 72, 火: 75, 土: 70, 金: 68, 水: 73 };
  const base = baseMap[wuXing] || 70;

  // 五行偏差（±5，基于地支和用户）
  const offset = (gz.zhiIndex + userHash) % 11 - 5; // -5 ~ +5

  const directions = ["东", "南", "西", "北", "东南", "西南", "东北", "西北"];
  const colors = ["红", "黄", "蓝", "绿", "白", "黑", "紫", "金"];
  const advises = [
    "今日宜静不宜动，宜守不宜攻",
    "适合拓展人脉，多与人交流",
    "注意健康饮食，适当运动",
    "财运亨通，适宜投资理财",
    "桃花运旺，适合表白或约会",
    "宜修身养性，读书写字",
    "工作上大有可为，主动出击",
    "宜踏青出游，放松心情",
  ];

  // 基于日地支+用户hash的确定性索引
  const idx = (gz.zhiIndex * 7 + userHash) % directions.length;
  const advIdx = (gz.zhiIndex * 3 + Math.floor(userHash / 7)) % advises.length;
  const numBase = ((gz.zhiIndex + 1) * (gz.ganIndex + 1) * 7 + userHash) % 99;

  return {
    direction: directions[idx],
    color: colors[(idx + gz.ganIndex) % colors.length],
    number: numBase + 1, // 1-99
    advice: advises[advIdx],
    overall: Math.min(95, Math.max(65, base + offset + ((userHash % 7) - 3))),
    career: Math.min(95, Math.max(65, base + ((gz.ganIndex - 5) * 2) + ((userHash % 5) - 2))),
    love: Math.min(95, Math.max(65, base + ((gz.zhiIndex - 6) * 2) + ((userHash % 5) - 2))),
    wealth: Math.min(95, Math.max(65, base + ((gz.ganIndex + gz.zhiIndex) % 7 - 3) + ((userHash % 5) - 2))),
    health: Math.min(95, Math.max(65, base + ((12 - gz.zhiIndex) % 7 - 3) + ((userHash % 5) - 2))),
  };
}

@Injectable()
export class FortuneService {
  private readonly logger = new Logger(FortuneService.name);

  constructor(
    private prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ───────── 每日运势生成（7点执行） ─────────

  @Cron("0 7 * * *")
  async generateDailyFortunes() {
    await this.redis.runExclusive("fortune_daily_gen", 1800, () => this._generateDailyFortunes());
  }

  private async _generateDailyFortunes() {
    this.logger.log("开始生成每日运势");
    const today = new Date();
    const todayStr = formatDate(today, "YYYY-MM-DD");
    const subs = await this.prisma.fortuneSubscription.findMany({
      where: { fortuneType: "DAILY", isActive: true },
    });
    if (subs.length === 0) return;

    const existingIds = new Set(
      (await this.prisma.fortuneRecord.findMany({
        where: { fortuneType: "DAILY", period: todayStr, userId: { in: subs.map((s) => s.userId) } },
        select: { userId: true },
      })).map((r) => r.userId),
    );

    const newData = subs
      .filter((s) => !existingIds.has(s.userId))
      .map((sub) => {
        const content = generateFortune(today, sub.userId);
        return {
          userId: sub.userId,
          fortuneType: "DAILY" as const,
          period: todayStr,
          fortuneContent: content as unknown as Prisma.InputJsonValue,
          luckyDirection: content.direction,
          luckyColor: content.color,
          luckyNumber: content.number,
          advice: content.advice,
        };
      });

    if (newData.length > 0) {
      await this.prisma.fortuneRecord.createMany({ data: newData });
    }
    this.logger.log(`每日运势生成完成: ${newData.length}（基于日干支 ${dayGanZhi(today).ganZhi}）`);
  }

  @Cron("0 8 * * 1")
  async generateWeeklyFortunes() {
    await this.redis.runExclusive("fortune_weekly_gen", 1800, () => this._generateWeeklyFortunes());
  }

  private async _generateWeeklyFortunes() {
    this.logger.log("开始生成每周运势");
    const today = new Date();
    const period = getWeekPeriod(today);
    const subs = await this.prisma.fortuneSubscription.findMany({
      where: { fortuneType: "WEEKLY", isActive: true },
    });
    if (subs.length === 0) return;

    const existingIds = new Set(
      (await this.prisma.fortuneRecord.findMany({
        where: { fortuneType: "WEEKLY", period, userId: { in: subs.map((s) => s.userId) } },
        select: { userId: true },
      })).map((r) => r.userId),
    );

    const newData = subs
      .filter((s) => !existingIds.has(s.userId))
      .map((sub) => {
        const content = generateFortune(today, sub.userId);
        return {
          userId: sub.userId,
          fortuneType: "WEEKLY" as const,
          period,
          fortuneContent: content as unknown as Prisma.InputJsonValue,
          luckyDirection: content.direction,
          luckyColor: content.color,
          luckyNumber: content.number,
        };
      });

    if (newData.length > 0) {
      await this.prisma.fortuneRecord.createMany({ data: newData });
    }
    this.logger.log(`每周运势生成完成: ${newData.length}`);
  }

  // ───────── 订阅管理 ─────────

  async subscribe(userId: string, dto: { fortuneType: string; pushChannel: string; pushTime?: string }) {
    const existing = await this.prisma.fortuneSubscription.findUnique({
      where: { userId_fortuneType_pushChannel: { userId, fortuneType: dto.fortuneType, pushChannel: dto.pushChannel } },
    });
    if (existing) return existing;

    return this.prisma.fortuneSubscription.create({
      data: {
        userId,
        fortuneType: dto.fortuneType,
        pushChannel: dto.pushChannel,
        pushTime: dto.pushTime || "08:00",
      },
    });
  }

  async listSubscriptions(userId: string) {
    return this.prisma.fortuneSubscription.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async unsubscribe(userId: string, type: string, channel: string) {
    const sub = await this.prisma.fortuneSubscription.findUnique({
      where: { userId_fortuneType_pushChannel: { userId, fortuneType: type, pushChannel: channel } },
    });
    if (!sub) throw new BusinessException(ErrorCode.NOT_FOUND, "订阅不存在");
    return this.prisma.fortuneSubscription.update({
      where: { id: sub.id },
      data: { isActive: false },
    });
  }

  // ───────── 查询运势 ─────────

  /** 获取今日运势（基于日干支确定性算法，非随机） */
  async getTodayFortune(userId: string) {
    const today = new Date();
    const todayStr = formatDate(today, "YYYY-MM-DD");
    const record = await this.prisma.fortuneRecord.findUnique({
      where: { userId_fortuneType_period: { userId, fortuneType: "DAILY", period: todayStr } },
    });
    if (!record) {
      const content = generateFortune(today, userId);
      return this.prisma.fortuneRecord.create({
        data: {
          userId,
          fortuneType: "DAILY",
          period: todayStr,
          fortuneContent: content as unknown as Prisma.InputJsonValue,
          luckyDirection: content.direction,
          luckyColor: content.color,
          luckyNumber: content.number,
          advice: content.advice,
        },
      });
    }
    return record;
  }

  async getFortuneByPeriod(userId: string, type: string, period: string) {
    const record = await this.prisma.fortuneRecord.findUnique({
      where: { userId_fortuneType_period: { userId, fortuneType: type, period } },
    });
    if (record) return record;

    // 缺失即按（周期日期 + 用户）确定性生成并落库——运势算法确定性，同一用户同一天结果稳定
    const baseDate = type === "DAILY" ? new Date(period) : new Date();
    if (isNaN(baseDate.getTime())) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "无效的运势周期");
    }
    const content = generateFortune(baseDate, userId);
    return this.prisma.fortuneRecord.create({
      data: {
        userId,
        fortuneType: type,
        period,
        fortuneContent: content as unknown as Prisma.InputJsonValue,
        luckyDirection: content.direction,
        luckyColor: content.color,
        luckyNumber: content.number,
        advice: content.advice,
      },
    });
  }

  // ───────── 管理 ─────────

  async pushAll(fortuneType: string) {
    const period = fortuneType === "DAILY" ? formatDate(new Date(), "YYYY-MM-DD")
      : fortuneType === "WEEKLY" ? getWeekPeriod(new Date())
      : formatDate(new Date(), "YYYY-MM");
    const records = await this.prisma.fortuneRecord.findMany({
      where: { fortuneType, period, sentStatus: "PENDING" },
    });
    return { pushed: records.length };
  }

  async adminListRecords(rawPage = 1, rawPageSize = 20, fortuneType?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: any = {};
    if (fortuneType) where.fortuneType = fortuneType;
    const [items, total] = await Promise.all([
      this.prisma.fortuneRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.fortuneRecord.count({ where }),
    ]);
    // 返回 items 键，由 ResponseInterceptor 自动识别为分页响应
    return { items, total, page, pageSize };
  }

  /** 管理端：列出所有用户的运势推送订阅配置 */
  async adminListSubscriptions(rawPage = 1, rawPageSize = 20, fortuneType?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: any = {};
    if (fortuneType) where.fortuneType = fortuneType;
    const [items, total] = await Promise.all([
      this.prisma.fortuneSubscription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.fortuneSubscription.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 管理端：启用/禁用某条订阅配置 */
  async adminUpdateSubscription(id: string, isActive: boolean) {
    const sub = await this.prisma.fortuneSubscription.findUnique({ where: { id } });
    if (!sub) throw new BusinessException(ErrorCode.NOT_FOUND, "订阅配置不存在");
    return this.prisma.fortuneSubscription.update({
      where: { id },
      data: { isActive },
    });
  }

  // ───────── 排盘工具聚合 ─────────

  async getToolsGrid(userId?: string) {
    const tools = [
      { id: "bazi", name: "八字排盘", icon: "bazi", route: "/fortune/bazi", desc: "四柱八字命理分析" },
      { id: "ziwei", name: "紫微斗数", icon: "ziwei", route: "/fortune/ziwei", desc: "十二宫紫微命盘" },
      { id: "liuyao", name: "六爻占卜", icon: "liuyao", route: "/fortune/liuyao", desc: "易经六爻预测" },
      { id: "qimen", name: "奇门遁甲", icon: "qimen", route: "/fortune/qimen", desc: "时空方位决策" },
      { id: "fengshui", name: "风水堪舆", icon: "fengshui", route: "/fortune/fengshui", desc: "环境气场布局" },
      { id: "xingming", name: "姓名学", icon: "xingming", route: "/fortune/xingming", desc: "姓名五行分析" },
      { id: "hehun", name: "八字合婚", icon: "hehun", route: "/fortune/hehun", desc: "两人八字配对" },
      { id: "zeri", name: "择日", icon: "zeri", route: "/fortune/zeri", desc: "黄道吉日选择" },
    ];

    // 最近使用（仅登录用户）
    let recentTools: string[] = [];
    if (userId) {
      const recent = await this.prisma.fortuneRecord.findMany({
        where: { userId },
        select: { fortuneType: true },
        orderBy: { createdAt: "desc" },
        take: 8,
        distinct: ["fortuneType"],
      });
      recentTools = recent.map((r) => r.fortuneType);
    }

    // 课程推荐（排盘相关课程，按学员数降序）
    const recommendedCourses = await this.prisma.course.findMany({
      where: { auditStatus: "APPROVED" },
      select: { id: true, title: true, cover: true, price: true, studentCount: true },
      orderBy: { studentCount: "desc" },
      take: 3,
    });

    // 智能体引导入口（ACTIVE状态，按排序权重）
    const featuredBots = await this.prisma.botConfig.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, avatar: true, intro: true, type: true },
      orderBy: { sortOrder: "asc" },
      take: 2,
    });

    return { tools, recentTools, recommendedCourses, featuredBots };
  }

  async getGuideCard(userId: string) {
    const today = formatDate(new Date(), "YYYY-MM-DD");
    const fortune = await this.prisma.fortuneRecord.findUnique({
      where: { userId_fortuneType_period: { userId, fortuneType: "DAILY", period: today } },
    });
    if (!fortune) return { fortune: null, tip: "今日运势尚未生成，请稍后再来" };

    return {
      fortune: {
        overall: (fortune.fortuneContent as unknown as FortuneContent)?.overall,
        career: (fortune.fortuneContent as unknown as FortuneContent)?.career,
        love: (fortune.fortuneContent as unknown as FortuneContent)?.love,
        wealth: (fortune.fortuneContent as unknown as FortuneContent)?.wealth,
        health: (fortune.fortuneContent as unknown as FortuneContent)?.health,
        direction: fortune.luckyDirection,
        color: fortune.luckyColor,
        number: fortune.luckyNumber,
        advice: fortune.advice,
      },
      tools: [
        { id: "bazi", name: "八字排盘", route: "/fortune/bazi" },
        { id: "ziwei", name: "紫微斗数", route: "/fortune/ziwei" },
        { id: "hehun", name: "合婚配对", route: "/fortune/hehun" },
        { id: "zeri", name: "择日", route: "/fortune/zeri" },
      ],
    };
  }
}
