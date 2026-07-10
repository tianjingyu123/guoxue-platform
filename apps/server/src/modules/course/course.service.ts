import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { safePagination } from "../../common/pagination";
import { RedisService } from "../../redis/redis.service";
import { AuditService } from "../audit/audit.service";
import { CourseRecommendService } from "./course-recommend.service";
import { CourseAdminService } from "./course-admin.service";
import { CourseCreatorService } from "./course-creator.service";
import { CoursePurchaseService } from "./course-purchase.service";
import { CourseLearningService } from "./course-learning.service";
import { CourseWorkService } from "./course-work.service";
import { CourseReviewQaService } from "./course-review-qa.service";
import {
  CreateCourseDto, UpdateCourseDto,
  CreateChapterDto, UpdateChapterDto,
  UpdateProgressDto, SubmitWorkDto,
  CreateReviewDto, PurchaseCourseDto,
  AskQuestionDto, AnswerQuestionDto, QaListQueryDto,
} from "./course.dto";

/**
 * 课程域 facade（P2-5 拆分·shop 范式）：自身保留课程 CRUD / 审核 / 品类树，
 * 其余按域委托 purchase(购买权限) / learning(章节进度看板证书) / work(作业AI批改) /
 * reviewQa(评价问答) / creator(创作草稿) / admin(管理端) / recommend(相关推荐)。
 * controller/外部消费者零改动·公共 API 逐字节不变·行为零变化。
 */
