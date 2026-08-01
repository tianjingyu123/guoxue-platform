import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * 对话后的向导式推荐。
 *
 * 设计原则：
 * 1. 先解决问题，再给下一步；
 * 2. 默认优先文章、古籍、视频、直播、工具和智能体；
 * 3. 在入门、练习、复盘等自然学习节点主动衔接课程或圈子，不错过合理服务机会；
 * 4. 明确需求与高相关场景直接展示，低置信商业推荐才先征求同意；
 * 5. 每次最多两条，价格与商业属性不做隐藏，投诉等负面场景不插入推荐。
 */
export type RecoType =
  | "article"
  | "classic"
  | "video"
  | "live"
  | "agent"
  | "tool"
  | "course"
  | "circle"
  | "product";

export interface RecoIntent {
  type: RecoType;
  query: string;
  reason?: string;
}

export interface RecoCard {
  type: RecoType;
  data: Record<string, unknown>;
}

export interface Recommendation {
  presentation: "inline" | "consent";
  title: string;
  lead: string;
  consentPrompt: string;
  commercialDisclosure?: string;
  items: RecoCard[];
}

const CONTENT_TYPES = new Set<RecoType>(["article", "classic", "video", "live", "agent", "tool"]);
const COMMERCIAL_TYPES = new Set<RecoType>(["course", "circle", "product"]);
const ALL_TYPES = new Set<RecoType>([...CONTENT_TYPES, ...COMMERCIAL_TYPES]);

const NEGATIVE_SERVICE_RE = /投诉|举报|退款|退费|被骗|欺诈|不满意|垃圾|错误|答非所问|连接失败|加载失败|无法使用|崩溃|卡死|人工客服/;
const EXPLICIT_RECOMMEND_RE = /推荐|有没有|哪里有|给我找|帮我找|想看|想听|想买|购买|报名|加入|多少钱|价格/;
const LEARNING_STAGE_RE = /入门|学习|怎么学|如何学|计划|路线|基础|练习|训练|复习|打卡|进阶|系统学|看不懂|讲解|制定|每周|课程/;
const COMMUNITY_RE = /交流|同好|一起学|讨论|反馈|点评|打卡|社群|圈子|加入/;
const PRODUCT_RE = /商品|购买|想买|买一|价格|多少钱|用品|材料|器材|设备|礼物|文房|茶具|香具|砚|墨|笔|纸/;

const TOPICS = [
  "八字", "紫微", "风水", "奇门", "六爻", "梅花易数", "择日", "周易", "易经",
  "论语", "道德经", "中医", "国学", "书法", "茶道", "香道", "古琴", "诗词",
];

const TOOL_GUIDES = [
  { keys: ["万年历", "节气", "历法", "黄历"], title: "万年历", intro: "查日期、节气与传统历法信息", href: "/paipan/wannianli", icon: "calendar" },
  { keys: ["八字", "四柱"], title: "四柱排盘", intro: "用结构化盘面辅助学习与记录", href: "/paipan/bazi", icon: "grid" },
  { keys: ["紫微"], title: "紫微排盘", intro: "查看宫位、星曜与基础盘面", href: "/paipan/ziwei", icon: "compass" },
  { keys: ["六爻"], title: "六爻排盘", intro: "记录起卦信息并查看标准盘面", href: "/paipan/liuyao", icon: "hexagon" },
  { keys: ["七政", "星盘"], title: "七政四余星盘", intro: "查看传统星命盘面与基础参数", href: "/paipan/qizheng", icon: "orbit" },
] as const;

@Injectable()
export class RecommendationService {
  constructor(private prisma: PrismaService) {}

  parseProtocol(content: string): { clean: string; intents: RecoIntent[] } {
    const re = /<!--\s*RECO:?\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*-->/;
    const match = content.match(re);
    if (!match) return { clean: content, intents: [] };

    let intents: RecoIntent[] = [];
    try {
      const parsed = JSON.parse(match[1]);
      intents = this.normalizeIntents(Array.isArray(parsed) ? parsed : [parsed]);
    } catch {
      // 协议解析失败时只移除机器标记，后续由平台规则兜底。
    }
    return { clean: content.replace(re, "").trim(), intents };
  }

