import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";

interface StrategyCtr {
  strategy: string;
  impressions: number;
  clicks: number;
  ctr: number;
  updatedAt: string;
}

@Injectable()
export class CtrCalcTask {
  private readonly logger = console;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async calcStrategyCtr() {
    // 计算过去 7 天各策略的 CTR
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const logs = await this.prisma.recommendLog.findMany({
      where: { createdAt: { gte: since } },
      select: { strategy: true, isClick: true },
    });

    const stats = new Map<string, { imp: number; click: number }>();
    for (const log of logs) {
      const strategies = log.strategy ? log.strategy.split(",") : ["unknown"];
      for (const s of strategies) {
        const trimmed = s.trim();
        if (!trimmed) continue;
        const entry = stats.get(trimmed) ?? { imp: 0, click: 0 };
        entry.imp++;
        if (log.isClick) entry.click++;
        stats.set(trimmed, entry);
      }
    }

    const ctrs: StrategyCtr[] = [];
    for (const [strategy, { imp, click }] of stats) {
      ctrs.push({
        strategy,
        impressions: imp,
        clicks: click,
        ctr: imp > 0 ? Math.round((click / imp) * 10000) / 10000 : 0,
        updatedAt: new Date().toISOString(),
      });
    }

    ctrs.sort((a, b) => b.ctr - a.ctr);

    // 写入 Redis，TTL 2 小时
    await this.redis.setJson("recommend:stats:strategy_ctr:v1", ctrs, 7200);

    // 计算全局平均 CTR 作为基准
    const totalImp = ctrs.reduce((s, c) => s + c.impressions, 0);
    const totalClick = ctrs.reduce((s, c) => s + c.clicks, 0);
    const avgCtr = totalImp > 0 ? totalClick / totalImp : 0;

    await this.redis.setJson("recommend:stats:avg_ctr:v1", { avgCtr, totalImp, totalClick, updatedAt: new Date().toISOString() }, 7200);
  }

  /** 获取各策略 CTR，用于权重动态调整 */
  async getStrategyCtrs(): Promise<StrategyCtr[]> {
    const cached = await this.redis.getJson<StrategyCtr[]>("recommend:stats:strategy_ctr:v1");
    return cached ?? [];
  }
}
