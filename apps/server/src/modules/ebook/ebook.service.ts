import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { Prisma } from "@prisma/client";
import { CreateEbookDto, UpdateEbookDto, CreateChapterDto, UpdateChapterDto } from "./ebook.dto";
import { MemoryCache } from "../../common/cache.util";

@Injectable()
export class EbookService {
  private readonly logger = new Logger(EbookService.name);
  private readonly catCache = new MemoryCache<any>(20);
  constructor(private prisma: PrismaService, private ai: AiService) {}

  // ═══════════════════════════════════════════
  // 分类
  // ═══════════════════════════════════════════

  async listCategories() {
    const cached = this.catCache.get("all");
    if (cached) return cached;
    const categories = await this.prisma.ebookCategory.findMany({ orderBy: { sortOrder: "asc" } });
    this.catCache.set("all", categories, 600_000);
    return categories;
  }

  async createCategory(dto: { name: string; sortOrder?: number }) {
    return this.prisma.ebookCategory.create({ data: dto });
  }

  // ═══════════════════════════════════════════
  // 电子书 CRUD
  // ═══════════════════════════════════════════

  async listBooks(query: { categoryId?: string; keyword?: string; status?: string; page?: number; pageSize?: number }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const where: Prisma.EbookWhereInput = {};
    if (query.status) {
      where.status = query.status as any;
    } else {
      where.status = "PUBLISHED";
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword } },
        { author: { contains: query.keyword } },
      ];
    }

    const [books, total] = await Promise.all([
      this.prisma.ebook.findMany({
        where,
        select: {
          id: true, title: true, author: true, cover: true, description: true,
          categoryId: true, price: true, originalPrice: true, fileType: true,
          totalChapters: true, language: true, memberFree: true,
          viewCount: true, purchaseCount: true, createdAt: true,
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.ebook.count({ where }),
    ]);
    return { books, total, page, pageSize };
  }

  async getBook(id: string, userId?: string) {
    const [book, purchase] = await Promise.all([
      this.prisma.ebook.findUnique({
        where: { id },
        include: {
          category: { select: { id: true, name: true } },
          chapters: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, sortOrder: true, pageStart: true, pageEnd: true, freeTrial: true } },
        },
      }),
      userId
        ? this.prisma.ebookPurchase.findUnique({ where: { userId_ebookId: { userId, ebookId: id } } })
        : Promise.resolve(null),
    ]);
    if (!book) throw new BusinessException(ErrorCode.NOT_FOUND, "电子书不存在");

    // 异步增加浏览数
    this.prisma.ebook.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch((err) => this.logger.warn("缓存写入失败", err));

    return { ...book, purchased: !!purchase };
  }

  async createEbook(dto: CreateEbookDto) {
    return this.prisma.ebook.create({ data: dto });
  }

  async updateEbook(id: string, dto: UpdateEbookDto) {
    const book = await this.prisma.ebook.findUnique({ where: { id } });
    if (!book) throw new BusinessException(ErrorCode.NOT_FOUND, "电子书不存在");
    return this.prisma.ebook.update({ where: { id }, data: dto });
  }

  async deleteEbook(id: string) {
    return this.prisma.ebook.delete({ where: { id } }).catch(() => {
      throw new BusinessException(ErrorCode.NOT_FOUND, "电子书不存在");
    });
  }

  // ═══════════════════════════════════════════
  // 章节管理
  // ═══════════════════════════════════════════

  async getChapter(id: string, userId?: string) {
    const chapter = await this.prisma.ebookChapter.findUnique({
      where: { id },
      include: { ebook: { select: { id: true, title: true, price: true, memberFree: true } } },
    });
    if (!chapter) throw new BusinessException(ErrorCode.NOT_FOUND, "章节不存在");

    // 免费试读直接放行
    if (chapter.freeTrial) return chapter;

    // 检查购买/会员权限
    const hasAccess = await this.checkAccess(chapter.ebookId, userId);
    if (!hasAccess) throw new BusinessException(ErrorCode.BAD_REQUEST, "请先购买电子书");

    return chapter;
  }

  async createChapter(ebookId: string, dto: CreateChapterDto) {
    const chapter = await this.prisma.ebookChapter.create({
      data: { ...dto, ebookId },
    });
    await this.prisma.ebook.update({
      where: { id: ebookId },
      data: { totalChapters: { increment: 1 } },
    });
    return chapter;
  }

  async updateChapter(id: string, dto: UpdateChapterDto) {
    return this.prisma.ebookChapter.update({ where: { id }, data: dto });
  }

  async deleteChapter(id: string) {
    const ch = await this.prisma.ebookChapter.findUnique({ where: { id } });
    if (ch) {
      await this.prisma.ebook.update({
        where: { id: ch.ebookId },
        data: { totalChapters: { increment: -1 } },
      });
    }
    return this.prisma.ebookChapter.delete({ where: { id } });
  }

  // ═══════════════════════════════════════════
  // 购买与鉴权
  // ═══════════════════════════════════════════

  async purchase(userId: string, ebookId: string) {
    const book = await this.prisma.ebook.findUnique({ where: { id: ebookId } });
    if (!book) throw new BusinessException(ErrorCode.NOT_FOUND, "电子书不存在");

    // 会员免费
    if (book.memberFree) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.memberLevel && user.memberLevel !== "NONE" && (!user.memberExpire || user.memberExpire > new Date())) {
        return this.prisma.ebookPurchase.upsert({
          where: { userId_ebookId: { userId, ebookId } },
          create: { userId, ebookId, amount: 0 },
          update: {},
        });
      }
    }

    const amount = Number(book.price);
    if (amount <= 0) {
      // 免费电子书
      return this.prisma.ebookPurchase.upsert({
        where: { userId_ebookId: { userId, ebookId } },
        create: { userId, ebookId, amount: 0 },
        update: {},
      });
    }

    // 防重复购买 — 先查后创 + 捕获唯一约束冲突
    const existing = await this.prisma.ebookPurchase.findUnique({
      where: { userId_ebookId: { userId, ebookId } },
    });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "已购买该电子书");

    let purchase: Record<string, unknown>;
    try {
      purchase = await this.prisma.ebookPurchase.create({
        data: { userId, ebookId, amount },
      }) as unknown as Record<string, unknown>;
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "P2002") throw new BusinessException(ErrorCode.BAD_REQUEST, "已购买该电子书");
      throw e;
    }

    await this.prisma.ebook.update({
      where: { id: ebookId },
      data: { purchaseCount: { increment: 1 } },
    });

    return purchase;
  }

  async checkAccess(ebookId: string, userId?: string): Promise<boolean> {
    if (!userId) return false;

    const book = await this.prisma.ebook.findUnique({ where: { id: ebookId } });
    if (!book) return false;
    if (Number(book.price) <= 0 || book.memberFree) return true;

    // 会员免费
    if (book.memberFree) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.memberLevel && user.memberLevel !== "NONE" && (!user.memberExpire || user.memberExpire > new Date())) {
        return true;
      }
    }

    const record = await this.prisma.ebookPurchase.findUnique({
      where: { userId_ebookId: { userId, ebookId } },
    });
    return !!record;
  }

  async getMyPurchases(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [purchases, total] = await Promise.all([
      this.prisma.ebookPurchase.findMany({
        where,
        include: { ebook: { select: { id: true, title: true, cover: true, author: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { paidAt: "desc" },
      }),
      this.prisma.ebookPurchase.count({ where }),
    ]);
    return { purchases, total, page, pageSize };
  }

  // ═══════════════════════════════════════════
  // 阅读进度
  // ═══════════════════════════════════════════

  async getProgress(userId: string, ebookId: string) {
    return this.prisma.ebookProgress.findUnique({
      where: { userId_ebookId: { userId, ebookId } },
    });
  }

  async updateProgress(userId: string, ebookId: string, dto: { chapterId?: string; progress?: number; currentPage?: number }) {
    const data: Record<string, unknown> = {};
    if (dto.chapterId !== undefined) data.chapterId = dto.chapterId;
    if (dto.progress !== undefined) data.progress = dto.progress;
    if (dto.currentPage !== undefined) data.currentPage = dto.currentPage;
    if (dto.progress !== undefined && dto.progress >= 100) data.completed = true;

    return this.prisma.ebookProgress.upsert({
      where: { userId_ebookId: { userId, ebookId } },
      create: { userId, ebookId, ...data },
      update: data,
    });
  }

  // ═══════════════════════════════════════════
  // 书签
  // ═══════════════════════════════════════════

  async listBookmarks(userId: string, params?: { ebookId?: string; page?: number; pageSize?: number }) {
    const { ebookId, page = 1, pageSize = 20 } = params || {};
    const where: Prisma.EbookBookmarkWhereInput = { userId };
    if (ebookId) where.ebookId = ebookId;
    const [bookmarks, total] = await Promise.all([
      this.prisma.ebookBookmark.findMany({
        where,
        include: {
          ebook: { select: { title: true } },
          chapter: { select: { title: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.ebookBookmark.count({ where }),
    ]);
    return { bookmarks, total, page, pageSize };
  }

  async createBookmark(userId: string, ebookId: string, dto: { chapterId?: string; page: number; note?: string }) {
    return this.prisma.ebookBookmark.create({
      data: { userId, ebookId, chapterId: dto.chapterId, page: dto.page, note: dto.note },
    });
  }

  async deleteBookmark(id: string) {
    return this.prisma.ebookBookmark.delete({ where: { id } }).catch(() => {
      throw new BusinessException(ErrorCode.NOT_FOUND, "书签不存在");
    });
  }

  // ═══════════════════════════════════════════
  // 笔记
  // ═══════════════════════════════════════════

  async listNotes(userId: string, params?: { ebookId?: string; page?: number; pageSize?: number }) {
    const { ebookId, page = 1, pageSize = 20 } = params || {};
    const where: Prisma.EbookNoteWhereInput = { userId };
    if (ebookId) where.ebookId = ebookId;
    const [notes, total] = await Promise.all([
      this.prisma.ebookNote.findMany({
        where,
        include: {
          ebook: { select: { title: true } },
          chapter: { select: { title: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.ebookNote.count({ where }),
    ]);
    return { notes, total, page, pageSize };
  }

  async createNote(userId: string, ebookId: string, dto: { chapterId?: string; content: string; page?: number; isPublic?: boolean }) {
    return this.prisma.ebookNote.create({
      data: { userId, ebookId, chapterId: dto.chapterId, content: dto.content, page: dto.page ?? 0, isPublic: dto.isPublic ?? false },
    });
  }

  async updateNote(id: string, dto: { content?: string; isPublic?: boolean }) {
    return this.prisma.ebookNote.update({ where: { id }, data: dto });
  }

  async deleteNote(id: string) {
    return this.prisma.ebookNote.delete({ where: { id } }).catch(() => {
      throw new BusinessException(ErrorCode.NOT_FOUND, "笔记不存在");
    });
  }

  // ═══════════════════════════════════════════
  // AI 翻译
  // ═══════════════════════════════════════════

  async translateText(dto: { text: string; sourceLang?: string; targetLang?: string }) {
    const sourceLang = dto.sourceLang || "zh";
    const targetLang = dto.targetLang || "en";
    const translated = await this.ai.translateText(dto.text, sourceLang, targetLang);
    return { original: dto.text, translated, sourceLang, targetLang };
  }

  async lookupWord(dto: { text: string; context?: string }) {
    const [translation, keywords] = await Promise.all([
      this.ai.translateText(dto.text, "zh", "en"),
      this.ai.extractKeywords(dto.context || dto.text, 5),
    ]);
    return {
      word: dto.text,
      context: dto.context || null,
      english: translation,
      relatedKeywords: keywords,
    };
  }
}
