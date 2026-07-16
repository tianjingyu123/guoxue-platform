import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ClassicService } from "./classic.service";

/**
 * 古籍馆「页面聚合（BFF）」服务。
 *
 * 前端 pkg-classics 各页面期望的是「页面级聚合接口」（如 /classics/home 一次返回首页所有板块），
 * 而后端 ClassicService 提供的是细粒度 REST 资源接口。本服务在二者之间做聚合 + 结构映射，
 * 复用 ClassicService 的只读查询，把后端 ClassicBook 数据组装成前端原型期望的精确结构。
 *
 * 数据源说明：
 * - 浏览主干（首页/分类/详情/排行/搜索）有完整数据源（ClassicBook 共 1.7 万余部）。
 * - audiobooks（有声书）/lists（书单）/collections（收藏夹）后端暂无对应数据模型，返回空，前端走空态。
 * - bookshelf/bookmarks/notes 需登录态（用户私有数据），本聚合层暂返回空，后续批次接入鉴权。
 */

/**
 * 典籍部类展示配置（颜色/图标，聚合时回填真实 count）。
 * 不止传统经史子集四部——库内「释(佛典4368)/道+道藏(2264)/命(术数)/医(中医)」均独立成部，
 * 给最大类佛典等真实入口（cats 支持多分类合并，如道部含「道」+「道藏」）。
 */
const CATEGORY_TILES = [
  { id: "jing", cats: ["经"], name: "经部", desc: "儒家经典", intro: "四书五经，儒学根本，立身处世之道尽在其中。", icon: "scroll-text", from: "#a06a38", to: "#7a4d22", cover: "brown", subCats: ["全部", "易类", "书类", "诗类", "礼类", "春秋", "四书", "小学"] },
  { id: "shi", cats: ["史"], name: "史部", desc: "历史典籍", intro: "二十四史，编年纪传，鉴往知来通古今之变。", icon: "book-open", from: "#3a6196", to: "#243f63", cover: "blue", subCats: ["全部", "正史", "编年", "纪事本末", "别史", "杂史", "传记", "地理"] },
  { id: "zi", cats: ["子"], name: "子部", desc: "诸子百家", intro: "百家争鸣，纵横捭阖，思想智慧的浩瀚星河。", icon: "lightbulb", from: "#3f8560", to: "#27543b", cover: "green", subCats: ["全部", "儒家", "道家", "法家", "兵家", "杂家", "小说"] },
  { id: "ji", cats: ["集"], name: "集部", desc: "诗词文集", intro: "楚辞汉赋，唐诗宋词，千古文心的风雅传承。", icon: "pen-line", from: "#9a4f6b", to: "#6e3147", cover: "red", subCats: ["全部", "楚辞", "别集", "总集", "诗文评", "词曲"] },
  { id: "fo", cats: ["释"], name: "释部", desc: "佛典经藏", intro: "三藏十二部，明心见性，般若智慧的法门。", icon: "sparkles", from: "#b8860b", to: "#8a6308", cover: "brown", subCats: ["全部"] },
  { id: "dao", cats: ["道", "道藏"], name: "道部", desc: "道藏丹经", intro: "道法自然，丹道养生，玄门修真的宝藏。", icon: "wind", from: "#2f7d7d", to: "#1c5454", cover: "green", subCats: ["全部"] },
  { id: "ming", cats: ["命"], name: "命理", desc: "术数命理", intro: "星命卜筮，推天道以明人事的玄机。", icon: "compass", from: "#7a4f9e", to: "#553672", cover: "blue", subCats: ["全部"] },
  { id: "yi", cats: ["医"], name: "医部", desc: "中医典籍", intro: "岐黄之术，济世活人的养生智慧。", icon: "leaf", from: "#3f8560", to: "#27543b", cover: "green", subCats: ["全部"] },
];

/** 详情/搜索结果封面色轮播（前端 CoverColor 取值）。 */
const COVER_COLORS = ["cream", "brown", "blue", "green", "red"];

