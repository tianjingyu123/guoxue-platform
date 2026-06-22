import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CategoryDto,
  CollectionItemDto,
  HomeResponseDto,
  PoemDetailResponseDto,
  PoemItemDto,
  PoemLineDto,
  PoemNoteDto,
  PoetItemDto,
  RelatedPoemDto,
  TodayPoemDto,
} from "./poetry.dto";

// Prisma Json 字段解析辅助
type AnyRecord = Record<string, unknown>;

@Injectable()
export class PoetryService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // 工具方法
  // ─────────────────────────────────────────────

  /** 将正文按换行切分为句数组 */
  private splitLines(content: string): string[] {
    return content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  /** 取第一句作预览（去除尾部标点） */
  private firstLine(content: string): string {
    const [first] = this.splitLines(content);
    return (first ?? "").replace(/[，。！？、；]$/, "");
  }

  private asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map((v) => String(v)) : [];
  }

  private asPinyinArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map((v) => String(v)) : [];
  }

  private asNotes(value: unknown): PoemNoteDto[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((v): v is AnyRecord => !!v && typeof v === "object")
      .map((v) => ({ word: String(v.word ?? ""), note: String(v.note ?? "") }));
  }

  // ─────────────────────────────────────────────
  // 首页聚合
  // ─────────────────────────────────────────────

  async getHome(): Promise<HomeResponseDto> {
    const [todayRow, hotRows, poetRows] = await Promise.all([
      // 每日一首：优先取 isToday，退化为最高赞
      this.prisma.poetry.findFirst({
        where: { status: "PUBLISHED", isToday: true },
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.poetry.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ isRecommended: "desc" }, { likes: "desc" }],
        take: 12,
      }),
      // 热门诗人：按作者聚合统计
      this.prisma.poetry.groupBy({
        by: ["author", "dynasty"],
        where: { status: "PUBLISHED" },
        _count: { _all: true },
        _sum: { likes: true },
        orderBy: { _sum: { likes: "desc" } },
        take: 8,
      }),
    ]);

    const todaySource =
      todayRow ??
      (await this.prisma.poetry.findFirst({
        where: { status: "PUBLISHED" },
        orderBy: { likes: "desc" },
      }));

    const todayPoem: TodayPoemDto = todaySource
      ? {
          id: todaySource.id,
          title: todaySource.title,
          author: todaySource.author,
          dynasty: todaySource.dynasty,
          lines: this.splitLines(todaySource.content),
          tags: this.asStringArray(todaySource.tags),
          likes: todaySource.likes,
        }
      : { id: "", title: "", author: "", dynasty: "", lines: [], tags: [], likes: 0 };

    const poems: PoemItemDto[] = hotRows.map((p) => ({
      id: p.id,
      title: p.title,
      author: p.author,
      dynasty: p.dynasty,
      form: p.form ?? "",
      preview: this.firstLine(p.content),
      likes: p.likes,
    }));

    const poets: PoetItemDto[] = poetRows.map((r, idx) => ({
      id: String(idx + 1),
      name: r.author,
      dynasty: r.dynasty,
      poemCount: r._count._all,
      avatar: r.author.slice(0, 1),
    }));

    return { todayPoem, poems, poets };
  }

  // ─────────────────────────────────────────────
  // 分类
  // ─────────────────────────────────────────────

  async getCategories(): Promise<CategoryDto[]> {
    const rows = await this.prisma.poetryCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { poems: true } } },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon ?? "📜",
      desc: c.intro ?? "",
      count: c._count.poems,
      subCategories: this.asStringArray(c.subCategories),
    }));
  }

  // ─────────────────────────────────────────────
  // 合集
  // ─────────────────────────────────────────────

  async getCollections(): Promise<CollectionItemDto[]> {
    const rows = await this.prisma.poetryCollection.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map((c) => ({
      id: c.id,
      title: c.title,
      author: c.author ?? "",
      authorAvatar: c.authorAvatar ?? "",
      dynasty: c.dynasty ?? "",
      excerpt: c.excerpt ?? "",
      category: c.category ?? "",
      likes: c.likes,
      liked: false,
      collectedAt: c.createdAt.toISOString().slice(0, 10),
    }));
  }

  // ─────────────────────────────────────────────
  // 详情
  // ─────────────────────────────────────────────

  async getDetail(id: string): Promise<PoemDetailResponseDto> {
    const poem = await this.prisma.poetry.findFirst({
      where: { id, status: "PUBLISHED" },
    });
    if (!poem) throw new NotFoundException("诗词不存在");

    // 浏览量 +1（失败不影响读取）
    this.prisma.poetry
      .update({ where: { id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);

    const lines = this.splitLines(poem.content);
    const pinyinList = this.asPinyinArray(poem.pinyin);
    const content: PoemLineDto[] = lines.map((line, i) => ({
      line,
      pinyin: pinyinList[i] ?? "",
    }));

    // 同作者相关诗词
    const relatedRows = await this.prisma.poetry.findMany({
      where: { status: "PUBLISHED", author: poem.author, id: { not: poem.id } },
      orderBy: { likes: "desc" },
      take: 3,
    });
    const relatedPoems: RelatedPoemDto[] = relatedRows.map((r) => ({
      id: r.id,
      title: r.title,
      author: r.author,
      preview: this.firstLine(r.content) + "...",
    }));

    const authorPoemCount = await this.prisma.poetry.count({
      where: { status: "PUBLISHED", author: poem.author },
    });

    const translations = poem.translation ? this.splitLines(poem.translation) : [];

    return {
      poem: {
        id: poem.id,
        title: poem.title,
        author: poem.author,
        authorId: poem.authorId ?? "",
        dynasty: poem.dynasty,
        form: poem.form ?? "",
        content,
        appreciation: poem.appreciation ?? "",
        aiAppreciation: poem.aiAppreciation ?? "",
        notes: this.asNotes(poem.notes),
        authorInfo: {
          name: poem.author,
          dynasty: poem.dynasty,
          years: poem.authorYears ?? "",
          title: poem.authorTitle ?? "",
          intro: poem.authorIntro ?? "",
          poemCount: authorPoemCount,
        },
        relatedPoems,
        tags: this.asStringArray(poem.tags),
        likes: poem.likes,
        collections: poem.collectCount,
      },
      translations,
    };
  }
}
