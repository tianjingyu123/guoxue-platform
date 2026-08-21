import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { isPublicContentQuarantined } from "../../common/public-content-quarantine";
import type { FeedItem, SmartFeedResult } from "./smart-feed.service";
import { PUBLIC_CLASSIC_BOOK_WHERE } from "../classic/classic-publication-policy";
import { toPublicClassicIntro } from "../classic/classic-public-copy";

type TimedFeedItem = { at: number; item: FeedItem };

@Injectable()
export class HomeChannelFeedService {
  private readonly logger = new Logger(HomeChannelFeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getFollowingFeed(
    userId: string | undefined,
    page = 1,
    pageSize = 20,
  ): Promise<SmartFeedResult> {
    const { safePage, safeSize } = this.normalizePage(page, pageSize);
    const generatedAt = new Date().toISOString();
    if (!userId) {
      return {
        userId: null as unknown as string,
        userSegment: "following-anonymous",
        items: [],
        generatedAt,
      };
    }

    const [follows, memberships] = await Promise.all([
      this.prisma.follow.findMany({
        where: { userId },
        select: { followedUserId: true },
      }),
      this.prisma.circleMember.findMany({
        where: { userId },
        select: { circleId: true },
      }),
    ]);
    const followedUserIds = follows.map((row) => row.followedUserId);
    const circleIds = memberships.map((row) => row.circleId);
    if (followedUserIds.length === 0 && circleIds.length === 0) {
      return { userId, userSegment: "following", items: [], generatedAt };
    }

    const sourceFilter = [
      ...(followedUserIds.length > 0
        ? [{ visibility: "PLATFORM", userId: { in: followedUserIds } }]
        : []),
      ...(circleIds.length > 0 ? [{ circleId: { in: circleIds } }] : []),
    ];
    const productSourceFilter = [
      ...(followedUserIds.length > 0 ? [{ userId: { in: followedUserIds } }] : []),
      ...(circleIds.length > 0 ? [{ circleId: { in: circleIds } }] : []),
    ];
    const poolSize = Math.min(200, safePage * safeSize);

    const [articles, courses, videos, lives, products] = await Promise.all([
      this.prisma.article.findMany({
        where: { auditStatus: "APPROVED", deletedAt: null, OR: sourceFilter },
        select: {
          id: true, title: true, excerpt: true, cover: true, likeCount: true, updatedAt: true,
          user: { select: { nickname: true, avatar: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: poolSize,
      }),
      this.prisma.course.findMany({
        where: { auditStatus: "APPROVED", deletedAt: null, OR: sourceFilter },
        select: {
          id: true, title: true, intro: true, cover: true, price: true,
          originalPrice: true, studentCount: true, updatedAt: true,
          user: { select: { nickname: true, avatar: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: poolSize,
      }),
      this.prisma.video.findMany({
        where: {
          status: "PUBLISHED",
          auditStatus: "APPROVED",
          isPrivate: false,
          OR: sourceFilter,
          NOT: { id: { startsWith: "demo-video-" } },
        },
        select: {
          id: true, title: true, description: true, coverUrl: true, videoUrl: true,
          duration: true, viewCount: true, createdAt: true,
          user: { select: { nickname: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        take: poolSize,
      }),
      this.prisma.liveRoom.findMany({
        where: {
          auditStatus: "APPROVED",
          AND: [
            { OR: sourceFilter },
            {
              OR: [
                { status: "LIVING" },
                { status: "WAITING", cover: { not: "" } },
                { status: "REPLAY", replayUrl: { not: "" } },
              ],
            },
          ],
        },
        select: {
          id: true, title: true, cover: true, status: true, viewCount: true,
          startTime: true, replayUrl: true, updatedAt: true,
          user: { select: { nickname: true, avatar: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: poolSize,
      }),
      this.prisma.product.findMany({
        where: { status: "ON_SALE", deletedAt: null, OR: productSourceFilter },
        select: {
          id: true, title: true, intro: true, images: true, price: true,
          originalPrice: true, updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: poolSize,
      }),
    ]);

    const entries: TimedFeedItem[] = [
      ...articles.map((row) => ({ at: this.toEpoch(row.updatedAt), item: this.mapArticle(row, "关注更新") })),
      ...courses.map((row) => ({ at: this.toEpoch(row.updatedAt), item: this.mapCourse(row, "关注课程") })),
      ...videos.map((row) => ({ at: this.toEpoch(row.createdAt), item: this.mapVideo(row, "关注短视频") })),
      ...lives.map((row) => ({ at: this.toEpoch(row.updatedAt), item: this.mapLive(row, "关注直播") })),
      ...products.map((row) => ({ at: this.toEpoch(row.updatedAt), item: this.mapProduct(row, "关注商铺上新") })),
    ];
    const items = this.publicOnly(
      entries.sort((a, b) => b.at - a.at).map((entry) => entry.item),
    );
    return {
      userId,
      userSegment: "following",
      items: items.slice((safePage - 1) * safeSize, safePage * safeSize),
      generatedAt,
    };
  }

  async getHotFeed(page = 1, pageSize = 20): Promise<SmartFeedResult> {
    const { safePage, safeSize } = this.normalizePage(page, pageSize);
    const poolSize = Math.min(200, safePage * safeSize);
    const items = await this.cached(
      `smartfeed:home-channel:hot:${poolSize}`,
      120,
      () => this.computeHotFeed(poolSize),
    );
    return {
      userId: null as unknown as string,
      userSegment: "hot",
      items: items.slice((safePage - 1) * safeSize, safePage * safeSize),
      generatedAt: new Date().toISOString(),
    };
  }

  private async computeHotFeed(size: number): Promise<FeedItem[]> {
    const take = Math.max(4, Math.ceil(size / 6));
    const [articles, courses, classics, videos, lives, products] = await Promise.all([
      this.prisma.article.findMany({
        where: { auditStatus: "APPROVED", visibility: "PLATFORM", deletedAt: null },
        select: {
          id: true, title: true, excerpt: true, cover: true, likeCount: true,
          user: { select: { nickname: true, avatar: true } },
        },
        orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
        take,
      }),
      this.prisma.course.findMany({
        where: { auditStatus: "APPROVED", visibility: "PLATFORM", deletedAt: null },
        select: {
          id: true, title: true, intro: true, cover: true, price: true,
          originalPrice: true, studentCount: true,
          user: { select: { nickname: true, avatar: true } },
        },
        orderBy: { studentCount: "desc" },
        take,
      }),
      this.prisma.classicBook.findMany({
        where: PUBLIC_CLASSIC_BOOK_WHERE,
        select: {
          id: true, title: true, intro: true, cover: true,
          author: true, dynasty: true, category: true, viewCount: true,
        },
        orderBy: { viewCount: "desc" },
        take,
      }),
      this.prisma.video.findMany({
        where: {
          status: "PUBLISHED", visibility: "PLATFORM", auditStatus: "APPROVED", isPrivate: false,
          NOT: { id: { startsWith: "demo-video-" } },
        },
        select: {
          id: true, title: true, description: true, coverUrl: true, videoUrl: true,
          duration: true, viewCount: true,
          user: { select: { nickname: true, avatar: true } },
        },
        orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
        take,
      }),
      this.prisma.liveRoom.findMany({
        where: {
          visibility: "PLATFORM",
          auditStatus: "APPROVED",
          OR: [
            { status: "LIVING" },
            { status: "WAITING", cover: { not: "" } },
            { status: "REPLAY", replayUrl: { not: "" } },
          ],
        },
        select: {
          id: true, title: true, cover: true, status: true, viewCount: true,
          startTime: true, replayUrl: true,
          user: { select: { nickname: true, avatar: true } },
        },
        // 直播内容有强时效性：未来预约和当前直播优先于历史回放，
        // 同一批数据仍来自固定热门池，不引入个人兴趣排序。
        orderBy: [{ startTime: "desc" }, { viewCount: "desc" }],
        take,
      }),
      this.prisma.product.findMany({
        where: { status: "ON_SALE", deletedAt: null },
        select: {
          id: true, title: true, intro: true, images: true, price: true,
          originalPrice: true, salesCount: true,
        },
        orderBy: { salesCount: "desc" },
        take,
      }),
    ]);

    const sources: FeedItem[][] = [
      articles.map((row) => this.mapArticle(row, "全平台热门")),
      videos.map((row) => this.mapVideo(row, "全平台热门")),
      courses.map((row) => this.mapCourse(row, "全平台热门")),
      classics.map((row) => this.mapClassic(row, "全平台热门")),
      lives.map((row) => this.mapLive(row, "全平台热门")),
      products.map((row) => this.mapProduct(row, "全平台热门")),
    ];
    const mixed: FeedItem[] = [];
    for (let index = 0; mixed.length < size; index += 1) {
      let appended = false;
      for (const source of sources) {
        if (source[index]) {
          mixed.push(source[index]);
          appended = true;
          if (mixed.length >= size) break;
        }
      }
      if (!appended) break;
    }
    return this.publicOnly(mixed);
  }

  private normalizePage(page: number, pageSize: number) {
    return {
      safePage: Math.max(1, Number(page) || 1),
      safeSize: Math.min(50, Math.max(1, Number(pageSize) || 20)),
    };
  }

  private async cached<T>(key: string, ttl: number, factory: () => Promise<T>): Promise<T> {
    try {
      return await this.redis.getOrSet(key, ttl, factory);
    } catch (error) {
      this.logger.warn(`频道缓存不可用，直接回源: ${(error as Error).message}`);
      return factory();
    }
  }

  private publicOnly(items: FeedItem[]): FeedItem[] {
    return items.filter(
      (item) => item.type !== "post" && !isPublicContentQuarantined(item.type, item.id),
    );
  }

  private toNum(value: unknown): number {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
  }

  private toEpoch(value: Date | string): number {
    return value instanceof Date ? value.getTime() : new Date(value).getTime();
  }

  private mapArticle(row: any, reason: string): FeedItem {
    return {
      id: row.id, type: "article", title: row.title, subtitle: row.excerpt || "",
      cover: row.cover || "", score: 0, reason, coverRatio: "16:9",
      author: row.user ? { name: row.user.nickname, avatar: row.user.avatar || undefined } : undefined,
      metric: { kind: "like", value: this.toNum(row.likeCount) },
    };
  }

  private mapCourse(row: any, reason: string): FeedItem {
    const price = this.toNum(row.price);
    return {
      id: row.id, type: "course", title: row.title, subtitle: row.intro || "",
      cover: row.cover || "", score: 0, reason, coverRatio: "16:9",
      author: row.user ? { name: row.user.nickname, avatar: row.user.avatar || undefined } : undefined,
      metric: { kind: "students", value: this.toNum(row.studentCount) },
      payload: {
        price,
        originalPrice: row.originalPrice == null ? undefined : this.toNum(row.originalPrice),
        free: price === 0,
      },
    };
  }

  private mapClassic(row: any, reason: string): FeedItem {
    return {
      id: row.id, type: "classic", title: row.title,
      subtitle: toPublicClassicIntro(row.intro, row.title),
      cover: row.cover || "", score: 0, reason, coverRatio: "3:4",
      author: row.author ? { name: row.author } : undefined,
      metric: { kind: "readers", value: this.toNum(row.viewCount) },
      payload: {
        author: row.author || "",
        dynasty: row.dynasty || "",
        category: row.category || "",
      },
    };
  }

  private mapVideo(row: any, reason: string): FeedItem {
    return {
      id: row.id, type: "video", title: row.title || "精彩短视频",
      subtitle: row.description || "", cover: row.coverUrl || "", score: 0, reason,
      coverRatio: "3:4",
      author: row.user ? { name: row.user.nickname, avatar: row.user.avatar || undefined } : undefined,
      metric: { kind: "play", value: this.toNum(row.viewCount) },
      payload: { duration: this.toNum(row.duration), videoUrl: row.videoUrl || "" },
    };
  }

  private mapLive(row: any, reason: string): FeedItem {
    const status = row.status === "LIVING" ? "live" : row.status === "REPLAY" ? "replay" : "upcoming";
    const viewers = this.toNum(row.viewCount);
    return {
      id: row.id, type: "live", title: row.title,
      subtitle: status === "live" ? "正在直播中" : status === "replay" ? "直播回放" : "直播预告",
      cover: row.cover || "", score: 0, reason, coverRatio: "4:3",
      author: row.user ? { name: row.user.nickname, avatar: row.user.avatar || undefined } : undefined,
      metric: { kind: "view", value: viewers },
      payload: {
        isLive: status === "live",
        status,
        viewers,
        scheduledTime: row.startTime?.toISOString?.() || row.startTime || "",
        replayUrl: status === "replay" ? row.replayUrl || "" : "",
      },
    };
  }

  private mapProduct(row: any, reason: string): FeedItem {
    const price = this.toNum(row.price);
    return {
      id: row.id, type: "product", title: row.title, subtitle: row.intro || "",
      cover: row.images?.[0] || "", score: 0, reason, coverRatio: "1:1",
      metric: { kind: "price", value: price },
      payload: {
        price,
        originalPrice: row.originalPrice == null ? undefined : this.toNum(row.originalPrice),
      },
    };
  }
}
