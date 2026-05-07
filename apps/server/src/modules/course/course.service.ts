import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import {
  CreateCourseDto, UpdateCourseDto,
  CreateChapterDto, UpdateChapterDto,
  UpdateProgressDto, SubmitWorkDto,
} from "./course.dto";

@Injectable()
export class CourseService {
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
      data: dto as any,
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
      // 不阻塞：异步增加学习人数
      this.prisma.course.update({
        where: { id: courseId },
        data: { studentCount: { increment: 1 } },
      }).catch(() => {});
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
    auditStatus?: string;
  }) {
    const { page, pageSize, circleId, auditStatus } = params;
    const filterHash = `${circleId ?? ""}:${auditStatus ?? ""}`;
    const cacheKey = `courses:list:${page}:${pageSize}:${filterHash}`;

    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (circleId) where.circleId = circleId;
    if (auditStatus) where.auditStatus = auditStatus;
    else where.auditStatus = "APPROVED";

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
      data: dto as any,
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
    });
  }

  // ═══════════════════ 学习进度 ═══════════════════

  async updateProgress(userId: string, chapterId: string, dto: UpdateProgressDto) {
    const chapter = await this.prisma.courseChapter.findUnique({
      where: { id: chapterId },
      select: { courseId: true },
    });
    if (!chapter) throw new NotFoundException("章节不存在");

    const completed = dto.progress >= 100;

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
    const where: any = { courseId };
    if (chapterId) where.chapterId = chapterId;

    return this.prisma.courseWork.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async scoreWork(workId: string, userId: string, score: number, feedback?: string) {
    return this.prisma.courseWork.update({
      where: { id: workId },
      data: { score, feedback },
    });
  }

  // ═══════════════════ 辅助 ═══════════════════

  private async ensureOwner(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException("课程不存在");
    if (course.userId !== userId) throw new ForbiddenException("只能编辑自己的课程");
  }
}
