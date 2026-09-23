import { Injectable, Logger } from "@nestjs/common";
import { safePagination } from "../../common/pagination";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { Prisma } from "@prisma/client";
import { CreateAnnotationDto } from "./classic.dto";
import { JwtService } from "@nestjs/jwt";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { withUserAnswerExperience } from "../dialogue/answer-experience";
import { TextDerivedAssetService, TextAssetRequest } from "./text-derived-asset.service";
import { createHash } from "node:crypto";
import {
  PUBLIC_CLASSIC_BOOK_WHERE,
  PUBLIC_CLASSIC_COPYRIGHT_WHERE,
} from "./classic-publication-policy";

/** 古籍问答模型无产出时的兜底文案（不计 AI 次数） */
export const CLASSIC_QA_EMPTY_ANSWER = "抱歉，我暂时无法回答这个问题，请换个方式提问。";

@Injectable()
export class ClassicService {
  private readonly logger = new Logger(ClassicService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
    private gateway: AiGatewayService,
    private textAssetService: TextDerivedAssetService,
  ) {}

  /** 书籍列表缓存 TTL（秒） */
  private readonly BOOK_LIST_TTL = 600;
  /** 章节内容缓存 TTL（秒） */
  private readonly CHAPTER_CACHE_TTL = 3600;

