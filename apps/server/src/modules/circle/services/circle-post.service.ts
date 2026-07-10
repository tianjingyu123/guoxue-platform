import {
  Injectable,
  Logger,
  Optional,
} from "@nestjs/common";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { Cacheable } from "../../../common/cache.decorator";
import { safePagination } from "../../../common/pagination";
import { PrismaService } from "../../../prisma/prisma.service";
import { CoinService } from "../../coin/coin.service";
import { NotificationService } from "../../notification/notification.service";
import { AuditService } from "../../audit/audit.service";
import { CreatePostDto } from "../circle.dto";
import { Prisma, PostType } from "@prisma/client";
import { CircleSharedService } from "./circle-shared.service";
import { CircleGovernanceService } from "../governance/circle-governance.service";

/**
 * 圈子-帖子与互动域（从 circle.service 拆出·纯搬家不改逻辑）。
 * 职责：帖子 CRUD/草稿/加精置顶 + 帖子打赏（含扣费分账）+ 排行榜（圈子/成员/热帖）
 * + 全平台热门帖子/今日活动聚合。
 * ⚠️ 含资金/扣费方法（rewardPost），逐字搬迁，跨域调用改注入。
 * 依赖：共享叶子域（ensureMember/checkAdmin）·单向不循环。
 */
