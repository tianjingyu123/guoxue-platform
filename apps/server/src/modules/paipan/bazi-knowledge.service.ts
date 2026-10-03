import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { VectorService } from "../ai-gateway/vector.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { safePagination } from "../../common/pagination";

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

  /**
   * 按【当前八字】检索相关古籍条目 —— 八字结果页「古籍参考」用。
   *
   * 🔴 此前那一块是 4 段硬编码原文（「论丁火」「论丁生午月」），不管用户排的是什么盘
   *    都给同一份内容，却在页面上标着《滴天髓》—— 那不是兜底，是**假的针对性**，
   *    比空着更糟：它让用户以为这是为他这一盘检索出来的。
   *
   * 现在按盘面特征给知识条目打分排序，并且每条都说得出**为什么推它**（matchedOn），
   * 不做黑箱召回。相关度权重（越靠近这一盘的命理结论，越优先）：
   *   格局   +10  这一盘是什么格局，是最贴身的信息
   *   用神   +8
   *   日主干 +6   日主是命主自身
   *   月令支 +4   月令司权
   *   神煞   +3   命带的神煞
   *   五行   +2   最泛，兜底
   * 一条都命中不了就返回空 —— 宁可不显示，也不塞一段不相干的原文冒充「参考」。
   */
  async forBazi(input: {
    dayGan?: string;
    dayZhi?: string;
    monthZhi?: string;
    geju?: string;
    yongshen?: string;
    shenSha?: string[];
    wuxing?: string;
    limit?: number;
  }) {
    const signals: { value: string; weight: number; reason: string }[] = [];
    const push = (v: string | undefined, weight: number, reason: string) => {
      const s = (v || "").trim();
      if (s) signals.push({ value: s, weight, reason });
    };

    push(input.geju, 10, "格局");
    push(input.dayGan, 6, "日主");
    push(input.monthZhi, 4, "月令");
    for (const s of (input.shenSha ?? []).slice(0, 6)) push(s, 3, "神煞");

    // 🔴 用神/五行两个信号已废弃（入参保留只为兼容旧调用）。
    //    它们的值是五行字（「土」），会撞上《穷通宝鉴·论戊土》这类章的日主五行标签——
    //    可章上的「土」意思是「本章论土日主」，用神的「土」意思是「这盘需要土帮扶」，
    //    两个土不是一回事。撞车的后果实测过：庚金日主的盘，六条里四条在论戊己土。
    //    日主本身已由 dayGan 精确命中，五行是冗余信号，去掉只赚不亏。

    if (!signals.length) return [];

    const values = signals.map((s) => s.value);
    const scoreOf = (tags: string[]) => {
      const hits = signals.filter((s) => tags.includes(s.value));
      return {
        score: hits.reduce((sum, h) => sum + h.weight, 0),
        // 去重：同一维度（如「格局」）命中多次只记一次理由
        matchedOn: [...new Set(hits.map((h) => `${h.reason}「${h.value}」`))],
      };
    };

    // ① 古籍原文 —— 命类古籍的章节（《穷通宝鉴·论丁火》这种，是真正「这本书对你这盘怎么说」）。
    //    标签由 scripts/tag-classics-bazi.ts 按规则打（天干只认章标题，不按正文词频滥标）。
    //    命类共 ~400 章，先只取轻量字段打分，再回表取命中那几章的正文——不把全部原文拉进内存。
    const chapterMeta = await this.prisma.classicChapter.findMany({
      where: { deletedAt: null, book: { category: "命", deletedAt: null } },
      select: { id: true, title: true, tags: true, book: { select: { title: true } } },
    });
    const chapterHits = chapterMeta
      .map((c) => {
        const tags = Array.isArray(c.tags) ? (c.tags as unknown[]).map(String) : [];
        return { ...c, tags, ...scoreOf(tags) };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, input.limit ?? 6);

    const contents = chapterHits.length
      ? await this.prisma.classicChapter.findMany({
          where: { id: { in: chapterHits.map((c) => c.id) } },
          select: { id: true, content: true },
        })
      : [];
    const contentById = new Map(contents.map((c) => [c.id, c.content]));

    const fromClassics = chapterHits.map((c) => ({
      id: c.id,
      title: c.title.replace(/\s+/g, " ").trim(),
      category: "古籍原文",
      tags: c.tags,
      content: contentById.get(c.id) ?? "",
      source: `《${c.book.title}》`,
      score: c.score + 5, // 原文优先于概说摘要
      matchedOn: c.matchedOn,
    }));

    // ② 知识库概说 —— 补充位。是通论摘要，不如原文贴身，故不加分。
    const rows = await this.prisma.baziKnowledge.findMany({
      where: { status: "PUBLISHED", tags: { hasSome: values } },
      select: { id: true, title: true, category: true, tags: true, content: true, source: true },
      take: 60,
    });
    const fromKnowledge = rows
      .map((r) => ({ ...r, ...scoreOf(r.tags) }))
      .filter((r) => r.score > 0);

    return [...fromClassics, ...fromKnowledge]
      .sort((a, b) => b.score - a.score)
      .slice(0, input.limit ?? 6);
  }

  /** 按分类列出知识条目 */
  async listByCategory(category: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { category, status: "PUBLISHED" };
    const [items, total] = await Promise.all([
      this.prisma.baziKnowledge.findMany({
        where,
        select: { id: true, title: true, category: true, tags: true, source: true, createdAt: true },
        skip,
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
    const existing = await this.prisma.baziKnowledge.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "八字知识不存在");
    const data: any = { ...dto };
    if (dto.content) data.contentHash = this.hashContent(dto.content);
    return this.prisma.baziKnowledge.update({ where: { id }, data });
  }

  /** 删除知识条目 */
  async delete(id: string) {
    const existing = await this.prisma.baziKnowledge.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "八字知识不存在");
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
