import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** 画像输入：归属成员（归属判定/分页由各业务模块自己做，本服务只负责聚合） */
export interface InsightMember {
  userId: string;
  /** 归属建立时间（推荐绑定/报名/入圈等，语义由调用方定） */
  boundAt: Date | null;
}

/** 单个客户/成员的行为画像 */
export interface CustomerProfile {
  userId: string;
  nickname: string;
  avatar: string | null;
  boundAt: Date | null;
  lastActiveAt: Date | null;
  events30d: number;
  orderCount: number;
  totalSpent: number;
  interests: string[];
}

/**
 * 客户洞察公共服务（智能名片）：基于 TrackEvent/Order 聚合行为画像与行为时间线。
 * 复用方：站长（归属客户）/ 驿站（报名学员）/ 圈主（圈子成员）。
 * 合规边界（调用方共同遵守）：只对经营主体自己的归属成员调用；不返回手机号等敏感字段；
 * 时间线只透出人话摘要，不透传完整 payload。
 */
@Injectable()
export class InsightService {
  constructor(private prisma: PrismaService) {}

  /** 浏览路径 → 兴趣模块标签（page_view 只有模块级路径；内容级兴趣由 view_content 事件提供） */
  private static readonly MODULE_LABELS: Array<[string, string]> = [
    ["pkg-shop", "商城"], ["course", "课程"], ["pkg-circle", "圈子"], ["pkg-live", "直播"],
    ["classic", "古籍"], ["poetry", "诗词"], ["ebook", "电子书"], ["paipan", "命理工具"],
    ["fortune", "命理工具"], ["pkg-video", "短视频"], ["competition", "赛事"], ["offline", "线下驿站"],
  ];

  pathToModuleLabel(path?: string | null): string | null {
    if (!path) return null;
    for (const [prefix, label] of InsightService.MODULE_LABELS) {
      if (path.includes(prefix)) return label;
    }
    return null;
  }

  /**
   * 批量聚合成员画像：最近活跃/30天行为量/消费力/兴趣标签TOP3
   * （搜索词权重3 > 内容标题2 > 浏览模块1），按最近活跃降序返回，便于优先跟进「热」客户。
   */
  async buildCustomerProfiles(members: InsightMember[]): Promise<CustomerProfile[]> {
    const userIds = members.map((m) => m.userId);
    if (userIds.length === 0) return [];

    const since30 = new Date(Date.now() - 30 * 86_400_000);
    const [users, activity, purchases, interestEvents] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, nickname: true, avatar: true },
      }),
      this.prisma.trackEvent.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, occurredAt: { gte: since30 } },
        _count: true,
        _max: { occurredAt: true },
      }),
      this.prisma.order.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.trackEvent.findMany({
        where: { userId: { in: userIds }, action: { in: ["search", "view_content", "page_view"] }, occurredAt: { gte: since30 } },
        select: { userId: true, action: true, path: true, payload: true },
        orderBy: { occurredAt: "desc" },
        take: 1500,
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const actMap = new Map(activity.map((a) => [a.userId, a]));
    const buyMap = new Map(purchases.map((p) => [p.userId, p]));

    // 兴趣聚合：搜索词权重3 > 内容标题权重2 > 浏览模块权重1，取 TOP3
    const interestMap = new Map<string, Map<string, number>>();
    const bump = (uid: string, tag: string, w: number) => {
      if (!tag) return;
      const m = interestMap.get(uid) ?? new Map<string, number>();
      m.set(tag, (m.get(tag) || 0) + w);
      interestMap.set(uid, m);
    };
    for (const e of interestEvents) {
      if (!e.userId) continue;
      const payload = (e.payload ?? {}) as Record<string, unknown>;
      if (e.action === "search" && typeof payload.keyword === "string") {
        bump(e.userId, String(payload.keyword).slice(0, 12), 3);
      } else if (e.action === "view_content" && typeof payload.title === "string") {
        bump(e.userId, String(payload.title).slice(0, 12), 2);
      } else {
        const label = this.pathToModuleLabel(e.path ?? (payload.path as string | undefined));
        if (label) bump(e.userId, label, 1);
      }
    }

    const profiles = members.map((m) => {
      const act = actMap.get(m.userId);
      const buy = buyMap.get(m.userId);
      const tags = [...(interestMap.get(m.userId) ?? new Map())]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag);
      return {
        userId: m.userId,
        nickname: userMap.get(m.userId)?.nickname || "用户",
        avatar: userMap.get(m.userId)?.avatar || null,
        boundAt: m.boundAt,
        lastActiveAt: act?._max.occurredAt || null,
        events30d: act?._count || 0,
        orderCount: buy?._count || 0,
        totalSpent: Number(buy?._sum.amount || 0),
        interests: tags,
      };
    });
    profiles.sort((a, b) => (b.lastActiveAt?.getTime?.() || 0) - (a.lastActiveAt?.getTime?.() || 0));
    return profiles;
  }

  /** 单个成员最近行为时间线（人话摘要）。归属校验由调用方先做，防越权窥探。 */
  async getTimeline(userId: string, limit = 30) {
    const events = await this.prisma.trackEvent.findMany({
      where: { userId },
      select: { action: true, path: true, payload: true, occurredAt: true },
      orderBy: { occurredAt: "desc" },
      take: Math.min(50, limit),
    });
    return {
      events: events.map((e) => ({
        action: e.action,
        path: e.path,
        // 只透出经营分析所需的轻量字段，不透传完整 payload
        summary: this.summarizeEvent(e.action, (e.payload ?? {}) as Record<string, unknown>, e.path),
        occurredAt: e.occurredAt,
      })),
    };
  }

  /** 行为事件 → 人话摘要 */
  summarizeEvent(action: string, payload: Record<string, unknown>, path?: string | null): string {
    if (action === "search" && payload.keyword) return `搜索了「${String(payload.keyword).slice(0, 20)}」`;
    if (action === "view_content" && payload.title) {
      const typeLabel = payload.type === "course" ? "课程" : payload.type === "product" ? "商品" : "内容";
      return `浏览了${typeLabel}「${String(payload.title).slice(0, 24)}」`;
    }
    if (action === "purchase") return "完成了一笔购买";
    if (action === "share") return "分享了内容";
    if (action === "ref_click") return "点开了一条分享链接";
    const label = this.pathToModuleLabel(path ?? (payload.path as string | undefined));
    return label ? `逛了逛${label}` : "浏览了页面";
  }
}
