import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";

@Injectable()
export class DedupService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // 获取用户已拥有/已购买/已收藏的所有内容ID集合
  async getUserOwnedSet(userId: string): Promise<Set<string>> {
    const cacheKey = `recommend:dedup:${userId}`;
    const cached = await this.redis.getJson<string[]>(cacheKey);
    if (cached) return new Set(cached);

    const [orders, collects, likes, members, progresses] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId, status: { in: ["PAID", "COMPLETED"] } },
        select: { type: true, targetId: true },
      }),
      this.prisma.collect.findMany({
        where: { userId },
        select: { targetType: true, targetId: true },
      }),
      this.prisma.like.findMany({
        where: { userId },
        select: { targetType: true, targetId: true },
      }),
      this.prisma.circleMember.findMany({
        where: { userId },
        select: { circleId: true },
      }),
      this.prisma.courseProgress.findMany({
        where: { userId, completed: true },
        select: { courseId: true },
      }),
    ]);

    const set = new Set<string>();
    orders.forEach((o) => set.add(`${o.type}:${o.targetId}`));
    collects.forEach((c) => set.add(`${c.targetType}:${c.targetId}`));
    likes.forEach((l) => set.add(`${l.targetType}:${l.targetId}`));
    members.forEach((m) => set.add(`CIRCLE_JOIN:${m.circleId}`));
    progresses.forEach((p) => set.add(`COURSE:${p.courseId}`));

    await this.redis.setJson(cacheKey, [...set], 300);
    return set;
  }

  // 清除用户去重缓存（购买/收藏等操作后调用）
  async clearCache(userId: string) {
    await this.redis.del(`recommend:dedup:${userId}`);
  }
}
