import { Injectable } from "@nestjs/common";
import { SearchService } from "./search.service";

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

  /** 把全局搜索结果映射成统一来源卡片 */
  async guide(query: string, topK = 8): Promise<GuideResult> {
    const q = (query || "").trim();
    if (!q) return { query: "", cards: [] };

    const raw = await this.search.search({ q, page: 1, pageSize: 20 });

    const cards: GuideCard[] = [];
    const push = (
      type: GuideCardType,
      list: any[],
      fields: {
        id: (r: any) => string;
        title: (r: any) => string;
        subtitle?: (r: any) => string;
        cover?: (r: any) => string | undefined;
      },
    ) => {
      for (const r of list || []) {
        cards.push({
          type,
          id: String(fields.id(r)),
          title: String(fields.title(r) || "").trim(),
          subtitle: fields.subtitle ? String(fields.subtitle(r) || "").trim() : undefined,
          cover: fields.cover ? fields.cover(r) : undefined,
          target: this.buildTarget(type, String(fields.id(r))),
        });
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
    push("course", res.courses, {
      id: (r) => r.id,
      title: (r) => r.title,
      subtitle: (r) => r.intro,
      cover: (r) => r.cover,
    });
    push("circle", res.circles, {
      id: (r) => r.id,
      title: (r) => r.name,
      subtitle: (r) => r.intro,
      cover: (r) => r.cover,
    });
    push("content", res.contents, {
      id: (r) => r.id,
      title: (r) => r.title,
      subtitle: (r) => [r.author, r.dynasty].filter(Boolean).join(" · ") || r.excerpt,
      cover: (r) => r.cover,
    });

    return { query: q, cards: cards.slice(0, topK) };
  }

  /**
   * 构建导航目标（前端真实页面路径）
   *
   * 与 apps/mobile/src/pages.json 及全局搜索结果页（lib/search-data.ts + utils/router.ts 动态路由）保持一致：
   * - 文章 /articles/:id → /pkg-circle/articles/detail
   * - 圈子 /circles/:id → /pkg-circle/circles/detail
   * - Content 内容表与搜索结果页一致，走文章详情页（Content.id 不是古籍章节 ID，不能拼成阅读器地址）
   */
  private buildTarget(type: GuideCardType, id: string): string {
    const encoded = encodeURIComponent(id);
    switch (type) {
      case "classic": return `/pkg-classics/detail/index?id=${encoded}`;
      case "article": return `/pkg-circle/articles/detail?id=${encoded}`;
      case "course": return `/pkg-course/detail/index?id=${encoded}`;
      case "circle": return `/pkg-circle/circles/detail?id=${encoded}`;
      case "content": return `/pkg-circle/articles/detail?id=${encoded}`;
      default: return `/`;
    }
  }
}

export type GuideCardType = "classic" | "article" | "course" | "circle" | "content";

export interface GuideCard {
  type: GuideCardType;
  id: string;
  title: string;
  subtitle?: string;
  cover?: string;
  /** 前端导航目标路径 */
  target: string;
}

export interface GuideResult {
  query: string;
  cards: GuideCard[];
}
