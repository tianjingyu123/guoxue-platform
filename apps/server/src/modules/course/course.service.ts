import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma, OrderStatus } from "@prisma/client";
import { RedisService } from "../../redis/redis.service";
import {
  CreateCourseDto, UpdateCourseDto,
  CreateChapterDto, UpdateChapterDto,
  UpdateProgressDto, SubmitWorkDto,
  CreateReviewDto, PurchaseCourseDto,
} from "./course.dto";

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ═══════════════════ 课程 CRUD ═══════════════════

  async create(userId: string, dto: CreateCourseDto) {
    const course = await this.prisma.course.create({
      data: {
        userId,
        circleId: dto.circleId,
        title: dto.title,
        cover: dto.cover,
        intro: dto.intro,
        type: dto.type || "VIDEO",
        price: dto.price ?? 0,
        originalPrice: dto.originalPrice,
        stationId: dto.stationId,
      },
      include: { chapters: { orderBy: { sortOrder: "asc" } } },
    });

    await this.redis.delByPattern("courses:list:*");
    return course;
  }

  async update(courseId: string, userId: string, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException("课程不存在");
    if (course.userId !== userId) throw new ForbiddenException("只能编辑自己的课程");

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: dto as Prisma.CourseUpdateInput,
      include: { chapters: { orderBy: { sortOrder: "asc" } } },
    });

    await Promise.all([
      this.redis.delByPattern("courses:list:*"),
      this.redis.del(`courses:detail:${courseId}`),
    ]);
    return updated;
  }

  async delete(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException("课程不存在");
    if (course.userId !== userId) throw new ForbiddenException("只能删除自己的课程");

    await this.prisma.course.delete({ where: { id: courseId } });

    await Promise.all([
      this.redis.delByPattern("courses:list:*"),
      this.redis.del(`courses:detail:${courseId}`),
    ]);
    return { success: true };
  }

  async getDetail(courseId: string) {
    const cacheKey = `courses:detail:${courseId}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      this.prisma.course.update({
        where: { id: courseId },
        data: { studentCount: { increment: 1 } },
      }).catch((e) => this.logger.warn(`缓存命中时更新课程 ${courseId} 学习人数失败: ${e.message}`));
      return cached;
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        circle: { select: { id: true, name: true, cover: true } },
        chapters: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!course) throw new NotFoundException("课程不存在");

    await this.prisma.course.update({
      where: { id: courseId },
      data: { studentCount: { increment: 1 } },
    });

    await this.redis.setJson(cacheKey, course, 600);
    return course;
  }

  async listCourses(params: {
    page: number; pageSize: number; circleId?: string;
    auditStatus?: string; stationId?: string; keyword?: string;
  }) {
    const { page, pageSize, circleId, auditStatus, stationId, keyword } = params;
    const filterHash = `${circleId ?? ""}:${auditStatus ?? ""}:${keyword ?? ""}`;
    const cacheKey = `courses:list:${page}:${pageSize}:${filterHash}`;

    // 关键词搜索不缓存（搜索组合太多）
    if (!keyword) {
      const cached = await this.redis.getJson<any>(cacheKey);
      if (cached) return cached;
    }

    const where: Prisma.CourseWhereInput = {};
    if (circleId) where.circleId = circleId;
    if (auditStatus) where.auditStatus = auditStatus;
    else where.auditStatus = "APPROVED";
    if (stationId) where.stationId = stationId;
    if (keyword) where.title = { contains: keyword };

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        select: {
          id: true, title: true, cover: true, intro: true,
          type: true, price: true, originalPrice: true,
          studentCount: true, auditStatus: true, createdAt: true,
          user: { select: { id: true, nickname: true, avatar: true } },
          circle: { select: { id: true, name: true } },
          _count: { select: { chapters: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.course.count({ where }),
    ]);

    const data = { courses, total, page, pageSize };
    await this.redis.setJson(cacheKey, data, 300);
    return data;
  }

  // ═══════════════════ 审核 ═══════════════════

  async audit(courseId: string, status: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { auditStatus: true } });
    if (!course) throw new NotFoundException("课程不存在");
    if (course.auditStatus !== "PENDING") throw new BadRequestException("该课程已审核，不可重复操作");
    if (!["APPROVED", "REJECTED"].includes(status)) throw new BadRequestException("审核结果只能是 APPROVED 或 REJECTED");
    return this.prisma.course.update({
      where: { id: courseId },
      data: { auditStatus: status },
    });
  }

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
    return this.prisma.courseChapter.update({
      where: { id: chapterId },
      data: dto as Prisma.CourseChapterUpdateInput,
    });
  }

  async deleteChapter(chapterId: string, courseId: string, userId: string) {
    await this.ensureOwner(courseId, userId);
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
    if (!chapter) throw new NotFoundException("章节不存在");

    // 免费章节 or 课程免费 or 课程作者本人 — 直接放行
    if (chapter.freeTrial || Number(chapter.course.price) === 0 || chapter.course.userId === userId) {
      return chapter;
    }

    // 检查是否已购买
    const hasAccess = await this.checkAccess(userId, chapter.course.id);
    if (!hasAccess) throw new ForbiddenException("请先购买课程");

    return chapter;
  }

  // ═══════════════════ 学习进度 ═══════════════════

  async updateProgress(userId: string, chapterId: string, dto: UpdateProgressDto) {
    const chapter = await this.prisma.courseChapter.findUnique({
      where: { id: chapterId },
      select: { courseId: true },
    });
    if (!chapter) throw new NotFoundException("章节不存在");

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

  // ═══════════════════ 作业 ═══════════════════

  async submitWork(userId: string, chapterId: string, dto: SubmitWorkDto) {
    const chapter = await this.prisma.courseChapter.findUnique({
      where: { id: chapterId },
      select: { courseId: true },
    });
    if (!chapter) throw new NotFoundException("章节不存在");

    return this.prisma.courseWork.create({
      data: {
        userId,
        courseId: chapter.courseId,
        chapterId,
        content: dto.content,
      },
    });
  }

  async getWorks(courseId: string, chapterId?: string) {
    const where: Prisma.CourseWorkWhereInput = { courseId };
    if (chapterId) where.chapterId = chapterId;

    return this.prisma.courseWork.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async scoreWork(workId: string, userId: string, score: number, feedback?: string) {
    const work = await this.prisma.courseWork.findUnique({ where: { id: workId }, select: { courseId: true } });
    if (!work) throw new NotFoundException("作业不存在");
    const course = await this.prisma.course.findUnique({ where: { id: work.courseId }, select: { userId: true } });
    if (!course || course.userId !== userId) throw new ForbiddenException("只有讲师可以评分");
    return this.prisma.courseWork.update({
      where: { id: workId },
      data: { score, feedback },
    });
  }

  // ═══════════════════ 课程购买 ═══════════════════

  /** 创建课程购买订单 */
  async purchase(userId: string, courseId: string, dto?: PurchaseCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, price: true, title: true },
    });
    if (!course) throw new NotFoundException("课程不存在");

    // 检查是否已购买
    const alreadyPaid = await this.prisma.order.findFirst({
      where: { userId, type: "COURSE", targetId: courseId, status: { in: ["PAID", "COMPLETED"] } },
    });
    if (alreadyPaid) throw new BadRequestException("已购买该课程");

    // 检查是否有待支付订单
    const pendingOrder = await this.prisma.order.findFirst({
      where: { userId, type: "COURSE", targetId: courseId, status: "PENDING" },
    });
    if (pendingOrder) return pendingOrder;

    try {
      const order = await this.prisma.order.create({
        data: {
          userId,
          type: "COURSE",
          targetId: courseId,
          amount: course.price,
          couponId: dto?.couponId,
          referrerId: dto?.referrerId,
          status: "PENDING",
        },
      });
      return order;
    } catch (e: unknown) {
      if ((e as Record<string, unknown>)?.code === "P2002") {
        const existing = await this.prisma.order.findFirst({
          where: { userId, type: "COURSE", targetId: courseId, status: { in: ["PENDING", "PAID", "COMPLETED"] } },
        });
        if (existing) return existing;
        throw e;
      }
      throw e;
    }
  }

  /** 检查用户是否有课程访问权限 */
  async checkAccess(userId: string, courseId: string): Promise<boolean> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { price: true, userId: true },
    });
    if (!course) return false;
    if (Number(course.price) === 0 || course.userId === userId) return true;

    const order = await this.prisma.order.findFirst({
      where: { userId, type: "COURSE", targetId: courseId, status: { in: ["PAID", "COMPLETED"] } },
    });
    return !!order;
  }

  /** 获取我购买的课程 */
  async getMyCourses(userId: string, page = 1, pageSize = 20) {
    const where: Prisma.OrderWhereInput = { userId, type: "COURSE" as const, status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] } };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { paidAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);

    // 批量获取课程信息
    const courseIds = orders.map(o => o.targetId);
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({
          where: { id: { in: courseIds } },
          select: {
            id: true, title: true, cover: true, type: true,
            user: { select: { id: true, nickname: true, avatar: true } },
          },
        })
      : [];

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const enriched = orders.map(o => ({
      orderId: o.id,
      paidAt: o.paidAt,
      amount: o.amount,
      course: courseMap.get(o.targetId) || null,
      // 查询学习进度
    }));

    return { courses: enriched, total, page, pageSize };
  }

  // ═══════════════════ 课程评价 ═══════════════════

  async createReview(userId: string, courseId: string, dto: CreateReviewDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException("课程不存在");

    // 检查是否已购买
    const hasAccess = await this.checkAccess(userId, courseId);
    if (!hasAccess && course.userId !== userId) {
      throw new ForbiddenException("购买课程后才能评价");
    }

    // 检查是否已评价
    const existing = await this.prisma.courseReview.findFirst({
      where: { userId, courseId },
    });
    if (existing) throw new BadRequestException("已评价过该课程");

    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException("评分范围为1-5星");
    }

    const review = await this.prisma.courseReview.create({
      data: {
        courseId,
        userId,
        orderId: dto.orderId,
        rating: dto.rating,
        content: dto.content,
      },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });

    // 清除课程详情缓存
    await this.redis.del(`courses:detail:${courseId}`);
    return review;
  }

  async listReviews(courseId: string, page = 1, pageSize = 20) {
    const where = { courseId, status: "PUBLISHED" };
    const [reviews, total] = await Promise.all([
      this.prisma.courseReview.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.courseReview.count({ where }),
    ]);
    return { reviews, total, page, pageSize };
  }

  async getCourseRating(courseId: string) {
    const stats = await this.prisma.courseReview.aggregate({
      where: { courseId, status: "PUBLISHED" },
      _avg: { rating: true },
      _count: true,
    });
    return {
      courseId,
      avgRating: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : 0,
      reviewCount: stats._count,
    };
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
    if (!course) throw new NotFoundException("课程不存在");
    if (course.userId !== userId) throw new ForbiddenException("只能查看自己课程的统计");

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

  // ═══════════════════ 辅助 ═══════════════════

  private async ensureOwner(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException("课程不存在");
    if (course.userId !== userId) throw new ForbiddenException("只能编辑自己的课程");
  }
}
