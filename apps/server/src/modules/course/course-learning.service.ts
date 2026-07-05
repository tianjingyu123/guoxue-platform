import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import {
  CreateChapterDto, UpdateChapterDto, UpdateProgressDto,
} from "./course.dto";
import { CoursePurchaseService } from "./course-purchase.service";

/**
 * 课程-学习域（从 course.service 拆出·纯搬家不改逻辑）。
 * 职责：章节 CRUD、章节内容鉴权取用、学习进度、学习看板、完成评估与证书。
 * 依赖 CoursePurchaseService.checkAccess（getChapterContent/completeCourse 鉴权）。
 */
@Injectable()
export class CourseLearningService {
  private readonly logger = new Logger(CourseLearningService.name);

  constructor(
    private prisma: PrismaService,
    private purchaseSvc: CoursePurchaseService,
  ) {}

  // ═══════════════════ 章节管理 ═══════════════════

  async addChapter(courseId: string, userId: string, dto: CreateChapterDto) {
    await this.ensureOwner(courseId, userId);
    return this.prisma.courseChapter.create({
      data: {
        courseId,
        title: dto.title,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        duration: dto.duration,
        sortOrder: dto.sortOrder ?? 0,
        freeTrial: dto.freeTrial ?? false,
      },
    });
  }