@Injectable()
export class CirclePostService {
  private readonly logger = new Logger(CirclePostService.name);
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private shared: CircleSharedService,
    @Optional() private governance?: CircleGovernanceService,
    @Optional() private coinService?: CoinService,
    @Optional() private notificationService?: NotificationService,
  ) {}

  // ───────── 帖子 ─────────

  async createPost(circleId: string, userId: string, dto: CreatePostDto) {
    await this.shared.ensureMember(circleId, userId);

    // 圈子治理闸门（#10/#11）：禁言拦截 + 刷屏限流 + 圈内敏感词命中转人工审核（AUDITING）
    const gate = this.governance
      ? await this.governance.checkPostGate(circleId, userId, [dto.title, dto.content])
      : { forceAudit: false, hitWords: [] as string[] };

    // 内容审核（标题+正文，先审后发）
    await this.audit.moderateTextOrThrow([dto.title, dto.content].filter(Boolean).join(" "), {
      scene: "CIRCLE_POST",
      userId,
    });
    // 图片审核（发帖配图，先审后发）
    await this.audit.moderateImageOrThrow(dto.images, { scene: "CIRCLE_POST", userId });

    // 治理转审（敏感词命中/新成员先审）：发布态强制降级为 AUDITING（不直接展示·转圈主人工复核）；草稿不动
    let status = dto.status ?? "PUBLISHED";
    if (gate.forceAudit && status === "PUBLISHED") {
      status = "AUDITING";
      this.logger.log(
        `圈内发帖转审 circle=${circleId} user=${userId} reason=${gate.auditReason ?? "SENSITIVE_WORDS"}${gate.hitWords.length ? ` words=${gate.hitWords.join(",")}` : ""}`,
      );
    }

    const post = await this.prisma.post.create({
      data: {
        circleId,
        userId,
        type: dto.type as PostType,
        title: dto.title,
        content: dto.content,
        images: dto.images ?? [],
        videoUrl: dto.videoUrl,
        fileUrl: dto.fileUrl,
        linkUrl: dto.linkUrl,
        status,
      },
    });

    // 只有发布状态的帖子才计入统计
    if (status === "PUBLISHED") {
      await this.prisma.circle.update({
        where: { id: circleId },
        data: { postCount: { increment: 1 } },
      });
    }

    return post;
  }

  /** 获取我的草稿列表 */
  async getMyDrafts(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { userId, status: "DRAFT" };
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: { circle: { select: { id: true, name: true } } },
        skip,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.post.count({ where }),
    ]);
    return { posts, total, page, pageSize };
  }

  /** 发布草稿 */
  async publishPost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new BusinessException(ErrorCode.NOT_FOUND, "帖子不存在");
    if (post.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能发布自己的帖子");
    if (post.status !== "DRAFT") throw new BusinessException(ErrorCode.BAD_REQUEST, "该帖子不是草稿");

    await this.prisma.circle.update({
      where: { id: post.circleId },
      data: { postCount: { increment: 1 } },
    });

    return this.prisma.post.update({
      where: { id: postId },
      data: { status: "PUBLISHED", createdAt: new Date() },
    });
  }

  async updatePost(postId: string, userId: string, dto: Partial<CreatePostDto>) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new BusinessException(ErrorCode.NOT_FOUND, "帖子不存在");
    if (post.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能编辑自己的帖子");

    // 内容审核（编辑后重新过审，仅审有变更的文本字段）
    await this.audit.moderateTextOrThrow([dto.title, dto.content].filter(Boolean).join(" "), {
      scene: "CIRCLE_POST",
      userId,
      dataId: postId,
    });
    // 图片审核（编辑后配图重新过审；无变更时 dto.images 为 undefined 自动跳过）
    await this.audit.moderateImageOrThrow(dto.images, { scene: "CIRCLE_POST", userId, dataId: postId });

    return this.prisma.post.update({ where: { id: postId }, data: dto as Prisma.PostUpdateInput });
  }

  async deletePost(postId: string, userId: string, circleId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    // 校验帖子确实属于该圈子，防止跨圈越权删帖（IDOR）
    if (!post || post.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "帖子不存在");

    // 检查权限：作者本人，或矩阵授权「删帖/折叠」（治理 #8·默认圈主/合伙人/管理员）
    if (post.userId !== userId) {
      await this.shared.checkPermission(circleId, userId, "content.moderate");
    }

    await this.prisma.post.delete({ where: { id: postId } });
    await this.prisma.circle.update({
      where: { id: circleId },
      data: { postCount: { decrement: 1 } },
    });

    return { success: true };
  }

  @Cacheable({ key: (args: any[]) => `circle:posts:${args[0]}:${args[1]?.type || ""}:${args[1]?.isEssence || ""}:${args[1]?.page || 1}:${args[1]?.pageSize || 20}`, ttl: 15 })
  async getPosts(circleId: string, query: { type?: string; isEssence?: string; page?: number; pageSize?: number }) {
    const { type, isEssence } = query;
    const { page, pageSize, skip } = safePagination(query.page, query.pageSize);
    const where: Prisma.PostWhereInput = { circleId, status: "PUBLISHED" };

    if (type) where.type = type as PostType;
    if (isEssence === "true") where.isEssence = true;
    if (isEssence === "top") where.isTop = true;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
        },
        skip,
        take: pageSize,
        orderBy: [{ isTop: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.post.count({ where }),
    ]);

    return { posts, total, page, pageSize };
  }

  async getPostDetail(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        circle: { select: { id: true, name: true } },
      },
    });
    if (!post) throw new BusinessException(ErrorCode.NOT_FOUND, "帖子不存在");
    return post;
  }

  async toggleEssence(postId: string, circleId: string, userId: string) {
    await this.shared.checkPermission(circleId, userId, "content.pin");
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "帖子不存在");

    return this.prisma.post.update({
      where: { id: postId },
      data: { isEssence: !post.isEssence },
    });
  }

  async toggleTop(postId: string, circleId: string, userId: string) {
    await this.shared.checkPermission(circleId, userId, "content.pin");
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "帖子不存在");

    return this.prisma.post.update({
      where: { id: postId },
      data: { isTop: !post.isTop },
    });
  }

  // ───────── 排行榜 ─────────

  @Cacheable({ key: (args: any[]) => `circle:ranking:${args[0]}:${args[1]}:${args[2] || "memberCount"}`, ttl: 30 })
  async getCircleRanking(rawPage = 1, rawPageSize = 20, sortBy?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const validSortBy = ["memberCount", "postCount", "activityScore"] as const;
    const sortField = validSortBy.includes(sortBy as any) ? sortBy! : "memberCount";
    const where: Prisma.CircleWhereInput = { status: "ACTIVE" };

    let items: Array<Record<string, unknown>>;
    let total: number;

    if (sortField === "activityScore") {
      // activityScore 需要计算（memberCount + postCount），取全部后排序
      const [circles, count] = await Promise.all([
        this.prisma.circle.findMany({
          where,
          select: {
            id: true, name: true, cover: true, memberCount: true,
            postCount: true, intro: true, categoryLevel1: true,
            owner: { select: { nickname: true } },
          },
          orderBy: [{ memberCount: "desc" }, { postCount: "desc" }],
        }),
        this.prisma.circle.count({ where }),
      ]);
      total = count;
      items = circles.slice((page - 1) * pageSize, page * pageSize).map((c, i) => ({
        ...c,
        rank: (page - 1) * pageSize + i + 1,
      }));
    } else {
      const [circles, count] = await Promise.all([
        this.prisma.circle.findMany({
          where,
          select: {
            id: true, name: true, cover: true, memberCount: true,
            postCount: true, intro: true, categoryLevel1: true,
            owner: { select: { nickname: true } },
          },
          orderBy: { [sortField]: "desc" } as Prisma.CircleOrderByWithRelationInput,
          skip,
          take: pageSize,
        }),
        this.prisma.circle.count({ where }),
      ]);
      total = count;
      items = circles.map((c, i) => ({
        ...c,
        rank: (page - 1) * pageSize + i + 1,
      }));
    }

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getMemberLeaderboard(circleId: string, page = 1, pageSize = 20, period?: string) {
    const circle = await this.prisma.circle.findUnique({
      where: { id: circleId },
      select: { id: true },
    });
    if (!circle) throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在");

    const now = new Date();
    let periodStart: Date | undefined;
    if (period === "week") {
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const postWhere: Prisma.PostWhereInput = { circleId, status: "PUBLISHED" };
    if (periodStart) {
      postWhere.createdAt = { gte: periodStart };
    }

    // 按 userId 聚合帖子数量作为贡献度依据
    const postStats = await this.prisma.post.groupBy({
      by: ["userId"],
      where: postWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const total = postStats.length;
    const paged = postStats.slice((page - 1) * pageSize, page * pageSize);
    const userIds = paged.map((s) => s.userId);

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nickname: true, avatar: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const items = paged.map((stat, index) => ({
      userId: stat.userId,
      nickname: userMap.get(stat.userId)?.nickname ?? "",
      avatar: userMap.get(stat.userId)?.avatar ?? null,
      contributionScore: stat._count.id * 10,
      postCount: stat._count.id,
      rank: (page - 1) * pageSize + index + 1,
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getHotContentRanking(circleId: string, limit = 10) {
    // 获取最近帖子作为候选集
    const posts = await this.prisma.post.findMany({
      where: { circleId, status: "PUBLISHED" },
      select: {
        id: true, title: true,
        user: { select: { id: true, nickname: true, avatar: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    if (posts.length === 0) return [];

    const postIds = posts.map((p) => p.id);

    // 并行统计点赞数和评论数
    const [likeCounts, commentCounts] = await Promise.all([
      this.prisma.like.groupBy({
        by: ["targetId"],
        where: { targetType: "POST", targetId: { in: postIds } },
        _count: { id: true },
      }),
      this.prisma.comment.groupBy({
        by: ["targetId"],
        where: { targetType: "POST", targetId: { in: postIds } },
        _count: { id: true },
      }),
    ]);

    const likeMap = new Map(likeCounts.map((l) => [l.targetId, l._count.id]));
    const commentMap = new Map(commentCounts.map((c) => [c.targetId, c._count.id]));

    return posts
      .map((p) => {
        const likeCount = likeMap.get(p.id) ?? 0;
        const commentCount = commentMap.get(p.id) ?? 0;
        return {
          id: p.id,
          title: p.title,
          user: p.user,
          likeCount,
          commentCount,
          hotScore: likeCount + commentCount,
          createdAt: p.createdAt,
        };
      })
      .sort((a, b) => b.hotScore - a.hotScore)
      .slice(0, limit);
  }

  // ───────── 帖子打赏 ─────────

  async rewardPost(circleId: string, postId: string, userId: string, amount: number, message?: string) {
    // 校验帖子存在且属于该圈子（防止 IDOR：postId 与 circleId 必须匹配）
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, circleId: true, title: true },
    });
    if (!post) throw new BusinessException(ErrorCode.NOT_FOUND, "帖子不存在");
    if (post.circleId !== circleId) throw new BusinessException(ErrorCode.FORBIDDEN, "帖子不属于该圈子");
    if (post.userId === userId) throw new BusinessException(ErrorCode.BAD_REQUEST, "不能打赏自己的帖子");

    // 校验打赏人是圈子成员
    await this.shared.ensureMember(circleId, userId);

    if (!this.coinService) throw new BusinessException(ErrorCode.BAD_REQUEST, "支付服务暂不可用");

    await this.coinService.spend(userId, {
      amountCoin: amount,
      scene: "POST_REWARD",
      refId: postId,
      description: `打赏帖子: ${post.title || "无标题"}`,
    });

    // 分账：作者入账 50%，平台留成 50%（业务决策）。作者入账失败不回滚打赏，仅记日志。
    const authorShare = Math.floor(amount / 2);
    if (authorShare > 0) {
      await this.coinService.refund(post.userId, authorShare, `帖子打赏收入: ${post.title || "无标题"}`)
        .catch((err) => this.logger.warn("打赏作者入账失败", err));
    }

    // 通知帖子作者（圈内通知·交易类：金额按作者实际入账口径，注明已扣除平台服务费）
    if (this.notificationService) {
      this.notificationService.send(post.userId, {
        type: "POST_REWARD",
        title: "收到打赏",
        content: `有人打赏了你的帖子，入账 ${authorShare} 币（已扣除平台服务费）${message ? `：${message}` : ""}`,
        targetType: "POST",
        targetId: postId,
        category: "TRADE",
        circleId,
      }).catch((err) => this.logger.warn("打赏通知发送失败", err));
    }

    return { success: true, amount };
  }

  // ───────── 全局聚合 ─────────

  /** 获取全平台热门帖子（跨圈子） */
  async getGlobalHotPosts(limit = 10) {
    const posts = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true, title: true, content: true,
        circleId: true,
        circle: { select: { id: true, name: true, cover: true } },
        user: { select: { id: true, nickname: true, avatar: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (posts.length === 0) return [];

    const postIds = posts.map((p) => p.id);
    const [likeCounts, commentCounts] = await Promise.all([
      this.prisma.like.groupBy({
        by: ['targetId'],
        where: { targetType: 'POST', targetId: { in: postIds } },
        _count: { id: true },
      }),
      this.prisma.comment.groupBy({
        by: ['targetId'],
        where: { targetType: 'POST', targetId: { in: postIds } },
        _count: { id: true },
      }),
    ]);

    const likeMap = new Map(likeCounts.map((l) => [l.targetId, l._count.id]));
    const commentMap = new Map(commentCounts.map((c) => [c.targetId, c._count.id]));

    const scored = posts.map((p) => ({
      ...p,
      likes: likeMap.get(p.id) || 0,
      comments: commentMap.get(p.id) || 0,
      hotScore: (likeMap.get(p.id) || 0) * 2 + (commentMap.get(p.id) || 0) * 3,
    }));

    scored.sort((a, b) => b.hotScore - a.hotScore);
    return scored.slice(0, limit);
  }

  /** 获取今日活动（聚合近期帖子和即将开始的直播） */
  async getTodayActivities(limit = 5) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);

    // 今日帖子
    const todayPosts = await this.prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        createdAt: { gte: todayStart, lt: tomorrowStart },
      },
      select: {
        id: true, title: true,
        circle: { select: { id: true, name: true } },
        user: { select: { id: true, nickname: true, avatar: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const activities = todayPosts.map((p) => ({
      id: p.id,
      type: 'post' as const,
      title: p.title,
      circle: p.circle,
      user: p.user,
      createdAt: p.createdAt,
    }));

    return activities;
  }
}
