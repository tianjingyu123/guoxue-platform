import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AuditService } from "../audit/audit.service";
import { safePagination } from "../../common/pagination";
import { CreateCourseDto, UpdateCourseDto } from "./course.dto";

/**
 * 课程-讲师创作台与草稿域（从 course.service 拆出·纯搬家不改逻辑）。
 * 职责：我创建的课程列表、讲师回复自己课程评价、草稿 CRUD 与发布。
 */
@Injectable()
export class CourseCreatorService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private auditService: AuditService,
  ) {}

  // ═══════════════════ 讲师创作管理台 ═══════════════════

  /** 我创建的课程（讲师管理台，含章节/评价计数与审核状态） */
  async getCreatedCourses(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.CourseWhereInput = { userId, deletedAt: null };
    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        select: {
          id: true,
          title: true,
          cover: true,
          type: true,
          price: true,
          auditStatus: true,
          visibility: true, // SELF_ONLY=机审降级仅自己可见（前端灰色小标）
          studentCount: true,
          circleId: true,
          createdAt: true,
          _count: { select: { chapters: true, reviews: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.course.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 讲师回复自己课程的评价（归属校验：只能回复自己创建课程下的评价） */
  async replyReviewByCreator(reviewId: string, userId: string, reply: string) {
    if (!reply || !reply.trim()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "回复内容不能为空");
    }
    const review = await this.prisma.courseReview.findUnique({
      where: { id: reviewId },
      include: { course: { select: { userId: true } } },
    });
    if (!review) throw new BusinessException(ErrorCode.NOT_FOUND, "评价不存在");
    if (review.course.userId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只能回复自己课程的评价");
    }
    // 统一内容审核（违规抛异常）
    await this.auditService.moderateTextOrThrow(reply, { scene: "REVIEW_REPLY", userId, dataId: reviewId });
    const updated = await this.prisma.courseReview.update({
      where: { id: reviewId },
      data: { reply: reply.trim() } as any,
    });
    await this.redis.del(`courses:detail:${review.courseId}`);
    return updated;
  }

  // ═══════════════════ 草稿管理（讲师端）═══════════════════

  async getMyDrafts(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.CourseWhereInput = { userId, auditStatus: "DRAFT" };
    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        select: { id: true, title: true, cover: true, intro: true, updatedAt: true },
        skip,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.course.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async saveDraft(userId: string, dto: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        userId,
        circleId: dto.circleId,
        title: dto.title || "未命名课程",
        cover: dto.cover,
        intro: dto.intro,
        type: dto.type || "VIDEO",
        price: dto.price ?? 0,
        originalPrice: dto.originalPrice,
        tags: dto.tags || [],
        categoryLevel1: dto.categoryLevel1,
        categoryLevel2: dto.categoryLevel2,
        validityDays: dto.validityDays ?? 0,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        stationId: dto.stationId,
        auditStatus: "DRAFT",
      },
    });
  }

  async updateDraft(id: string, userId: string, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "草稿不存在");
    if (course.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能编辑自己的草稿");
    return this.prisma.course.update({ where: { id }, data: dto as Prisma.CourseUpdateInput });
  }

  async deleteDraft(id: string, userId: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "草稿不存在");
    if (course.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能删除自己的草稿");
    await this.prisma.course.delete({ where: { id } });
    return { success: true };
  }

  async publishDraft(id: string, userId: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "草稿不存在");
    if (course.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能发布自己的草稿");
    if (course.auditStatus !== "DRAFT") throw new BusinessException(ErrorCode.BAD_REQUEST, "该课程不是草稿");
    // 审核无感化（20260711 第八节）：发布即可见，机审异步分级处置
    const updated = await this.prisma.course.update({
      where: { id },
      data: { auditStatus: "APPROVED" },
    });
    this.auditService.queueContentModeration({
      contentType: "COURSE",
      contentId: id,
      userId,
      circleId: course.circleId,
      text: [course.title, course.intro].filter(Boolean).join(" "),
    });
    await this.redis.delByPattern("courses:list:*");
    return updated;
  }
}