/** 古籍馆固定热搜词（运营配置，后端暂无热搜统计）。 */
const HOT_SEARCH = [
  { keyword: "周易", isHot: true }, { keyword: "道德经", isHot: true }, { keyword: "论语", isHot: true },
  { keyword: "史记", isHot: false }, { keyword: "黄帝内经", isHot: true }, { keyword: "孙子兵法", isHot: false },
  { keyword: "庄子", isHot: false }, { keyword: "资治通鉴", isHot: false },
];

/** AI 阅读特性（前端原型固定展示项）。 */
const AI_FEATURES = [
  { icon: "file-text", label: "文白翻译" },
  { icon: "sparkles", label: "智能查词" },
  { icon: "headphones", label: "AI 听书" },
  { icon: "network", label: "知识图谱" },
];

type BookRow = {
  id: string; title: string; author: string | null; dynasty: string | null;
  category: string; cover: string | null; intro: string | null;
  chapterCount: number; viewCount: number; createdAt?: Date; source?: string | null;
};

function pickColor(i: number): string {
  return COVER_COLORS[i % COVER_COLORS.length];
}

function fmtReads(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : `${n}`;
}

@Injectable()
export class ClassicsBffService {
  constructor(
    private prisma: PrismaService,
    private classic: ClassicService,
  ) {}

