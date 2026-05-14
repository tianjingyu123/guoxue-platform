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

    let generated = 0;
    for (const sub of subs) {
      try {
        const existing = await this.prisma.fortuneRecord.findUnique({
          where: { userId_fortuneType_period: { userId: sub.userId, fortuneType: "DAILY", period: today } },
        });
        if (existing) continue;

        const content = this.generateTemplateFortune();
        await this.prisma.fortuneRecord.create({
          data: {
            userId: sub.userId,
            fortuneType: "DAILY",
            period: today,
            fortuneContent: content as any,
            luckyDirection: content.direction,
            luckyColor: content.color,
            luckyNumber: content.number,
            advice: content.advice,
          },
        });
        generated++;
      } catch (_err) {
        this.logger.warn(`用户 ${sub.userId} 运势生成失败`);
      }
    }
    this.logger.log(`每日运势生成完成: ${generated}`);
  }

  @Cron("0 8 * * 1")
  async generateWeeklyFortunes() {
    this.logger.log("开始生成每周运势");
    const period = getWeekPeriod(new Date());
    const subs = await this.prisma.fortuneSubscription.findMany({
      where: { fortuneType: "WEEKLY", isActive: true },
    });
    for (const sub of subs) {
      try {
        const content = this.generateTemplateFortune();
        await this.prisma.fortuneRecord.create({
          data: {
            userId: sub.userId,
            fortuneType: "WEEKLY",
            period,
            fortuneContent: content as any,
            luckyDirection: content.direction,
            luckyColor: content.color,
            luckyNumber: content.number,
          },
        });
      } catch (_err) {
        this.logger.warn(`用户 ${sub.userId} 周运生成失败`);
      }
    }
    this.logger.log(`每周运势生成完成: ${subs.length}`);
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
}
