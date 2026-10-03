import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { check } from "./managed-policy";

type CourseAccess = { id: string; userId: string; price: Prisma.Decimal; validityDays: number };
/** 只访问固定客户库内的章节与本人进度；不加载平台购买、会员、推荐或媒体上传入口。 */
export class ManagedLeaseLearningService {
  constructor(private readonly db: PrismaClient) {}
  private async course(tx: Prisma.TransactionClient, id: string, allowed: string[]) {
    check(typeof id === "string" && allowed.includes(id), "课程未获合同授权");
    const course = await tx.course.findFirst({ where: { id, deletedAt: null, auditStatus: "APPROVED" }, select: { id: true, userId: true, price: true, validityDays: true } });
    if (!course) throw new NotFoundException("已授权课程当前不可学习");
    return course;
  }
  private async entitled(tx: Prisma.TransactionClient, userId: string, course: CourseAccess) {
    if (Number(course.price) === 0 || course.userId === userId) return true;
    const order = await tx.order.findFirst({ where: { userId, type: "COURSE", targetId: course.id, status: { in: ["PAID", "COMPLETED"] }, paidAt: { not: null } }, select: { paidAt: true }, orderBy: { paidAt: "desc" } });
    return !!order?.paidAt && (course.validityDays === 0 || order.paidAt.getTime() + course.validityDays * 86400000 > Date.now());
  }
  async chapters(userId: string, courseId: string, allowed: string[]) {
    const course = await this.course(this.db, courseId, allowed);
    const accessible = await this.entitled(this.db, userId, course);
    const rows = await this.db.courseChapter.findMany({ where: { courseId }, select: { id: true, title: true, duration: true, sortOrder: true, freeTrial: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 501 });
    check(rows.length <= 500, "课程章节超过当前读取上限，请联系维护人员分页迁入");
    return rows.map(row => ({ ...row, accessible: accessible || row.freeTrial }));
  }
  async chapter(userId: string, courseId: string, chapterId: string, allowed: string[]) {
    const course = await this.course(this.db, courseId, allowed);
    const chapter = await this.db.courseChapter.findFirst({ where: { id: chapterId, courseId }, select: { id: true, courseId: true, title: true, content: true, mediaUrl: true, duration: true, freeTrial: true } });
    if (!chapter) throw new NotFoundException("课程章节不存在");
    if (!chapter.freeTrial && !await this.entitled(this.db, userId, course)) throw new ForbiddenException("本客户账号尚无有效的课程学习权益");
    return chapter;
  }
  async progress(userId: string, courseId: string, allowed: string[]) {
    await this.course(this.db, courseId, allowed);
    return this.db.courseProgress.findMany({ where: { userId, courseId }, select: { chapterId: true, progress: true, completed: true, updatedAt: true }, take: 501 }).then(rows => {
      check(rows.length <= 500, "课程进度超过当前读取上限，请联系维护人员"); return rows;
    });
  }
  async updateProgress(userId: string, courseId: string, chapterId: string, allowed: string[], body: unknown, reauthorize: () => Promise<unknown>) {
    check(body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).every(key => key === "progress"), "学习进度不接受用户、课程、权益或完成状态参数");
    const progress = (body as { progress?: unknown }).progress;
    check(typeof progress === "number" && Number.isFinite(progress) && progress >= 0 && progress <= 100, "学习进度必须在0到100之间");
    return this.db.$transaction(async tx => {
      const course = await this.course(tx, courseId, allowed);
      const chapter = await tx.courseChapter.findFirst({ where: { id: chapterId, courseId }, select: { id: true } });
      if (!chapter) throw new NotFoundException("课程章节不存在");
      if (!await this.entitled(tx, userId, course)) throw new ForbiddenException("本客户账号尚无有效的课程学习权益");
      const result = await tx.$queryRaw<Array<{ chapterId: string; progress: number; completed: boolean; updatedAt: Date }>>`INSERT INTO "CourseProgress" (id,"userId","courseId","chapterId",progress,completed,"updatedAt")
        VALUES (${randomUUID()},${userId},${courseId},${chapterId},${progress},${progress === 100},${new Date()})
        ON CONFLICT ("userId","chapterId") DO UPDATE SET progress=GREATEST("CourseProgress".progress,EXCLUDED.progress),completed=(GREATEST("CourseProgress".progress,EXCLUDED.progress)>=100),"updatedAt"=EXCLUDED."updatedAt"
        RETURNING "chapterId",progress,completed,"updatedAt"`;
      if (!await this.entitled(tx, userId, course)) throw new ForbiddenException("课程权益已变化，进度没有保存");
      await reauthorize();
      return result[0];
    });
  }
}
