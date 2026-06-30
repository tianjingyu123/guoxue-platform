import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * 软性导流 —— 智能体对话后的精准推荐。
 *
 * 意图来源（双轨·Coze 优先）：
 * 1. Coze 智能体在回复末尾按协议输出结构化推荐意图（`<!--RECO:[{type,query,reason}]-->`），
 *    平台解析并从展示文本中剥离；
 * 2. 兜底：Coze 未输出协议时，平台侧从用户问题轻量提取意图（保证功能可用/可演示）。
 *
 * 规则（用户定位）：不打断（本职回答在前）、必须征求同意（前端先问按钮）、可拒绝、推荐精准（匹配真实实体）。
 * 本期品类：课程 course、圈子 circle。
 */

export type RecoType = "course" | "circle" | "product";

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
  /** 征求同意话术（前端先问，同意才展开卡片） */
  consentPrompt: string;
  items: RecoCard[];
}

@Injectable()
export class RecommendationService {
  constructor(private prisma: PrismaService) {}

  /** 解析 Coze 回复中的 RECO 协议意图，返回剥离标记后的纯文本 */
  parseProtocol(content: string): { clean: string; intents: RecoIntent[] } {
    const re = /<!--\s*RECO:?\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*-->/;
    const m = content.match(re);
    if (!m) return { clean: content, intents: [] };
    let intents: RecoIntent[] = [];
    try {
      const parsed = JSON.parse(m[1]);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      intents = this.normalizeIntents(arr);
    } catch {
      /* 协议块解析失败则忽略，走兜底 */
    }
    return { clean: content.replace(re, "").trim(), intents };
  }

  private normalizeIntents(arr: unknown[]): RecoIntent[] {
    const out: RecoIntent[] = [];
    for (const x of arr) {
      if (!x || typeof x !== "object") continue;
      const rec = x as Record<string, unknown>;
      const type = rec.type;
      const query = rec.query;
      if ((type === "course" || type === "circle") && typeof query === "string" && query) {
        out.push({ type, query, reason: rec.reason ? String(rec.reason) : undefined });
      }
    }
    return out.slice(0, 2);
  }

  /** 平台侧兜底：从用户问题提取国学主题 + 学习/社交信号 → 推荐意图 */
  fallbackIntents(userQuery: string): RecoIntent[] {
    const q = userQuery || "";
    const TOPICS = [
      "八字", "紫微", "风水", "奇门", "六爻", "梅花易数", "面相", "手相", "起名", "择日",
      "周易", "易经", "论语", "道德经", "中医", "命理", "塔罗", "星座", "国学", "书法", "茶道", "香道", "古琴", "诗词",
    ];
    const topic = TOPICS.find((t) => q.includes(t));
    if (!topic) return [];

    const learn = /怎么|如何|学|入门|教程|课程|系统|提升|了解|基础|精进/.test(q);
    const social = /圈子|交流|同好|社群|讨论|一起|同道|结识|认识/.test(q);

    const intents: RecoIntent[] = [];
    if (learn || !social) intents.push({ type: "course", query: topic, reason: `系统学习${topic}` });
    if (social) intents.push({ type: "circle", query: topic, reason: `结识${topic}同好` });
    return intents.slice(0, 2);
  }

  /** 按意图匹配平台真实实体（课程/圈子） */
  async match(intents: RecoIntent[]): Promise<RecoCard[]> {
    const cards: RecoCard[] = [];
    for (const it of intents.slice(0, 2)) {
      if (it.type === "course") {
        // 注：演示阶段不强制 auditStatus 过滤；上线应加 auditStatus="APPROVED"
        const rows = await this.prisma.course.findMany({
          where: { deletedAt: null, OR: [{ title: { contains: it.query } }, { intro: { contains: it.query } }, { tags: { has: it.query } }] },
          orderBy: { studentCount: "desc" },
          take: 2,
          select: { id: true, title: true, cover: true, price: true, studentCount: true },
        });
        for (const r of rows) {
          cards.push({ type: "course", data: { id: r.id, title: r.title, cover: r.cover, price: Number(r.price), studentCount: r.studentCount, reason: it.reason } });
        }
      } else {
        const rows = await this.prisma.circle.findMany({
          where: { deletedAt: null, OR: [{ name: { contains: it.query } }, { intro: { contains: it.query } }, { tags: { has: it.query } }] },
          orderBy: { memberCount: "desc" },
          take: 2,
          select: { id: true, name: true, cover: true, memberCount: true, intro: true },
        });
        for (const r of rows) {
          cards.push({ type: "circle", data: { id: r.id, name: r.name, cover: r.cover, memberCount: r.memberCount, intro: r.intro, reason: it.reason } });
        }
      }
    }
    // 去重（同一实体可能被多意图命中）
    const seen = new Set<string>();
    return cards.filter((c) => {
      const key = `${c.type}:${String(c.data.id)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /** 综合：Coze 协议意图(优先) → 兜底意图 → 匹配真实实体 → 征求同意话术 */
  async build(rawContent: string, userQuery: string): Promise<{ content: string; recommendation: Recommendation | null }> {
    const { clean, intents: cozeIntents } = this.parseProtocol(rawContent);
    const intents = cozeIntents.length ? cozeIntents : this.fallbackIntents(userQuery);
    if (!intents.length) return { content: clean, recommendation: null };

    const items = await this.match(intents);
    if (!items.length) return { content: clean, recommendation: null };

    const hasCourse = items.some((i) => i.type === "course");
    const hasCircle = items.some((i) => i.type === "circle");
    const hasProduct = items.some((i) => i.type === "product");
    const parts: string[] = [];
    if (hasCourse) parts.push("相关课程");
    if (hasCircle) parts.push("志同道合的圈子");
    if (hasProduct) parts.push("开运好物");
    const consentPrompt = `需要我为你推荐${parts.join("、")}吗？`;

    return { content: clean, recommendation: { consentPrompt, items } };
  }
}
