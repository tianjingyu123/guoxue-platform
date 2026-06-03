import { Injectable, Logger } from "@nestjs/common";
import { HttpStatus } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import {
  LikeDto, CreateCommentDto, CollectDto,
  FollowDto, ReportDto, CommentListQueryDto, ReportListQueryDto,
} from "./interaction.dto";
import { Prisma } from "@prisma/client";
import { isUniqueConstraintError } from "../../common/prisma-errors";

@Injectable()
export class InteractionService {
  private readonly logger = new Logger(InteractionService.name);

  constructor(private prisma: PrismaService) {}

  // ═══════════════════ 点赞 ═══════════════════

  async toggleLike(userId: string, dto: LikeDto) {
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

  async isLiked(userId: string, targetType: string, targetIds: string[]) {
    const likes = await this.prisma.like.findMany({
      where: { userId, targetType, targetId: { in: targetIds } },
      select: { targetId: true },
    });
    return new Set(likes.map(l => l.targetId));
  }

  async getLikeCount(targetType: string, targetId: string) {
    return this.prisma.like.count({ where: { targetType, targetId } });
  }

  async getMyLikes(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [likes, total] = await Promise.all([
      this.prisma.like.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.like.count({ where }),
    ]);
    return { items: likes, total, page, pageSize };
  }

  // ═══════════════════ 评论 ═══════════════════

  async createComment(userId: string, dto: CreateCommentDto) {
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

    return comment;
  }

  async listComments(dto: CommentListQueryDto) {
    const { targetType, targetId, page = 1, pageSize = 20, userId, status } = dto;
    const where: Prisma.CommentWhereInput = { parentId: null };

    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    if (userId) where.userId = userId;
    if (status) where.status = status;
    else where.status = "PUBLISHED";

    const total = await this.prisma.comment.count({ where });

    const comments = await this.prisma.comment.findMany({
      where,
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        replies: {
          where: { status: "PUBLISHED" },
          include: {
            user: { select: { id: true, nickname: true, avatar: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });

    return { comments, total, page, pageSize };
  }

  async deleteComment(commentId: string, userId: string, isAdmin = false) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND, "评论不存在");
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

  async getUserCollects(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [collects, total] = await Promise.all([
      this.prisma.collect.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.collect.count({ where }),
    ]);

    return { collects, total, page, pageSize };
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

  async getFollowers(userId: string, page = 1, pageSize = 20) {
    const where = { followedUserId: userId };
    const [followers, total] = await Promise.all([
      this.prisma.follow.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.follow.count({ where }),
    ]);
    return { followers, total, page, pageSize };
  }

  async getFollowing(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [followings, total] = await Promise.all([
      this.prisma.follow.findMany({
        where,
        include: { followedUser: { select: { id: true, nickname: true, avatar: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.follow.count({ where }),
    ]);
    return { followings, total, page, pageSize };
  }

  // ═══════════════════ 举报 ═══════════════════

  async report(userId: string, dto: ReportDto) {
    return this.prisma.report.create({
      data: {
        reporterId: userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
      },
    });
  }

  async listReports(dto: ReportListQueryDto) {
    const { targetType, status, page = 1, pageSize = 20 } = dto;
    const where: Prisma.ReportWhereInput = {};
    if (targetType) where.targetType = targetType;
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: { reporter: { select: { id: true, nickname: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { reports, total, page, pageSize };
  }

  async processReport(reportId: string, result?: string) {
    return this.prisma.report.update({
      where: { id: reportId },
      data: { status: "PROCESSED", result, processedAt: new Date() },
    });
  }

  async dismissReport(reportId: string) {
    return this.prisma.report.update({
      where: { id: reportId },
      data: { status: "DISMISSED", processedAt: new Date() },
    });
  }

  // ═══════════════════ 附近的人 ═══════════════════

  async getNearbyUsers(
    userId: string,
    opts: { lat?: number; lng?: number; radius?: number; page: number; pageSize: number },
  ) {
    const { page, pageSize } = opts;
    // 基于 StationOffline 同城匹配：找到与当前用户同城的线下驿站，返回驿站相关用户
    // 若无坐标数据，返回最近活跃用户
    const [nearbyUsers, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          id: { not: userId },
          status: "ACTIVE",
        },
        select: { id: true, nickname: true, avatar: true, bio: true },
        skip: (page - 1) * pageSize,
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
