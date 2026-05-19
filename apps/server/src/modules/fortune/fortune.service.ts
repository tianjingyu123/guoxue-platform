import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

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

@Injectable()
export class FortuneService {
  private readonly logger = new Logger(FortuneService.name);

  constructor(private prisma: PrismaService) {}

  // ───────── 每日运势生成（7点执行） ─────────

  @Cron("0 7 * * *")
  async generateDailyFortunes() {
    this.logger.log("开始生成每日运势");
    const today = formatDate(new Date(), "YYYY-MM-DD");
    const subs = await this.prisma.fortuneSubscription.findMany({
      where: { fortuneType: "DAILY", isActive: true },
    });
    if (subs.length === 0) return;

    // 批量查出现有记录，避免 N+1
    const existingIds = new Set(
      (await this.prisma.fortuneRecord.findMany({
        where: { fortuneType: "DAILY", period: today, userId: { in: subs.map((s) => s.userId) } },
        select: { userId: true },
      })).map((r) => r.userId),
    );

    const newData = subs
      .filter((s) => !existingIds.has(s.userId))
      .map((sub) => {
        const content = this.generateTemplateFortune();
        return {
          userId: sub.userId,
          fortuneType: "DAILY" as const,
          period: today,
          fortuneContent: content as any,
          luckyDirection: content.direction,
          luckyColor: content.color,
          luckyNumber: content.number,
          advice: content.advice,
        };
      });

    if (newData.length > 0) {
      await this.prisma.fortuneRecord.createMany({ data: newData });
    }
    this.logger.log(`每日运势生成完成: ${newData.length}`);
  }

  @Cron("0 8 * * 1")
  async generateWeeklyFortunes() {
    this.logger.log("开始生成每周运势");
    const period = getWeekPeriod(new Date());
    const subs = await this.prisma.fortuneSubscription.findMany({
      where: { fortuneType: "WEEKLY", isActive: true },
    });
    if (subs.length === 0) return;

    // 批量查出本周已生成记录
    const existingIds = new Set(
      (await this.prisma.fortuneRecord.findMany({
        where: { fortuneType: "WEEKLY", period, userId: { in: subs.map((s) => s.userId) } },
        select: { userId: true },
      })).map((r) => r.userId),
    );

    const newData = subs
      .filter((s) => !existingIds.has(s.userId))
      .map((sub) => {
        const content = this.generateTemplateFortune();
        return {
          userId: sub.userId,
          fortuneType: "WEEKLY" as const,
          period,
          fortuneContent: content as any,
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

  private generateTemplateFortune() {
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
    const r = () => Math.floor(Math.random() * 8);
    return {
      direction: directions[r()],
      color: colors[r()],
      number: Math.floor(Math.random() * 99) + 1,
      advice: advises[r()],
      overall: Math.floor(Math.random() * 40) + 60,
      career: Math.floor(Math.random() * 40) + 60,
      love: Math.floor(Math.random() * 40) + 60,
      wealth: Math.floor(Math.random() * 40) + 60,
      health: Math.floor(Math.random() * 40) + 60,
    };
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

  async getTodayFortune(userId: string) {
    const today = formatDate(new Date(), "YYYY-MM-DD");
    const record = await this.prisma.fortuneRecord.findUnique({
      where: { userId_fortuneType_period: { userId, fortuneType: "DAILY", period: today } },
    });
    if (!record) {
      const content = this.generateTemplateFortune();
      return this.prisma.fortuneRecord.create({
        data: {
          userId,
          fortuneType: "DAILY",
          period: today,
          fortuneContent: content as any,
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
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "运势记录不存在");
    return record;
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

  async adminListRecords(page = 1, pageSize = 20, fortuneType?: string) {
    const where: any = {};
    if (fortuneType) where.fortuneType = fortuneType;
    const [records, total] = await Promise.all([
      this.prisma.fortuneRecord.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.fortuneRecord.count({ where }),
    ]);
    return { records, total, page, pageSize };
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
        overall: (fortune.fortuneContent as any)?.overall,
        career: (fortune.fortuneContent as any)?.career,
        love: (fortune.fortuneContent as any)?.love,
        wealth: (fortune.fortuneContent as any)?.wealth,
        health: (fortune.fortuneContent as any)?.health,
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
