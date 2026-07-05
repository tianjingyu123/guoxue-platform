import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { safePagination } from "../../common/pagination";

/**
 * 课程-管理端域（从 course.service 拆出·纯搬家不改逻辑）。
 * 职责：学员列表/学生进度、批量审核/强制删除/强制状态、评价管理（回复/隐藏/全量列表）。
 */
@Injectable()
export class CourseAdminService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ═══════════════════ 学员管理 ═══════════════════

  /** 管理员查看课程学员列表 */
  async getCourseStudents(courseId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    const where: Prisma.OrderWhereInput = { type: "COURSE", targetId: courseId, status: { in: ["PAID", "COMPLETED"] } };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: { id: true, userId: true, amount: true, paidAt: true },
        skip,
        take: pageSize,
        orderBy: { paidAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);

    const userIds = orders.map(o => o.userId);
    const [users, progresses] = await Promise.all([
      userIds.length > 0 ? this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true, avatar: true } }) : [],
      this.prisma.courseProgress.groupBy({ by: ["userId"], where: { courseId, userId: { in: userIds } }, _count: { id: true }, _sum: { progress: true } }),
    ]);

    const userMap = new Map<any, any>(users.map((u: any) => [u.id, u] as [string, any]));
    const progressMap = new Map<any, any>(progresses.map((p: any) => [p.userId, { completedChapters: p._count.id, totalProgress: Math.round((p._sum.progress || 0) / Math.max(p._count.id, 1)) }] as [string, any]));

    const students = orders.map(o => ({
      orderId: o.id,
      paidAt: o.paidAt,
      amount: o.amount,
      user: userMap.get(o.userId) || { id: o.userId, nickname: "未知", avatar: null },
      progress: progressMap.get(o.userId) || { completedChapters: 0, totalProgress: 0 },
    }));

    return { students, total, page, pageSize };
  }

  /** 管理员查看学生详细进度 */
  async getStudentProgress(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    const [progresses, works] = await Promise.all([
      this.prisma.courseProgress.findMany({
        where: { userId, courseId },
        include: { chapter: { select: { id: true, title: true, sortOrder: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.courseWork.findMany({
        where: { userId, courseId },
        include: { chapter: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { userId, courseId, progresses, works };
  }

  // ═══════════════════ 批量操作 ═══════════════════

  /** 批量审核课程 */
  async batchAudit(ids: string[], status: string) {
    if (!["APPROVED", "REJECTED"].includes(status)) throw new BusinessException(ErrorCode.BAD_REQUEST, "审核结果只能是 APPROVED 或 REJECTED");
    const result = await this.prisma.course.updateMany({
      where: { id: { in: ids }, auditStatus: "PENDING" },
      data: { auditStatus: status },
    });
    await this.redis.delByPattern("courses:list:*");
    return { affectedCount: result.count, status };
  }

  /** 管理员强制删除 */
  async forceDelete(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");
    await this.prisma.course.delete({ where: { id: courseId } });
    await Promise.all([this.redis.delByPattern("courses:list:*"), this.redis.del(`courses:detail:${courseId}`)]);
    return { success: true };
  }

  /** 管理员强制变更审核状态（上架/下架） */
  async forceStatus(courseId: string, status: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");
    if (!["DRAFT", "PENDING", "APPROVED", "REJECTED"].includes(status)) throw new BusinessException(ErrorCode.BAD_REQUEST, "无效的状态值");
    await this.prisma.course.update({ where: { id: courseId }, data: { auditStatus: status } });
    await Promise.all([this.redis.delByPattern("courses:list:*"), this.redis.del(`courses:detail:${courseId}`)]);
    return { success: true, status };
  }

  // ═══════════════════ 评价管理 ═══════════════════

  /** 管理员回复评价 */
  async replyReview(reviewId: string, reply: string) {
    const review = await this.prisma.courseReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new BusinessException(ErrorCode.NOT_FOUND, "评价不存在");
    const updated = await this.prisma.courseReview.update({ where: { id: reviewId }, data: { reply } as any });
    await this.redis.del(`courses:detail:${review.courseId}`);
    return updated;
  }

  /** 管理员隐藏/恢复评价 */
  async toggleReviewStatus(reviewId: string, status: string) {
    if (!["PUBLISHED", "HIDDEN"].includes(status)) throw new BusinessException(ErrorCode.BAD_REQUEST, "状态只能是 PUBLISHED 或 HIDDEN");
    const review = await this.prisma.courseReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new BusinessException(ErrorCode.NOT_FOUND, "评价不存在");
    const updated = await this.prisma.courseReview.update({ where: { id: reviewId }, data: { status } });
    await this.redis.del(`courses:detail:${review.courseId}`);
    return updated;
  }

  /** 管理员查看所有评价（含隐藏） */
  async listAllReviews(courseId: string, rawPage = 1, rawPageSize = 20, status?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.CourseReviewWhereInput = { courseId };
    if (status) where.status = status;
    const [reviews, total] = await Promise.all([
      this.prisma.courseReview.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.courseReview.count({ where }),
    ]);
    return { reviews, total, page, pageSize };
  }
}
