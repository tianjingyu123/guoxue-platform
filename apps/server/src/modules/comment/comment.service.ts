import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCommentDto, CommentQueryDto } from "./comment.dto";
import { Prisma } from "@prisma/client";

export interface ReplyNode {
  id: string;
  parentId: string | null;
  [key: string]: unknown;
}

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateCommentDto) {
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { id: true, targetType: true, targetId: true, parentId: true },
      });
      if (!parent) throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND, "父评论不存在");
      if (parent.targetType !== dto.targetType || parent.targetId !== dto.targetId) {
        throw new BusinessException(ErrorCode.COMMENT_FORBIDDEN, "回复评论与目标不匹配");
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        parentId: dto.parentId ?? null,
        content: dto.content,
      },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });

    // 异步记录行为
    this.prisma.userBehavior.create({ data: { userId, targetType: dto.targetType, targetId: dto.targetId, behavior: "COMMENT", weight: 1.5 } }).catch((err) => this.logger.warn("行为记录失败", err));

    return comment;
  }

  async findByTarget(dto: CommentQueryDto) {
    const { targetType, targetId, page = 1, pageSize = 20 } = dto;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { targetType, targetId, parentId: null, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
        },
      }),
      this.prisma.comment.count({
        where: { targetType, targetId, parentId: null, status: "PUBLISHED" },
      }),
    ]);

    const topIds = items.map((c) => c.id);
    const nestedComments = topIds.length > 0 ? await this.fetchNestedReplies(topIds) : [];

    const replyMap = new Map<string, ReplyNode[]>();
    for (const reply of nestedComments) {
      const list = replyMap.get(reply.parentId!) || [];
      list.push(reply);
      replyMap.set(reply.parentId!, list);
    }

    const attachReplies = (commentIds: string[]): ReplyNode[] => {
      const result: ReplyNode[] = [];
      for (const id of commentIds) {
        const replies = replyMap.get(id) || [];
        result.push(...replies.map((r) => ({ ...r, replies: attachReplies([r.id]) })));
      }
      return result;
    };

    const data = items.map((c) => ({
      ...c,
      replies: attachReplies([c.id]),
    }));

    return { data, total, page, pageSize };
  }

  private async fetchNestedReplies(parentIds: string[]) {
    const level1 = await this.prisma.comment.findMany({
      where: { parentId: { in: parentIds }, status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
    });

    const level1Ids = level1.map((c) => c.id);
    if (level1Ids.length === 0) return level1;

    const level2 = await this.prisma.comment.findMany({
      where: { parentId: { in: level1Ids }, status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
    });

    const level2Ids = level2.map((c) => c.id);
    if (level2Ids.length === 0) return [...level1, ...level2];

    const level3 = await this.prisma.comment.findMany({
      where: { parentId: { in: level2Ids }, status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
    });

    return [...level1, ...level2, ...level3];
  }

  async findReplies(parentId: string) {
    const parent = await this.prisma.comment.findUnique({ where: { id: parentId } });
    if (!parent) throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND, "评论不存在");

    return this.prisma.comment.findMany({
      where: { parentId, status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
    });
  }

  async like(commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND, "评论不存在");

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { likeCount: { increment: 1 } },
      select: { id: true, likeCount: true },
    });
  }

  async delete(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND, "评论不存在");
    if (comment.userId !== userId) throw new BusinessException(ErrorCode.COMMENT_FORBIDDEN, "只能删除自己的评论");

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { success: true };
  }

  async hide(commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND, "评论不存在");

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { status: "HIDDEN" },
      select: { id: true, status: true },
    });
  }

  async getCommentCount(targetType: string, targetId: string) {
    return this.prisma.comment.count({
      where: { targetType, targetId, status: "PUBLISHED" },
    });
  }

  // ───────── 管理员审核 ─────────

  async getModerationList(params: { status?: string; targetType?: string; page?: number; pageSize?: number }) {
    const { status = "PUBLISHED", targetType, page = 1, pageSize = 20 } = params;
    const where: Prisma.CommentWhereInput = { status };
    if (targetType) where.targetType = targetType;

    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.comment.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async batchHide(ids: string[]) {
    await this.prisma.comment.updateMany({
      where: { id: { in: ids } },
      data: { status: "HIDDEN" },
    });
    return { success: true, count: ids.length };
  }

  // ───────── 用户评论历史 ─────────

  async getUserComments(userId: string, page = 1, pageSize = 20) {
    const where = { userId, status: "PUBLISHED" };
    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.comment.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
