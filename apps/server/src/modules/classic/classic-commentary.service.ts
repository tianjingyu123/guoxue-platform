import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { VectorService } from "../ai-gateway/vector.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/**
 * 经典学术解释库服务（RAG 第2层）
 *
 * 管理名家注解、白话翻译、现代解读的结构化存储与向量化索引。
 * 注解可关联到具体章节或整部经典，类型涵盖注释/翻译/解读/论文/讲义。
 */
@Injectable()
export class ClassicCommentaryService {
  private readonly logger = new Logger(ClassicCommentaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vector: VectorService,
  ) {}

  /** 获取某部经典的注解列表（分页） */
  async listByBook(bookId: string, query?: { type?: string; school?: string }, page = 1, pageSize = 50) {
    const where: any = { bookId, status: "PUBLISHED" };
    if (query?.type) where.type = query.type;
    if (query?.school) where.school = query.school;

    const [items, total] = await Promise.all([
      this.prisma.classicCommentary.findMany({
        where,
        select: {
          id: true, title: true, author: true, dynasty: true,
          school: true, type: true, chapterId: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.classicCommentary.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 获取单条注解详情 */
  async getById(id: string) {
    return this.prisma.classicCommentary.findUnique({
      where: { id },
      include: {
        book: { select: { id: true, title: true } },
        chapter: { select: { id: true, title: true } },
      },
    });
  }

  /** 获取某章节的注解 */
  async listByChapter(chapterId: string) {
    return this.prisma.classicCommentary.findMany({
      where: { chapterId, status: "PUBLISHED" },
      select: {
        id: true, title: true, author: true, type: true,
        content: true, school: true, dynasty: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /** 创建注解 */
  async create(dto: {
    bookId: string;
    chapterId?: string;
    title: string;
    author?: string;
    dynasty?: string;
    school?: string;
    type?: string;
    content: string;
    sourceUrl?: string;
  }) {
    const commentary = await this.prisma.classicCommentary.create({
      data: {
        ...dto,
        contentHash: this.hashContent(dto.content),
      },
    });

    // 异步同步到知识库
    this.syncToKnowledge(commentary.id).catch((err) =>
      this.logger.warn(`注解 ${commentary.id} 同步知识库失败: ${err.message}`),
    );

    return commentary;
  }

  /** 更新注解 */
  async update(id: string, dto: {
    title?: string;
    content?: string;
    type?: string;
    school?: string;
    status?: string;
  }) {
    const data: any = { ...dto };
    if (dto.content) data.contentHash = this.hashContent(dto.content);

    return this.prisma.classicCommentary.update({ where: { id }, data });
  }

  /** 删除注解 */
  async delete(id: string) {
    const existing = await this.prisma.classicCommentary.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "注解不存在");
    return this.prisma.classicCommentary.delete({ where: { id } });
  }

  /** 搜索注解（全文+元数据，分页） */
  async search(query: { keyword?: string; school?: string; type?: string; bookId?: string }, page = 1, pageSize = 20) {
    const where: any = { status: "PUBLISHED" };
    if (query.school) where.school = query.school;
    if (query.type) where.type = query.type;
    if (query.bookId) where.bookId = query.bookId;
    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword } },
        { content: { contains: query.keyword } },
        { author: { contains: query.keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.classicCommentary.findMany({
        where,
        select: {
          id: true, title: true, author: true, type: true,
          content: true, school: true, bookId: true,
          book: { select: { title: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.classicCommentary.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 统计概览 */
  async stats() {
    const [total, byType, bySchool] = await Promise.all([
      this.prisma.classicCommentary.count({ where: { status: "PUBLISHED" } }),
      this.prisma.classicCommentary.groupBy({
        by: ["type"],
        _count: true,
        where: { status: "PUBLISHED" },
      }),
      this.prisma.classicCommentary.groupBy({
        by: ["school"],
        _count: true,
        where: { status: "PUBLISHED" },
      }),
    ]);

    return {
      total,
      byType: byType.map((t) => ({ type: t.type, count: t._count })),
      bySchool: bySchool.map((s) => ({ school: s.school, count: s._count })),
    };
  }

  /** 同步注解到 circle_knowledge（供 RAG 检索） */
  async syncToKnowledge(commentaryId: string): Promise<void> {
    const commentary = await this.prisma.classicCommentary.findUnique({
      where: { id: commentaryId },
      include: { book: { select: { title: true } } },
    });
    if (!commentary) return;

    const sourceType = "classic_commentary";
    const content = `【${commentary.type}】《${commentary.book.title}》${commentary.title} — ${commentary.author || "佚名"}: ${commentary.content}`;

    const existing = await this.prisma.circleKnowledge.findFirst({
      where: {
        circleId: "classic",
        sourceType,
        contentHash: commentary.contentHash || this.hashContent(content),
      },
    });
    if (existing) return;

    try {
      await this.prisma.circleKnowledge.create({
        data: {
          circleId: "classic",
          sourceType,
          sourceId: commentaryId,
          content,
          contentHash: commentary.contentHash || this.hashContent(content),
          addedBy: "SYSTEM",
        },
      });
    } catch (err) {
      // contentHash 冲突，忽略
      this.logger.warn(`注解同步到知识库失败`, err);
    }
  }

  /** 批量向量化未索引的注解 */
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
