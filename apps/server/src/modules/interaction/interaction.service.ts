import { Injectable, Logger, Optional } from "@nestjs/common";
import { HttpStatus } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationService } from "../notification/notification.service";
import { DEFAULT_GOVERNANCE_CONFIG } from "../circle/governance/circle-governance.constants";
import {
  LikeDto, CreateCommentDto, CollectDto,
  FollowDto, ReportDto, CommentListQueryDto, ReportListQueryDto,
} from "./interaction.dto";
import { Prisma } from "@prisma/client";
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { resolveTargets, targetKey } from "./target-resolver";
import { safePagination } from "../../common/pagination";
import { VideoInteractionStore } from "../video/video-interaction.store";

@Injectable()
export class InteractionService {
  private readonly logger = new Logger(InteractionService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private notification?: NotificationService,
  ) {}

  /** 直播互动只能走 live 专属端点，避免通用互动接口绕过房间可见性。 */
  private assertGenericInteractionTarget(targetType?: string, targetId?: string) {
    if (!targetType?.trim() || !targetId?.trim()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "必须指定互动目标");
    }
    if (targetType.trim().toUpperCase() === "LIVESTREAM") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "直播互动请使用直播专属接口");
    }
  }

  // ═══════════════════ 点赞 ═══════════════════

  async toggleLike(userId: string, dto: LikeDto) {
    this.assertGenericInteractionTarget(dto.targetType, dto.targetId);
    if (dto.targetType === "VIDEO") {
      const result = await new VideoInteractionStore(this.prisma).toggleLike(userId, dto.targetId);
      // 保留通用入口既有推荐行为记录，只在互动事务成功且为新增点赞时记录。
      if (result.liked) this.prisma.userBehavior.create({ data: { userId, targetType: dto.targetType, targetId: dto.targetId, behavior: "LIKE", weight: 1 } }).catch((err) => this.logger.warn("用户行为记录失败", err));
      return result;
    }
    const where = { userId_targetType_targetId: { userId, targetType: dto.targetType, targetId: dto.targetId } };
    const existing = await this.prisma.like.findUnique({ where });

    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
      return { liked: false };
    }

    try {
      await this.prisma.like.create({ data: { userId, targetType: dto.targetType, targetId: dto.targetId } });
    } catch (e: unknown) {
      if (isUniqueConstraintError(e)) return { liked: true };
      throw e;
    }
    // 异步记录行为
    this.prisma.userBehavior.create({ data: { userId, targetType: dto.targetType, targetId: dto.targetId, behavior: "LIKE", weight: 1 } }).catch((err) => this.logger.warn("用户行为记录失败", err));
    return { liked: true };
  }

  /** 从“我的点赞”按记录 ID 确定性取消，避免 toggle 在客户端状态过期时反向创建点赞。 */
  async removeLike(userId: string, likeId: string) {
    const like = await this.prisma.like.findUnique({
      where: { id: likeId },
      select: { id: true, userId: true, targetType: true, targetId: true },
    });
    if (!like) throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND, "点赞记录不存在");
    this.assertGenericInteractionTarget(like.targetType, like.targetId);
    if (like.userId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只能取消自己的点赞");
    }
    if (like.targetType === "VIDEO") return new VideoInteractionStore(this.prisma).removeLike(userId, like.targetId, likeId);
    await this.prisma.like.delete({ where: { id: likeId } });
    return { success: true };
  }

  async isLiked(userId: string, targetType: string, targetIds: string[]) {
    if (!targetIds.length || targetIds.some((targetId) => !targetId.trim())) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "必须指定互动目标");
    }
    this.assertGenericInteractionTarget(targetType, targetIds[0]);
    const likes = await this.prisma.like.findMany({
      where: { userId, targetType, targetId: { in: targetIds } },
      select: { targetId: true },
    });
    // 返回数组而非 Set —— Set 无法 JSON 序列化（会变成 {}），导致前端拿不到点赞状态
    return likes.map(l => l.targetId);
  }

  async getLikeCount(targetType: string, targetId: string) {
    this.assertGenericInteractionTarget(targetType, targetId);
    return this.prisma.like.count({ where: { targetType, targetId } });
  }

  async getMyLikes(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { userId };
    const [likes, total] = await Promise.all([
      this.prisma.like.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.like.count({ where }),
    ]);
    // 多态批量补全目标详情（每种类型一次查询，绝不 N+1）
    const targets = await resolveTargets(this.prisma, likes);
    const items = likes.map((l) => ({
      id: l.id,
      targetType: l.targetType,
      targetId: l.targetId,
      createdAt: l.createdAt,
      // 目标已删除时为 null，前端降级显示"内容已删除"
      target: targets.get(targetKey(l.targetType, l.targetId)) ?? null,
    }));
    return { items, total, page, pageSize };
  }

  // ═══════════════════ 评论 ═══════════════════

  async createComment(userId: string, dto: CreateCommentDto) {
    this.assertGenericInteractionTarget(dto.targetType, dto.targetId);
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { targetType: true, targetId: true, status: true, deletedAt: true },
      });
      if (!parent || parent.status !== "PUBLISHED" || parent.deletedAt) {
        throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND, "父评论不存在");
      }
      this.assertGenericInteractionTarget(parent.targetType, parent.targetId);
      if (parent.targetType !== dto.targetType || parent.targetId !== dto.targetId) {
        throw new BusinessException(ErrorCode.COMMENT_FORBIDDEN, "回复评论与目标不匹配");
      }
    }
    const comment = await this.prisma.comment.create({
      data: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        parentId: dto.parentId,
        content: dto.content,
      },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });

    // 更新对应目标的评论数
    await this.incrementCommentCount(dto.targetType, dto.targetId);

    // 异步记录行为
    this.prisma.userBehavior.create({ data: { userId, targetType: dto.targetType, targetId: dto.targetId, behavior: "COMMENT", weight: 1.5 } }).catch((err) => this.logger.warn("用户行为记录失败", err));

    // 圈内帖子被回复 → 通知帖子作者（圈内通知中心·互动 INTERACT·fire-and-forget 不阻断评论）
    if (dto.targetType === "POST") {
      this.notifyPostAuthorOnComment(userId, dto.targetId, dto.content, comment.user?.nickname)
        .catch((err) => this.logger.warn("帖子回复通知发送失败", err));
    }

    return comment;
  }

  /** 圈内帖子有新回复时通知作者（仅圈子帖·不通知自己回复自己） */
  private async notifyPostAuthorOnComment(commenterId: string, postId: string, content: string, commenterNickname?: string | null) {
    if (!this.notification) return;
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, circleId: true, title: true },
    });
    if (!post?.circleId || post.userId === commenterId) return;
    await this.notification.send(post.userId, {
      type: "POST_COMMENT",
      title: "帖子有新回复",
      content: `${commenterNickname || "圈友"} 回复了你的帖子${post.title ? `「${post.title}」` : ""}：${content.slice(0, 60)}`,
      targetType: "POST",
      targetId: postId,
      category: "INTERACT",
      circleId: post.circleId,
    });
  }

  async listComments(dto: CommentListQueryDto) {
    const { targetType, targetId, userId, status } = dto;
    this.assertGenericInteractionTarget(targetType, targetId);
    if (status && status !== "PUBLISHED") {
      throw new BusinessException(ErrorCode.FORBIDDEN, "隐藏评论仅供管理端审核");
    }
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize);
    const where: Prisma.CommentWhereInput = { parentId: null, status: "PUBLISHED", deletedAt: null };

    where.targetType = targetType;
    where.targetId = targetId;
    if (userId) where.userId = userId;

    const total = await this.prisma.comment.count({ where });

    const comments = await this.prisma.comment.findMany({
      where,
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        replies: {
          where: { status: "PUBLISHED", deletedAt: null },
          include: {
            user: { select: { id: true, nickname: true, avatar: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });

    return { comments, total, page, pageSize };
  }

  async deleteComment(commentId: string, userId: string, isAdmin = false) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND, "评论不存在");
    this.assertGenericInteractionTarget(comment.targetType, comment.targetId);
    if (comment.userId !== userId && !isAdmin) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只能删除自己的评论");
    }

    await this.prisma.comment.deleteMany({ where: { parentId: commentId } });
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { success: true };
  }

  async hideComment(commentId: string) {
    return this.prisma.comment.update({
      where: { id: commentId },
      data: { status: "HIDDEN" },
    });
  }

  // ═══════════════════ 收藏 ═══════════════════

  async toggleCollect(userId: string, dto: CollectDto) {
    if (dto.targetType === "VIDEO") {
      const result = await new VideoInteractionStore(this.prisma).toggleCollect(userId, dto.targetId);
      if (result.collected) this.prisma.userBehavior.create({ data: { userId, targetType: dto.targetType, targetId: dto.targetId, behavior: "COLLECT", weight: 2 } }).catch((err) => this.logger.warn("用户行为记录失败", err));
      return result;
    }
    const where = { userId_targetType_targetId: { userId, targetType: dto.targetType, targetId: dto.targetId } };
    const existing = await this.prisma.collect.findUnique({ where });

    if (existing) {
      await this.prisma.collect.delete({ where: { id: existing.id } });
      return { collected: false };
    }

    try {
      await this.prisma.collect.create({ data: { userId, targetType: dto.targetType, targetId: dto.targetId } });
    } catch (e: unknown) {
      if (isUniqueConstraintError(e)) return { collected: true };
      throw e;
    }
    // 异步记录行为
    this.prisma.userBehavior.create({ data: { userId, targetType: dto.targetType, targetId: dto.targetId, behavior: "COLLECT", weight: 2 } }).catch((err) => this.logger.warn("用户行为记录失败", err));
    return { collected: true };
  }

  async getUserCollects(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { userId };
    const [collects, total] = await Promise.all([
      this.prisma.collect.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.collect.count({ where }),
    ]);

    // 多态批量补全目标详情（每种类型一次查询，绝不 N+1）；目标已删则 target 为 null，前端降级
    const targets = await resolveTargets(this.prisma, collects);
    const items = collects.map((c) => ({
      id: c.id,
      targetType: c.targetType,
      targetId: c.targetId,
      createdAt: c.createdAt,
      target: targets.get(targetKey(c.targetType, c.targetId)) ?? null,
    }));

    // 保留 collects 字段向后兼容，新增 items 含 target 详情
    return { items, collects, total, page, pageSize };
  }

  // ═══════════════════ 关注 ═══════════════════

  async toggleFollow(userId: string, dto: FollowDto) {
    if (userId === dto.followedUserId) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "不能关注自己", HttpStatus.CONFLICT);
    }

    const where = { userId_followedUserId: { userId, followedUserId: dto.followedUserId } };
    const existing = await this.prisma.follow.findUnique({ where });

    if (existing) {
      await this.prisma.follow.delete({ where: { id: existing.id } });
      return { followed: false };
    }

    try {
      await this.prisma.follow.create({ data: { userId, followedUserId: dto.followedUserId } });
    } catch (e: unknown) {
      if (isUniqueConstraintError(e)) return { followed: true };
      throw e;
    }
    // 异步记录行为
    this.prisma.userBehavior.create({ data: { userId, targetType: "USER", targetId: dto.followedUserId, behavior: "FOLLOW", weight: 1 } }).catch((err) => this.logger.warn("用户行为记录失败", err));
    return { followed: true };
  }

  async getFollowers(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { followedUserId: userId };
    const [followers, total] = await Promise.all([
      this.prisma.follow.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.follow.count({ where }),
    ]);
    return { followers, total, page, pageSize };
  }

  async getFollowing(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { userId };
    const [followings, total] = await Promise.all([
      this.prisma.follow.findMany({
        where,
        include: { followedUser: { select: { id: true, nickname: true, avatar: true } } },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.follow.count({ where }),
    ]);
    return { followings, total, page, pageSize };
  }

  // ═══════════════════ 举报 ═══════════════════

  async report(userId: string, dto: ReportDto) {
    const report = await this.prisma.report.create({
      data: {
        reporterId: userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
      },
    });

    // 圈子治理：圈内帖子被举报满阈值自动隐藏（幂等·失败不影响举报本身落库）
    if (String(dto.targetType || "").toUpperCase() === "POST") {
      await this.maybeAutoHideReportedPost(dto.targetId).catch((err) =>
        this.logger.warn(`举报自动隐藏处理失败 post=${dto.targetId}`, err),
      );
    }
    return report;
  }

  /**
   * 举报满 N 自动隐藏：帖子属于圈子、圈子开启 reportAutoHide 且
   * 待处理举报的**去重举报人数**达到阈值时，自动把帖子置 HIDDEN 并通知圈主处理。
   * 已隐藏的不重复处理；配置未落库时回落治理默认值（开·阈值 3）。
   */
  private async maybeAutoHideReportedPost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, circleId: true, status: true, title: true },
    });
    if (!post?.circleId) return; // 不存在或非圈内帖子
    if (post.status === "HIDDEN") return; // 已隐藏不重复处理

    const cfg = await this.prisma.circleGovernanceConfig.findUnique({
      where: { circleId: post.circleId },
      select: { reportAutoHideEnabled: true, reportAutoHideThreshold: true },
    });
    const enabled = cfg?.reportAutoHideEnabled ?? DEFAULT_GOVERNANCE_CONFIG.reportAutoHideEnabled;
    const threshold = cfg?.reportAutoHideThreshold ?? DEFAULT_GOVERNANCE_CONFIG.reportAutoHideThreshold;
    if (!enabled) return;

    // 去重举报人（同一人重复举报只算一票·只数未处理的举报）
    const reporters = await this.prisma.report.findMany({
      where: { targetType: "POST", targetId: postId, status: "PENDING" },
      distinct: ["reporterId"],
      select: { reporterId: true },
    });
    if (reporters.length < threshold) return;

    // 幂等置隐藏（并发下只有一次生效）
    const updated = await this.prisma.post.updateMany({
      where: { id: postId, status: { not: "HIDDEN" } },
      data: { status: "HIDDEN" },
    });
    if (!updated.count) return;

    // 已发布帖子隐藏后修正圈子帖子计数（与删帖口径一致）
    if (post.status === "PUBLISHED") {
      await this.prisma.circle
        .update({ where: { id: post.circleId }, data: { postCount: { decrement: 1 } } })
        .catch((err) => this.logger.warn("举报隐藏后修正 postCount 失败", err));
    }

    // 通知圈主待处理（可在治理/内容管理侧复核后决定恢复或处理成员）
    const circle = await this.prisma.circle.findUnique({
      where: { id: post.circleId },
      select: { ownerId: true, name: true },
    });
    if (circle?.ownerId && this.notification) {
      this.notification
        .send(circle.ownerId, {
          type: "CIRCLE_GOVERNANCE",
          category: "GOVERN",
          circleId: post.circleId,
          title: "圈内帖子被举报已自动隐藏",
          content: `圈子「${circle.name}」内帖子「${post.title || "无标题"}」被 ${reporters.length} 人举报，已按治理配置自动隐藏，请尽快核实处理。`,
          targetType: "POST",
          targetId: postId,
        })
        .catch((err) => this.logger.warn("举报隐藏圈主通知失败", err));
    }
    this.logger.log(`举报满阈值自动隐藏 post=${postId} circle=${post.circleId} reporters=${reporters.length}/${threshold}`);
  }

  async listReports(dto: ReportListQueryDto) {
    const { targetType, status } = dto;
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize);
    const where: Prisma.ReportWhereInput = {};
    if (targetType) where.targetType = targetType;
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: { reporter: { select: { id: true, nickname: true } } },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { reports, total, page, pageSize };
  }

  /** 用户侧举报记录：所有查询都绑定 reporterId，绝不允许按裸 id 越权读取。 */
  async getMyReports(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.ReportWhereInput = { reporterId: userId };
    const select = {
      id: true, targetType: true, targetId: true, reason: true,
      status: true, result: true, createdAt: true, processedAt: true,
    } as const;
    const [items, total] = await Promise.all([
      this.prisma.report.findMany({ where, select, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.report.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getMyReport(userId: string, reportId: string) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, reporterId: userId },
      select: {
        id: true, targetType: true, targetId: true, reason: true,
        status: true, result: true, createdAt: true, processedAt: true,
      },
    });
    if (!report) throw new BusinessException(ErrorCode.NOT_FOUND, "举报记录不存在");
    return report;
  }

  async processReport(reportId: string, result?: string) {
    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status: "PROCESSED", result, processedAt: new Date() },
    });
    this.notifyReportResult(updated.reporterId, reportId, false);
    return updated;
  }

  async dismissReport(reportId: string, result?: string) {
    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status: "DISMISSED", result, processedAt: new Date() },
    });
    this.notifyReportResult(updated.reporterId, reportId, true);
    return updated;
  }

  /** 站内信失败不回滚举报处理；用户仍可从“我的举报”主动查看。 */
  private notifyReportResult(userId: string | undefined, reportId: string, dismissed: boolean) {
    if (!userId || !this.notification) return;
    this.notification.send(userId, {
      type: "SYSTEM",
      title: dismissed ? "举报核查已完成" : "举报处理结果已更新",
      content: dismissed ? "平台已完成核查，点击查看处理说明。" : "你提交的举报已有处理结果，点击查看详情。",
      targetType: "REPORT",
      targetId: reportId,
    }).catch((err) => this.logger.warn(`举报结果通知失败 report=${reportId}`, err));
  }

  /**
   * 查看被举报内容详情（管理员）
   * ─────────────────────────────────────────────
   * 举报记录只存裸 targetType + targetId，管理员据此无法实质判断。
   * 本方法按 targetType 切换查询对应业务表，返回结构化内容摘要供后台核验。
   * 纯只读，不触碰举报处理逻辑。被举报目标已删/不存在时 found=false 由前端降级。
   */
  async getReportTarget(reportId: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new BusinessException(ErrorCode.NOT_FOUND, "举报不存在");

    const { targetType, targetId } = report;
    const type = String(targetType || "").toUpperCase();

    // 统一摘要结构；found=false 表示目标已删除或不存在
    const base = {
      reportId: report.id,
      targetType,
      targetId,
      reason: report.reason,
      status: report.status,
      found: false as boolean,
      type: "",
      title: "",
      content: "",
      author: null as null | { id: string; nickname: string; avatar: string },
      createdAt: null as Date | null,
      extra: {} as Record<string, unknown>,
    };

    const author = (u?: { id: string; nickname: string; avatar: string | null } | null) =>
      u ? { id: u.id, nickname: u.nickname, avatar: u.avatar ?? "" } : null;

    switch (type) {
      case "POST":
      case "CIRCLE_POST": {
        const p = await this.prisma.post.findUnique({
          where: { id: targetId },
          select: { id: true, title: true, content: true, images: true, status: true, createdAt: true, user: { select: { id: true, nickname: true, avatar: true } } },
        });
        if (p) Object.assign(base, { found: true, type: "帖子", title: p.title || "", content: p.content || "", author: author(p.user), createdAt: p.createdAt, extra: { images: p.images ?? [], status: p.status } });
        break;
      }
      case "COMMENT": {
        const c = await this.prisma.comment.findUnique({
          where: { id: targetId },
          select: { id: true, content: true, status: true, createdAt: true, targetType: true, targetId: true, user: { select: { id: true, nickname: true, avatar: true } } },
        });
        if (c) Object.assign(base, { found: true, type: "评论", title: "", content: c.content || "", author: author(c.user), createdAt: c.createdAt, extra: { status: c.status, onTargetType: c.targetType, onTargetId: c.targetId } });
        break;
      }
      case "ARTICLE": {
        const a = await this.prisma.article.findUnique({
          where: { id: targetId },
          select: { id: true, title: true, content: true, excerpt: true, cover: true, auditStatus: true, createdAt: true, user: { select: { id: true, nickname: true, avatar: true } } },
        });
        if (a) Object.assign(base, { found: true, type: "文章", title: a.title || "", content: a.excerpt || a.content || "", author: author(a.user), createdAt: a.createdAt, extra: { cover: a.cover, auditStatus: a.auditStatus } });
        break;
      }
      case "COURSE": {
        const c = await this.prisma.course.findUnique({
          where: { id: targetId },
          select: { id: true, title: true, intro: true, cover: true, auditStatus: true, createdAt: true, user: { select: { id: true, nickname: true, avatar: true } } },
        });
        if (c) Object.assign(base, { found: true, type: "课程", title: c.title || "", content: c.intro || "", author: author(c.user), createdAt: c.createdAt, extra: { cover: c.cover, auditStatus: c.auditStatus } });
        break;
      }
      case "PRODUCT": {
        const p = await this.prisma.product.findUnique({
          where: { id: targetId },
          select: { id: true, title: true, intro: true, images: true, status: true, createdAt: true },
        });
        if (p) Object.assign(base, { found: true, type: "商品", title: p.title || "", content: p.intro || "", createdAt: p.createdAt, extra: { images: p.images ?? [], status: p.status } });
        break;
      }
      case "VIDEO": {
        const v = await this.prisma.video.findUnique({
          where: { id: targetId },
          select: { id: true, title: true, coverUrl: true, videoUrl: true, status: true, createdAt: true, user: { select: { id: true, nickname: true, avatar: true } } },
        });
        if (v) Object.assign(base, { found: true, type: "视频", title: v.title || "视频", content: "", author: author(v.user), createdAt: v.createdAt, extra: { cover: v.coverUrl, videoUrl: v.videoUrl, status: v.status } });
        break;
      }
      case "CIRCLE": {
        const c = await this.prisma.circle.findUnique({
          where: { id: targetId },
          select: { id: true, name: true, intro: true, cover: true, status: true, createdAt: true, owner: { select: { id: true, nickname: true, avatar: true } } },
        });
        if (c) Object.assign(base, { found: true, type: "圈子", title: c.name || "", content: c.intro || "", author: author(c.owner), createdAt: c.createdAt, extra: { cover: c.cover, status: c.status } });
        break;
      }
      case "LIVE":
      case "LIVEROOM":
      case "LIVESTREAM": {
        const l = await this.prisma.liveRoom.findUnique({
          where: { id: targetId },
          select: { id: true, title: true, cover: true, status: true, createdAt: true, user: { select: { id: true, nickname: true, avatar: true } } },
        });
        if (l) Object.assign(base, { found: true, type: "直播", title: l.title || "", content: "", author: author(l.user), createdAt: l.createdAt, extra: { cover: l.cover, status: l.status } });
        break;
      }
      case "USER": {
        const u = await this.prisma.user.findUnique({
          where: { id: targetId },
          select: { id: true, nickname: true, avatar: true, bio: true, phone: true, status: true, createdAt: true },
        });
        if (u) Object.assign(base, { found: true, type: "用户", title: u.nickname || "", content: u.bio || "", author: author(u), createdAt: u.createdAt, extra: { phone: this.maskPhone(u.phone), status: u.status } });
        break;
      }
      default:
        // 未知类型，保持 found=false，前端展示「无法识别的举报对象类型」
        break;
    }

    return base;
  }

  /** 手机号脱敏：138****8000 */
  private maskPhone(phone?: string | null): string {
    if (!phone) return "";
    return phone.length >= 7 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : "***";
  }

  // ═══════════════════ 附近的人 ═══════════════════

  async getNearbyUsers(
    userId: string,
    opts: { lat?: number; lng?: number; radius?: number; page: number; pageSize: number },
  ) {
    const { page, pageSize, skip } = safePagination(opts.page, opts.pageSize);
    // 基于 StationOffline 同城匹配：找到与当前用户同城的线下驿站，返回驿站相关用户
    // 若无坐标数据，返回最近活跃用户
    const [nearbyUsers, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          id: { not: userId },
          status: "ACTIVE",
        },
        select: { id: true, nickname: true, avatar: true, bio: true },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({
        where: { id: { not: userId }, status: "ACTIVE" },
      }),
    ]);

    return { users: nearbyUsers, total, page, pageSize };
  }

  // ═══════════════════ 管理统计 ═══════════════════

  async getAdminStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const [totalLikes, totalComments, totalFollows, totalCollects, totalReports,
      todayLikes, todayComments, todayFollows, todayCollects, todayReports,
      weekLikes, weekComments, weekFollows, weekCollects,
    ] = await Promise.all([
      this.prisma.like.count(),
      this.prisma.comment.count(),
      this.prisma.follow.count(),
      this.prisma.collect.count(),
      this.prisma.report.count(),
      this.prisma.like.count({ where: { createdAt: { gte: today } } }),
      this.prisma.comment.count({ where: { createdAt: { gte: today } } }),
      this.prisma.follow.count({ where: { createdAt: { gte: today } } }),
      this.prisma.collect.count({ where: { createdAt: { gte: today } } }),
      this.prisma.report.count({ where: { createdAt: { gte: today } } }),
      this.prisma.like.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.comment.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.follow.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.collect.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);

    return {
      total: { likes: totalLikes, comments: totalComments, follows: totalFollows, collects: totalCollects, reports: totalReports },
      today: { likes: todayLikes, comments: todayComments, follows: todayFollows, collects: todayCollects, reports: todayReports },
      thisWeek: { likes: weekLikes, comments: weekComments, follows: weekFollows, collects: weekCollects },
    };
  }

  async getAdminTrends(days = 7) {
    const trends: { date: string; likes: number; comments: number; follows: number; collects: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const [likes, comments, follows, collects] = await Promise.all([
        this.prisma.like.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
        this.prisma.comment.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
        this.prisma.follow.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
        this.prisma.collect.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
      ]);
      trends.push({ date: dayStart.toISOString().slice(0, 10), likes, comments, follows, collects });
    }
    return trends;
  }

  async getAdminTopContent(limit = 10) {
    // 按点赞数排行的内容
    const topArticles = await this.prisma.like.groupBy({
      by: ["targetId", "targetType"],
      _count: { targetId: true },
      where: { targetType: { in: ["ARTICLE", "COURSE", "CIRCLE", "PRODUCT", "CLASSIC"] } },
      orderBy: { _count: { targetId: "desc" } },
      take: limit,
    });
    return topArticles.map((item) => ({
      targetId: item.targetId,
      targetType: item.targetType,
      likeCount: item._count.targetId,
    }));
  }

  // ═══════════════════ 辅助 ═══════════════════

  private async incrementCommentCount(targetType: string, targetId: string) {
    try {
      // 只对已定义 commentCount 字段的模型更新
      if (targetType === "ARTICLE") {
        await this.prisma.article.update({
          where: { id: targetId },
          data: { commentCount: { increment: 1 } },
        });
      }
    } catch (_err) { /* 忽略不支持的模型 */ }
  }
}
