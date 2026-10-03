import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/** 课程创建与缓存待办同事务，课程删除后仍保留恢复依据。 */
export async function enqueueCourseCache(tx: Prisma.TransactionClient, courseId: string): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO "CourseCacheInvalidation" (id, "courseId", "createdAt")
    VALUES (${randomUUID()}, ${courseId}, (NOW() AT TIME ZONE 'UTC'))`;
}

export async function clearCourseCaches(prisma: PrismaService, redis: RedisService, courseId?: string): Promise<number> {
  let cleared = 0;
  let after: { id: string; createdAt: Date } | undefined;
  let nextPage = true;
  while (nextPage) {
    const rows = await prisma.$queryRaw<Array<{ id: string; createdAt: Date }>>(Prisma.sql`
      SELECT id, "createdAt" FROM "CourseCacheInvalidation" WHERE "clearedAt" IS NULL
      ${courseId ? Prisma.sql`AND "courseId"=${courseId}` : Prisma.empty}
      ${after ? Prisma.sql`AND ("createdAt", id)>(${after.createdAt.toISOString()}::timestamp, ${after.id})` : Prisma.empty}
      ORDER BY "createdAt", id LIMIT 100`);
    if (!rows.length) break;
    // 真实共享缓存清理失败不能以进程内降级冒充完成。
    await redis.delByPatternShared("courses:list:*");
    for (const row of rows) {
      try {
        cleared += await prisma.$executeRaw`
          UPDATE "CourseCacheInvalidation" SET "clearedAt"=(NOW() AT TIME ZONE 'UTC')
          WHERE id=${row.id} AND "clearedAt" IS NULL`;
      } catch {
        // 单行确认故障留待办，不挡住后续分页；下轮可幂等重清。
      }
    }
    after = rows[rows.length - 1];
    nextPage = rows.length === 100;
  }
  return cleared;
}

@Injectable()
export class LectureCacheTask {
  private readonly logger = new Logger(LectureCacheTask.name);
  private running = false;
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: "lecture_course_cache_restore" })
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try { await clearCourseCaches(this.prisma, this.redis); }
    catch { this.logger.warn("讲座课程缓存待办恢复失败，将在下次调度重试"); }
    finally { this.running = false; }
  }
}
