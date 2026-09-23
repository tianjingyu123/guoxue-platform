import { Injectable } from "@nestjs/common";
import { SearchService } from "./search.service";
import { shouldSuppressContentGuide, wantsCircleResources, wantsCourseResources, wantsProductResources, wantsVideoResources } from "./ai-search-intent";

/**
 * 内容导览服务（S08）
 *
 * 把全局搜索结果统一映射成「来源卡片」，供「小卜帮我找」的语音/文字入口使用。
 * - 只返回真实存在、已发布且当前用户可访问的内容（复用 SearchService 的审核状态与隔离过滤）
 * - 卡片带导航目标 target（前端据此跳转并回到阅读位置）
 * - 不拼造链接、不执行任意 URL；会员/付费内容只展示有权展示的摘要
 */
@Injectable()
export class ContentGuideService {
  constructor(private readonly search: SearchService) {}

  private readonly topics = [
    "梅花易数", "紫微斗数", "道德经", "三字经", "千字文", "弟子规", "万年历",
    "八字", "四柱", "紫微", "周易", "易经", "论语", "诗词", "书法", "茶道",
    "古琴", "风水", "奇门", "六爻", "节气", "国学", "礼仪", "蒙学",
  ];

  private hasCards(result: Record<string, unknown>, query: string): boolean {
    const eligibleGroups = [
      "articles", "classics",
      ...(wantsCourseResources(query) ? ["courses"] : []),
      ...(wantsCircleResources(query) ? ["circles"] : []),
      ...(wantsVideoResources(query) ? ["videos"] : []),
      ...(wantsProductResources(query) ? ["products"] : []),
    ];
    return eligibleGroups
      .some((key) => Array.isArray(result[key]) && (result[key] as unknown[]).length > 0);
  }

  /** 把全局搜索结果映射成统一来源卡片 */
  async guide(query: string, topK = 8): Promise<GuideResult> {
    const q = String(query || "").trim().slice(0, 200);
    if (!q) return { query: "", cards: [] };
    if (shouldSuppressContentGuide(q)) return { query: q, cards: [] };
    const limit = Math.min(Math.max(Number(topK) || 4, 1), 8);

    let raw = await this.search.search({ q, page: 1, pageSize: 20, fresh: true });
    // 自然问句通常不会完整出现在标题中；零命中时用明确出现的主题词补检一次。
    if (!this.hasCards(raw as Record<string, unknown>, q)) {
      const topic = this.topics.find((item) => q.includes(item));
      if (topic && topic !== q) raw = await this.search.search({ q: topic, page: 1, pageSize: 20, fresh: true });
    }

    const groups = new Map<GuideCardType, GuideCard[]>();
    const push = (
      type: GuideCardType,
      list: any[],
      fields: {
        id: (r: any) => string;
        title: (r: any) => string;
        subtitle?: (r: any) => string;
        cover?: (r: any) => string | undefined;
        price?: (r: any) => number | string | null;
      },
    ) => {
      for (const r of list || []) {
        const id = String(fields.id(r) || "").trim();
        const title = String(fields.title(r) || "").trim();
        if (!id || !title) continue;
        const cards = groups.get(type) || [];
        cards.push({
          type,
          id,
          title,
          subtitle: fields.subtitle ? String(fields.subtitle(r) || "").trim() : undefined,
          cover: fields.cover ? fields.cover(r) : undefined,
          price: fields.price && Number.isFinite(Number(fields.price(r)))
            ? Math.max(0, Number(fields.price(r))) : undefined,
          target: this.buildTarget(type, id),
        });
        groups.set(type, cards);
      }
    };

    const res = raw as any;
    push("classic", res.classics, {
      id: (r) => r.id,
      title: (r) => r.title,
      subtitle: (r) => [r.author, r.dynasty, r.category].filter(Boolean).join(" · "),
      cover: (r) => r.cover,
    });
    push("article", res.articles, {
      id: (r) => r.id,
      title: (r) => r.title,
      subtitle: (r) => r.excerpt,
      cover: (r) => r.cover,
    });
    if (wantsCourseResources(q)) push("course", res.courses, {
      id: (r) => r.id,
      title: (r) => r.title,
      subtitle: (r) => r.intro,
      cover: (r) => r.cover,
      price: (r) => r.price,
    });
    if (wantsCircleResources(q)) push("circle", res.circles, {
      id: (r) => r.id,
      title: (r) => r.name,
      subtitle: (r) => r.intro,
      cover: (r) => r.cover,
      price: (r) => r.price,
    });
    if (wantsVideoResources(q)) push("video", res.videos, {
      id: (r) => r.id,
      title: (r) => r.title,
      subtitle: (r) => r.description,
      cover: (r) => r.coverUrl,
    });
    if (wantsProductResources(q)) push("product", res.products, {
      id: (r) => r.id,
      title: (r) => r.title,
      subtitle: (r) => r.intro,
      cover: (r) => r.images?.[0],
      price: (r) => r.price,
    });

    // 跨类型轮取；课程和圈子分别按用户明确意图进入候选。
    const priority: GuideCardType[] = wantsVideoResources(q)
      ? ["video", "article", "classic", "course", "circle", "product"]
      : wantsProductResources(q)
        ? ["product", "article", "classic", "course", "circle", "video"]
      : /课程|系统学|入门|学习路线/.test(q)
      ? ["course", "article", "classic", "circle", "video", "product"]
      : /圈子|社群|交流|同好/.test(q)
        ? ["circle", "article", "course", "classic", "video", "product"]
        : /原文|古籍|典籍|出处/.test(q)
          ? ["classic", "article", "course", "circle", "video", "product"]
          : ["article", "classic", "course", "circle", "video", "product"];
    const cards: GuideCard[] = [];
    while (cards.length < limit && priority.some((type) => groups.get(type)?.length)) {
      for (const type of priority) {
        const next = groups.get(type)?.shift();
        if (next) cards.push(next);
        if (cards.length >= limit) break;
      }
    }
    return { query: q, cards };
  }

  /**
   * 构建导航目标（前端真实页面路径）
   *
   * 与 apps/mobile/src/pages.json 及全局搜索结果页（lib/search-data.ts + utils/router.ts 动态路由）保持一致：
   * - 文章 /articles/:id → /pkg-circle/articles/detail
   * - 圈子 /circles/:id → /pkg-circle/circles/detail
 * - Content 内容表暂无安全且能按其 ID 打开的前端详情页，因此暂不发卡片。
   */
  private buildTarget(type: GuideCardType, id: string): string {
    const encoded = encodeURIComponent(id);
    switch (type) {
      case "classic": return `/pkg-classics/detail/index?id=${encoded}`;
      case "article": return `/pkg-circle/articles/detail?id=${encoded}`;
      case "course": return `/pkg-course/detail/index?id=${encoded}`;
      case "circle": return `/pkg-circle/circles/detail?id=${encoded}`;
      case "video": return `/pkg-video/detail/index?id=${encoded}`;
      case "product": return `/pkg-mall/product/detail?id=${encoded}`;
      default: return `/`;
    }
  }
}

export type GuideCardType = "classic" | "article" | "course" | "circle" | "video" | "product";

export interface GuideCard {
  type: GuideCardType;
  id: string;
  title: string;
  subtitle?: string;
  cover?: string;
  /** 当前检索时的价格快照，权益及最终价格以详情页为准 */
  price?: number;
  /** 前端导航目标路径 */
  target: string;
}

export interface GuideResult {
  query: string;
  cards: GuideCard[];
}
