import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";

export interface ActiveRule {
  id: string;
  scene: string;
  targetType: string;
  targetId: string;
  ruleType: string; // PIN, BOOST, MUTE, BAN
  ruleValue?: number | null;
  priority: number;
  conditionJson?: unknown;
}

@Injectable()
export class RuleService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // 获取所有生效的运营规则
  async getActiveRules(): Promise<ActiveRule[]> {
    const cacheKey = "recommend:rules:active";
    const cached = await this.redis.getJson<ActiveRule[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const rules = await this.prisma.recommendRule.findMany({
      where: {
        OR: [
          { startAt: null, endAt: null },
          { startAt: { lte: now }, endAt: null },
          { startAt: null, endAt: { gte: now } },
          { startAt: { lte: now }, endAt: { gte: now } },
        ],
      },
      orderBy: { priority: "desc" },
    });

    const mapped: ActiveRule[] = rules.map((r) => ({
      id: r.id,
      scene: r.scene,
      targetType: r.targetType,
      targetId: r.targetId,
      ruleType: r.ruleType,
      ruleValue: r.ruleValue,
      priority: r.priority,
      conditionJson: r.conditionJson,
    }));

    await this.redis.setJson(cacheKey, mapped, 60);
    return mapped;
  }

  // 应用规则到推荐列表
  applyRules<T extends { id: string; type: string; score: number }>(
    items: T[],
    scene: string,
    rules: ActiveRule[],
  ): T[] {
    const sceneRules = rules.filter((r) => r.scene === "ALL" || r.scene === scene);

    // 禁推集合
    const banSet = new Set(
      sceneRules
        .filter((r) => r.ruleType === "BAN")
        .map((r) => `${r.targetType}:${r.targetId}`),
    );

    // 加权/降权映射
    const boostMap = new Map<string, number>();
    const muteMap = new Map<string, number>();
    for (const r of sceneRules) {
      const key = `${r.targetType}:${r.targetId}`;
      if (r.ruleType === "BOOST") boostMap.set(key, r.ruleValue ?? 2);
      if (r.ruleType === "MUTE") muteMap.set(key, r.ruleValue ?? 0.3);
    }

    // 过滤禁推
    let filtered = items.filter((item) => !banSet.has(`${item.type}:${item.id}`));

    // 加权/降权
    filtered = filtered.map((item) => {
      const key = `${item.type}:${item.id}`;
      let score = item.score;
      const boost = boostMap.get(key);
      const mute = muteMap.get(key);
      if (boost !== undefined) score *= boost;
      if (mute !== undefined) score *= mute;
      return { ...item, score };
    });

    return filtered.sort((a, b) => b.score - a.score);
  }

  async clearCache() {
    await this.redis.del("recommend:rules:active");
  }
}