  async updateChapter(chapterId: string, courseId: string, userId: string, dto: UpdateChapterDto) {
    await this.ensureOwner(courseId, userId);
    const existing = await this.prisma.courseChapter.findUnique({ where: { id: chapterId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "课程章节不存在");
    return this.prisma.courseChapter.update({
      where: { id: chapterId },
      data: dto as Prisma.CourseChapterUpdateInput,
    });
  }

  async deleteChapter(chapterId: string, courseId: string, userId: string) {
    await this.ensureOwner(courseId, userId);
    const existing = await this.prisma.courseChapter.findUnique({ where: { id: chapterId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "课程章节不存在");
    await this.prisma.courseChapter.delete({ where: { id: chapterId } });
    return { success: true };
  }

  async getChapters(courseId: string) {
    return this.prisma.courseChapter.findMany({
      where: { courseId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true, title: true, duration: true, sortOrder: true, freeTrial: true,
      },
    });
  }

  /** 获取章节完整内容（需验证访问权限） */
  async getChapterContent(userId: string, chapterId: string) {
    const chapter = await this.prisma.courseChapter.findUnique({
      where: { id: chapterId },
      include: { course: { select: { id: true, price: true, userId: true } } },
    });
    if (!chapter) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "章节不存在");

    // 免费章节 or 课程免费 or 课程作者本人 — 直接放行
    if (chapter.freeTrial || Number(chapter.course.price) === 0 || chapter.course.userId === userId) {
      return chapter;
    }

    // 检查是否已购买
    const hasAccess = await this.purchaseSvc.checkAccess(userId, chapter.course.id);
    if (!hasAccess) throw new BusinessException(ErrorCode.COURSE_CHAPTER_LOCKED, "请先购买课程");

    return chapter;
  }

  // ═══════════════════ 学习进度 ═══════════════════

  async updateProgress(userId: string, chapterId: string, dto: UpdateProgressDto) {
    const chapter = await this.prisma.courseChapter.findUnique({
      where: { id: chapterId },
      select: { courseId: true },
    });
    if (!chapter) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "章节不存在");

    const completed = dto.progress >= 100;

    if (dto.progress >= 50) {
      this.prisma.userBehavior.create({ data: { userId, targetType: "COURSE", targetId: chapter.courseId, behavior: "LEARN", weight: 3 } }).catch((e) => this.logger.warn("学习行为记录失败", e));
    }

    if (completed) {
      await this.prisma.courseProgress.upsert({
        where: { userId_chapterId: { userId, chapterId } },
        create: { userId, courseId: chapter.courseId, chapterId, progress: 100, completed: true },
        update: { progress: 100, completed: true },
      });
    } else {
      await this.prisma.courseProgress.upsert({
        where: { userId_chapterId: { userId, chapterId } },
        create: { userId, courseId: chapter.courseId, chapterId, progress: dto.progress },
        update: { progress: dto.progress, completed: false },
      });
    }

    return { success: true, progress: dto.progress, completed };
  }

  async getMyProgress(userId: string, courseId: string) {
    return this.prisma.courseProgress.findMany({
      where: { userId, courseId },
      select: { chapterId: true, progress: true, completed: true, updatedAt: true },
    });
  }

  // ═══════════════════ 学习看板 ═══════════════════

  /** 学生学习看板 */
  async getMyLearningDashboard(userId: string) {
    // 学习的课程数
    const enrolledOrders = await this.prisma.order.count({
      where: { userId, type: "COURSE", status: { in: ["PAID", "COMPLETED"] } },
    });

    // 已完成的章节数
    const completedChapters = await this.prisma.courseProgress.count({
      where: { userId, completed: true },
    });

    // 进行中的章节数
    const inProgressChapters = await this.prisma.courseProgress.count({
      where: { userId, completed: false, progress: { gt: 0 } },
    });

    // 待批改作业数
    const pendingWorks = await this.prisma.courseWork.count({
      where: { userId, score: null },
    });

    // 最近学习记录
    const recentProgress = await this.prisma.courseProgress.findMany({
      where: { userId },
      include: {
        chapter: { select: { id: true, title: true } },
        course: { select: { id: true, title: true, cover: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    return {
      enrolledCourses: enrolledOrders,
      completedChapters,
      inProgressChapters,
      pendingWorks,
      recentProgress,
    };
  }

  /** 讲师课程统计 */
  async getCourseStats(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, userId: true, title: true },
    });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");
    if (course.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能查看自己课程的统计");

    const [
      enrollmentCount,
      completedCount,
      totalChapters,
      avgRating,
      reviewCount,
      works,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { type: "COURSE", targetId: courseId, status: { in: ["PAID", "COMPLETED"] } },
      }),
      this.prisma.courseProgress.count({
        where: { courseId, completed: true },
      }),
      this.prisma.courseChapter.count({ where: { courseId } }),
      this.prisma.courseReview.aggregate({
        where: { courseId, status: "PUBLISHED" },
        _avg: { rating: true },
      }),
      this.prisma.courseReview.count({ where: { courseId, status: "PUBLISHED" } }),
      this.prisma.courseWork.count({ where: { courseId } }),
    ]);

    return {
      courseId,
      title: course.title,
      enrollmentCount,
      completedCount,
      totalChapters,
      avgRating: avgRating._avg.rating ? Math.round(avgRating._avg.rating * 10) / 10 : 0,
      reviewCount,
      totalWorks: works,
    };
  }

  // ═══════════════════ 完成评估 + 证书 ═══════════════════

  async completeCourse(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true, title: true, userId: true } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    const hasAccess = await this.purchaseSvc.checkAccess(userId, courseId);
    if (!hasAccess) throw new BusinessException(ErrorCode.FORBIDDEN, "请先购买课程");

    const chapters = await this.prisma.courseChapter.count({ where: { courseId } });
    const completed = await this.prisma.courseProgress.count({ where: { userId, courseId, completed: true } });
    if (chapters > 0 && completed < chapters) throw new BusinessException(ErrorCode.BAD_REQUEST, `还有 ${chapters - completed} 个章节未完成`);

    return { courseId, userId, title: course.title, completedAt: new Date(), completed: true };
  }

  async getCertificate(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true, user: { select: { nickname: true } }, chapters: { select: { duration: true } } },
    });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    const chapters = course.chapters.length;
    const completedRows = await this.prisma.courseProgress.findMany({
      where: { userId, courseId, completed: true },
      select: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    if (chapters > 0 && completedRows.length < chapters) throw new BusinessException(ErrorCode.BAD_REQUEST, "尚未完成全部章节");

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
    const completedAt = completedRows[0]?.updatedAt ?? new Date();
    const totalHours = Math.round((course.chapters.reduce((s, c) => s + (c.duration || 0), 0) / 3600) * 10) / 10;

    return {
      id: `cert-${courseId.slice(0, 8)}-${userId.slice(0, 8)}`,
      courseId,
      // 原字段保留（向后兼容）+ 补全字段（前端证书页所需）
      courseTitle: course.title,
      courseName: course.title,
      studentName: user?.nickname || "",
      instructor: course.user?.nickname || "讲师",
      completedChapters: completedRows.length,
      totalChapters: chapters,
      totalHours,
      completedAt: completedAt.toISOString().slice(0, 10),
      certificateNo: `GX-${courseId.slice(0, 8).toUpperCase()}-${userId.slice(0, 4).toUpperCase()}`,
    };
  }

  // ═══════════════════ 辅助 ═══════════════════

  private async ensureOwner(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");
    if (course.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能编辑自己的课程");
  }
}
