import { Injectable, Logger, Optional } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { safePagination } from "../../common/pagination";
import { RedisService } from "../../redis/redis.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { SystemService } from "../system/system.service";
import { SubmitWorkDto } from "./course.dto";

/**
 * 课程-作业与学习激励域（从 course.service 拆出·纯搬家不改逻辑）。
 * 职责：作业提交/查询、讲师与 AI 批改、我的学习计划、限时特惠派生。
 */
@Injectable()
export class CourseWorkService {
  private readonly logger = new Logger(CourseWorkService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private aiGateway: AiGatewayService,
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

  async getWorks(courseId: string, chapterId?: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.CourseWorkWhereInput = { courseId };
    if (chapterId) where.chapterId = chapterId;

    const [list, total] = await Promise.all([
      this.prisma.courseWork.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          chapter: { select: { id: true, title: true } },
        },
      }),
      this.prisma.courseWork.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  /** 获取单份作业（含批改结果）— 作业本人或课程讲师可见 */
  async getWork(workId: string, userId: string) {
    const work = await this.prisma.courseWork.findUnique({
      where: { id: workId },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        chapter: { select: { id: true, title: true } },
        course: { select: { id: true, title: true, userId: true } },
      },
    });
    if (!work) throw new BusinessException(ErrorCode.NOT_FOUND, "作业不存在");
    if (work.userId !== userId && work.course.userId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权查看该作业");
    }
    return work;
  }

  /** 限时特惠：从折扣课（originalPrice>price）派生，单场进行中 */
  async getFlashSale() {
    const courses = await this.prisma.course.findMany({
      where: { auditStatus: "APPROVED", deletedAt: null, originalPrice: { not: null } },
      include: { user: { select: { nickname: true } } },
      orderBy: { studentCount: "desc" },
      take: 30,
    });
    const list = courses
      .filter((c) => c.originalPrice != null && Number(c.originalPrice) > Number(c.price))
      .map((c) => {
        const orig = Number(c.originalPrice);
        const price = Number(c.price);
        return {
          id: c.id,
          title: c.title,
          instructor: c.user?.nickname || "讲师",
          cover: c.cover || "",
          originalPrice: orig,
          salePrice: price,
          discount: orig > 0 ? Math.round((price / orig) * 100) : 100,
          students: c.studentCount,
          rating: 0,
          sessionId: "active",
          sold: c.studentCount,
          total: c.studentCount + 50,
          category: c.categoryLevel1 || "",
        };
      });
    const sessions = [
      { id: "active", label: "限时特惠", startTime: "00:00", endTime: "23:59", status: "active" as const },
    ];
    return { sessions, courses: list };
  }

  /** 我的学习计划：从已购/有进度课程 + 进度更新历史派生 */
  async getStudyPlan(userId: string) {
    const progresses = await this.prisma.courseProgress.findMany({
      where: { userId },
      include: { course: { select: { id: true, title: true, cover: true, _count: { select: { chapters: true } } } } },
      orderBy: { updatedAt: "desc" },
    });

    // 计划课程：按课程聚合完成进度
    const courseMap = new Map<string, { id: string; courseId: string; title: string; cover: string; totalLessons: number; completedLessons: number; scheduledDays: number[]; order: number }>();
    for (const p of progresses) {
      if (!courseMap.has(p.courseId)) {
        courseMap.set(p.courseId, {
          id: p.courseId, courseId: p.courseId, title: p.course.title, cover: p.course.cover || "",
          totalLessons: p.course._count.chapters, completedLessons: 0, scheduledDays: [], order: courseMap.size,
        });
      }
      if (p.completed) courseMap.get(p.courseId)!.completedLessons++;
    }
    const courses = [...courseMap.values()];

    // 打卡：按 updatedAt 日期聚合
    const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const dayCount = new Map<string, number>();
    for (const p of progresses) {
      const k = dayKey(new Date(p.updatedAt));
      dayCount.set(k, (dayCount.get(k) || 0) + 1);
    }
    // 近30天热力图（level 0-3）
    const checkInLevels: number[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const n = dayCount.get(dayKey(d)) || 0;
      checkInLevels.push(n >= 3 ? 3 : n === 2 ? 2 : n === 1 ? 1 : 0);
    }
    // 连续打卡（从今天往前）
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if ((dayCount.get(dayKey(d)) || 0) > 0) streak++;
      else if (i > 0) break; // 今天没打卡不中断（允许今天还没学）
    }

    return {
      goal: { daysPerWeek: 5, minutesPerDay: 30 },
      courses,
      streak,
      checkInLevels,
    };
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

    const systemPrompt = `你是${await this.getBrandName()}平台的课程助教，负责批改学员作业。
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

    const systemPrompt = `你是${await this.getBrandName()}平台的课程助教，负责批改学员作业。
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
}
