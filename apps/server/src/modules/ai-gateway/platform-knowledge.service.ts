import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { VectorService } from "./vector.service";

@Injectable()
export class PlatformKnowledgeService {
  private readonly logger = new Logger(PlatformKnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly vector: VectorService,
  ) {}

  /** 批量汇聚全平台知识到统一知识库 */
  async aggregateAll(): Promise<{ added: number; skipped: number }> {
    const lockKey = "cron:lock:platform_knowledge_sync";
    const locked = await this.redis.setNX(lockKey, "1", 120);
    if (!locked) return { added: 0, skipped: 0 };

    try {
      let added = 0;
      let skipped = 0;

      // 收集所有来源数据
      const [circleItems, aiItems, commentaryItems, baziItems] = await Promise.all([
        this.collectCircleKnowledge(),
        this.collectAiInteractions(),
        this.collectCommentaries(),
        this.collectBaziKnowledge(),
      ]);

      // 批量预取已存在的 sourceType+sourceId 组合，消除 N+1
      const allItems = [...circleItems, ...aiItems, ...commentaryItems, ...baziItems];
      const existingKeys = new Set(
        allItems.length > 0
          ? (await this.prisma.platformKnowledge.findMany({
              where: {
                OR: allItems.map((i) => ({ sourceType: i.sourceType, sourceId: i.sourceId })),
              },
              select: { sourceType: true, sourceId: true },
            })).map((r) => `${r.sourceType}:${r.sourceId}`)
          : [],
      );

      for (const item of allItems) {
        const result = await this.upsert(item, existingKeys);
        if (result === "added") added++; else skipped++;
      }

      this.logger.log(`平台知识汇聚完成: 新增 ${added}，跳过 ${skipped}`);
      return { added, skipped };
    } catch (err: any) {
      this.logger.error(`平台知识汇聚失败: ${err.message}`);
      return { added: 0, skipped: 0 };
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /** 定时汇聚（每天凌晨3点） */
  @Cron("0 3 * * *")
  async scheduledAggregate() {
    await this.aggregateAll();
  }

  /** 查询平台知识库 */
  async search(params: {
    category?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where: any = {};
    if (params.category) where.category = params.category;
    if (params.keyword) {
      where.OR = [
        { title: { contains: params.keyword } },
        { content: { contains: params.keyword } },
      ];
    }

    const page = params.page || 1;
    const pageSize = params.pageSize || 20;

    const [items, total] = await Promise.all([
      this.prisma.platformKnowledge.findMany({
        where,
        select: {
          id: true,
          title: true,
          sourceType: true,
          category: true,
          tags: true,
          qualityScore: true,
          usageCount: true,
          createdAt: true,
        },
        orderBy: { qualityScore: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.platformKnowledge.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 获取知识详情 */
  async getById(id: string) {
    return this.prisma.platformKnowledge.findUnique({ where: { id } });
  }

  /** 按分类统计 */
  async getStats() {
    const [total, byCategory, bySource] = await Promise.all([
      this.prisma.platformKnowledge.count(),
      this.prisma.platformKnowledge.groupBy({
        by: ["category"],
        _count: true,
      }),
      this.prisma.platformKnowledge.groupBy({
        by: ["sourceType"],
        _count: true,
      }),
    ]);

    return {
      total,
      byCategory: byCategory.map((b) => ({ category: b.category, count: b._count })),
      bySource: bySource.map((b) => ({ sourceType: b.sourceType, count: b._count })),
    };
  }

  // ─── 收集方法 ───

  private async collectCircleKnowledge(): Promise<
    Array<{ title: string; content: string; sourceType: string; sourceId: string; circleId: string; tags: string[]; category?: string }>
  > {
    const items = await this.prisma.circleKnowledge.findMany({
      where: { status: "active" },
      select: {
        id: true,
        circleId: true,
        sourceType: true,
        content: true,
      },
      take: 500,
    });

    return items.map((i) => ({
      title: i.content.slice(0, 80),
      content: i.content,
      sourceType: `circle_knowledge:${i.sourceType}`,
      sourceId: i.id,
      circleId: i.circleId,
      tags: [] as string[],
      category: this.inferCategory(i.content),
    }));
  }

  private async collectAiInteractions(): Promise<
    Array<{ title: string; content: string; sourceType: string; sourceId: string; circleId?: string; tags: string[]; category?: string }>
  > {
    // 从 AiCacheEntry 收集有价值的问答对
    const items = await this.prisma.aiCacheEntry.findMany({
      where: { queryText: { not: undefined } },
      select: { id: true, scene: true, queryText: true, response: true },
      take: 200,
      orderBy: { hitCount: "desc" },
    });

    const result: Array<{ title: string; content: string; sourceType: string; sourceId: string; tags: string[]; category?: string }> = [];
    for (const i of items) {
      if (!i.queryText || !i.response) continue;
      result.push({
        title: i.queryText.slice(0, 80),
        content: `Q: ${i.queryText}\nA: ${i.response.slice(0, 500)}`,
        sourceType: `ai_qa:${i.scene}`,
        sourceId: i.id,
        tags: [i.scene],
        category: this.inferCategory(i.queryText),
      });
    }
    return result;
  }

  private async collectCommentaries(): Promise<
    Array<{ title: string; content: string; sourceType: string; sourceId: string; tags: string[]; category?: string }>
  > {
    const items = await this.prisma.classicCommentary.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, content: true, school: true },
      take: 300,
    });

    return items.map((i) => ({
      title: i.title,
      content: i.content,
      sourceType: "commentary",
      sourceId: i.id,
      tags: [i.school || ""].filter(Boolean),
      category: "儒学",
    }));
  }

  private async collectBaziKnowledge(): Promise<
    Array<{ title: string; content: string; sourceType: string; sourceId: string; tags: string[]; category?: string }>
  > {
    const items = await this.prisma.baziKnowledge.findMany({
      where: { status: "active" },
      select: { id: true, title: true, content: true, tags: true },
      take: 200,
    });

    return items.map((i) => ({
      title: i.title,
      content: i.content,
      sourceType: "bazi",
      sourceId: i.id,
      tags: i.tags || [],
      category: "易学",
    }));
  }

  // ─── 内部工具 ───

  /**
   * 去重 + 入库
   * 返回 "added" | "skipped"
   * @param existingKeys 预取的 "sourceType:sourceId" 集合，命中则直接跳过
   */
  private async upsert(
    item: {
      title: string;
      content: string;
      sourceType: string;
      sourceId: string;
      circleId?: string;
      tags: string[];
      category?: string;
    },
    existingKeys?: Set<string>,
  ): Promise<"added" | "skipped"> {
    // 检查是否已存在：优先用预取集合
    const lookupKey = `${item.sourceType}:${item.sourceId}`;
    if (existingKeys) {
      if (existingKeys.has(lookupKey)) return "skipped";
    } else {
      const existing = await this.prisma.platformKnowledge.findFirst({
        where: { sourceType: item.sourceType, sourceId: item.sourceId },
      });
      if (existing) return "skipped";
    }

    // 全局内容哈希去重
    const duplicate = await this.prisma.platformKnowledge.findFirst({
      where: {
        AND: [
          { sourceType: item.sourceType },
          { content: { contains: item.content.slice(0, 100) } },
        ],
      },
    });

    if (duplicate) return "skipped";

    try {
      await this.prisma.platformKnowledge.create({
        data: {
          title: item.title,
          content: item.content,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          circleId: item.circleId,
          tags: item.tags,
          category: item.category,
          qualityScore: 0.5, // 默认中等质量，后续由 QualityScorer 评估
        },
      });

      // 异步向量化
      this.vectorizeLatest().catch((err) =>
        this.logger.warn(`向量化失败: ${err.message}`),
      );

      return "added";
    } catch (err: any) {
      this.logger.debug(`知识入库跳过: ${err.message}`);
      return "skipped";
    } finally {
      existingKeys?.add(lookupKey);
    }
  }

  /** 为未向量化的知识生成向量 */
  private async vectorizeLatest(limit = 50) {
    const items = await this.prisma.platformKnowledge.findMany({
      where: { embeddingJson: null },
      select: { id: true, title: true, content: true },
      take: limit,
    });

    for (const item of items) {
      try {
        const [vec] = await this.vector.embed([item.title + " " + item.content.slice(0, 500)]);
        if (vec) {
          const vecJson = JSON.stringify(vec);
          await this.prisma.platformKnowledge.update({
            where: { id: item.id },
            data: { embeddingJson: vecJson },
          });
        }
      } catch (err: any) {
        this.logger.debug(`向量生成跳过 id=${item.id}: ${err.message}`);
      }
    }
  }

  /** 简单中文分类推断 */
  private inferCategory(text: string): string | undefined {
    const rules: Array<[RegExp, string]> = [
      [/论语|孟子|大学|中庸|儒家|孔子|孟子|荀子/, "儒学"],
      [/道德经|老子|庄子|道家|列子|无为/, "道学"],
      [/金刚经|心经|佛|禅|涅槃|菩萨|佛陀/, "佛学"],
      [/黄帝内经|伤寒|本草|中医|针灸|经络|脉/, "中医"],
      [/诗经|唐诗|宋词|元曲|李白|杜甫|苏轼|诗词/, "诗词"],
      [/史记|资治通鉴|春秋|战国|三国|明朝|清朝|唐朝/, "历史"],
      [/易经|八卦|风水|命理|八字|紫微|六爻|奇门/, "易学"],
    ];

    for (const [pattern, category] of rules) {
      if (pattern.test(text)) return category;
    }
    return undefined;
  }
}