@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private auditSvc: AuditService,
    private recommendSvc: CourseRecommendService,
    private adminSvc: CourseAdminService,
    private creatorSvc: CourseCreatorService,
    private purchaseSvc: CoursePurchaseService,
    private learningSvc: CourseLearningService,
    private workSvc: CourseWorkService,
    private reviewQaSvc: CourseReviewQaService,
  ) {}

  // ═══════════════════ 课程 CRUD ═══════════════════

  /** circleId 缺省时兜底「官方圈子」(id存ConfigSystem.official_circle_id)·供后台/AI自动发布种子课程。沿用短视频模式(见 video.service.resolveCircleId) */
  private async resolveCircleId(circleId?: string): Promise<string | undefined> {
    if (circleId) return circleId;
    const cfg = await this.prisma.configSystem.findUnique({ where: { configKey: "official_circle_id" } });
    return cfg?.configValue || undefined;
  }

  async create(userId: string, dto: CreateCourseDto, autoApprove = false) {
    // UGC 机审（标题+简介）——与文章/短视频发布对齐
    await this.auditSvc.moderateTextOrThrow([dto.title, dto.intro].filter(Boolean).join(" "), { scene: "COURSE", userId });

    const circleId = await this.resolveCircleId(dto.circleId);
    // 开放范围分流：CIRCLE_ONLY 圈内直生效；PLATFORM 须平台审核（管理员/官方圈自动过审）
    const { visibility, auditStatus } = await this.auditSvc.resolveContentVisibility({
      visibility: dto.visibility,
      circleId,
      isAdmin: autoApprove,
    });
    const course = await this.prisma.course.create({
      data: {
        userId,
        visibility,
        auditStatus,
        circleId,
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

    if (auditStatus === "PENDING") {
      await this.auditSvc.openContentAudit({ contentType: "COURSE", contentId: course.id, circleId, submitterId: userId });
    }

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
    categoryLevel1?: string; sort?: string; free?: boolean; minPrice?: number; maxPrice?: number;
  }) {
    const { circleId, auditStatus, status, stationId, type, keyword, categoryLevel1, sort, free, minPrice, maxPrice } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize);
    const filterStatus = auditStatus || status;
    const hasPrice = minPrice !== undefined || maxPrice !== undefined;
    const filterHash = `${circleId ?? ""}:${filterStatus ?? ""}:${type ?? ""}:${keyword ?? ""}:${categoryLevel1 ?? ""}:${sort ?? ""}:${free ? "1" : ""}:${minPrice ?? ""}-${maxPrice ?? ""}`;
    const cacheKey = `courses:list:${page}:${pageSize}:${filterHash}`;

    // 关键词搜索、类型/品类/排序/免费/价格筛选不缓存（组合太多）
    if (!keyword && !type && !categoryLevel1 && !sort && !free && !hasPrice) {
      const cached = await this.redis.getJson<any>(cacheKey);
      if (cached) return cached;
    }

    const where: Prisma.CourseWhereInput = {};
    if (circleId) where.circleId = circleId;
    // ALL=管理端查看全部状态（含待审核/草稿/驳回），不加 auditStatus 过滤；
    // 指定具体状态则精确过滤；未传（移动端公开列表）默认只看已通过。
    if (filterStatus === "ALL") { /* 不过滤状态 */ }
    else if (filterStatus) where.auditStatus = filterStatus; // 管理端显式指定状态时不加开放范围过滤
    else {
      where.auditStatus = "APPROVED";
      // 平台公共池（未按圈子过滤）只出「全平台开放」课程；圈内列表（带 circleId）圈内课程全可见
      if (!circleId) where.visibility = "PLATFORM";
    }
    if (stationId) where.stationId = stationId;
    if (type) where.type = type as any;
    if (keyword) where.title = { contains: keyword };
    if (categoryLevel1) where.categoryLevel1 = categoryLevel1;
    if (free) where.price = 0;
    else if (hasPrice) {
      const priceCond: Prisma.DecimalFilter = {};
      if (minPrice !== undefined) priceCond.gte = minPrice;
      if (maxPrice !== undefined) priceCond.lte = maxPrice;
      where.price = priceCond;
    }

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
        skip,
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
    // 品类 tab 服务于平台课程列表页 → 与公共池口径一致（只统计全平台开放课程）
    const where: Prisma.CourseWhereInput = { auditStatus: "APPROVED", visibility: "PLATFORM", categoryLevel1: { not: null } };
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

  // ═══════════════════ 章节管理（委托 CourseLearningService） ═══════════════════

  addChapter(courseId: string, userId: string, dto: CreateChapterDto) {
    return this.learningSvc.addChapter(courseId, userId, dto);
  }

  updateChapter(chapterId: string, courseId: string, userId: string, dto: UpdateChapterDto) {
    return this.learningSvc.updateChapter(chapterId, courseId, userId, dto);
  }

  deleteChapter(chapterId: string, courseId: string, userId: string) {
    return this.learningSvc.deleteChapter(chapterId, courseId, userId);
  }

  getChapters(courseId: string) {
    return this.learningSvc.getChapters(courseId);
  }

  getChapterContent(userId: string, chapterId: string) {
    return this.learningSvc.getChapterContent(userId, chapterId);
  }

  // ═══════════════════ 学习进度（委托 CourseLearningService） ═══════════════════

  updateProgress(userId: string, chapterId: string, dto: UpdateProgressDto) {
    return this.learningSvc.updateProgress(userId, chapterId, dto);
  }

  getMyProgress(userId: string, courseId: string) {
    return this.learningSvc.getMyProgress(userId, courseId);
  }

  // ═══════════════════ 作业（委托 CourseWorkService） ═══════════════════

  submitWork(userId: string, chapterId: string, dto: SubmitWorkDto) {
    return this.workSvc.submitWork(userId, chapterId, dto);
  }

  getWorks(courseId: string, chapterId?: string, rawPage = 1, rawPageSize = 20) {
    return this.workSvc.getWorks(courseId, chapterId, rawPage, rawPageSize);
  }

  getWork(workId: string, userId: string) {
    return this.workSvc.getWork(workId, userId);
  }

  getFlashSale() {
    return this.workSvc.getFlashSale();
  }

  getStudyPlan(userId: string) {
    return this.workSvc.getStudyPlan(userId);
  }

  scoreWork(workId: string, userId: string, score: number, isAdmin: boolean, feedback?: string) {
    return this.workSvc.scoreWork(workId, userId, score, isAdmin, feedback);
  }

  aiScoreWork(workId: string) {
    return this.workSvc.aiScoreWork(workId);
  }

  aiBatchScoreWorks(courseId: string, chapterId?: string) {
    return this.workSvc.aiBatchScoreWorks(courseId, chapterId);
  }

  // ═══════════════════ 课程购买（委托 CoursePurchaseService） ═══════════════════

  purchase(userId: string, courseId: string, dto?: PurchaseCourseDto) {
    return this.purchaseSvc.purchase(userId, courseId, dto);
  }

  checkAccess(userId: string, courseId: string): Promise<boolean> {
    return this.purchaseSvc.checkAccess(userId, courseId);
  }

  setMemberFree(operatorUserId: string, courseId: string, memberFree: boolean) {
    return this.purchaseSvc.setMemberFree(operatorUserId, courseId, memberFree);
  }

  checkCourseExpiry(userId: string, courseId: string) {
    return this.purchaseSvc.checkCourseExpiry(userId, courseId);
  }

  getUserValidCourses(userId: string) {
    return this.purchaseSvc.getUserValidCourses(userId);
  }

  getMyCourses(userId: string, rawPage = 1, rawPageSize = 20) {
    return this.purchaseSvc.getMyCourses(userId, rawPage, rawPageSize);
  }

  // ═══════════════════ 课程评价（委托 CourseReviewQaService） ═══════════════════

  createReview(userId: string, courseId: string, dto: CreateReviewDto) {
    return this.reviewQaSvc.createReview(userId, courseId, dto);
  }

  listReviews(courseId: string, rawPage = 1, rawPageSize = 20) {
    return this.reviewQaSvc.listReviews(courseId, rawPage, rawPageSize);
  }

  getCourseRating(courseId: string) {
    return this.reviewQaSvc.getCourseRating(courseId);
  }

  // ═══════════════════ 讲师创作管理台（委托 CourseCreatorService） ═══════════════════

  getCreatedCourses(userId: string, rawPage = 1, rawPageSize = 20) {
    return this.creatorSvc.getCreatedCourses(userId, rawPage, rawPageSize);
  }

  replyReviewByCreator(reviewId: string, userId: string, reply: string) {
    return this.creatorSvc.replyReviewByCreator(reviewId, userId, reply);
  }

  // ═══════════════════ 学习看板（委托 CourseLearningService） ═══════════════════

  /** 学生学习看板 */
  getMyLearningDashboard(userId: string) {
    return this.learningSvc.getMyLearningDashboard(userId);
  }

  /** 讲师课程统计 */
  getCourseStats(userId: string, courseId: string) {
    return this.learningSvc.getCourseStats(userId, courseId);
  }

  // ═══════════════════ 完成评估 + 证书（委托 CourseLearningService） ═══════════════════

  completeCourse(userId: string, courseId: string) {
    return this.learningSvc.completeCourse(userId, courseId);
  }

  getCertificate(userId: string, courseId: string) {
    return this.learningSvc.getCertificate(userId, courseId);
  }

  // ═══════════════════ 草稿管理（委托 CourseCreatorService） ═══════════════════

  getMyDrafts(userId: string, rawPage = 1, rawPageSize = 20) {
    return this.creatorSvc.getMyDrafts(userId, rawPage, rawPageSize);
  }

  saveDraft(userId: string, dto: CreateCourseDto) {
    return this.creatorSvc.saveDraft(userId, dto);
  }

  updateDraft(id: string, userId: string, dto: UpdateCourseDto) {
    return this.creatorSvc.updateDraft(id, userId, dto);
  }

  deleteDraft(id: string, userId: string) {
    return this.creatorSvc.deleteDraft(id, userId);
  }

  publishDraft(id: string, userId: string) {
    return this.creatorSvc.publishDraft(id, userId);
  }

  // ═══════════════════ 管理端（委托 CourseAdminService） ═══════════════════

  getCourseStudents(courseId: string, rawPage = 1, rawPageSize = 20) {
    return this.adminSvc.getCourseStudents(courseId, rawPage, rawPageSize);
  }

  getStudentProgress(courseId: string, userId: string) {
    return this.adminSvc.getStudentProgress(courseId, userId);
  }

  batchAudit(ids: string[], status: string) {
    return this.adminSvc.batchAudit(ids, status);
  }

  forceDelete(courseId: string) {
    return this.adminSvc.forceDelete(courseId);
  }

  forceStatus(courseId: string, status: string) {
    return this.adminSvc.forceStatus(courseId, status);
  }

  replyReview(reviewId: string, reply: string) {
    return this.adminSvc.replyReview(reviewId, reply);
  }

  toggleReviewStatus(reviewId: string, status: string) {
    return this.adminSvc.toggleReviewStatus(reviewId, status);
  }

  listAllReviews(courseId: string, rawPage = 1, rawPageSize = 20, status?: string) {
    return this.adminSvc.listAllReviews(courseId, rawPage, rawPageSize, status);
  }

  // ═══════════════════ 相关课程推荐（委托 CourseRecommendService） ═══════════════════

  getRelatedCourses(courseId: string, limit = 6, useAi = false) {
    return this.recommendSvc.getRelatedCourses(courseId, limit, useAi);
  }

  // ═══════════════════ 课程问答（委托 CourseReviewQaService） ═══════════════════

  /** 学生提问 */
  askQuestion(userId: string, courseId: string, dto: AskQuestionDto) {
    return this.reviewQaSvc.askQuestion(userId, courseId, dto);
  }

  /** 讲师/管理员回答 */
  answerQuestion(qaId: string, answererId: string, dto: AnswerQuestionDto) {
    return this.reviewQaSvc.answerQuestion(qaId, answererId, dto);
  }

  /** AI 生成回答建议 */
  aiSuggestAnswer(qaId: string) {
    return this.reviewQaSvc.aiSuggestAnswer(qaId);
  }

  /** 关闭问题 */
  closeQuestion(qaId: string, userId: string) {
    return this.reviewQaSvc.closeQuestion(qaId, userId);
  }

  /** 问答列表（按课程/章节/状态/标签筛选） */
  listQuestions(courseId: string, q: QaListQueryDto) {
    return this.reviewQaSvc.listQuestions(courseId, q);
  }

  /** 学生查看自己的提问 */
  getMyQuestions(userId: string, courseId: string, rawPage = 1, rawPageSize = 20) {
    return this.reviewQaSvc.getMyQuestions(userId, courseId, rawPage, rawPageSize);
  }

  /** 获取课程所有标签（去重，用于筛选器） */
  getQuestionTags(courseId: string) {
    return this.reviewQaSvc.getQuestionTags(courseId);
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
}
