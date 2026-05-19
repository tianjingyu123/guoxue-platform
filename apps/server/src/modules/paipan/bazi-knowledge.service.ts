import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { VectorService } from "../ai-gateway/vector.service";

/** 八字知识分类 */
export const BAZI_CATEGORIES = [
  "天干地支", "五行生克", "十神", "格局",
  "用神", "神煞", "大运流年", "实战案例",
] as const;

/**
 * 八字命理专业知识库服务（RAG 第3层）
 *
 * 管理八字命理的结构化知识：天干地支、五行生克、十神、
 * 格局、用神、神煞、大运流年和实战案例。
 * 支持全文检索和向量化，供 AI 排盘分析时 RAG 召回。
 */
@Injectable()
export class BaziKnowledgeService {
  private readonly logger = new Logger(BaziKnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vector: VectorService,
  ) {}

  /** 按分类列出知识条目 */
  async listByCategory(category: string, page = 1, pageSize = 20) {
    const where = { category, status: "PUBLISHED" };
    const [items, total] = await Promise.all([
      this.prisma.baziKnowledge.findMany({
        where,
        select: { id: true, title: true, category: true, tags: true, source: true, createdAt: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.baziKnowledge.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 获取单条详情 */
  async getById(id: string) {
    return this.prisma.baziKnowledge.findUnique({ where: { id } });
  }

  /** 搜索知识（全文+标签） */
  async search(keyword: string, category?: string) {
    const where: any = { status: "PUBLISHED" };
    if (category) where.category = category;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { content: { contains: keyword } },
        { tags: { hasSome: [keyword] } },
      ];
    }

    return this.prisma.baziKnowledge.findMany({
      where,
      select: {
        id: true, title: true, category: true, tags: true,
        content: true, source: true,
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });
  }

  /** 创建知识条目 */
  async create(dto: {
    title: string;
    category: string;
    content: string;
    tags?: string[];
    source?: string;
  }) {
    const knowledge = await this.prisma.baziKnowledge.create({
      data: {
        ...dto,
        tags: dto.tags || [],
        contentHash: this.hashContent(dto.content),
      },
    });

    // 异步同步到知识库
    this.syncToKnowledge(knowledge.id).catch((err) =>
      this.logger.warn(`八字知识 ${knowledge.id} 同步失败: ${err.message}`),
    );

    return knowledge;
  }

  /** 更新知识条目 */
  async update(id: string, dto: {
    title?: string;
    category?: string;
    content?: string;
    tags?: string[];
    source?: string;
    status?: string;
  }) {
    const data: any = { ...dto };
    if (dto.content) data.contentHash = this.hashContent(dto.content);
    return this.prisma.baziKnowledge.update({ where: { id }, data });
  }

  /** 删除知识条目 */
  async delete(id: string) {
    return this.prisma.baziKnowledge.delete({ where: { id } });
  }

  /** 统计概览 */
  async stats() {
    const [total, byCategory] = await Promise.all([
      this.prisma.baziKnowledge.count({ where: { status: "PUBLISHED" } }),
      this.prisma.baziKnowledge.groupBy({
        by: ["category"],
        _count: true,
        where: { status: "PUBLISHED" },
      }),
    ]);
    return {
      total,
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count })),
    };
  }

  /** 同步到 circle_knowledge（以 circleId="bazi" 命名空间） */
  async syncToKnowledge(knowledgeId: string): Promise<void> {
    const knowledge = await this.prisma.baziKnowledge.findUnique({
      where: { id: knowledgeId },
    });
    if (!knowledge) return;

    const sourceType = "bazi_knowledge";
    const content = `【${knowledge.category}】${knowledge.title}\n${knowledge.content}`;

    const existing = await this.prisma.circleKnowledge.findFirst({
      where: {
        circleId: "bazi",
        sourceType,
        contentHash: knowledge.contentHash || this.hashContent(content),
      },
    });
    if (existing) return;

    try {
      await this.prisma.circleKnowledge.create({
        data: {
          circleId: "bazi",
          sourceType,
          sourceId: knowledgeId,
          content,
          contentHash: knowledge.contentHash || this.hashContent(content),
          addedBy: "SYSTEM",
        },
      });
    } catch (_err) {
      this.logger.debug(`八字知识同步跳过（可能 contentHash 冲突）`);
    }
  }

  /** 向量化未索引条目 */
  async vectorizeUnindexed(batchSize = 30): Promise<number> {
    const unindexed = await this.vector.findUnindexed(batchSize);
    if (unindexed.length === 0) return 0;

    const texts = unindexed.map((r) => r.content);
    const vectors = await this.vector.embed(texts);

    let count = 0;
    for (let i = 0; i < unindexed.length && i < vectors.length; i++) {
      await this.vector.storeCircleKnowledge(unindexed[i].id, vectors[i]);
      count++;
    }
    return count;
  }

  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16);
  }
}