  private normalizeIntents(arr: unknown[]): RecoIntent[] {
    const result: RecoIntent[] = [];
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const type = record.type as RecoType;
      const query = typeof record.query === "string" ? record.query.trim() : "";
      if (!ALL_TYPES.has(type) || !query) continue;
      result.push({
        type,
        query: query.slice(0, 40),
        reason: record.reason ? String(record.reason).slice(0, 80) : undefined,
      });
    }
    return result.slice(0, 4);
  }

  /** 平台兜底：即使模型没有输出协议，也优先把用户带到内容与工具。 */
  fallbackIntents(userQuery: string): RecoIntent[] {
    const query = userQuery.trim();
    if (!query || NEGATIVE_SERVICE_RE.test(query)) return [];
    const toolSignal = /工具|排盘|查询|日历|万年历|怎么排|生成盘面/.test(query);
    const directTool = toolSignal
      ? TOOL_GUIDES.find((item) => item.keys.some((key) => query.includes(key)))
      : undefined;
    const topic = TOPICS.find((item) => query.includes(item)) || directTool?.keys[0];
    if (!topic) return [];

    const wantsTool = toolSignal;
    const wantsClassic = /原文|古籍|典籍|出处|原典|书里|阅读/.test(query);
    const wantsVideo = /视频|演示|讲解视频|怎么看/.test(query);
    const wantsLive = /直播|开播|直播课|几点开始/.test(query);
    const wantsAgent = /智能体|助手|陪练|问答/.test(query);
    const wantsCourse = LEARNING_STAGE_RE.test(query);
    const wantsCircle = COMMUNITY_RE.test(query);
    const wantsProduct = PRODUCT_RE.test(query);
    const explicitCourse = /课程|报名|跟老师学|有推荐的课|推荐.*课/.test(query);
    const explicitCircle = /圈子|社群|加入|同好|一起学/.test(query);
    const explicitProduct = PRODUCT_RE.test(query);

    const intents: RecoIntent[] = [];
    if (explicitCourse) intents.push({ type: "course", query: topic, reason: `沿着当前目标系统学习${topic}` });
    else if (explicitCircle) intents.push({ type: "circle", query: topic, reason: `在持续交流与反馈中学习${topic}` });
    else if (explicitProduct) intents.push({ type: "product", query: topic, reason: `与你当前使用场景直接相关` });
    else if (wantsTool) intents.push({ type: "tool", query: topic, reason: `用工具查看${topic}的结构化信息` });
    else if (wantsClassic) intents.push({ type: "classic", query: topic, reason: `回到原典继续了解${topic}` });
    else if (wantsVideo) intents.push({ type: "video", query: topic, reason: `用短视频快速理解${topic}` });
    else if (wantsLive) intents.push({ type: "live", query: topic, reason: `查看${topic}相关直播与预告` });
    else if (wantsAgent) intents.push({ type: "agent", query: topic, reason: `继续用结构化问答学习${topic}` });
    else intents.push({ type: "article", query: topic, reason: `先读一篇${topic}相关内容` });

    if (wantsCourse && !explicitCourse) intents.push({ type: "course", query: topic, reason: `把零散理解推进为${topic}学习路线` });
    else if (wantsCircle && !explicitCircle) intents.push({ type: "circle", query: topic, reason: `与${topic}同好继续交流和复盘` });
    else if (wantsProduct && !explicitProduct) intents.push({ type: "product", query: topic, reason: `查看与当前使用场景相关的商品` });

    if (explicitCourse) intents.push({ type: "article", query: topic, reason: `先用一篇内容判断${topic}是否适合你` });
    else if (explicitCircle) intents.push({ type: "article", query: topic, reason: `加入前先了解${topic}圈内常见话题` });
    else if (explicitProduct) intents.push({ type: "article", query: topic, reason: `购买前先了解相关使用方法` });

    return intents.slice(0, 2);
  }

  private allowsCommercial(type: RecoType, query: string): boolean {
    if (type === "course") return LEARNING_STAGE_RE.test(query) || EXPLICIT_RECOMMEND_RE.test(query);
    if (type === "circle") return COMMUNITY_RE.test(query) || /坚持|互相督促/.test(query);
    if (type === "product") return PRODUCT_RE.test(query);
    return true;
  }

  private prioritize(intents: RecoIntent[], userQuery: string): RecoIntent[] {
    if (NEGATIVE_SERVICE_RE.test(userQuery)) return [];
    const explicit = EXPLICIT_RECOMMEND_RE.test(userQuery);
    const allowed = intents.filter((item) => !COMMERCIAL_TYPES.has(item.type) || this.allowsCommercial(item.type, userQuery));
    return [...allowed].sort((left, right) => {
      const leftWeight = explicit && COMMERCIAL_TYPES.has(left.type) ? 0 : CONTENT_TYPES.has(left.type) ? 1 : 2;
      const rightWeight = explicit && COMMERCIAL_TYPES.has(right.type) ? 0 : CONTENT_TYPES.has(right.type) ? 1 : 2;
      return leftWeight - rightWeight;
    }).slice(0, 2);
  }

  private presentationFor(userQuery: string, items: RecoCard[]): Recommendation["presentation"] {
    const hasCommerce = items.some((item) => COMMERCIAL_TYPES.has(item.type));
    if (!hasCommerce) return "inline";
    if (EXPLICIT_RECOMMEND_RE.test(userQuery) || LEARNING_STAGE_RE.test(userQuery) || COMMUNITY_RE.test(userQuery)) {
      return "inline";
    }
    return "consent";
  }

  private recommendationCopy(userQuery: string, items: RecoCard[]) {
    const labels = [...new Set(items.map((item) => ({
      article: "文章",
      classic: "古籍",
      video: "视频",
      live: "直播",
      agent: "智能体",
      tool: "工具",
      course: "课程",
      circle: "圈子",
      product: "商品",
    })[item.type]))];
    const explicit = EXPLICIT_RECOMMEND_RE.test(userQuery);
    const learningStage = LEARNING_STAGE_RE.test(userQuery);
    const title = explicit ? "按你的需要找到了" : learningStage ? "把这一步接着走下去" : "顺着这个问题继续";
    const lead = explicit
      ? `以下${labels.join("和")}与刚才的需求直接相关，可以立即查看。`
      : learningStage
        ? `一条现在就能开始，一条帮助你持续推进；不必一次全部选择。`
        : `补充一条高相关内容，方便你继续理解，不打断当前对话。`;
    return { labels, title, lead };
  }

  async match(intents: RecoIntent[]): Promise<RecoCard[]> {
    const cards: RecoCard[] = [];
    for (const intent of intents.slice(0, 2)) {
      const card = await this.matchOne(intent);
      if (card) cards.push(card);
    }
    const seen = new Set<string>();
    return cards.filter((card) => {
      const key = `${card.type}:${String(card.data.id || card.data.href)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async matchOne(intent: RecoIntent): Promise<RecoCard | null> {
    const common = { mode: "insensitive" as const, contains: intent.query };

    if (intent.type === "tool") {
      const tool = TOOL_GUIDES.find((item) => item.keys.some((key) => intent.query.includes(key) || key.includes(intent.query)))
        || TOOL_GUIDES.find((item) => item.keys.some((key) => TOPICS.includes(intent.query) && key === intent.query));
      if (!tool) return { type: "tool", data: { id: "paipan-center", title: "国学工具箱", intro: "从排盘、历法与知识工具中选择下一步", href: "/paipan", reason: intent.reason } };
      return { type: "tool", data: { id: tool.href, title: tool.title, intro: tool.intro, href: tool.href, icon: tool.icon, reason: intent.reason } };
    }

    if (intent.type === "article") {
      const row = await this.prisma.article.findFirst({
        where: {
          deletedAt: null,
          auditStatus: "APPROVED",
          visibility: "PLATFORM",
          cover: { not: null },
          OR: [{ title: common }, { excerpt: common }, { tags: { has: intent.query } }],
        },
        orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
        select: { id: true, title: true, cover: true, excerpt: true, viewCount: true },
      });
      return row ? { type: "article", data: { ...row, href: `/articles/${row.id}`, reason: intent.reason } } : null;
    }

    if (intent.type === "classic") {
      const row = await this.prisma.classicBook.findFirst({
        where: {
          deletedAt: null,
          status: "PUBLISHED",
          OR: [{ title: common }, { intro: common }, { category: common }],
        },
        orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
        select: { id: true, title: true, cover: true, intro: true, author: true, dynasty: true, viewCount: true },
      });
      return row ? { type: "classic", data: { ...row, href: `/classics/${row.id}`, reason: intent.reason } } : null;
    }

    if (intent.type === "video") {
      const row = await this.prisma.video.findFirst({
        where: {
          status: "PUBLISHED",
          auditStatus: "APPROVED",
          visibility: "PLATFORM",
          OR: [{ title: common }, { description: common }, { tags: { has: intent.query } }],
        },
        orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
        select: { id: true, title: true, description: true, coverUrl: true, duration: true, viewCount: true },
      });
      return row ? { type: "video", data: { ...row, href: `/video/${row.id}`, reason: intent.reason } } : null;
    }

    if (intent.type === "live") {
      const row = await this.prisma.liveRoom.findFirst({
        where: {
          auditStatus: "APPROVED",
          visibility: "PLATFORM",
          status: { in: ["LIVING", "WAITING", "REPLAY"] },
          OR: [{ title: common }, { description: common }],
        },
        orderBy: [{ viewCount: "desc" }, { startTime: "desc" }],
        select: { id: true, title: true, description: true, cover: true, status: true, startTime: true, viewCount: true },
      });
      return row ? { type: "live", data: { ...row, href: `/live/${row.id}`, reason: intent.reason } } : null;
    }

    if (intent.type === "agent") {
      const row = await this.prisma.botConfig.findFirst({
        where: { status: "ACTIVE", OR: [{ name: common }, { intro: common }, { type: common }] },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, avatar: true, intro: true, isFree: true, price: true },
      });
      return row ? { type: "agent", data: { ...row, price: row.price ? Number(row.price) : 0, href: `/agent/${row.id}`, reason: intent.reason } } : null;
    }

    if (intent.type === "course") {
      const baseWhere = {
        deletedAt: null,
        auditStatus: "APPROVED" as const,
        visibility: "PLATFORM" as const,
      };
      // 标题和简介是课程主题的强信号，标签只用于兜底。
      // 避免历史脏标签让高热度但主题无关的课程抢占推荐位。
      let row = await this.prisma.course.findFirst({
        where: {
          ...baseWhere,
          OR: [{ title: common }, { intro: common }],
        },
        orderBy: [{ studentCount: "desc" }, { createdAt: "desc" }],
        select: { id: true, title: true, cover: true, intro: true, price: true, studentCount: true },
      });
      if (!row) {
        row = await this.prisma.course.findFirst({
          where: {
            ...baseWhere,
            tags: { has: intent.query },
          },
          orderBy: [{ studentCount: "desc" }, { createdAt: "desc" }],
          select: { id: true, title: true, cover: true, intro: true, price: true, studentCount: true },
        });
      }
      return row ? { type: "course", data: { ...row, price: Number(row.price), href: `/courses/${row.id}`, reason: intent.reason } } : null;
    }

    if (intent.type === "circle") {
      const row = await this.prisma.circle.findFirst({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          OR: [{ name: common }, { intro: common }, { tags: { has: intent.query } }],
        },
        orderBy: [{ memberCount: "desc" }, { createdAt: "desc" }],
        select: { id: true, name: true, cover: true, memberCount: true, intro: true, type: true, price: true },
      });
      return row ? { type: "circle", data: { ...row, price: Number(row.price), href: `/circles/${row.id}`, reason: intent.reason } } : null;
    }

    const row = await this.prisma.product.findFirst({
      where: {
        deletedAt: null,
        status: "ON_SALE",
        OR: [{ title: common }, { intro: common }, { tags: { has: intent.query } }],
      },
      orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, images: true, intro: true, price: true, originalPrice: true, salesCount: true },
    });
    return row ? {
      type: "product",
      data: {
        ...row,
        cover: row.images[0] || "",
        price: Number(row.price),
        originalPrice: row.originalPrice ? Number(row.originalPrice) : null,
        href: `/shop/${row.id}`,
        reason: intent.reason,
      },
    } : null;
  }

  async build(rawContent: string, userQuery: string): Promise<{ content: string; recommendation: Recommendation | null }> {
    const { clean, intents: protocolIntents } = this.parseProtocol(rawContent);
    let fallback = this.fallbackIntents(userQuery);
    // “有推荐的课程吗”这类续问常省略上一轮主题；模型未按协议输出时，
    // 只在明确推荐/学习场景从本轮回答前 300 字补足主题，避免普通闲聊误触发。
    if (!fallback.length && (EXPLICIT_RECOMMEND_RE.test(userQuery) || LEARNING_STAGE_RE.test(userQuery))) {
      fallback = this.fallbackIntents(`${userQuery} ${clean.slice(0, 300)}`);
    }
    const source = protocolIntents.length ? protocolIntents : fallback;
    const userTopic = TOPICS.find((topic) => userQuery.includes(topic));
    const topicAnchoredSource = userTopic
      ? source.map((intent) => (
          COMMERCIAL_TYPES.has(intent.type)
            ? { ...intent, query: userTopic }
            : intent
        ))
      : source;
    const intents = this.prioritize(topicAnchoredSource, userQuery);
    if (!intents.length) return { content: clean, recommendation: null };

    const items = await this.match(intents);
    if (!items.length) return { content: clean, recommendation: null };

    const presentation = this.presentationFor(userQuery, items);
    const { labels, title, lead } = this.recommendationCopy(userQuery, items);
    const hasCommerce = items.some((item) => COMMERCIAL_TYPES.has(item.type));
    const consentPrompt = hasCommerce
      ? `我找到${labels.join("、")}，都和你刚才的问题直接相关；其中商业内容会明确标注价格。要继续看看吗？`
      : `我找到${labels.join("、")}，都和你刚才的问题直接相关。要继续看看吗？`;

    return {
      content: clean,
      recommendation: {
        presentation,
        title,
        lead,
        consentPrompt,
        commercialDisclosure: hasCommerce ? "含商业服务，价格与权益均如实标注" : undefined,
        items,
      },
    };
  }
}