  /**
   * 按书名去重，保留浏览量最高的版本（入参已按 viewCount 倒序，故保留首次出现者）。
   * 殆知阁/汉籍导入存在大量同名多版本书，不去重会让排行榜/精选区出现重复条目。
   */
  private dedupeByTitle<T extends { title: string }>(rows: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const r of rows) {
      if (seen.has(r.title)) continue;
      seen.add(r.title);
      out.push(r);
    }
    return out;
  }

  /**
   * 清洗书籍简介：殆知阁/汉籍导入的 intro 多为脚本生成的元数据
   * （如「殆知阁收录古籍《X》。分类：编年。原文共12345字。」「来源: 汉籍リポジトリ...」），
   * 对读者无价值，识别后替换为得体的通用描述。
   */
  private cleanIntro(intro: string | null | undefined, title: string): string {
    const raw = (intro || "").trim();
    const isMeta =
      !raw ||
      /^来源[:：]/.test(raw) ||
      /殆知阁收录古籍/.test(raw) ||
      /原文共\s*\d+\s*字/.test(raw) ||
      /共\s*\d+\s*章，\s*\d+\s*字/.test(raw);
    return isMeta ? `《${title}》，中华传统典籍，点击阅读全文。` : raw;
  }

  /** 清洗版本来源：殆知阁/汉籍/URL 等脚本来源对读者无意义，归为「通行本」。 */
  private cleanSource(s: string | null | undefined): string {
    const r = (s || "").trim();
    if (!r || /汉籍|殆知阁|http|リポジトリ|来源|ctext|wiki/i.test(r)) return "通行本";
    return r;
  }

  // ── 单本书 → 前端各结构的映射 ──

  /** → home.rankingData 的 RankItem */
  private toRankItem(b: BookRow) {
    return {
      id: b.id, title: b.title, author: b.author || "佚名",
      dynasty: b.dynasty || "—", desc: this.cleanIntro(b.intro, b.title), reads: b.viewCount,
    };
  }

  /** → ranking 页的 RankBook */
  private toRankBook(b: BookRow, rank: number) {
    return {
      id: b.id, rank, title: b.title, author: b.author || "佚名",
      dynasty: b.dynasty || "", views: fmtReads(b.viewCount),
      rating: 0, category: b.category, // rating 保留字段兼容类型，前端已不展示古籍星级
    };
  }

  /** → home.featuredBooks 的 FeaturedItem */
  private toFeatured(b: BookRow) {
    const meta = [b.author, b.dynasty].filter(Boolean).join(" · ") || "佚名";
    return { id: b.id, title: b.title, author: meta, desc: this.cleanIntro(b.intro, b.title), isFree: true };
  }

  /** → category.books 的 CatBook */
  private toCatBook(b: BookRow) {
    return {
      id: b.id, title: b.title, author: b.author || "佚名", dynasty: b.dynasty || "",
      desc: this.cleanIntro(b.intro, b.title), reads: b.viewCount, isFree: true,
    };
  }

  /** → search.results 的 SearchResultItem */
  private toSearchResult(b: BookRow, i: number) {
    return {
      id: b.id, title: b.title, author: b.author || "佚名", dynasty: b.dynasty || "—",
      description: this.cleanIntro(b.intro, b.title), reads: b.viewCount,
      rating: 4.7, isFree: true, color: pickColor(i),
    };
  }

  // ── 端点 ──

  /** 首页聚合：统计 + 四部 + 排行 + 精选 */
  async getHome() {
    const [grouped, chapterTotal, topRes, listsFull] = await Promise.all([
      this.prisma.classicBook.groupBy({
        by: ["category"],
        where: { status: "PUBLISHED" },
        _count: { _all: true },
      }),
      this.prisma.classicChapter.count(),
      this.classic.listBooks({ sortBy: "viewCount", pageSize: 40 }),
      this.getLists(),
    ]);
    // 去重后，排行榜取前 5，精选区紧随其后取 6~10，避免两个板块出现同名书
    const topBooks = this.dedupeByTitle(topRes.books as BookRow[]);

    const countByCat: Record<string, number> = {};
    let total = 0;
    for (const g of grouped) {
      countByCat[g.category] = g._count._all;
      total += g._count._all;
    }

    const libraryStats = [
      { value: fmtReads(total), label: "部典籍" },
      { value: String(grouped.length), label: "门类" },
      { value: fmtReads(chapterTotal), label: "篇章" },
    ];

    const categories = CATEGORY_TILES.map((t) => ({
      id: t.id, name: t.name, desc: t.desc, icon: t.icon, from: t.from, to: t.to,
      count: `${t.cats.reduce((s, c) => s + (countByCat[c] || 0), 0).toLocaleString()} 部`,
    }));

    const top = topBooks[0];
    const todayFeature = top
      ? {
          id: top.id, title: top.title,
          author: [top.author, top.dynasty].filter(Boolean).join(" · ") || "佚名",
          // 标题句取简介第一句（整句·不再腰斩半句），简介从第二句起——
          // 原先 quote=前30字/desc=前60字，首屏同一段文字出现两遍（2026-07-15 走查修）
          ...(() => {
            const intro = this.cleanIntro(top.intro, top.title);
            const first = (intro.split(/[。！？!?]/)[0] || intro).slice(0, 26);
            const rest = intro.slice(first.length).replace(/^[。！？!?，、；;\s"”]+/, "");
            return { tagline: "今日导读", quote: first, desc: (rest || intro).slice(0, 60) };
          })(),
        }
      : null;

    return {
      libraryStats,
      categories,
      todayFeature,
      lastReading: null, // 需登录态，后续批次接入
      weeklyMinutes: 0,
      bookLists: listsFull.slice(0, 3).map((l) => ({
        id: l.id, title: l.title, desc: l.desc, count: l.bookCount,
        books: l.books.map((b) => ({ title: b.title })),
      })),
      rankingData: topBooks.slice(0, 5).map((b) => this.toRankItem(b)),
      // 听书：热门古籍 AI 语音朗读（正文即音源），首页推 4 本
      audioBooks: topBooks.slice(0, 4).map((b) => ({
        id: b.id, title: b.title, narrator: "AI 智能语音",
        desc: this.cleanIntro(b.intro, b.title),
      })),
      featuredBooks: topBooks.slice(5, 9).map((b) => this.toFeatured(b)),
    };
  }

  /** 分类书籍列表：jing/shi/zi/ji */
  async getCategory(cat: string, sort = "hot") {
    const tile = CATEGORY_TILES.find((t) => t.id === cat) || CATEGORY_TILES[0];
    const where = { status: "PUBLISHED", category: { in: tile.cats } };
    const [rows, count] = await Promise.all([
      this.prisma.classicBook.findMany({
        where,
        select: {
          id: true, title: true, author: true, dynasty: true,
          category: true, cover: true, intro: true, chapterCount: true,
          viewCount: true, createdAt: true,
        },
        orderBy: sort === "new" ? { createdAt: "desc" } : { viewCount: "desc" },
        take: 120,
      }),
      this.prisma.classicBook.count({ where }),
    ]);
    const config = {
      name: tile.name, desc: tile.desc, intro: tile.intro,
      count: count.toLocaleString(), from: tile.from, to: tile.to,
      cover: tile.cover, icon: tile.icon, subCats: tile.subCats,
    };
    const deduped = this.dedupeByTitle(rows as BookRow[]);
    // 最新：按收录时间直接展示；最热：数据完整(有作者朝代)的精校经典优先，无名氏冷门书靠后
    const books = sort === "new"
      ? deduped.slice(0, 30)
      : [
          ...deduped.filter((b) => b.author && b.dynasty),
          ...deduped.filter((b) => !(b.author && b.dynasty)),
        ].slice(0, 30);
    return { config, books: books.map((b) => this.toCatBook(b)) };
  }

  /** 图书详情 */
  async getDetail(id: string) {
    const book = (await this.classic.getBook(id)) as BookRow & {
      chapters: { id: string; title: string; sortOrder: number }[];
    };
    const related = await this.classic.listBooks({ category: book.category, sortBy: "viewCount", pageSize: 12 });
    const commentary = await this.prisma.classicCommentary
      .findFirst({
        where: { bookId: id, type: "现代解读", status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        select: { content: true },
      })
      .catch(() => null);
    const relatedBooks = this.dedupeByTitle(
      (related.books as BookRow[]).filter((b) => b.id !== id && b.title !== book.title),
    )
      .slice(0, 3)
      .map((b) => ({ id: b.id, title: b.title, author: b.author || "佚名", dynasty: b.dynasty || "—" }));

    const info = {
      id: book.id, title: book.title, author: book.author || "佚名", dynasty: book.dynasty || "—",
      version: this.cleanSource(book.source),
      description: this.cleanIntro(book.intro, book.title),
      aiSummary: commentary?.content || "", // 编辑部深度导读（ClassicCommentary 现代解读）
      reads: book.viewCount, rating: 0, // 古籍不做星级评分
      totalChapters: book.chapterCount,
      hasAI: true, hasAudio: true, hasTranslation: true, // AI 阅读(文白对照/查词) + AI 语音听书
      isFree: true, isInBookshelf: false,
      color: pickColor(0),
      chapters: (book.chapters || []).map((c) => ({ id: c.id, title: c.title })),
      relatedBooks,
    };
    return { book: info, discussions: [], aiFeatures: AI_FEATURES };
  }

  /** 排行榜（hot=阅读量 / new=最新收录，真实切换） */
  async getRanking(sort = "hot") {
    const sortBy = sort === "new" ? "createdAt" : "viewCount";
    const res = await this.classic.listBooks({ sortBy, pageSize: 40 });
    const books = this.dedupeByTitle(res.books as BookRow[])
      .slice(0, 10)
      .map((b, i) => this.toRankBook(b, i + 1));
    // 古籍不做星级评分（决策B），仅按热度/最新；前端据此真实切换重取
    const tabs = [
      { key: "hot", label: "热门" },
      { key: "new", label: "最新" },
    ];
    return { books, tabs };
  }

  /** 搜索 */
  async getSearch(query: string) {
    const q = (query || "").trim();
    if (!q) {
      // 无关键词时用热门书填充「为你推荐」，避免初始搜索页空板块
      const hot = await this.classic.listBooks({ sortBy: "viewCount", pageSize: 20 });
      const rows = this.dedupeByTitle(hot.books as BookRow[]).slice(0, 10);
      return {
        results: rows.map((b, i) => this.toSearchResult(b, i)),
        suggestions: [], hotSearch: HOT_SEARCH, history: [],
      };
    }
    const res = await this.classic.listBooks({ keyword: q, sortBy: "viewCount", pageSize: 40 });
    const rows = this.dedupeByTitle(res.books as BookRow[]).slice(0, 20);
    return {
      results: rows.map((b, i) => this.toSearchResult(b, i)),
      suggestions: rows.slice(0, 5).map((b) => b.title),
      hotSearch: HOT_SEARCH,
      history: [],
    };
  }

  // ── 暂无数据源 / 需登录态，返回空态（前端走 empty 状态，不回退假数据）──

  async getBookshelf() {
    return { books: [], groups: [], history: [] };
  }

  /** 听书书目：热门且有章节正文的古籍（AI 语音朗读，正文即音源） */
  async getAudiobooks() {
    const res = await this.classic.listBooks({ sortBy: "viewCount", pageSize: 30 });
    const books = this.dedupeByTitle(res.books as BookRow[])
      .filter((b) => b.chapterCount > 0)
      .slice(0, 12);
    return books.map((b, i) => ({
      id: b.id,
      title: b.title,
      shortTitle: b.title.length > 4 ? b.title.slice(0, 4) : b.title,
      author: b.author || "佚名",
      dynasty: b.dynasty || "",
      narrator: "AI 智能语音",
      chapters: b.chapterCount,
      plays: b.viewCount,
      desc: this.cleanIntro(b.intro, b.title),
      color: pickColor(i),
    }));
  }

  // 播放器直接复用 detail + chapter（章节正文即朗读音源），此端点保留兼容
  async getAudiobookPlayer(_id: string) {
    return null;
  }

  async getBookmarks() {
    return [];
  }

  async getNotes() {
    return [];
  }

  // collections(我的收藏)走 /classic/favorites(需登录)，此 BFF 端点保留兼容返回空
  async getCollections() {
    return [];
  }

  /** 精选书单列表（运营策划内容） */
  async getLists() {
    const lists = await this.prisma.classicBookList.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
    });
    return Promise.all(
      lists.map(async (l) => {
        const ids = (l.bookIds as string[]) || [];
        const covers = await this.prisma.classicBook.findMany({
          where: { id: { in: ids.slice(0, 3) } },
          select: { id: true, title: true },
        });
        // 按 ids 顺序排封面
        const orderedCovers = ids.slice(0, 3)
          .map((bid) => covers.find((c) => c.id === bid))
          .filter(Boolean) as { id: string; title: string }[];
        return {
          id: l.id, title: l.title, author: l.curator || "国学编辑部",
          bookCount: ids.length, likes: l.likeCount,
          desc: l.description || "", tags: (l.tags as string[]) || [],
          liked: false, color: l.coverColor,
          books: orderedCovers.map((b, i) => ({ title: b.title, color: pickColor(i) })),
        };
      }),
    );
  }

  /** 书单详情（含书目） */
  async getCollectionDetail(id: string) {
    const l = await this.prisma.classicBookList.findUnique({ where: { id } });
    if (!l) return null;
    const ids = (l.bookIds as string[]) || [];
    const books = await this.prisma.classicBook.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, author: true, dynasty: true, intro: true },
    });
    const ordered = ids
      .map((bid) => books.find((b) => b.id === bid))
      .filter(Boolean) as { id: string; title: string; author: string | null; dynasty: string | null; intro: string | null }[];
    this.prisma.classicBookList.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    return {
      id: l.id, title: l.title, description: l.description || "",
      cover: l.coverColor, curator: l.curator || "国学编辑部",
      bookCount: ids.length, viewCount: l.viewCount, tags: (l.tags as string[]) || [],
      books: ordered.map((b, i) => ({
        id: b.id, title: b.title, author: b.author || "佚名", dynasty: b.dynasty || "—",
        description: this.cleanIntro(b.intro, b.title), hasAI: true, hasTranslation: true, coverColor: pickColor(i),
      })),
    };
  }
}
