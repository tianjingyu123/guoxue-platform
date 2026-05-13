import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";

interface SimEntry {
  itemType: string;
  itemId: string;
  simItemId: string;
  score: number;
}

@Injectable()
export class CollabMatrixTask {
  private readonly logger = new Logger(CollabMatrixTask.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async buildSimilarityMatrix() {
    this.logger.log("开始构建协同过滤相似度矩阵...");

    // 从 Order 表中提取 item-item 共现数据
    const orders = await this.prisma.order.findMany({
      where: { status: { in: ["PAID", "COMPLETED"] } },
      select: { userId: true, type: true, targetId: true },
    });

    // 按用户分组：每个用户购买过的 (type, id) 集合
    const userItems = new Map<string, Set<string>>();
    for (const o of orders) {
      const key = `${o.type}:${o.targetId}`;
      if (!userItems.has(o.userId)) userItems.set(o.userId, new Set());
      userItems.get(o.userId)!.add(key);
    }

    // 构建共现矩阵：itemA -> { itemB: count }
    const cooccurrence = new Map<string, Map<string, number>>();
    const itemCounts = new Map<string, number>();

    for (const [, items] of userItems) {
      const itemList = [...items];
      for (let i = 0; i < itemList.length; i++) {
        const a = itemList[i];
        itemCounts.set(a, (itemCounts.get(a) ?? 0) + 1);
        for (let j = i + 1; j < itemList.length; j++) {
          const b = itemList[j];
          // a -> b
          if (!cooccurrence.has(a)) cooccurrence.set(a, new Map());
          cooccurrence.get(a)!.set(b, (cooccurrence.get(a)!.get(b) ?? 0) + 1);
          // b -> a
          if (!cooccurrence.has(b)) cooccurrence.set(b, new Map());
          cooccurrence.get(b)!.set(a, (cooccurrence.get(b)!.get(a) ?? 0) + 1);
        }
      }
    }

    // 计算 Jaccard 相似度：|A ∩ B| / |A ∪ B| ≈ cooccurCount / (countA + countB - cooccurCount)
    const similarities: SimEntry[] = [];
    for (const [itemA, neighbors] of cooccurrence) {
      const countA = itemCounts.get(itemA) ?? 1;
      const [aType, aId] = itemA.split(":", 2);

      // 只保留相似度 > 0.05 的关系以控制体积
      for (const [itemB, coCount] of neighbors) {
        const [, bId] = itemB.split(":", 2);
        const countB = itemCounts.get(itemB) ?? 1;
        const jaccard = coCount / (countA + countB - coCount);

        if (jaccard > 0.05) {
          similarities.push({
            itemType: aType,
            itemId: aId,
            simItemId: bId,
            score: Math.round(jaccard * 1000) / 1000,
          });
        }
      }
    }

    // 写入 Redis: recommend:collab:sim:{itemType}:{itemId} → [{ simItemId, simItemType, score }]
    const batchSize = 100;
    let written = 0;

    // 按 (itemType, itemId) 分组
    const grouped = new Map<string, { simItemId: string; simItemType: string; score: number }[]>();
    const typeIndex = new Map<string, string>(); // itemB -> bType

    // Build type index from all unique items
    for (const [, neighbors] of cooccurrence) {
      for (const [itemB] of neighbors) {
        const [bType] = itemB.split(":", 2);
        typeIndex.set(itemB, bType);
      }
    }

    for (const entry of similarities) {
      const key = `${entry.itemType}:${entry.itemId}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push({
        simItemId: entry.simItemId,
        simItemType: typeIndex.get(`${entry.itemType}:${entry.simItemId}`) ?? entry.itemType,
        score: entry.score,
      });
    }

    for (const [key, sims] of grouped) {
      const [itemType, itemId] = key.split(":", 2);
      const redisKey = `recommend:collab:sim:${itemType}:${itemId}:v1`;

      // 只保留 top-20 相似项
      const topSims = sims.sort((a, b) => b.score - a.score).slice(0, 20);
      await this.redis.setJson(redisKey, topSims, 3600).catch((err) => this.logger.warn("协同过滤矩阵构建失败", err));
      written++;

      if (written % batchSize === 0) {
        this.logger.log(`协同过滤矩阵进度: ${written}/${grouped.size}`);
      }
    }

    this.logger.log(`协同过滤矩阵构建完成: ${grouped.size} 个条目`);
  }
}
