import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCommentDto, UpdateCommentDto, CommentQueryDto } from "./comment.dto";
import { Prisma } from "@prisma/client";
import { safePagination } from "../../common/pagination";
import { Cacheable, CacheEvict } from "../../common/cache.decorator";
import { resolveTargets, targetKey } from "../interaction/target-resolver";
import { AuditService } from "../audit/audit.service";

export interface ReplyNode {
  id: string;
  parentId: string | null;
  [key: string]: unknown;
}

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // 发布评论后立刻失效该目标的列表缓存（findByTarget @Cacheable ttl15s·否则新评论要等缓存过期才可见）
  @CacheEvict({ key: (args: any[]) => `comment:target:${args[1]?.targetType || ""}:${args[1]?.targetId || ""}:*`, pattern: true })
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

    // 圈子治理 #10：圈内帖子评论前查禁言（轻量直查 CircleViolation·避免跨模块依赖）
    if (dto.targetType === "POST") {
      const post = await this.prisma.post.findUnique({ where: { id: dto.targetId }, select: { circleId: true } });
      if (post?.circleId) {
        const mute = await this.prisma.circleViolation.findFirst({
          where: { circleId: post.circleId, userId, type: "MUTE", status: "ACTIVE", expiresAt: { gt: new Date() } },
          select: { expiresAt: true },
        });
        if (mute) {
          const until = mute.expiresAt ? mute.expiresAt.toISOString().slice(0, 16).replace("T", " ") : "";
          throw new BusinessException(ErrorCode.FORBIDDEN, `你在该圈处于禁言期${until ? `（至 ${until}）` : ""}，暂不能评论`);
        }
      }
    }

    await this.audit.moderateTextOrThrow(dto.content, { scene: "COMMENT", userId, dataId: dto.targetId });

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

  @Cacheable({ key: (args: any[]) => `comment:target:${args[0]?.targetType || ""}:${args[0]?.targetId || ""}:${args[0]?.page || 1}:${args[0]?.pageSize || 20}`, ttl: 15 })
  async findByTarget(dto: CommentQueryDto) {
    const { targetType, targetId } = dto;
    const { skip, page, pageSize } = safePagination(dto.page, dto.pageSize);

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
    const nestedComments = topIds.length > 0 && targetType && targetId
      ? await this.fetchNestedReplies(targetType, targetId) : [];

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

  /** 单次查询拉取该目标下所有非顶级回复，利用 (targetType, targetId, parentId, status) 复合索引 */
  private async fetchNestedReplies(targetType: string, targetId: string) {
    return this.prisma.comment.findMany({
      where: { targetType, targetId, parentId: { not: null }, status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
    });
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

  async update(userId: string, commentId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND, "评论不存在");
    if (comment.userId !== userId) throw new BusinessException(ErrorCode.COMMENT_FORBIDDEN, "只能编辑自己的评论");

    await this.audit.moderateTextOrThrow(dto.content, { scene: "COMMENT_EDIT", userId, dataId: commentId });

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
    });
  }

  async getCommentById(commentId: string) {
    return this.prisma.comment.findUnique({ where: { id: commentId } });
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
    const { status = "PUBLISHED", targetType } = params;
    const { skip, page, pageSize } = safePagination(params.page, params.pageSize);
    const where: Prisma.CommentWhereInput = { status };
    if (targetType) where.targetType = targetType;

    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip,
        take: pageSize,
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
    const { skip, page: p, pageSize: ps } = safePagination(page, pageSize);
    const where = { userId, status: "PUBLISHED" };
    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take: ps,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.comment.count({ where }),
    ]);

    // 多态批量补全目标详情 + 一次性聚合各评论的回复数（均不 N+1）
    const commentIds = items.map((c) => c.id);
    const [targets, replyGroups] = await Promise.all([
      resolveTargets(this.prisma, items),
      commentIds.length
        ? this.prisma.comment.groupBy({
            by: ["parentId"],
            where: { parentId: { in: commentIds }, status: "PUBLISHED" },
            _count: { _all: true },
          })
        : Promise.resolve([] as { parentId: string | null; _count: { _all: number } }[]),
    ]);
    const replyCountMap = new Map<string, number>();
    for (const g of replyGroups) {
      if (g.parentId) replyCountMap.set(g.parentId, g._count._all);
    }

    const data = items.map((c) => {
      const replyCount = replyCountMap.get(c.id) ?? 0;
      return {
        ...c,
        replyCount,
        hasReply: replyCount > 0,
        // 目标已删除时为 null，前端降级显示"内容已删除"
        target: targets.get(targetKey(c.targetType, c.targetId)) ?? null,
      };
    });

    return { items: data, total, page: p, pageSize: ps };
  }

  /** 收到的评论：其他人对我的内容发表的评论 */
  async getReceivedComments(userId: string, page = 1, pageSize = 20) {
    const { skip, page: p, pageSize: ps } = safePagination(page, pageSize);

    // 查找该用户拥有的内容ID（文章/课程/视频/商品/圈子帖子）
    const [articleIds, courseIds, videoIds, productIds, postIds] = await Promise.all([
      this.prisma.article.findMany({ where: { userId }, select: { id: true } }),
      this.prisma.course.findMany({ where: { userId }, select: { id: true } }),
      this.prisma.video.findMany({ where: { userId }, select: { id: true } }),
      this.prisma.product.findMany({ where: { userId }, select: { id: true } }),
      this.prisma.post.findMany({ where: { userId }, select: { id: true } }),
    ]);

    const typeTargets: { targetType: string; targetIds: string[] }[] = [
      { targetType: "ARTICLE", targetIds: articleIds.map((a) => a.id) },
      { targetType: "COURSE", targetIds: courseIds.map((c) => c.id) },
      { targetType: "VIDEO", targetIds: videoIds.map((v) => v.id) },
      { targetType: "PRODUCT", targetIds: productIds.map((p) => p.id) },
      { targetType: "CIRCLE_POST", targetIds: postIds.map((p) => p.id) },
    ].filter((t) => t.targetIds.length > 0);

    if (typeTargets.length === 0) {
      return { items: [], total: 0, page: p, pageSize: ps };
    }

    // 构建OR条件：每个type+其IDs
    const orConditions = typeTargets.map((t) => ({
      targetType: t.targetType,
      targetId: { in: t.targetIds },
    }));

    const where: Prisma.CommentWhereInput = {
      OR: orConditions,
      userId: { not: userId }, // 排除我自己写的评论
      status: "PUBLISHED",
    };

    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip,
        take: ps,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.comment.count({ where }),
    ]);

    // 多态批量补全"我的内容"标题 + 一次性查我对这些评论的回复（不 N+1）
    const commentIds = items.map((c) => c.id);
    const [targets, myReplies] = await Promise.all([
      resolveTargets(this.prisma, items),
      commentIds.length
        ? this.prisma.comment.findMany({
            where: { parentId: { in: commentIds }, userId, status: "PUBLISHED" },
            orderBy: { createdAt: "asc" },
            select: { id: true, parentId: true, content: true, createdAt: true },
          })
        : Promise.resolve([] as { id: string; parentId: string | null; content: string; createdAt: Date }[]),
    ]);
    const myReplyMap = new Map<string, { content: string; createdAt: Date }>();
    for (const r of myReplies) {
      // 取每条评论最早的一条我方回复
      if (r.parentId && !myReplyMap.has(r.parentId)) {
        myReplyMap.set(r.parentId, { content: r.content, createdAt: r.createdAt });
      }
    }

    const data = items.map((c) => {
      const myReply = myReplyMap.get(c.id);
      return {
        ...c,
        target: targets.get(targetKey(c.targetType, c.targetId)) ?? null,
        isReplied: !!myReply,
        myReply: myReply ?? null,
      };
    });

    return { items: data, total, page: p, pageSize: ps };
  }
}
