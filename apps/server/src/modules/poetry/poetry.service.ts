import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import {
  CategoryDto,
  CollectionItemDto,
  HomeResponseDto,
  PoemDetailResponseDto,
  PoemItemDto,
  PoemLineDto,
  PoemNoteDto,
  PoetItemDto,
  PoetDetailResponseDto,
  RelatedPoemDto,
  TodayPoemDto,
  LikeResultDto,
  CollectResultDto,
  AppreciationResultDto,
  PoemCommentDto,
  CommentLikeResultDto,
} from "./poetry.dto";

// Prisma Json 字段解析辅助
type AnyRecord = Record<string, unknown>;

// 通用多态互动表的 targetType 取值（诗词板块）
const LIKE_TARGET = "POEM";
const COLLECT_TARGET = "POEM";
const COMMENT_TARGET = "POEM";
const COMMENT_LIKE_TARGET = "POEM_COMMENT";

@Injectable()
export class PoetryService {
  constructor(
    private prisma: PrismaService,
    private gateway: AiGatewayService,
  ) {}

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

  async getDetail(id: string, userId?: string): Promise<PoemDetailResponseDto> {
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

    // 当前用户的点赞/收藏状态（未登录则均为 false）
    let isLiked = false;
    let isBookmarked = false;
    if (userId) {
      const [liked, collected] = await Promise.all([
        this.prisma.like.findUnique({
          where: { userId_targetType_targetId: { userId, targetType: LIKE_TARGET, targetId: id } },
        }),
        this.prisma.collect.findUnique({
          where: { userId_targetType_targetId: { userId, targetType: COLLECT_TARGET, targetId: id } },
        }),
      ]);
      isLiked = !!liked;
      isBookmarked = !!collected;
    }

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
        isLiked,
        isBookmarked,
      },
      translations,
    };
  }

  // ─────────────────────────────────────────────
  // 搜索
  // ─────────────────────────────────────────────

  async search(keyword: string): Promise<PoemItemDto[]> {
    const kw = (keyword ?? "").trim();
    if (!kw) return [];
    const rows = await this.prisma.poetry.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: kw } },
          { author: { contains: kw } },
          { content: { contains: kw } },
        ],
      },
      orderBy: [{ likes: "desc" }],
      take: 30,
    });
    return rows.map((p) => this.toPoemItem(p));
  }

  /** Poetry → 列表项 DTO */
  private toPoemItem(p: {
    id: string; title: string; author: string; dynasty: string; form: string | null; content: string; likes: number;
  }): PoemItemDto {
    return {
      id: p.id,
      title: p.title,
      author: p.author,
      dynasty: p.dynasty,
      form: p.form ?? "",
      preview: this.firstLine(p.content),
      likes: p.likes,
    };
  }

  // ─────────────────────────────────────────────
  // 诗人详情（按作者聚合）
  // ─────────────────────────────────────────────

  async getPoet(name: string): Promise<PoetDetailResponseDto> {
    const author = (name ?? "").trim();
    if (!author) throw new BadRequestException("缺少诗人名");
    const poems = await this.prisma.poetry.findMany({
      where: { status: "PUBLISHED", author },
      orderBy: [{ isRecommended: "desc" }, { likes: "desc" }],
    });
    if (!poems.length) throw new NotFoundException("未找到该诗人");

    const first = poems[0];
    const totalLikes = poems.reduce((sum, p) => sum + p.likes, 0);
    return {
      poet: {
        name: author,
        dynasty: first.dynasty,
        years: first.authorYears ?? "",
        title: first.authorTitle ?? "",
        intro: first.authorIntro ?? "",
        poemCount: poems.length,
        totalLikes,
      },
      poems: poems.map((p) => this.toPoemItem(p)),
    };
  }

  // ─────────────────────────────────────────────
  // 互动：点赞 / 收藏（复用通用 Like/Collect 表 + 同步计数器）
  // ─────────────────────────────────────────────

  async toggleLike(userId: string, poemId: string): Promise<LikeResultDto> {
    const poem = await this.prisma.poetry.findFirst({ where: { id: poemId, status: "PUBLISHED" }, select: { id: true } });
    if (!poem) throw new NotFoundException("诗词不存在");

    const where = { userId_targetType_targetId: { userId, targetType: LIKE_TARGET, targetId: poemId } };
    const existing = await this.prisma.like.findUnique({ where });

    if (existing) {
      const [, updated] = await this.prisma.$transaction([
        this.prisma.like.delete({ where: { id: existing.id } }),
        this.prisma.poetry.update({ where: { id: poemId }, data: { likes: { decrement: 1 } } }),
      ]);
      return { liked: false, likes: Math.max(0, updated.likes) };
    }
    const [, updated] = await this.prisma.$transaction([
      this.prisma.like.create({ data: { userId, targetType: LIKE_TARGET, targetId: poemId } }),
      this.prisma.poetry.update({ where: { id: poemId }, data: { likes: { increment: 1 } } }),
    ]);
    return { liked: true, likes: updated.likes };
  }

  async toggleCollect(userId: string, poemId: string): Promise<CollectResultDto> {
    const poem = await this.prisma.poetry.findFirst({ where: { id: poemId, status: "PUBLISHED" }, select: { id: true } });
    if (!poem) throw new NotFoundException("诗词不存在");

    const where = { userId_targetType_targetId: { userId, targetType: COLLECT_TARGET, targetId: poemId } };
    const existing = await this.prisma.collect.findUnique({ where });

    if (existing) {
      const [, updated] = await this.prisma.$transaction([
        this.prisma.collect.delete({ where: { id: existing.id } }),
        this.prisma.poetry.update({ where: { id: poemId }, data: { collectCount: { decrement: 1 } } }),
      ]);
      return { collected: false, collectCount: Math.max(0, updated.collectCount) };
    }
    const [, updated] = await this.prisma.$transaction([
      this.prisma.collect.create({ data: { userId, targetType: COLLECT_TARGET, targetId: poemId } }),
      this.prisma.poetry.update({ where: { id: poemId }, data: { collectCount: { increment: 1 } } }),
    ]);
    return { collected: true, collectCount: updated.collectCount };
  }

  // ─────────────────────────────────────────────
  // AI 实时深度赏析
  // ─────────────────────────────────────────────

  async appreciate(poemId: string, question?: string): Promise<AppreciationResultDto> {
    const poem = await this.prisma.poetry.findFirst({ where: { id: poemId, status: "PUBLISHED" } });
    if (!poem) throw new NotFoundException("诗词不存在");

    const body = this.splitLines(poem.content).join("\n");
    const system = `你是一位精研中国古典诗词的鉴赏大家，贯通文学史、音韵、意象与情志。
请对用户给出的诗词作深度赏析，要求：
1. 结构分明，用 markdown 小标题分「**创作背景**」「**逐层细读**」「**意象与艺术**」「**情感与境界**」四个维度；
2. 解读有据，必要时引证诗人生平、同题материал或前人评点，避免空泛套话；
3. 语言典雅而不晦涩，让普通读者也能领会其妙；
4. 全文 600 字以内，不要寒暄、不要复述题目。`;
    const userMsg = (question ?? "").trim()
      ? `就《${poem.title}》（${poem.dynasty}·${poem.author}）回答：${question!.trim()}\n\n原文：\n${body}`
      : `请深度赏析《${poem.title}》（${poem.dynasty}·${poem.author}）：\n${body}`;

    const result = await this.gateway.chat({
      scene: "poetry_appreciation",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      options: { temperature: 0.7, maxTokens: 1600 },
    });
    return { appreciation: result.content?.trim() || "AI 暂时无法生成赏析，请稍后再试。" };
  }

  // ─────────────────────────────────────────────
  // 诗词品评（评论，复用通用 Comment 表）
  // ─────────────────────────────────────────────

  /** 相对时间格式化 */
  private timeAgo(date: Date): string {
    const diff = Date.now() - date.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "刚刚";
    if (min < 60) return `${min}分钟前`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}小时前`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}天前`;
    return date.toISOString().slice(0, 10);
  }

  async listComments(poemId: string, userId?: string): Promise<PoemCommentDto[]> {
    const comments = await this.prisma.comment.findMany({
      where: { targetType: COMMENT_TARGET, targetId: poemId, parentId: null, status: "PUBLISHED" },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        replies: {
          where: { status: "PUBLISHED" },
          include: { user: { select: { id: true, nickname: true, avatar: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
      take: 50,
    });

    // 当前用户点赞过的评论集合（含主评论与回复）
    let likedSet = new Set<string>();
    if (userId) {
      const allIds = comments.flatMap((c) => [c.id, ...c.replies.map((r) => r.id)]);
      if (allIds.length) {
        const likes = await this.prisma.like.findMany({
          where: { userId, targetType: COMMENT_LIKE_TARGET, targetId: { in: allIds } },
          select: { targetId: true },
        });
        likedSet = new Set(likes.map((l) => l.targetId));
      }
    }

    return comments.map((c) => ({
      id: c.id,
      authorId: c.user.id,
      authorName: c.user.nickname ?? "诗友",
      authorAvatar: c.user.avatar ?? "",
      content: c.content,
      time: this.timeAgo(c.createdAt),
      likeCount: c.likeCount,
      liked: likedSet.has(c.id),
      mine: !!userId && c.user.id === userId,
      replies: c.replies.map((r) => ({
        id: r.id,
        authorName: r.user.nickname ?? "诗友",
        authorAvatar: r.user.avatar ?? "",
        content: r.content,
        time: this.timeAgo(r.createdAt),
        likeCount: r.likeCount,
        liked: likedSet.has(r.id),
        replyToName: "",
      })),
    }));
  }

  async createComment(userId: string, poemId: string, content: string, parentId?: string): Promise<PoemCommentDto> {
    const text = (content ?? "").trim();
    if (!text) throw new BadRequestException("评论内容不能为空");
    if (text.length > 1000) throw new BadRequestException("评论内容过长");

    const poem = await this.prisma.poetry.findFirst({ where: { id: poemId, status: "PUBLISHED" }, select: { id: true } });
    if (!poem) throw new NotFoundException("诗词不存在");
    if (parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: parentId }, select: { id: true, targetId: true } });
      if (!parent || parent.targetId !== poemId) throw new BadRequestException("回复的评论不存在");
    }

    const c = await this.prisma.comment.create({
      data: { userId, targetType: COMMENT_TARGET, targetId: poemId, parentId, content: text },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
    });

    return {
      id: c.id,
      authorId: c.user.id,
      authorName: c.user.nickname ?? "诗友",
      authorAvatar: c.user.avatar ?? "",
      content: c.content,
      time: this.timeAgo(c.createdAt),
      likeCount: 0,
      liked: false,
      mine: true,
      replies: [],
    };
  }

  async deleteComment(userId: string, commentId: string): Promise<{ success: boolean }> {
    const c = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!c) throw new NotFoundException("评论不存在");
    if (c.userId !== userId) throw new ForbiddenException("只能删除自己的评论");
    await this.prisma.comment.deleteMany({ where: { parentId: commentId } });
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { success: true };
  }

  async likeComment(userId: string, commentId: string): Promise<CommentLikeResultDto> {
    const c = await this.prisma.comment.findUnique({ where: { id: commentId }, select: { id: true } });
    if (!c) throw new NotFoundException("评论不存在");

    const where = { userId_targetType_targetId: { userId, targetType: COMMENT_LIKE_TARGET, targetId: commentId } };
    const existing = await this.prisma.like.findUnique({ where });

    if (existing) {
      const [, updated] = await this.prisma.$transaction([
        this.prisma.like.delete({ where: { id: existing.id } }),
        this.prisma.comment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return { liked: false, likeCount: Math.max(0, updated.likeCount) };
    }
    const [, updated] = await this.prisma.$transaction([
      this.prisma.like.create({ data: { userId, targetType: COMMENT_LIKE_TARGET, targetId: commentId } }),
      this.prisma.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } }),
    ]);
    return { liked: true, likeCount: updated.likeCount };
  }

  // ─────────────────────────────────────────────
  // 管理端 CRUD（诗词 / 分类 / 合集）
  // ─────────────────────────────────────────────

  /** 管理端：诗词分页列表（支持 status/categoryId/dynasty/keyword 筛选） */
  async adminListPoems(params: { page?: number; pageSize?: number; status?: string; categoryId?: string; dynasty?: string; keyword?: string }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.dynasty) where.dynasty = params.dynasty;
    if (params.keyword) {
      where.OR = [
        { title: { contains: params.keyword, mode: "insensitive" } },
        { author: { contains: params.keyword, mode: "insensitive" } },
        { content: { contains: params.keyword, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.poetry.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      }),
      this.prisma.poetry.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 仅保留 Poetry 表存在的字段，避免多余字段写入报错 */
  private sanitizePoemInput(dto: any, partial = false) {
    const allowed = [
      "title", "author", "authorId", "dynasty", "form", "content", "pinyin",
      "translation", "appreciation", "aiAppreciation", "notes", "authorIntro",
      "authorYears", "authorTitle", "tags", "categoryId", "collectionId",
      "cover", "isRecommended", "isToday", "status", "sortOrder",
    ];
    const data: any = {};
    for (const k of allowed) if (dto[k] !== undefined) data[k] = dto[k];
    if (!partial && (!data.title || !data.author || !data.dynasty || !data.content)) {
      throw new BadRequestException("标题、作者、朝代、正文为必填");
    }
    return data;
  }

  async adminCreatePoem(dto: any) {
    return this.prisma.poetry.create({ data: this.sanitizePoemInput(dto) });
  }

  async adminUpdatePoem(id: string, dto: any) {
    const exist = await this.prisma.poetry.findUnique({ where: { id }, select: { id: true } });
    if (!exist) throw new NotFoundException("诗词不存在");
    return this.prisma.poetry.update({ where: { id }, data: this.sanitizePoemInput(dto, true) });
  }

  async adminDeletePoem(id: string) {
    const exist = await this.prisma.poetry.findUnique({ where: { id }, select: { id: true } });
    if (!exist) throw new NotFoundException("诗词不存在");
    await this.prisma.poetry.delete({ where: { id } });
    return { success: true };
  }

  // ── 分类 ──
  async adminListCategories() {
    const items = await this.prisma.poetryCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { poems: true } } },
    });
    return items.map((c) => ({ ...c, poemCount: c._count.poems }));
  }
  async adminCreateCategory(dto: any) {
    if (!dto.name) throw new BadRequestException("分类名称为必填");
    return this.prisma.poetryCategory.create({
      data: { name: dto.name, icon: dto.icon, intro: dto.intro, subCategories: dto.subCategories, sortOrder: dto.sortOrder ?? 0 },
    });
  }
  async adminUpdateCategory(id: string, dto: any) {
    const exist = await this.prisma.poetryCategory.findUnique({ where: { id }, select: { id: true } });
    if (!exist) throw new NotFoundException("分类不存在");
    return this.prisma.poetryCategory.update({
      where: { id },
      data: { name: dto.name, icon: dto.icon, intro: dto.intro, subCategories: dto.subCategories, sortOrder: dto.sortOrder },
    });
  }
  async adminDeleteCategory(id: string) {
    const exist = await this.prisma.poetryCategory.findUnique({ where: { id }, select: { id: true } });
    if (!exist) throw new NotFoundException("诗词分类不存在");
    const count = await this.prisma.poetry.count({ where: { categoryId: id } });
    if (count > 0) throw new BadRequestException(`该分类下还有 ${count} 首诗词，请先移出后再删除`);
    await this.prisma.poetryCategory.delete({ where: { id } });
    return { success: true };
  }

  // ── 合集 / 诗单 ──
  async adminListCollections(params: { page?: number; pageSize?: number; status?: string }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const where: any = {};
    if (params.status) where.status = params.status;
    const [rows, total] = await Promise.all([
      this.prisma.poetryCollection.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        include: { _count: { select: { poems: true } } },
      }),
      this.prisma.poetryCollection.count({ where }),
    ]);
    return { items: rows.map((c) => ({ ...c, poemCount: c._count.poems })), total, page, pageSize };
  }
  private sanitizeCollectionInput(dto: any, partial = false) {
    const allowed = ["title", "author", "authorAvatar", "dynasty", "excerpt", "category", "cover", "status", "sortOrder"];
    const data: any = {};
    for (const k of allowed) if (dto[k] !== undefined) data[k] = dto[k];
    if (!partial && !data.title) throw new BadRequestException("合集标题为必填");
    return data;
  }
  async adminCreateCollection(dto: any) {
    return this.prisma.poetryCollection.create({ data: this.sanitizeCollectionInput(dto) });
  }
  async adminUpdateCollection(id: string, dto: any) {
    const exist = await this.prisma.poetryCollection.findUnique({ where: { id }, select: { id: true } });
    if (!exist) throw new NotFoundException("合集不存在");
    return this.prisma.poetryCollection.update({ where: { id }, data: this.sanitizeCollectionInput(dto, true) });
  }
  async adminDeleteCollection(id: string) {
    const exist = await this.prisma.poetryCollection.findUnique({ where: { id }, select: { id: true } });
    if (!exist) throw new NotFoundException("合集不存在");
    await this.prisma.poetry.updateMany({ where: { collectionId: id }, data: { collectionId: null } });
    await this.prisma.poetryCollection.delete({ where: { id } });
    return { success: true };
  }
}