  // ── 书籍 CRUD ──
  async listBooks(query: { category?: string; keyword?: string; page?: number; pageSize?: number; sortBy?: string }) {
    const { page, pageSize, skip } = safePagination(query.page, query.pageSize);
    const cat = (query.category && query.category !== "all") ? query.category : null;
    const kw = query.keyword || "";
    const sortBy = query.sortBy || "createdAt";
    const cacheKey = `classic:v2:books:${cat || "all"}:${kw}:${sortBy}:${page}:${pageSize}`;

    if (!query.keyword) {
      const cached = await this.redis.getJson<any>(cacheKey);
      if (cached) return cached;
    }

    const where: Prisma.ClassicBookWhereInput = { ...PUBLIC_CLASSIC_BOOK_WHERE };
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
        skip,
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
    const book = await this.prisma.classicBook.findFirst({
      where: { id, ...PUBLIC_CLASSIC_BOOK_WHERE },
      include: {
        chapters: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          select: { id: true, title: true, sortOrder: true },
        },
        copyrights: {
          where: PUBLIC_CLASSIC_COPYRIGHT_WHERE,
          orderBy: { auditedAt: "desc" },
          select: {
            sourceName: true,
            sourceUrl: true,
            license: true,
            licenseUrl: true,
            auditNote: true,
            auditedAt: true,
          },
        },
      },
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
    const cacheKey = `classic:v2:chapter:${id}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const chapter = await this.prisma.classicChapter.findFirst({
      where: { id, deletedAt: null, book: PUBLIC_CLASSIC_BOOK_WHERE },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            copyrights: {
              where: PUBLIC_CLASSIC_COPYRIGHT_WHERE,
              orderBy: { auditedAt: "desc" },
              select: { sourceName: true, sourceUrl: true, license: true, licenseUrl: true },
            },
          },
        },
      },
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
      where: { bookId, deletedAt: null, book: PUBLIC_CLASSIC_BOOK_WHERE },
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
  async listBookmarks(userId: string, bookId?: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.BookmarkWhereInput = { userId };
    if (bookId) where.bookId = bookId;
    const [items, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where,
        include: {
          book: { select: { title: true, cover: true, author: true, dynasty: true } },
          chapter: { select: { title: true, sortOrder: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
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
      where: { id: { in: ids }, ...PUBLIC_CLASSIC_BOOK_WHERE },
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
    const book = await this.prisma.classicBook.findFirst({
      where: { id: bookId, ...PUBLIC_CLASSIC_BOOK_WHERE },
      select: { id: true },
    });
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
    const book = await this.prisma.classicBook.findFirst({ where: { id: bookId, ...PUBLIC_CLASSIC_BOOK_WHERE } });
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
    const book = await this.prisma.classicBook.findFirst({
      where: { id: bookId, ...PUBLIC_CLASSIC_BOOK_WHERE },
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

  // ── 白话翻译（AI）with TextDerivedAsset 持久化 ──
  //
  // S04 口径（2026-09-21）：
  // - 身份含原文哈希、上下文哈希（无上下文记 none）、策略、网关路由策略、提示词版本；实际模型由网关返回后记录
  // - 命中已有合格译文**不调用模型、不计 AI 次数**（控制器先 peek）：命中缓存要不要计次尚待产品拍板，
  //   拍板前按「不擅自扣」处理
  // - 段落级译文绑定稳定段落 ID 与段落内容哈希；原文修订后旧译文判为 expired，不会被当成当前译文返回

  private translationRequest(text: string, context?: string, source?: { segmentId: string }): TextAssetRequest {
    return {
      sourceType: source ? "classic_segment" : "classic_translation",
      sourceId: source ? source.segmentId : createHash("sha256").update(text, "utf8").digest("hex").slice(0, 32),
      content: text,
      context: context?.trim() || undefined,
      processingType: "translation",
      strategy: "vernacular_json",
      modelPolicy: "gateway:classic_translate",
      promptVersion: "translate-v1",
      language: "zh-CN",
    };
  }

  private parseTranslation(raw: string, original: string) {
    try {
      return JSON.parse(raw);
    } catch (err) {
      this.logger.warn("翻译JSON解析失败", err);
      return { original, translation: raw?.slice(0, 2000) || "翻译暂不可用", notes: [], source: "" };
    }
  }

  private async runTranslation(req: TextAssetRequest, userId?: string) {
    return this.textAssetService.getOrCreateTextAsset(
      req,
      async () => {
        const contextHint = req.context ? `\n上下文提示：这段话出自「${req.context}」。请根据上下文做出准确翻译。` : "";
        const prompt = `你是一位资深的古籍白话翻译专家。请将用户提供的文言文段落翻译成准确、流畅的现代白话文。
保留原文的修辞风格和文化内涵，对关键词语给出注释。${contextHint}
必须使用以下JSON格式返回（不要包含其他文字，不要用markdown代码块包裹）：
{
  "original": "原文",
  "translation": "现代白话文翻译",
  "notes": ["关键词语的注释1", "关键词语的注释2"],
  "source": "推测的出处（不确定则填空字符串）"
}`;
        const aiResult = await this.gateway.chat({
          scene: "classic_translate",
          userId,
          // 精确复用由 TextDerivedAsset（原文+上下文+提示词版本）负责且带校验；
          // 语义缓存只按用户原文相似度匹配、不含上下文，且会把一次坏结果长期复用导致“重试”无效
          skipCache: true,
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: req.content },
          ],
          options: { temperature: 0.3, maxTokens: 1536 },
        });
        return { result: aiResult.content, model: aiResult.model };
      },
      // 只有可解析且译文非空的结果才作为可复用资产保存
      (raw) => {
        try {
          const parsed = JSON.parse(raw);
          return typeof parsed?.translation === "string" && parsed.translation.trim().length > 0;
        } catch {
          return false;
        }
      },
    );
  }

  /** 只查已有合格译文（不调模型、不计次数）；没有返回 null */
  async peekTranslation(dto: { text: string; context?: string }) {
    const text = dto.text.trim();
    const hit = await this.textAssetService.findCompletedAsset(this.translationRequest(text, dto.context));
    return hit ? { ...this.parseTranslation(hit.result, text), cached: true } : null;
  }

  async translateClassical(dto: { text: string; context?: string }, userId?: string) {
    const text = dto.text.trim();
    const result = await this.runTranslation(this.translationRequest(text, dto.context), userId);
    return { ...this.parseTranslation(result.result, text), cached: result.cached };
  }

  /** 段落级：加载公开可读段落与上下文（书名·篇名） */
  private async loadSegmentForTranslation(segmentId: string) {
    const seg = await this.prisma.classicSegment.findFirst({
      where: { id: segmentId, deletedAt: null, chapter: { deletedAt: null, book: PUBLIC_CLASSIC_BOOK_WHERE } },
      select: { id: true, content: true, contentHash: true, sortOrder: true, chapter: { select: { title: true, book: { select: { title: true } } } } },
    });
    if (!seg) throw new BusinessException(ErrorCode.NOT_FOUND, "段落不存在");
    if (seg.content.length > 1500) throw new BusinessException(ErrorCode.BAD_REQUEST, "段落过长，暂不支持整段翻译");
    const context = `${seg.chapter?.book?.title ?? ""}·${seg.chapter?.title ?? ""}`;
    return { seg, context };
  }

  /**
   * 段落译文状态（不生成、不计次）：
   * none 未生成 / generating 生成中 / success 成功 / failed 失败 / expired 原文已修订、旧译文过期
   * 人工复核状态另见 reviewStatus（none/pending_review/approved/rejected）
   */
  async segmentTranslationStatus(segmentId: string) {
    const { seg, context } = await this.loadSegmentForTranslation(segmentId);
    const req = this.translationRequest(seg.content, context, { segmentId });
    const assetKey = this.textAssetService.buildAssetKey(req);
    const current = await this.prisma.textDerivedAsset.findUnique({ where: { assetKey } });
    const base = { segmentId, contentHash: seg.contentHash, promptVersion: req.promptVersion };
    if (current) {
      const status =
        current.processingStatus === "completed" ? "success" : current.processingStatus === "processing" ? "generating" : "failed";
      return {
        ...base,
        status,
        reviewStatus: current.reviewStatus,
        model: current.model,
        result: status === "success" ? this.parseTranslation(current.result, seg.content) : null,
      };
    }
    // 同一段落有旧版本原文的译文：说明原文已修订，旧译文过期（不返回正文，避免把旧译文当成当前译文）
    const stale = await this.prisma.textDerivedAsset.findFirst({
      where: { sourceType: "classic_segment", sourceId: segmentId, processingType: "translation", processingStatus: "completed" },
      select: { id: true },
    });
    return { ...base, status: stale ? "expired" : "none", reviewStatus: null, model: null, result: null };
  }

  async translateSegment(segmentId: string, userId?: string) {
    const { seg, context } = await this.loadSegmentForTranslation(segmentId);
    const result = await this.runTranslation(this.translationRequest(seg.content, context, { segmentId }), userId);
    return {
      segmentId,
      contentHash: seg.contentHash,
      cached: result.cached,
      ...this.parseTranslation(result.result, seg.content),
    };
  }

  // ── 古籍AI问答（自由对话） ──
  async askClassic(question: string) {
    const prompt = withUserAnswerExperience(`你是一位博学儒雅的国学与古籍专家，贯通经史子集、释道医卜。
请用通俗易懂的白话，准确且有据地回答用户关于古籍、传统文化的问题。要求：
1. 单句古文先给一句白话解释；用户只打招呼时简短回应，不展开讲课。
2. 引用原文或观点时尽量注明可核对的书名、篇名；出处不确定就明确说不确定，不编造原句。
3. 复杂问题先说关键结论，再用少量依据和贴近生活的例子解释；不要为了凑字数罗列典故。
4. 若问题超出古籍与传统文化范畴，简短说明边界，并指向更合适的功能。`);
    const result = await this.gateway.chat({
      scene: "classic_qa",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: question },
      ],
      options: { temperature: 0.6, maxTokens: 1200 },
    });
    return { answer: result.content?.trim() || CLASSIC_QA_EMPTY_ANSWER };
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
  async listMyNotes(userId: string, bookId?: string, chapterId?: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.ClassicReadingNoteWhereInput = { userId };
    if (bookId) where.bookId = bookId;
    if (chapterId) where.chapterId = chapterId;
    const [items, total] = await Promise.all([
      this.prisma.classicReadingNote.findMany({
        where,
        include: {
          book: { select: { id: true, title: true, author: true, dynasty: true } },
          chapter: { select: { id: true, title: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.classicReadingNote.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async createNote(
    userId: string,
    bookId: string,
    dto: { chapterId: string; content: string; position?: number; originalText?: string },
  ) {
    return this.prisma.classicReadingNote.create({
      data: {
        userId,
        bookId,
        chapterId: dto.chapterId,
        content: dto.content,
        position: dto.position,
        originalText: dto.originalText,
      },
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
  async listAnnotations(bookId: string, chapterId?: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.ClassicAnnotationWhereInput = { bookId };
    if (chapterId) where.chapterId = chapterId;
    const [items, total] = await Promise.all([
      this.prisma.classicAnnotation.findMany({
        where,
        orderBy: { startPos: "asc" },
        skip,
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
    const book = await this.prisma.classicBook.findFirst({
      where: { id: bookId, ...PUBLIC_CLASSIC_BOOK_WHERE },
      select: { title: true, author: true, dynasty: true },
    });
    if (!book) throw new BusinessException(ErrorCode.NOT_FOUND, "书籍不存在");

    const versions = await this.prisma.classicBook.findMany({
      where: {
        ...PUBLIC_CLASSIC_BOOK_WHERE,
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
    const book = await this.prisma.classicBook.findFirst({
      where: { id: bookId, ...PUBLIC_CLASSIC_BOOK_WHERE },
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
    const { bookId } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize);
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
        skip,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.classicReadingNote.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 管理端-所有书签 */
  async getAllBookmarks(params: { bookId?: string; page?: number; pageSize?: number }) {
    const { bookId } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize);
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
        skip,
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
