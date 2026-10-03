import { Prisma, PrismaClient } from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { CacheEvict } from "../../common/cache.decorator";
import { isUniqueConstraintError } from "../../common/prisma-errors";

/** 视频专属入口与“我的互动”共用同一事务，防止记录和计数分离。无外部服务依赖。 */
export class VideoInteractionStore {
  constructor(private readonly prisma: Pick<PrismaClient, "$transaction">) {}

  @CacheEvict({ key: (args) => `video:detail:${args[1]}` })
  @CacheEvict({ key: "video:list:*", pattern: true })
  async toggleLike(userId: string, videoId: string) {
    return this.transaction(async (tx) => {
      const video = await tx.video.findUnique({ where: { id: videoId } });
      if (!video) throw new BusinessException(ErrorCode.NOT_FOUND, "视频不存在");
      const existing = await tx.like.findUnique({
        where: { userId_targetType_targetId: { userId, targetType: "VIDEO", targetId: videoId } },
      });
      if (existing) await tx.like.delete({ where: { id: existing.id } });
      else await tx.like.create({ data: { userId, targetType: "VIDEO", targetId: videoId } });
      const updated = await tx.video.update({
        where: { id: videoId },
        data: { likeCount: existing ? Math.max(0, video.likeCount - 1) : { increment: 1 } },
      });
      return { liked: !existing, likeCount: updated.likeCount };
    });
  }

  @CacheEvict({ key: (args) => `video:detail:${args[1]}` })
  @CacheEvict({ key: "video:list:*", pattern: true })
  async removeLike(userId: string, videoId: string, likeId: string) {
    return this.transaction(async (tx) => {
      const like = await tx.like.findUnique({ where: { id: likeId } });
      if (!like) throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND, "点赞记录不存在");
      if (like.userId !== userId || like.targetType !== "VIDEO" || like.targetId !== videoId) {
        throw new BusinessException(ErrorCode.FORBIDDEN, "只能取消自己的点赞");
      }
      const video = await tx.video.findUnique({ where: { id: videoId } });
      await tx.like.delete({ where: { id: likeId } });
      // 目标已删除仍允许清理自己的历史记录，但不得反向创建点赞。
      if (video) await tx.video.update({ where: { id: videoId }, data: { likeCount: Math.max(0, video.likeCount - 1) } });
      return { success: true };
    });
  }

  @CacheEvict({ key: (args) => `video:collected:${args[0]}:*`, pattern: true })
  @CacheEvict({ key: (args) => `video:detail:${args[1]}` })
  @CacheEvict({ key: "video:list:*", pattern: true })
  async toggleCollect(userId: string, videoId: string) {
    return this.transaction(async (tx) => {
      const video = await tx.video.findUnique({ where: { id: videoId } });
      if (!video) throw new BusinessException(ErrorCode.NOT_FOUND, "视频不存在");
      const existing = await tx.collect.findFirst({ where: { userId, targetType: "VIDEO", targetId: videoId } });
      if (existing) await tx.collect.delete({ where: { id: existing.id } });
      else await tx.collect.create({ data: { userId, targetType: "VIDEO", targetId: videoId } });
      const updated = await tx.video.update({
        where: { id: videoId },
        data: { collectCount: existing ? Math.max(0, video.collectCount - 1) : { increment: 1 } },
      });
      return { collected: !existing, collectCount: updated.collectCount };
    });
  }

  private async transaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
        // 只重跑数据库已回滚的并发冲突，未知结果不能自动重试。
        if (attempt >= 2 || (code !== "P2034" && !isUniqueConstraintError(error))) throw error;
      }
    }
  }
}
