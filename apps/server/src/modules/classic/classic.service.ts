import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { Prisma } from "@prisma/client";
import { CreateAnnotationDto } from "./classic.dto";
import { JwtService } from "@nestjs/jwt";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";

@Injectable()
export class ClassicService {
  private readonly logger = new Logger(ClassicService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
    private gateway: AiGatewayService,
  ) {}

  /** 书籍列表缓存 TTL（秒） */
  private readonly BOOK_LIST_TTL = 600;
  /** 章节内容缓存 TTL（秒） */
  private readonly CHAPTER_CACHE_TTL = 3600;

  // ── 书籍 CRUD ──
  async listBooks(query: { category?: string; keyword?: string; page?: number; pageSize?: number; sortBy?: string }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const cat = (query.category && query.category !== "all") ? query.category : null;
    const kw = query.keyword || "";
    const sortBy = query.sortBy || "createdAt";
    const cacheKey = `classic:books:${cat || "all"}:${kw}:${sortBy}:${page}:${pageSize}`;

    if (!query.keyword) {
      const cached = await this.redis.getJson<any>(cacheKey);
      if (cached) return cached;
    }

    const where: Prisma.ClassicBookWhereInput = { status: "PUBLISHED" };
    if (cat) where.category = cat;
    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword } },
        { author: { contains: query.keyword } },
        { intro: { contains: query.keyword } },
      ];
    }

    const orderByMap: Record<string, Prisma.ClassicBookOrderByWithRelationInput> = {
      createdAt: { createdAt: "desc" },
      viewCount: { viewCount: "desc" },
      title: { title: "asc" },
    };

    const [books, total] = await Promise.all([
      this.prisma.classicBook.findMany({
        where,
        select: {
          id: true, title: true, author: true, dynasty: true,
          category: true, cover: true, intro: true, chapterCount: true,
          viewCount: true, createdAt: true,
        },
        orderBy: orderByMap[sortBy] || orderByMap.createdAt,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.classicBook.count({ where }),
    ]);
    const result = { books, total, page, pageSize };
    if (!query.keyword) {
      await this.redis.setJson(cacheKey, result, this.BOOK_LIST_TTL);
    }
    return result;
  }

  async getBook(id: string) {
    const book = await this.prisma.classicBook.findUnique({
      where: { id },
      include: { chapters: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, sortOrder: true } } },
    });
    if (!book) throw new BusinessException(ErrorCode.NOT_FOUND, "书籍不存在");
    // 浏览计数延迟更新，不阻塞响应
    this.prisma.classicBook.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch((err) => this.logger.warn("古籍浏览计数更新失败", err));
    return book;
  }

  async createBook(dto: Prisma.ClassicBookCreateInput) {
    const book = await this.prisma.classicBook.create({ data: dto });
    await this.redis.delByPattern("classic:books:*");
    return book;
  }

  async updateBook(id: string, dto: Prisma.ClassicBookUpdateInput) {
    const existing = await this.prisma.classicBook.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "古籍不存在");
    const book = await this.prisma.classicBook.update({ where: { id }, data: dto });
    await this.redis.delByPattern("classic:books:*");
    return book;
  }

  async deleteBook(id: string) {
    const existing = await this.prisma.classicBook.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "古籍不存在");
    const book = await this.prisma.classicBook.delete({ where: { id } });
    await this.redis.delByPattern("classic:books:*");
    return book;
  }

  // ── 章节 CRUD ──
  async getChapter(id: string) {
    const cacheKey = `classic:chapter:${id}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const chapter = await this.prisma.classicChapter.findUnique({
      where: { id },
      include: { book: { select: { id: true, title: true } } },
    });
    if (!chapter) throw new BusinessException(ErrorCode.NOT_FOUND, "章节不存在");

    await this.redis.setJson(cacheKey, chapter, this.CHAPTER_CACHE_TTL);
    return chapter;
  }

  /** 按字符范围获取章节内容片段（用于长文本分段加载） */
  async getChapterContentSlice(id: string, start = 0, end = 2000) {
    const chapter = await this.getChapter(id);
    const content = chapter.content || "";
    const actualEnd = Math.min(end, content.length);
    return {
      chapterId: id,
      title: chapter.title,
      content: content.slice(start, actualEnd),
      start,
      end: actualEnd,
      totalLength: content.length,
      hasMore: actualEnd < content.length,
    };
  }

  async listChaptersByBook(bookId: string) {
    return this.prisma.classicChapter.findMany({
      where: { bookId },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createChapter(bookId: string, dto: Omit<Prisma.ClassicChapterCreateInput, "book">) {
    const ch = await this.prisma.classicChapter.create({
      data: { ...dto, bookId } as unknown as Prisma.ClassicChapterCreateInput,
    });
    await this.prisma.classicBook.update({
      where: { id: bookId },
      data: { chapterCount: { increment: 1 } },
    });
    return ch;
  }

  async updateChapter(id: string, dto: Prisma.ClassicChapterUpdateInput) {
    const existing = await this.prisma.classicChapter.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "章节不存在");
    return this.prisma.classicChapter.update({ where: { id }, data: dto });
  }

  async deleteChapter(id: string) {
    const ch = await this.prisma.classicChapter.findUnique({ where: { id } });
    if (!ch) throw new BusinessException(ErrorCode.NOT_FOUND, "章节不存在");
    const [deleted] = await this.prisma.$transaction([
      this.prisma.classicChapter.delete({ where: { id } }),
      this.prisma.classicBook.update({
        where: { id: ch.bookId },
        data: { chapterCount: { increment: -1 } },
      }),
    ]);
    // 清除章节缓存
    await this.redis.del(`classic:chapter:${id}`);
    return deleted;
  }

  // ── 阅读进度 ──
  async getMyProgresses(userId: string) {
    const records = await this.prisma.readingProgress.findMany({
      where: { userId, progress: { gt: 0 } },
      select: { bookId: true, chapterId: true, progress: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    return { progresses: records };
  }

  async getProgress(userId: string, bookId: string) {
    return this.prisma.readingProgress.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });
  }

  async updateProgress(userId: string, bookId: string, dto: { chapterId: string; progress: number }) {
    return this.prisma.readingProgress.upsert({
      where: { userId_bookId: { userId, bookId } },
      create: { userId, bookId, chapterId: dto.chapterId, progress: dto.progress },
      update: { chapterId: dto.chapterId, progress: dto.progress },
    });
  }

  /** 移出书架：删除该用户某书的阅读进度（幂等） */
  async deleteProgress(userId: string, bookId: string) {
    await this.prisma.readingProgress.deleteMany({ where: { userId, bookId } });
    return { success: true };
  }

  // ── 书签 ──
  async listBookmarks(userId: string, bookId?: string, page = 1, pageSize = 20) {
    const where: Prisma.BookmarkWhereInput = { userId };
    if (bookId) where.bookId = bookId;
    const [items, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where,
        include: {
          book: { select: { title: true, cover: true } },
          chapter: { select: { title: true, sortOrder: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bookmark.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async createBookmark(userId: string, bookId: string, dto: { chapterId: string; position: number; note?: string }) {
    return this.prisma.bookmark.create({
      data: { userId, bookId, chapterId: dto.chapterId, position: dto.position, note: dto.note },
    });
  }

  async updateBookmark(id: string, userId: string, dto: { position?: number; note?: string }) {
    const existing = await this.prisma.bookmark.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "书签不存在");
    if (existing.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权修改此书签");
    return this.prisma.bookmark.update({ where: { id }, data: dto });
  }

  async deleteBookmark(id: string, userId?: string) {
    const where: Prisma.BookmarkWhereInput = { id };
    if (userId) where.userId = userId;
    const existing = await this.prisma.bookmark.findFirst({ where });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "书签不存在");
    return this.prisma.bookmark.delete({ where: { id } });
  }

  // ── 收藏 ──
  async listFavorites(userId: string) {
    const favs = await this.prisma.classicFavorite.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    const ids = favs.map((f) => f.bookId);
    if (!ids.length) return { items: [] };
    const books = await this.prisma.classicBook.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, author: true, dynasty: true, category: true, viewCount: true },
    });
    const items = favs
      .map((f) => {
        const b = books.find((x) => x.id === f.bookId);
        return b
          ? { id: b.id, title: b.title, author: b.author, dynasty: b.dynasty, category: b.category, plays: b.viewCount, addedAt: f.createdAt }
          : null;
      })
      .filter(Boolean);
    return { items };
  }

  async addFavorite(userId: string, bookId: string) {
    const book = await this.prisma.classicBook.findUnique({ where: { id: bookId }, select: { id: true } });
    if (!book) throw new BusinessException(ErrorCode.NOT_FOUND, "书籍不存在");
    return this.prisma.classicFavorite.upsert({
      where: { userId_bookId: { userId, bookId } },
      create: { userId, bookId },
      update: {},
    });
  }

  async removeFavorite(userId: string, bookId: string) {
    await this.prisma.classicFavorite.deleteMany({ where: { userId, bookId } });
    return { success: true };
  }

  async isFavorited(userId: string, bookId: string) {
    const f = await this.prisma.classicFavorite.findUnique({ where: { userId_bookId: { userId, bookId } } });
    return { favorited: !!f };
  }

  // ── 下载 ──
  async generateDownloadUrl(bookId: string, userId: string) {
    const book = await this.prisma.classicBook.findUnique({ where: { id: bookId } });
    if (!book) throw new BusinessException(ErrorCode.NOT_FOUND, "书籍不存在");

    const token = this.jwt.sign({ bookId, userId, type: "classic_download" }, { expiresIn: "7d" });
    return { downloadUrl: `/api/v1/classic/books/${bookId}/file?token=${token}`, expiresIn: "7天" };
  }

  async verifyAndGetDownloadContent(bookId: string, token: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new BusinessException(ErrorCode.FORBIDDEN, "下载链接已过期或无效");
    }
    if (payload.bookId !== bookId || payload.type !== "classic_download") {
      throw new BusinessException(ErrorCode.FORBIDDEN, "下载token不匹配");
    }
    const book = await this.prisma.classicBook.findUnique({
      where: { id: bookId },
      include: { chapters: { orderBy: { sortOrder: "asc" }, select: { title: true, content: true } } },
    });
    if (!book) throw new BusinessException(ErrorCode.NOT_FOUND, "书籍不存在");
    const content = book.chapters.map((ch) => `【${ch.title}】\n\n${ch.content || ""}`).join("\n\n");
    return { title: book.title, content };
  }

  async getDownloads(userId: string, page = 1, pageSize = 20) {
    return { items: [], total: 0, page, pageSize };
  }

  // ── 字典查询（AI） ──
  async dictionaryLookup(word: string) {
    const prompt = `你是一位资深的古汉语字典专家。请为用户提供的字/词提供详细的解释。
必须使用以下JSON格式返回（不要包含其他文字，不要用markdown代码块包裹）：
{
  "word": "字/词",
  "pinyin": "拼音",
  "radicals": "部首",
  "meanings": ["释义1", "释义2"],
  "classicalUsages": ["古籍用例1——出处", "古籍用例2——出处"],
  "commonPhrases": ["常见词组1", "常见词组2"],
  "explanation": "详细白话解释"
}`;

    const result = await this.gateway.chat({
      scene: "classic_dictionary",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: word },
      ],
      options: { temperature: 0.2, maxTokens: 1024 },
    });

    try {
      const parsed = JSON.parse(result.content);
      return parsed;
    } catch (err) {
      this.logger.warn(`字典查询JSON解析失败: ${word}`, err);
      return {
        word,
        pinyin: "",
        radicals: "",
        meanings: [],
        classicalUsages: [],
        commonPhrases: [],
        explanation: result.content?.slice(0, 500) || "暂无解释",
      };
    }
  }

  // ── 白话翻译（AI） ──
  async translateClassical(dto: { text: string; context?: string }) {
    const contextHint = dto.context ? `\n上下文提示：这段话出自「${dto.context}」。请根据上下文做出准确翻译。` : "";

    const prompt = `你是一位资深的古籍白话翻译专家。请将用户提供的文言文段落翻译成准确、流畅的现代白话文。
保留原文的修辞风格和文化内涵，对关键词语给出注释。${contextHint}
必须使用以下JSON格式返回（不要包含其他文字，不要用markdown代码块包裹）：
{
  "original": "原文",
  "translation": "现代白话文翻译",
  "notes": ["关键词语的注释1", "关键词语的注释2"],
  "source": "推测的出处（不确定则填空字符串）"
}`;

    const result = await this.gateway.chat({
      scene: "classic_translate",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: dto.text },
      ],
      options: { temperature: 0.3, maxTokens: 1536 },
    });

    try {
      return JSON.parse(result.content);
    } catch (err) {
      this.logger.warn("翻译JSON解析失败", err);
      return {
        original: dto.text,
        translation: result.content?.slice(0, 2000) || "翻译暂不可用",
        notes: [],
        source: "",
      };
    }
  }

  // ── 古籍AI问答（自由对话） ──
  async askClassic(question: string) {
    const prompt = `你是一位博学儒雅的国学与古籍专家，贯通经史子集、释道医卜。
请用通俗易懂的白话，准确且有据地回答用户关于古籍、传统文化的问题。要求：
1. 引用相关古籍原文或观点时，注明出处书名（如《论语·学而》）；
2. 深入浅出、生动有趣，让古籍学习不再枯燥难懂，必要时举例或打比方；
3. 若问题超出古籍与传统文化范畴，礼貌地引导回国学话题；
4. 回答条理清晰，控制在 500 字以内。`;
    const result = await this.gateway.chat({
      scene: "classic_qa",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: question },
      ],
      options: { temperature: 0.6, maxTokens: 1200 },
    });
    return { answer: result.content?.trim() || "抱歉，我暂时无法回答这个问题，请换个方式提问。" };
  }

  // ── 继续阅读 ──
  async getContinueReading(userId: string, limit = 10) {
    const records = await this.prisma.readingProgress.findMany({
      where: { userId, progress: { gt: 0 } },
      include: {
        book: { select: { id: true, title: true, author: true, cover: true, category: true } },
        chapter: { select: { id: true, title: true, sortOrder: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: Math.min(limit, 50),
    });

    return {
      items: records.map((r) => ({
        book: r.book,
        chapter: r.chapter,
        progress: r.progress,
        updatedAt: r.updatedAt.toISOString(),
      })),
      total: records.length,
    };
  }

  // ── 阅读统计 ──
  async getReadingStats(userId: string) {
    const totalBooksRead = await this.prisma.readingProgress.count({
      where: { userId, progress: { gt: 0 } },
    });

    const totalChaptersRead = await this.prisma.readingProgress.count({
      where: { userId },
    });

    const totalReadingTime = totalChaptersRead * 3; // 每章估算3分钟

    const progressRecords = await this.prisma.readingProgress.findMany({
      where: { userId },
      select: { updatedAt: true, bookId: true },
      orderBy: { updatedAt: "desc" },
    });

    const readingStreak = this.calculateStreak(progressRecords);

    // 最爱分类 — 单查询 groupBy 替代 N+1
    const bookIds = [...new Set(progressRecords.map((r) => r.bookId))];
    const categoryCounts = bookIds.length > 0
      ? await this.prisma.classicBook.groupBy({
          by: ["category"],
          where: { id: { in: bookIds } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 5,
        })
      : [];
    const mostReadCategories = categoryCounts.map((g) => ({
      category: g.category,
      count: g._count.id,
    }));

    // 近7天活动
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activityMap = new Map<string, number>();
    for (const r of progressRecords) {
      if (r.updatedAt >= sevenDaysAgo) {
        const d = r.updatedAt.toISOString().slice(0, 10);
        activityMap.set(d, (activityMap.get(d) || 0) + 1);
      }
    }
    const recentActivity: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      recentActivity.push({ date: key, count: activityMap.get(key) || 0 });
    }

    return {
      totalBooksRead,
      totalChaptersRead,
      totalReadingTime,
      readingStreak,
      mostReadCategories,
      recentActivity,
    };
  }

  // ── 读书笔记 ──
  async listMyNotes(userId: string, bookId?: string, chapterId?: string, page = 1, pageSize = 20) {
    const where: Prisma.ClassicReadingNoteWhereInput = { userId };
    if (bookId) where.bookId = bookId;
    if (chapterId) where.chapterId = chapterId;
    const [items, total] = await Promise.all([
      this.prisma.classicReadingNote.findMany({
        where,
        include: {
          book: { select: { id: true, title: true } },
          chapter: { select: { id: true, title: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.classicReadingNote.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async createNote(userId: string, bookId: string, dto: { chapterId: string; content: string }) {
    return this.prisma.classicReadingNote.create({
      data: { userId, bookId, chapterId: dto.chapterId, content: dto.content },
    });
  }

  async updateNote(id: string, userId: string, content: string) {
    const note = await this.prisma.classicReadingNote.findUnique({ where: { id } });
    if (!note) throw new BusinessException(ErrorCode.NOT_FOUND, "笔记不存在");
    if (note.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权修改此笔记");
    return this.prisma.classicReadingNote.update({ where: { id }, data: { content } });
  }

  async deleteNote(id: string, userId: string) {
    const note = await this.prisma.classicReadingNote.findUnique({ where: { id } });
    if (!note) throw new BusinessException(ErrorCode.NOT_FOUND, "笔记不存在");
    if (note.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权删除此笔记");
    return this.prisma.classicReadingNote.delete({ where: { id } });
  }

  // ── 注疏标记 ──
  async listAnnotations(bookId: string, chapterId?: string, page = 1, pageSize = 20) {
    const where: Prisma.ClassicAnnotationWhereInput = { bookId };
    if (chapterId) where.chapterId = chapterId;
    const [items, total] = await Promise.all([
      this.prisma.classicAnnotation.findMany({
        where,
        orderBy: { startPos: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.classicAnnotation.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async createAnnotation(bookId: string, dto: Omit<CreateAnnotationDto, "bookId">) {
    return this.prisma.classicAnnotation.create({
      data: { bookId, ...dto },
    });
  }

  async deleteAnnotation(id: string) {
    const existing = await this.prisma.classicAnnotation.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "注疏不存在");
    return this.prisma.classicAnnotation.delete({ where: { id } });
  }

  // ── 版本管理 ──
  async getBookVersions(bookId: string) {
    const book = await this.prisma.classicBook.findUnique({
      where: { id: bookId },
      select: { title: true, author: true, dynasty: true },
    });
    if (!book) throw new BusinessException(ErrorCode.NOT_FOUND, "书籍不存在");

    const versions = await this.prisma.classicBook.findMany({
      where: {
        title: { startsWith: book.title.slice(0, 2) },
        id: { not: bookId },
      },
      select: {
        id: true, title: true, author: true, dynasty: true, category: true, cover: true, source: true,
      },
      take: 20,
    });
    return { current: book, versions };
  }

  // ── 引用生成 ──
  async generateCitation(bookId: string, style = "gbt7714", chapterId?: string, startPos?: number, endPos?: number) {
    const book = await this.prisma.classicBook.findUnique({
      where: { id: bookId },
      select: { id: true, title: true, author: true, dynasty: true, source: true },
    });
    if (!book) throw new BusinessException(ErrorCode.NOT_FOUND, "书籍不存在");

    let chapter: { title: string; sortOrder: number } | null = null;
    if (chapterId) {
      chapter = await this.prisma.classicChapter.findUnique({
        where: { id: chapterId },
        select: { title: true, sortOrder: true },
      });
    }

    const excerpt = chapterId && startPos !== undefined && endPos !== undefined
      ? await this.prisma.classicChapter.findUnique({
          where: { id: chapterId },
          select: { content: true },
        }).then((ch) => ch?.content.slice(startPos, endPos) || "")
      : "";

    const citations: Record<string, string> = {};

    // GB/T 7714-2015 古籍格式
    citations.gbt7714 = [
      book.author ? `${book.author}（${book.dynasty || "?"}）` : "",
      `《${book.title}》`,
      chapter ? `卷${chapter.sortOrder}·${chapter.title}` : "",
      excerpt ? `"${excerpt.slice(0, 50)}${excerpt.length > 50 ? "..." : ""}"` : "",
      book.source ? `刻本：${book.source}` : "",
      "国学传统文化平台",
      new Date().getFullYear().toString(),
    ].filter(Boolean).join("，") + ".";

    // Chicago 格式
    citations.chicago = [
      book.author ? `${book.author}（${book.dynasty || "?"}）.` : "",
      `*${book.title}*`,
      chapter ? `卷${chapter.sortOrder}（${chapter.title}）` : "",
      book.source ? `${book.source}` : "",
      "国学传统文化平台",
      `${new Date().getFullYear()}.`,
    ].filter(Boolean).join(" ");

    // MLA 格式
    citations.mla = [
      book.author ? `${book.author}.` : "",
      `*${book.title}*.`,
      book.dynasty ? `${book.dynasty}.` : "",
      `Guoxue Platform, ${new Date().getFullYear()}.`,
    ].filter(Boolean).join(" ");

    // APA 格式
    citations.apa = [
      book.author ? `${book.author} (${book.dynasty || "n.d."}).` : `佚名 (${book.dynasty || "n.d."}).`,
      `*${book.title}*.`,
      `国学传统文化平台.`,
      `Retrieved ${new Date().toISOString().slice(0, 10)}, from https://guoxue.cn/classic/books/${bookId}`,
    ].filter(Boolean).join(" ");

    return {
      book: { id: book.id, title: book.title, author: book.author, dynasty: book.dynasty },
      chapter: chapter ? { title: chapter.title, sortOrder: chapter.sortOrder } : null,
      excerpt,
      citations: style === "all"
        ? citations
        : { [style]: citations[style] || citations.gbt7714 },
    };
  }

  /** 管理端：整体统计面板 */
  async getAdminStats() {
    const [bookCount, chapterCount, imageCount, ocrTextCount, commentaryCount, annotationCount] = await Promise.all([
      this.prisma.classicBook.count({ where: { status: "PUBLISHED" } }),
      this.prisma.classicChapter.count(),
      this.prisma.classicImage.count(),
      this.prisma.classicOcrText.count(),
      this.prisma.classicCommentary.count({ where: { status: "PUBLISHED" } }),
      this.prisma.classicAnnotation.count(),
    ]);

    const byCategory = await this.prisma.classicBook.groupBy({
      by: ["category"],
      where: { status: "PUBLISHED" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const byDynasty = await this.prisma.classicBook.groupBy({
      by: ["dynasty"],
      where: { status: "PUBLISHED", dynasty: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    return {
      totals: { books: bookCount, chapters: chapterCount, images: imageCount, ocrTexts: ocrTextCount, commentaries: commentaryCount, annotations: annotationCount },
      byCategory: byCategory.map((g) => ({ category: g.category, count: g._count.id })),
      byDynasty: byDynasty.map((g) => ({ dynasty: g.dynasty, count: g._count.id })),
    };
  }

  /** 管理端：清除经典模块缓存 */
  async clearCache() {
    await this.redis.delByPattern("classic:books:*");
    await this.redis.delByPattern("classic:chapter:*");
    return { cleared: true };
  }

  /** 管理端：切换书籍发布状态 */
  async setBookStatus(id: string, status: string) {
    const existing = await this.prisma.classicBook.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "书籍不存在");
    const book = await this.prisma.classicBook.update({ where: { id }, data: { status } });
    await this.redis.delByPattern("classic:books:*");
    return book;
  }

  // ═══════════════════════════════════════════
  // 管理端方法
  // ═══════════════════════════════════════════

  /** 管理端-所有读书笔记 */
  async getAllNotes(params: { bookId?: string; page?: number; pageSize?: number }) {
    const { bookId, page = 1, pageSize = 20 } = params;
    const where: Prisma.ClassicReadingNoteWhereInput = {};
    if (bookId) where.bookId = bookId;
    const [items, total] = await Promise.all([
      this.prisma.classicReadingNote.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true } },
          book: { select: { id: true, title: true } },
          chapter: { select: { id: true, title: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.classicReadingNote.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 管理端-所有书签 */
  async getAllBookmarks(params: { bookId?: string; page?: number; pageSize?: number }) {
    const { bookId, page = 1, pageSize = 20 } = params;
    const where: Prisma.BookmarkWhereInput = {};
    if (bookId) where.bookId = bookId;
    const [items, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true } },
          book: { select: { id: true, title: true } },
          chapter: { select: { id: true, title: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.bookmark.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 管理端-平台阅读统计概览 */
  async getPlatformReadingStats() {
    const [totalBooks, totalChapters, totalProgresses, userResult] = await Promise.all([
      this.prisma.classicBook.count({ where: { status: "PUBLISHED" } }),
      this.prisma.classicChapter.count(),
      this.prisma.readingProgress.count({ where: { progress: { gt: 0 } } }),
      this.prisma.readingProgress.groupBy({ by: ["userId"], where: { progress: { gt: 0 } } }),
    ]);
    return { totalBooks, totalChapters, totalUsers: userResult.length, totalProgresses };
  }

  /** 管理端-删除任意笔记 */
  async adminDeleteNote(id: string) {
    const note = await this.prisma.classicReadingNote.findUnique({ where: { id } });
    if (!note) throw new BusinessException(ErrorCode.NOT_FOUND, "笔记不存在");
    await this.prisma.classicReadingNote.delete({ where: { id } });
    return { success: true };
  }

  private calculateStreak(records: Array<{ updatedAt: Date }>): number {
    if (records.length === 0) return 0;

    const dates = [...new Set(records.map((r) => {
      const d = new Date(r.updatedAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }))].sort().reverse();

    if (dates.length === 0) return 0;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    if (dates[0] !== todayStr && dates[0] !== yesterdayStr) return 0;

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diffDays = Math.abs((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 2) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }
}
