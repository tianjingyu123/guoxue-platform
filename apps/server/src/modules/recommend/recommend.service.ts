import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RecommendService {
  constructor(private prisma: PrismaService) {}

  // ───── a) 基于内容标签的协同推荐 ─────

  async related(contentId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: contentId },
      select: { tags: true },
    });
    if (!article) throw new NotFoundException("文章不存在");

    const tags = article.tags ?? [];
    if (tags.length === 0) return [];

    const result = await this.prisma.article.findMany({
      where: {
        id: { not: contentId },
        auditStatus: "APPROVED",
        tags: { hasSome: tags },
      },
      select: {
        id: true,
        title: true,
        cover: true,
        excerpt: true,
        tags: true,
        viewCount: true,
        likeCount: true,
        collectCount: true,
        createdAt: true,
        user: { select: { id: true, nickname: true, avatar: true } },
      },
      take: 5,
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
    });

    return result;
  }

  // ───── b) 基于用户行为的个性化推荐 ─────

  async personalized(userId: string) {
    // 1. 获取用户最近互动的文章（点赞/收藏）
    const [likes, collects] = await Promise.all([
      this.prisma.like.findMany({
        where: { userId, targetType: "ARTICLE" },
        select: { targetId: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      this.prisma.collect.findMany({
        where: { userId, targetType: "ARTICLE" },
        select: { targetId: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const interactedIds = [
      ...new Set([
        ...likes.map((l) => l.targetId),
        ...collects.map((c) => c.targetId),
      ]),
    ];

    if (interactedIds.length === 0) return [];

    // 2. 提取这些文章的标签
    const interactedArticles = await this.prisma.article.findMany({
      where: { id: { in: interactedIds } },
      select: { tags: true },
    });

    const tags = [
      ...new Set(interactedArticles.flatMap((a) => a.tags ?? [])),
    ];

    if (tags.length === 0) return [];

    // 3. 查找拥有相同标签的文章（排除已互动的）
    const result = await this.prisma.article.findMany({
      where: {
        id: { notIn: interactedIds },
        auditStatus: "APPROVED",
        tags: { hasSome: tags },
      },
      select: {
        id: true,
        title: true,
        cover: true,
        excerpt: true,
        tags: true,
        viewCount: true,
        likeCount: true,
        collectCount: true,
        createdAt: true,
        user: { select: { id: true, nickname: true, avatar: true } },
      },
      take: 5,
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
    });

    return result;
  }

  // ───── c) 热门趋势推荐 ─────

  async trending() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 近 7 天发布的文章按浏览量排序
    const byViews = await this.prisma.article.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        auditStatus: "APPROVED",
      },
      select: {
        id: true,
        title: true,
        cover: true,
        excerpt: true,
        tags: true,
        viewCount: true,
        likeCount: true,
        collectCount: true,
        createdAt: true,
        user: { select: { id: true, nickname: true, avatar: true } },
      },
      take: 10,
      orderBy: { viewCount: "desc" },
    });

    // 近 7 天互动最多的文章（从 Like / Collect 表聚合）
    const [recentLikes, recentCollects] = await Promise.all([
      this.prisma.like.findMany({
        where: { targetType: "ARTICLE", createdAt: { gte: sevenDaysAgo } },
        select: { targetId: true },
      }),
      this.prisma.collect.findMany({
        where: { targetType: "ARTICLE", createdAt: { gte: sevenDaysAgo } },
        select: { targetId: true },
      }),
    ]);

    // 点赞权重 2，收藏权重 3
    const engagementMap = new Map<string, number>();
    for (const l of recentLikes) {
      engagementMap.set(l.targetId, (engagementMap.get(l.targetId) ?? 0) + 2);
    }
    for (const c of recentCollects) {
      engagementMap.set(c.targetId, (engagementMap.get(c.targetId) ?? 0) + 3);
    }

    const sortedIds = [...engagementMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    let byEngagement: any[] = [];
    if (sortedIds.length > 0) {
      byEngagement = await this.prisma.article.findMany({
        where: { id: { in: sortedIds }, auditStatus: "APPROVED" },
        select: {
          id: true,
          title: true,
          cover: true,
          excerpt: true,
          tags: true,
          viewCount: true,
          likeCount: true,
          collectCount: true,
          createdAt: true,
          user: { select: { id: true, nickname: true, avatar: true } },
        },
      });
      // 保持聚合排序
      const order = new Map(sortedIds.map((id, i) => [id, i]));
      byEngagement.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }

    return { byViews, byEngagement };
  }
}
