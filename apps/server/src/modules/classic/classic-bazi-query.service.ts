import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { safePagination } from "../../common/pagination";

export interface BookGroup {
  bookId: string;
  bookTitle: string;
  author: string | null;
  dynasty: string | null;
  chapters: Array<{
    id: string;
    title: string;
    content: string;
    translation: string | null;
    tags: string[];
    matchScore: number;
  }>;
}

@Injectable()
export class BaziClassicQueryService {
  private readonly CACHE_TTL = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 根据八字概念标签查询相关古籍章节
   * 核心联动接口：八字排盘结果 → 古籍交叉引用
   */
  async queryByTags(params: {
    tags: string[];
    dayMaster?: string;
    monthBranch?: string;
    keyword?: string;
    maxPerBook?: number;
  }): Promise<BookGroup[]> {
    const { tags, dayMaster, monthBranch, keyword, maxPerBook = 5 } = params;

    const cacheKey = `bazi:classic:${JSON.stringify({ tags, dayMaster, monthBranch, keyword })}`;
    const cached = await this.redis.getJson<BookGroup[]>(cacheKey);
    if (cached) return cached;

    const allTags = [...tags];
    if (dayMaster) {
      const tianganMap: Record<string, string> = {
        甲: "甲木", 乙: "乙木", 丙: "丙火", 丁: "丁火",
        戊: "戊土", 己: "己土", 庚: "庚金", 辛: "辛金",
        壬: "壬水", 癸: "癸水",
      };
      if (tianganMap[dayMaster]) allTags.push(tianganMap[dayMaster]);
    }
    if (monthBranch) {
      allTags.push("月令");
    }

    const baziBooks = await this.prisma.classicBook.findMany({
      where: { category: "命", status: "PUBLISHED" },
      select: { id: true, title: true, author: true, dynasty: true },
    });

    if (baziBooks.length === 0) return [];

    const bookIds = baziBooks.map((b) => b.id);
    const bookMap = new Map(baziBooks.map((b) => [b.id, b]));

    const tagConditions = allTags.map((tag) => ({
      tags: { array_contains: [tag] },
    }));

    let contentCondition: object | undefined;
    if (keyword) {
      contentCondition = {
        OR: [
          { content: { contains: keyword } },
          { title: { contains: keyword } },
        ],
      };
    }

    const where: any = {
      bookId: { in: bookIds },
      OR: [
        ...(tagConditions.length > 0 ? tagConditions : []),
        ...(contentCondition ? [contentCondition] : []),
      ],
    };

    if (where.OR.length === 0) return [];

    const chapters = await this.prisma.classicChapter.findMany({
      where,
      select: {
        id: true,
        bookId: true,
        title: true,
        content: true,
        translation: true,
        tags: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    const grouped = new Map<string, BookGroup>();

    for (const ch of chapters) {
      const chTags = (Array.isArray(ch.tags) ? ch.tags : []) as string[];
      let matchScore = 0;
      for (const tag of allTags) {
        if (chTags.some((t) => t === tag || t.includes(tag))) matchScore++;
      }
      if (keyword) {
        if (ch.content.includes(keyword)) matchScore += 2;
        if (ch.title.includes(keyword)) matchScore += 1;
      }

      if (!grouped.has(ch.bookId)) {
        const book = bookMap.get(ch.bookId)!;
        grouped.set(ch.bookId, {
          bookId: book.id,
          bookTitle: book.title,
          author: book.author,
          dynasty: book.dynasty,
          chapters: [],
        });
      }

      grouped.get(ch.bookId)!.chapters.push({
        id: ch.id,
        title: ch.title,
        content: ch.content,
        translation: ch.translation,
        tags: chTags,
        matchScore,
      });
    }

    const result: BookGroup[] = [];
    for (const group of grouped.values()) {
      group.chapters.sort((a, b) => b.matchScore - a.matchScore);
      group.chapters = group.chapters.slice(0, maxPerBook);
      result.push(group);
    }

    result.sort((a, b) => {
      const aMax = Math.max(...a.chapters.map((c) => c.matchScore), 0);
      const bMax = Math.max(...b.chapters.map((c) => c.matchScore), 0);
      return bMax - aMax;
    });

    await this.redis.setJson(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * 全文搜索命理古籍
   */
  async searchBaziClassics(keyword: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = {
      book: { category: "命", status: "PUBLISHED" },
      OR: [
        { content: { contains: keyword } },
        { title: { contains: keyword } },
        { translation: { contains: keyword } },
      ],
    };

    const [chapters, total] = await Promise.all([
      this.prisma.classicChapter.findMany({
        where,
        select: {
          id: true,
          title: true,
          content: true,
          translation: true,
          tags: true,
          book: { select: { id: true, title: true, author: true, dynasty: true } },
        },
        orderBy: { sortOrder: "asc" },
        skip,
        take: pageSize,
      }),
      this.prisma.classicChapter.count({ where }),
    ]);

    return { chapters, total, page, pageSize };
  }

  /**
   * 获取所有命理古籍列表（简要信息）
   */
  async listBaziBooks() {
    return this.prisma.classicBook.findMany({
      where: { category: "命", status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        author: true,
        dynasty: true,
        intro: true,
        cover: true,
        chapterCount: true,
        source: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * 获取可用的八字标签列表（用于前端筛选器）
   */
  async listAvailableTags(): Promise<string[]> {
    const cacheKey = "bazi:classic:all-tags";
    const cached = await this.redis.getJson<string[]>(cacheKey);
    if (cached) return cached;

    const chapters = await this.prisma.classicChapter.findMany({
      where: { book: { category: "命" } },
      select: { tags: true },
    });

    const tagSet = new Set<string>();
    for (const ch of chapters) {
      const tags = Array.isArray(ch.tags) ? ch.tags : [];
      for (const tag of tags) {
        if (typeof tag === "string") tagSet.add(tag);
      }
    }

    const result = Array.from(tagSet).sort();
    await this.redis.setJson(cacheKey, result, 3600);
    return result;
  }
}
