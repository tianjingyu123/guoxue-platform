import { Injectable, Logger, Optional } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { safePagination } from "../../common/pagination";
import { RedisService } from "../../redis/redis.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { AuditService } from "../audit/audit.service";
import { SystemService } from "../system/system.service";
import {
  CreateReviewDto, AskQuestionDto, AnswerQuestionDto, QaListQueryDto,
} from "./course.dto";
import { CoursePurchaseService } from "./course-purchase.service";

/**
 * 课程-评价与问答域（从 course.service 拆出·纯搬家不改逻辑）。
 * 职责：课程评价 CRUD 与评分聚合、课程问答提问/回答/AI 建议/关闭/列表/标签。
 * 依赖 CoursePurchaseService.checkAccess（createReview 鉴权）。
 */
@Injectable()
export class CourseReviewQaService {
  private readonly logger = new Logger(CourseReviewQaService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private aiGateway: AiGatewayService,
    private auditService: AuditService,
    private purchaseSvc: CoursePurchaseService,
    // SystemModule 为 @Global 导出·@Optional 保证单测缺 provider 时回退默认品牌名
    @Optional() private readonly systemService?: SystemService,
  ) {}

  /** 品牌名（后台 BrandConfig 可配·拉取失败/未注入时兜底"热卜国学"，与历史口径一致） */
  private async getBrandName(): Promise<string> {
    try {
      const cfg = await this.systemService?.getBrandConfig();
      return (cfg as { siteName?: string } | undefined)?.siteName || "热卜国学";
    } catch {
      return "热卜国学";
    }
  }

  // ═══════════════════ 课程评价 ═══════════════════

  async createReview(userId: string, courseId: string, dto: CreateReviewDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    // 检查是否已购买
    const hasAccess = await this.purchaseSvc.checkAccess(userId, courseId);
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

    // 统一内容审核（违规抛异常）
    await this.auditService.moderateTextOrThrow(dto.content, { scene: "COURSE_REVIEW", userId, dataId: courseId });

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

  async listReviews(courseId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { courseId, status: "PUBLISHED" };
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

    // 统一内容审核（违规抛异常）
    await this.auditService.moderateTextOrThrow(dto.question, { scene: "COURSE_QUESTION", userId, dataId: courseId });

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

    // 统一内容审核（违规抛异常）
    await this.auditService.moderateTextOrThrow(dto.answer, { scene: "COURSE_ANSWER", userId: answererId, dataId: qaId });

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
    const systemPrompt = `你是${await this.getBrandName()}平台的课程助教，负责回答学员关于课程的问题。
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
    const { page, pageSize, skip } = safePagination(q.page, q.pageSize);
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
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.courseQa.count({ where }),
    ]);

    return { questions, total, page, pageSize };
  }

  /** 学生查看自己的提问 */
  async getMyQuestions(userId: string, courseId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.CourseQaWhereInput = { userId, courseId };
    const [questions, total] = await Promise.all([
      this.prisma.courseQa.findMany({ where, include: { chapter: { select: { id: true, title: true } } }, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
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
}
