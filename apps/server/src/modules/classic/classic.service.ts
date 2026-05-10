import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class ClassicService {
  constructor(private prisma: PrismaService) {}

  // ── 书籍 CRUD ──
  async listBooks(query: { category?: string; page?: number; pageSize?: number }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const where: Prisma.ClassicBookWhereInput = { status: "PUBLISHED" };
    if (query.category) where.category = query.category;

    const [books, total] = await Promise.all([
      this.prisma.classicBook.findMany({
        where,
        select: {
          id: true, title: true, author: true, dynasty: true,
          category: true, cover: true, intro: true, chapterCount: true,
          viewCount: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.classicBook.count({ where }),
    ]);
    return { books, total, page, pageSize };
  }

  async getBook(id: string) {
    const book = await this.prisma.classicBook.findUnique({
      where: { id },
      include: { chapters: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, sortOrder: true } } },
    });
    if (book) {
      await this.prisma.classicBook.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    }
    return book;
  }

  async createBook(dto: Prisma.ClassicBookCreateInput) {
    return this.prisma.classicBook.create({ data: dto });
  }

  async updateBook(id: string, dto: Prisma.ClassicBookUpdateInput) {
    return this.prisma.classicBook.update({ where: { id }, data: dto });
  }

  async deleteBook(id: string) {
    return this.prisma.classicBook.delete({ where: { id } });
  }

  // ── 章节 CRUD ──
  async getChapter(id: string) {
    return this.prisma.classicChapter.findUnique({
      where: { id },
      include: { book: { select: { id: true, title: true } } },
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
    return this.prisma.classicChapter.update({ where: { id }, data: dto });
  }

  async deleteChapter(id: string) {
    const ch = await this.prisma.classicChapter.findUnique({ where: { id } });
    if (ch) {
      await this.prisma.classicBook.update({
        where: { id: ch.bookId },
        data: { chapterCount: { increment: -1 } },
      });
    }
    return this.prisma.classicChapter.delete({ where: { id } });
  }

  // ── 阅读进度 ──
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

  // ── 书签 ──
  async listBookmarks(userId: string, bookId?: string) {
    const where: Prisma.BookmarkWhereInput = { userId };
    if (bookId) where.bookId = bookId;
    return this.prisma.bookmark.findMany({
      where,
      include: { book: { select: { title: true } }, chapter: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async createBookmark(userId: string, bookId: string, dto: { chapterId: string; position: number; note?: string }) {
    return this.prisma.bookmark.create({
      data: { userId, bookId, chapterId: dto.chapterId, position: dto.position, note: dto.note },
    });
  }

  async deleteBookmark(id: string) {
    return this.prisma.bookmark.delete({ where: { id } });
  }
}
