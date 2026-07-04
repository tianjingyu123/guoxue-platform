import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private readonly CACHE_TTL = 300;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ───────── 动态价格计算 ─────────

  async calculatePrice(targetType: string, targetId: string, userId?: string, basePrice?: number): Promise<{ price: number; ruleName: string; strategy: string }> {
    const cacheKey = `pricing:${targetType}:${targetId}`;
    const cached = await this.redis.getJson<{ price: number; ruleName: string; strategy: string }>(cacheKey);
    if (cached) return cached;

    const rules = await this.prisma.pricingRule.findMany({
      where: { targetType, isActive: true },
      orderBy: { priority: "desc" },
    });

    const matchedRule = rules.find(r => r.targetIds.length === 0 || r.targetIds.includes(targetId));
    if (!matchedRule) {
      const result = { price: basePrice || 0, ruleName: "默认", strategy: "FIXED" };
      await this.redis.setJson(cacheKey, result, this.CACHE_TTL);
      return result;
    }

    const config = matchedRule.strategyConfig as any;
    let finalPrice = Number(matchedRule.basePrice) || basePrice || 0;

    switch (matchedRule.strategy) {
      case "FIXED":
        finalPrice = Number(matchedRule.basePrice) || basePrice || 0;
        break;
      case "TIME_DISCOUNT": {
        const { discountPercent, startHour, endHour } = config;
        const hour = new Date().getHours();
        if (hour >= (startHour || 0) && hour <= (endHour || 24)) {
          finalPrice = finalPrice * (discountPercent / 100);
        }
        break;
      }
      case "DEMAND_BASED": {
        const demand = await this.prisma.pricingDemand.findFirst({
          where: { targetType, targetId },
          orderBy: { recordedAt: "desc" },
        });
        if (demand) {
          const multiplier = demand.demandLevel === "HIGH" ? (config.highMultiplier || 1.3)
            : demand.demandLevel === "MEDIUM" ? 1.0
            : (config.lowMultiplier || 0.8);
          finalPrice = finalPrice * multiplier;
        }
        break;
      }
    }

    if (matchedRule.minPrice) finalPrice = Math.max(finalPrice, Number(matchedRule.minPrice));
    if (matchedRule.maxPrice) finalPrice = Math.min(finalPrice, Number(matchedRule.maxPrice));

    const result = { price: Math.round(finalPrice * 100) / 100, ruleName: matchedRule.name, strategy: matchedRule.strategy };
    await this.redis.setJson(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  // ───────── 每小时需求统计 ─────────

  @Cron("0 * * * *")
  async trackDemand() {
    await this.redis.runExclusive("pricing_track_demand", 600, async () => {
      this.logger.log("执行需求统计");
      const since24h = new Date(Date.now() - 24 * 3600 * 1000);

      const viewStats = await this.prisma.userBehavior.groupBy({
        by: ["targetType"],
        where: { behavior: "VIEW", createdAt: { gte: since24h } },
        _count: true,
      });

      for (const stat of viewStats) {
        if (!stat.targetType) continue;
        const demandLevel = stat._count > 100 ? "HIGH" : stat._count > 30 ? "MEDIUM" : "LOW";
        await this.prisma.pricingDemand.create({
          data: {
            targetType: stat.targetType,
            targetId: "ALL",
            viewCount24h: stat._count,
            demandLevel,
          },
        });
      }
      this.logger.log(`需求统计完成: ${viewStats.length} 类型`);
    });
  }

  // ───────── 管理接口 ─────────

  async listRules() {
    return this.prisma.pricingRule.findMany({ orderBy: { priority: "desc" } });
  }

  async createRule(body: any) {
    return this.prisma.pricingRule.create({ data: body });
  }

  async updateRule(id: string, body: any) {
    const existing = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "定价规则不存在");
    return this.prisma.pricingRule.update({ where: { id }, data: body });
  }

  async deleteRule(id: string) {
    const existing = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "定价规则不存在");
    await this.prisma.pricingRule.delete({ where: { id } });
    return { success: true };
  }

  async getDemandHeatmap() {
    return this.prisma.pricingDemand.findMany({
      orderBy: { recordedAt: "desc" },
      take: 200,
    });
  }
}
