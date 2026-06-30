import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma, OrderStatus } from "@prisma/client";
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { RedisService } from "../../redis/redis.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { UnifiedPricingService } from "../pricing/unified-pricing.service";
import {
  CreateCourseDto, UpdateCourseDto,
  CreateChapterDto, UpdateChapterDto,
  UpdateProgressDto, SubmitWorkDto,
  CreateReviewDto, PurchaseCourseDto,
  AskQuestionDto, AnswerQuestionDto, QaListQueryDto,
} from "./course.dto";

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private aiGateway: AiGatewayService,
    private unifiedPricing: UnifiedPricingService,
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
        tags: dto.tags || [],
        categoryLevel1: dto.categoryLevel1,
        categoryLevel2: dto.categoryLevel2,
        validityDays: dto.validityDays ?? 0,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      },
      include: { chapters: { orderBy: { sortOrder: "asc" } } },
    });

    await this.redis.delByPattern("courses:list:*");
    return course;
  }

  async update(courseId: string, userId: string, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");
    if (course.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能编辑自己的课程");

    const data: Prisma.CourseUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.cover !== undefined) data.cover = dto.cover;
    if (dto.intro !== undefined) data.intro = dto.intro;
    if (dto.type !== undefined) data.type = dto.type as any;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.originalPrice !== undefined) data.originalPrice = dto.originalPrice;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if ((dto as any).validityDays !== undefined) data.validityDays = (dto as any).validityDays;
    if (dto.categoryLevel1 !== undefined) data.categoryLevel1 = dto.categoryLevel1;
    if (dto.categoryLevel2 !== undefined) data.categoryLevel2 = dto.categoryLevel2;
    if (dto.circleId !== undefined) (data as any).circleId = dto.circleId;
    if ((dto as any).description !== undefined) (data as any).description = (dto as any).description;

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data,
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
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");
    if (course.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能删除自己的课程");

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
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    await this.prisma.course.update({
      where: { id: courseId },
      data: { studentCount: { increment: 1 } },
    });

    await this.redis.setJson(cacheKey, course, 600);
    return course;
  }

  async listCourses(params: {
    page: number; pageSize: number; circleId?: string;
    auditStatus?: string; status?: string; stationId?: string; type?: string; keyword?: string;
    categoryLevel1?: string; sort?: string; free?: boolean;
  }) {
    const { page, pageSize, circleId, auditStatus, status, stationId, type, keyword, categoryLevel1, sort, free } = params;
    const filterStatus = auditStatus || status;
    const filterHash = `${circleId ?? ""}:${filterStatus ?? ""}:${type ?? ""}:${keyword ?? ""}:${categoryLevel1 ?? ""}:${sort ?? ""}:${free ? "1" : ""}`;
    const cacheKey = `courses:list:${page}:${pageSize}:${filterHash}`;

    // 关键词搜索、类型/品类/排序/免费筛选不缓存（组合太多）
    if (!keyword && !type && !categoryLevel1 && !sort && !free) {
      const cached = await this.redis.getJson<any>(cacheKey);
      if (cached) return cached;
    }

    const where: Prisma.CourseWhereInput = {};
    if (circleId) where.circleId = circleId;
    if (filterStatus) where.auditStatus = filterStatus;
    else where.auditStatus = "APPROVED";
    if (stationId) where.stationId = stationId;
    if (type) where.type = type as any;
    if (keyword) where.title = { contains: keyword };
    if (categoryLevel1) where.categoryLevel1 = categoryLevel1;
    if (free) where.price = 0;

    // 排序下沉：popular/recommend=学习人数，price-asc=价格升序，newest/默认=最新
    const orderBy: Prisma.CourseOrderByWithRelationInput =
      sort === "popular" || sort === "recommend" ? { studentCount: "desc" }
      : sort === "price-asc" ? { price: "asc" }
      : { createdAt: "desc" };

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        select: {
          id: true, title: true, cover: true, intro: true,
          type: true, price: true, originalPrice: true, categoryLevel1: true,
          studentCount: true, auditStatus: true, createdAt: true,
          user: { select: { id: true, nickname: true, avatar: true } },
          circle: { select: { id: true, name: true } },
          _count: { select: { chapters: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      this.prisma.course.count({ where }),
    ]);

    const data = { courses, total, page, pageSize };
    await this.redis.setJson(cacheKey, data, 300);
    return data;
  }

  /** 课程一级品类聚合(供课程列表页 tab：仅返回真实有课程的品类+计数，分页后无法从单页聚合) */
  async listCourseCategoryTabs(stationId?: string) {
    const where: Prisma.CourseWhereInput = { auditStatus: "APPROVED", categoryLevel1: { not: null } };
    if (stationId) where.stationId = stationId;
    const grouped = await this.prisma.course.groupBy({
      by: ["categoryLevel1"],
      where,
      _count: { _all: true },
    });
    return grouped
      .filter(g => g.categoryLevel1)
      .map(g => ({ name: g.categoryLevel1 as string, count: g._count._all }))
      .sort((a, b) => b.count - a.count);
  }

  // ═══════════════════ 审核 ═══════════════════

  async audit(courseId: string, status: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { auditStatus: true } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");
    if (course.auditStatus !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "该课程已审核，不可重复操作");
    if (!["APPROVED", "REJECTED"].includes(status)) throw new BusinessException(ErrorCode.BAD_REQUEST, "审核结果只能是 APPROVED 或 REJECTED");
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
    if (!chapter) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "章节不存在");

    // 免费章节 or 课程免费 or 课程作者本人 — 直接放行
    if (chapter.freeTrial || Number(chapter.course.price) === 0 || chapter.course.userId === userId) {
      return chapter;
    }

    // 检查是否已购买
    const hasAccess = await this.checkAccess(userId, chapter.course.id);
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

  // ═══════════════════ 作业 ═══════════════════

  async submitWork(userId: string, chapterId: string, dto: SubmitWorkDto) {
    const chapter = await this.prisma.courseChapter.findUnique({
      where: { id: chapterId },
      select: { courseId: true },
    });
    if (!chapter) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "章节不存在");

    // 将图片URL拼接到内容末尾
    const contentWithImages = dto.images?.length
      ? dto.content + '\n\n' + dto.images.map((url: string) => `![作业图片](${url})`).join('\n')
      : dto.content;

    return this.prisma.courseWork.create({
      data: {
        userId,
        courseId: chapter.courseId,
        chapterId,
        content: contentWithImages,
      },
    });
  }

  async getWorks(courseId: string, chapterId?: string, page = 1, pageSize = 20) {
    const where: Prisma.CourseWorkWhereInput = { courseId };
    if (chapterId) where.chapterId = chapterId;

    const [list, total] = await Promise.all([
      this.prisma.courseWork.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.courseWork.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async scoreWork(workId: string, userId: string, score: number, isAdmin: boolean, feedback?: string) {
    const work = await this.prisma.courseWork.findUnique({ where: { id: workId }, select: { courseId: true } });
    if (!work) throw new BusinessException(ErrorCode.NOT_FOUND, "作业不存在");
    if (!isAdmin) {
      const course = await this.prisma.course.findUnique({ where: { id: work.courseId }, select: { userId: true } });
      if (!course || course.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只有讲师可以评分");
    }
    const updated = await this.prisma.courseWork.update({
      where: { id: workId },
      data: { score, feedback },
    });
    await this.redis.del(`courses:detail:${work.courseId}`);
    return updated;
  }

  /** AI 自动批改单份作业 */
  async aiScoreWork(workId: string) {
    const work = await this.prisma.courseWork.findUnique({
      where: { id: workId },
      include: {
        chapter: { select: { title: true, content: true } },
        course: { select: { title: true, type: true } },
        user: { select: { nickname: true } },
      },
    });
    if (!work) throw new BusinessException(ErrorCode.NOT_FOUND, "作业不存在");

    const chapterCtx = work.chapter
      ? `关联章节：${work.chapter.title}。章节内容参考：${(work.chapter.content || '').slice(0, 600)}`
      : '';

    const systemPrompt = `你是热卜国学平台的课程助教，负责批改学员作业。
课程：${work.course.title}
类型：${work.course.type}
${chapterCtx}

请根据作业内容给出：
1. 评分（0-100分）
2. 简短点评（50-150字）
3. 改进建议（1-2条）

请严格按以下 JSON 格式回复（不要包含其他内容）：
{"score": 85, "feedback": "点评内容", "suggestions": ["建议1", "建议2"]}`;

    try {
      const result = await this.aiGateway.chat({
        scene: "course-work-grading",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `学员${work.user.nickname || ''}的作业：\n${work.content}` },
        ],
        options: { temperature: 0.3, maxTokens: 500 },
      });

      const parsed = JSON.parse(result.content.match(/\{[\s\S]*\}/)?.[0] || result.content);
      return {
        suggestedScore: Number(parsed.score) || 70,
        feedback: parsed.feedback || '',
        suggestions: parsed.suggestions || [],
        model: result.model,
      };
    } catch (err: any) {
      this.logger.warn(`AI 批改失败: ${err.message}`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI 批改失败，请稍后重试或手动批改");
    }
  }

  /** AI 批量批改作业（并发限流 + 批量写入） */
  async aiBatchScoreWorks(courseId: string, chapterId?: string) {
    const where: Prisma.CourseWorkWhereInput = { courseId, score: null };
    if (chapterId) where.chapterId = chapterId;

    const works = await this.prisma.courseWork.findMany({
      where,
      select: { id: true, content: true, userId: true },
      take: 50,
    });

    if (works.length === 0) return { processed: 0, message: "没有待批改的作业" };

    // 批量获取课程信息（所有作业属于同一课程，只需查询一次）
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true, type: true },
    });

    // 并发 AI 批改，限制最大并行数 5
    const CONCURRENCY = 5;
    const results: { workId: string; score?: number; feedback?: string; status: string }[] = [];
    const updates: { id: string; score: number; feedback: string }[] = [];

    for (let i = 0; i < works.length; i += CONCURRENCY) {
      const batch = works.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(w => this.scoreWorkViaAi(w, course?.title || "", course?.type || "")),
      );

      for (let j = 0; j < batch.length; j++) {
        const w = batch[j];
        const r = batchResults[j];
        if (r.status === "fulfilled") {
          updates.push({ id: w.id, score: r.value.suggestedScore, feedback: r.value.feedback });
          results.push({ workId: w.id, score: r.value.suggestedScore, status: "success" });
        } else {
          results.push({ workId: w.id, status: "failed" });
        }
      }
    }

    // 批量写入评分
    if (updates.length > 0) {
      await this.prisma.$transaction(
        updates.map(u =>
          this.prisma.courseWork.update({
            where: { id: u.id },
            data: { score: u.score, feedback: u.feedback },
          }),
        ),
      );
    }

    return {
      processed: works.length,
      successCount: updates.length,
      failCount: works.length - updates.length,
      results,
    };
  }

  /** 单份作业 AI 评分（不含数据库读写，仅 AI 调用） */
  private async scoreWorkViaAi(
    work: { id: string; content: string; userId: string },
    courseTitle: string,
    courseType: string,
  ) {
    // 获取作业所属用户的昵称和章节信息（用于构建 prompt）
    const [user, chapterInfo] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: work.userId }, select: { nickname: true } }),
      this.prisma.courseChapter.findFirst({
        where: { works: { some: { id: work.id } } },
        select: { title: true, content: true },
      }),
    ]);

    const chapterCtx = chapterInfo
      ? `关联章节：${chapterInfo.title}。章节内容参考：${(chapterInfo.content || "").slice(0, 600)}`
      : "";

    const systemPrompt = `你是热卜国学平台的课程助教，负责批改学员作业。
课程：${courseTitle}
类型：${courseType}
${chapterCtx}

请根据作业内容给出：
1. 评分（0-100分）
2. 简短点评（50-150字）
3. 改进建议（1-2条）

请严格按以下 JSON 格式回复（不要包含其他内容）：
{"score": 85, "feedback": "点评内容", "suggestions": ["建议1", "建议2"]}`;

    const result = await this.aiGateway.chat({
      scene: "course-work-grading",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `学员${user?.nickname || ""}的作业：\n${work.content}` },
      ],
      options: { temperature: 0.3, maxTokens: 500 },
    });

    const parsed = JSON.parse(result.content.match(/\{[\s\S]*\}/)?.[0] || result.content);
    return {
      suggestedScore: Number(parsed.score) || 70,
      feedback: parsed.feedback || "",
      suggestions: parsed.suggestions || [],
      model: result.model,
    };
  }

  // ═══════════════════ 课程购买 ═══════════════════

  /** 创建课程购买订单（Redis 锁防并发重复下单） */
  async purchase(userId: string, courseId: string, dto?: PurchaseCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, price: true, title: true, validityDays: true },
    });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    // 通过统一价格引擎计算实付价格（检查限时折扣）
    const pricing = await this.unifiedPricing.calculateTargetPrice(courseId, "COURSE", userId);

    // Redis 锁防并发：同一用户对同一课程只能有一个下单流程
    const lockKey = `purchase:lock:${userId}:${courseId}`;
    const locked = await this.redis.setNX(lockKey, "1", 10);
    if (!locked) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "订单处理中，请稍后再试");
    }

    try {
      // 锁内再次检查是否已购买（含有效期判断）
      const existingOrder = await this.prisma.order.findFirst({
        where: { userId, type: "COURSE", targetId: courseId, status: { in: ["PAID", "COMPLETED"] } },
        orderBy: { paidAt: "desc" },
      });
      if (existingOrder && existingOrder.paidAt) {
        if (course.validityDays > 0) {
          const expiresAt = new Date(existingOrder.paidAt.getTime() + course.validityDays * 86400000);
          if (expiresAt > new Date()) {
            throw new BusinessException(ErrorCode.COURSE_ALREADY_ENROLLED, "该课程仍在有效期内，无需重复购买");
          }
        } else {
          throw new BusinessException(ErrorCode.COURSE_ALREADY_ENROLLED, "已购买该课程");
        }
      }

      // 检查是否有待支付订单（复用）
      const pendingOrder = await this.prisma.order.findFirst({
        where: { userId, type: "COURSE", targetId: courseId, status: "PENDING" },
      });
      if (pendingOrder) return pendingOrder;

      const orderData: any = {
        userId,
        type: "COURSE",
        targetId: courseId,
        amount: pricing.effectivePrice,
        originalAmount: pricing.originalPrice > pricing.effectivePrice ? pricing.originalPrice : undefined,
        couponId: dto?.couponId,
        referrerId: dto?.referrerId,
        status: "PENDING",
      };
      if (pricing.appliedPromotion) {
        orderData.promotionType = pricing.appliedPromotion.type;
        orderData.promotionId = pricing.appliedPromotion.id;
      }
      const order = await this.prisma.order.create({ data: orderData });
      return order;
    } finally {
      await this.redis.del(lockKey).catch(() => {});
    }
  }

  /** 检查用户是否有课程访问权限（含有效期检查） */
  async checkAccess(userId: string, courseId: string): Promise<boolean> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { price: true, userId: true, validityDays: true },
    });
    if (!course) return false;
    if (Number(course.price) === 0 || course.userId === userId) return true;

    const order = await this.prisma.order.findFirst({
      where: { userId, type: "COURSE", targetId: courseId, status: { in: ["PAID", "COMPLETED"] } },
    });
    if (!order || !order.paidAt) return false;

    // 如果课程有有效期，检查是否过期
    if (course.validityDays > 0) {
      const expiresAt = new Date(order.paidAt.getTime() + course.validityDays * 86400000);
      if (expiresAt <= new Date()) return false;
    }

    return true;
  }

  /** 检查用户课程是否过期 */
  async checkCourseExpiry(userId: string, courseId: string): Promise<{
    expired: boolean;
    expiresAt: string | null;
    remainingDays: number | null;
  }> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { validityDays: true },
    });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    // validityDays === 0 表示永久有效
    if (course.validityDays === 0) {
      return { expired: false, expiresAt: null, remainingDays: null };
    }

    const order = await this.prisma.order.findFirst({
      where: { userId, type: "COURSE", targetId: courseId, status: { in: ["PAID", "COMPLETED"] } },
      orderBy: { paidAt: "desc" },
    });
    if (!order || !order.paidAt) {
      return { expired: true, expiresAt: null, remainingDays: null };
    }

    const expiresAt = new Date(order.paidAt.getTime() + course.validityDays * 86400000);
    const now = new Date();
    const expired = now > expiresAt;
    const remainingDays = expired ? 0 : Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);

    return {
      expired,
      expiresAt: expiresAt.toISOString(),
      remainingDays,
    };
  }

  /** 获取用户有效期内课程列表 */
  async getUserValidCourses(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId, type: "COURSE", status: { in: ["PAID", "COMPLETED"] }, paidAt: { not: null } },
      orderBy: { paidAt: "desc" },
    });

    if (orders.length === 0) return { courses: [], total: 0 };

    const courseIds = orders.map((o) => o.targetId);
    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true, cover: true, type: true, validityDays: true, price: true },
    });

    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const validCourses = orders
      .filter((o) => {
        const course = courseMap.get(o.targetId);
        if (!course || !o.paidAt) return false;
        if (course.validityDays === 0) return true; // 永久有效
        const expiresAt = new Date(o.paidAt.getTime() + course.validityDays * 86400000);
        return expiresAt > new Date();
      })
      .map((o) => {
        const course = courseMap.get(o.targetId)!;
        const expiresAt =
          course.validityDays > 0 && o.paidAt
            ? new Date(o.paidAt.getTime() + course.validityDays * 86400000)
            : null;
        return {
          orderId: o.id,
          paidAt: o.paidAt,
          amount: o.amount,
          course: {
            id: course.id,
            title: course.title,
            cover: course.cover,
            type: course.type,
            price: course.price,
            validityDays: course.validityDays,
          },
          expiresAt: expiresAt?.toISOString() || null,
          remainingDays: expiresAt
            ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000))
            : null,
        };
      });

    return { courses: validCourses, total: validCourses.length };
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
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    // 检查是否已购买
    const hasAccess = await this.checkAccess(userId, courseId);
    if (!hasAccess && course.userId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "购买课程后才能评价");
    }

    // 检查是否已评价
    const existing = await this.prisma.courseReview.findFirst({
      where: { userId, courseId },
    });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "已评价过该课程");

    if (dto.rating < 1 || dto.rating > 5) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "评分范围为1-5星");
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

    const hasAccess = await this.checkAccess(userId, courseId);
    if (!hasAccess) throw new BusinessException(ErrorCode.FORBIDDEN, "请先购买课程");

    const chapters = await this.prisma.courseChapter.count({ where: { courseId } });
    const completed = await this.prisma.courseProgress.count({ where: { userId, courseId, completed: true } });
    if (chapters > 0 && completed < chapters) throw new BusinessException(ErrorCode.BAD_REQUEST, `还有 ${chapters - completed} 个章节未完成`);

    return { courseId, userId, title: course.title, completedAt: new Date(), completed: true };
  }

  async getCertificate(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    const chapters = await this.prisma.courseChapter.count({ where: { courseId } });
    const completed = await this.prisma.courseProgress.count({ where: { userId, courseId, completed: true } });
    if (chapters > 0 && completed < chapters) throw new BusinessException(ErrorCode.BAD_REQUEST, "尚未完成全部章节");

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });

    return {
      courseTitle: course.title,
      studentName: user?.nickname || "",
      completedChapters: completed,
      totalChapters: chapters,
      certificateNo: `GX-${courseId.slice(0, 8).toUpperCase()}-${userId.slice(0, 4).toUpperCase()}`,
    };
  }

  // ═══════════════════ 草稿管理（讲师端）═══════════════════

  async getMyDrafts(userId: string, page = 1, pageSize = 20) {
    const where: Prisma.CourseWhereInput = { userId, auditStatus: "DRAFT" };
    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        select: { id: true, title: true, cover: true, intro: true, updatedAt: true },
        skip: (page - 1) * pageSize,
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
    const updated = await this.prisma.course.update({
      where: { id },
      data: { auditStatus: "PENDING" },
    });
    await this.redis.delByPattern("courses:list:*");
    return updated;
  }

  // ═══════════════════ 管理端 — 学员管理 ═══════════════════

  /** 管理员查看课程学员列表 */
  async getCourseStudents(courseId: string, page = 1, pageSize = 20) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    const where: Prisma.OrderWhereInput = { type: "COURSE", targetId: courseId, status: { in: ["PAID", "COMPLETED"] } };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: { id: true, userId: true, amount: true, paidAt: true },
        skip: (page - 1) * pageSize,
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

  // ═══════════════════ 管理端 — 批量操作 ═══════════════════

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

  // ═══════════════════ 管理端 — 评价管理 ═══════════════════

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
  async listAllReviews(courseId: string, page = 1, pageSize = 20, status?: string) {
    const where: Prisma.CourseReviewWhereInput = { courseId };
    if (status) where.status = status;
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

  // ═══════════════════ 相关课程推荐 ═══════════════════

  /** 获取相关课程（按标签+品类匹配） */
  async getRelatedCourses(courseId: string, limit = 6, useAi = false) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, intro: true, tags: true, categoryLevel1: true, categoryLevel2: true },
    });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    const where: Prisma.CourseWhereInput = {
      id: { not: courseId },
      auditStatus: "APPROVED",
    };
    if (course.tags.length > 0) where.tags = { hasSome: course.tags };
    else if (course.categoryLevel1) where.categoryLevel1 = course.categoryLevel1;

    const fetchCount = useAi ? Math.min(limit * 3, 20) : limit;
    let related = await this.prisma.course.findMany({
      where,
      select: { id: true, title: true, cover: true, type: true, price: true, studentCount: true },
      take: fetchCount,
      orderBy: { studentCount: "desc" },
    });

    // 不足时用同类热门补充
    if (related.length < limit && course.categoryLevel1) {
      const existingIds = [courseId, ...related.map(r => r.id)];
      const fallback = await this.prisma.course.findMany({
        where: { id: { notIn: existingIds }, auditStatus: "APPROVED", categoryLevel1: course.categoryLevel1 },
        select: { id: true, title: true, cover: true, type: true, price: true, studentCount: true },
        take: limit - related.length,
        orderBy: { studentCount: "desc" },
      });
      related = [...related, ...fallback];
    }

    // AI 语义重排序
    if (useAi && related.length > limit) {
      try {
        related = await this.aiReRank(course as any, related as any, limit) as any;
      } catch (err: any) {
        this.logger.warn(`AI 推荐重排序失败，回退默认排序: ${err.message}`);
        related = related.slice(0, limit);
      }
    }

    return related;
  }

  /** AI 语义重排序：从候选课程中选出最相关的 topN */
  private async aiReRank(
    source: { id: string; title: string; intro?: string | null; tags?: string[]; categoryLevel1?: string | null; categoryLevel2?: string | null },
    candidates: { id: string; title: string; cover?: string | null; type: string; price: any; studentCount: number }[],
    topN: number,
  ) {
    const candidateList = candidates.map((c, i) => `${i + 1}. ${c.title}（${c.type || '课程'}）`).join("\n");
    const prompt = `你是国学学习推荐专家。当前学员在学习课程「${source.title}」${source.intro ? `，简介：「${source.intro.slice(0, 200)}」` : ''}。

请从以下候选课程中选出最相关的 ${topN} 门推荐。考虑因素：
- 知识体系的关联性
- 学习路径的递进关系
- 学员兴趣延展

候选课程列表：
${candidateList}

请只返回所选课程的序号（数字），用逗号分隔，例如：1,3,5,2,8。`;

    const result = await this.aiGateway.chat({
      scene: "course-recommend",
      messages: [
        { role: "system", content: "你是课程推荐专家。只返回数字序号，不返回其他内容。" },
        { role: "user", content: prompt },
      ],
      options: { temperature: 0.3, maxTokens: 100 },
    });

    // 解析 AI 返回的序号
    const indices = (result.content.match(/\d+/g) || []).map(Number).filter(n => n >= 1 && n <= candidates.length);
    const seen = new Set<number>();
    const reRanked = indices
      .filter(n => !seen.has(n) && seen.add(n))
      .map(n => candidates[n - 1])
      .filter(Boolean)
      .slice(0, topN);

    // 如果 AI 返回不足，用原始排序填充
    if (reRanked.length < topN) {
      for (const c of candidates) {
        if (reRanked.length >= topN) break;
        if (!reRanked.find(r => r.id === c.id)) reRanked.push(c);
      }
    }

    return reRanked;
  }

  // ═══════════════════ 课程问答 ═══════════════════

  /** 学生提问 */
  async askQuestion(userId: string, courseId: string, dto: AskQuestionDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    // 验证章节归属（如果指定了章节）
    if (dto.chapterId) {
      const chapter = await this.prisma.courseChapter.findUnique({ where: { id: dto.chapterId } });
      if (!chapter || chapter.courseId !== courseId) throw new BusinessException(ErrorCode.BAD_REQUEST, "章节不属于该课程");
    }

    // AI 自动标签分类（基于问题关键词）
    const autoTags = this.classifyQuestion(dto.question);

    return this.prisma.courseQa.create({
      data: {
        courseId,
        chapterId: dto.chapterId,
        userId,
        question: dto.question,
        tags: autoTags,
        status: "PENDING",
      },
      include: { user: { select: { id: true, nickname: true, avatar: true } }, chapter: { select: { id: true, title: true } } },
    });
  }

  /** 讲师/管理员回答 */
  async answerQuestion(qaId: string, answererId: string, dto: AnswerQuestionDto) {
    const qa = await this.prisma.courseQa.findUnique({ where: { id: qaId } });
    if (!qa) throw new BusinessException(ErrorCode.NOT_FOUND, "问答不存在");
    if (qa.status === "CLOSED") throw new BusinessException(ErrorCode.BAD_REQUEST, "该问题已关闭");

    return this.prisma.courseQa.update({
      where: { id: qaId },
      data: { answer: dto.answer, answeredBy: answererId, status: "ANSWERED", answeredAt: new Date() },
    });
  }

  /** AI 生成回答建议 */
  async aiSuggestAnswer(qaId: string) {
    const qa = await this.prisma.courseQa.findUnique({
      where: { id: qaId },
      include: {
        user: { select: { nickname: true } },
        chapter: { select: { title: true, content: true } },
        course: { select: { title: true, intro: true, type: true } },
      },
    });
    if (!qa) throw new BusinessException(ErrorCode.NOT_FOUND, "问答不存在");
    if (qa.status === "CLOSED") throw new BusinessException(ErrorCode.BAD_REQUEST, "该问题已关闭");

    const chapterCtx = qa.chapter ? `关联章节：${qa.chapter.title}。章节内容摘要：${(qa.chapter.content || '').slice(0, 500)}` : '';
    const systemPrompt = `你是热卜国学平台的课程助教，负责回答学员关于课程的问题。
课程名称：${qa.course.title}
课程类型：${qa.course.type}
课程简介：${qa.course.intro || '暂无'}
${chapterCtx}

请用专业、亲切的中文回答学员问题。回答应：
1. 针对问题直接给出清晰解答
2. 结合课程内容上下文（如有）
3. 鼓励学员继续深入学习
4. 控制在300字以内`;

    try {
      const result = await this.aiGateway.chat({
        scene: "course-qa",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `学员${qa.user.nickname || ''}提问：${qa.question}` },
        ],
      });

      return { suggestion: result.content, model: result.model };
    } catch (err: any) {
      this.logger.warn(`AI 回答生成失败: ${err.message}`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI 回答生成失败，请稍后重试或手动回答");
    }
  }

  /** 关闭问题 */
  async closeQuestion(qaId: string, userId: string) {
    const qa = await this.prisma.courseQa.findUnique({ where: { id: qaId } });
    if (!qa) throw new BusinessException(ErrorCode.NOT_FOUND, "问答不存在");
    // 提问者本人或课程讲师/管理员可关闭
    const course = await this.prisma.course.findUnique({ where: { id: qa.courseId }, select: { userId: true } });
    if (qa.userId !== userId && course?.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能关闭自己的问题");

    return this.prisma.courseQa.update({ where: { id: qaId }, data: { status: "CLOSED" } });
  }

  /** 问答列表（按课程/章节/状态/标签筛选） */
  async listQuestions(courseId: string, q: QaListQueryDto) {
    const where: Prisma.CourseQaWhereInput = { courseId };
    if (q.chapterId) where.chapterId = q.chapterId;
    if (q.status) where.status = q.status;
    if (q.tag) where.tags = { has: q.tag };

    const [questions, total] = await Promise.all([
      this.prisma.courseQa.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          chapter: { select: { id: true, title: true } },
        },
        skip: ((q.page || 1) - 1) * (q.pageSize || 20),
        take: q.pageSize || 20,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.courseQa.count({ where }),
    ]);

    return { questions, total, page: q.page || 1, pageSize: q.pageSize || 20 };
  }

  /** 学生查看自己的提问 */
  async getMyQuestions(userId: string, courseId: string, page = 1, pageSize = 20) {
    const where: Prisma.CourseQaWhereInput = { userId, courseId };
    const [questions, total] = await Promise.all([
      this.prisma.courseQa.findMany({ where, include: { chapter: { select: { id: true, title: true } } }, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.courseQa.count({ where }),
    ]);
    return { questions, total, page, pageSize };
  }

  /** 获取课程所有标签（去重，用于筛选器） */
  async getQuestionTags(courseId: string) {
    const questions = await this.prisma.courseQa.findMany({ where: { courseId }, select: { tags: true }, take: 5000 });
    const tagSet = new Set<string>();
    questions.forEach(q => q.tags.forEach(t => tagSet.add(t)));
    return { tags: Array.from(tagSet) };
  }

  /** 简单关键词分类（AI标签的fallback实现） */
  private classifyQuestion(question: string): string[] {
    const tags: string[] = [];
    const rules: [RegExp, string][] = [
      [/作业|习题|练习|怎么做|怎么写/i, "作业答疑"],
      [/看不懂|不理解|什么意思|为什么/i, "概念疑问"],
      [/实践|操作|怎么用|技巧/i, "实践应用"],
      [/章节|目录|内容|在哪儿/i, "内容导航"],
      [/有效期|过期|购买|退款|支付/i, "购买/权益"],
      [/证书|完成|进度|学习/i, "学习管理"],
    ];
    for (const [re, tag] of rules) {
      if (re.test(question)) tags.push(tag);
    }
    return tags.length > 0 ? tags : ["其他"];
  }

  // ═══════════════════ 课程分类 ═══════════════════

  /** 获取课程品类树（公开接口，从 system_config 读取） */
  async getCourseCategories() {
    const cfg = await this.prisma.configSystem.findUnique({ where: { configKey: "course_category_tree" } });
    if (cfg?.configValue) {
      try { return JSON.parse(cfg.configValue); } catch { /* fall through */ }
    }
    // 默认课程品类树
    return {
      "国学经典": ["儒家经典", "道家典籍", "佛学经典", "诸子百家"],
      "易经命理": ["八字命理", "紫微斗数", "风水堪舆", "姓名学", "六爻占卜"],
      "中医养生": ["中医基础", "食疗药膳", "经络穴位", "四季养生", "导引吐纳"],
      "道家文化": ["道门经典", "内丹修炼", "符箓科仪", "道教历史"],
      "儒家文化": ["四书五经", "宋明理学", "礼乐文化", "家训家风"],
      "诗词文学": ["唐诗鉴赏", "宋词赏析", "古文观止", "现代诗词创作"],
      "书法绘画": ["书法入门", "国画技法", "名家鉴赏", "篆刻艺术"],
      "茶道香道": ["茶道文化", "香道文化", "茶具鉴赏", "品茶技法"],
      "武术太极": ["太极拳", "八段锦", "武术基础", "养生气功"],
      "民俗节庆": ["传统节日", "民俗活动", "民间故事", "礼仪习俗"],
      "非遗传承": ["传统技艺", "传统美术", "传统音乐"],
      "其他": ["通识入门", "专题讲座", "综合课程"],
    };
  }

  // ═══════════════════ 辅助 ═══════════════════

  private async ensureOwner(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");
    if (course.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能编辑自己的课程");
  }
}
