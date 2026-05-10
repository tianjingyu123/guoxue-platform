import { Injectable, NotFoundException, ConflictException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  LikeDto, CreateCommentDto, CollectDto,
  FollowDto, ReportDto, CommentListQueryDto, ReportListQueryDto,
} from "./interaction.dto";
import { Prisma } from "@prisma/client";

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
      if ((e as any)?.code === "P2002") return { liked: true };
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

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException("评论不存在");
    if (comment.userId !== userId) {
      // 管理员也可以删
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
      if ((e as any)?.code === "P2002") return { collected: true };
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
      throw new ConflictException("不能关注自己");
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
      if ((e as any)?.code === "P2002") return { followed: true };
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

  // ═══════════════════ 辅助 ═══════════════════

  private async incrementCommentCount(targetType: string, targetId: string) {
    try {
      // 只对已定义 commentCount 字段的模型更新
      if (targetType === "ARTICLE") {
        await (this.prisma as any).article.update({
          where: { id: targetId },
          data: { commentCount: { increment: 1 } },
        });
      }
    } catch { /* 忽略不支持的模型 */ }
  }
}
