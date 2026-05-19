import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { CircleKnowledgeService } from "./circle-knowledge.service";
import { RagService } from "../ai-gateway/rag.service";

/**
 * 圈子知识库定时同步任务
 *
 * 每天凌晨 3:00 扫描各圈子的精华帖、热门帖、课程等，
 * 自动添加到知识库候选队列，供圈主审核后入库。
 */
@Injectable()
export class CircleKnowledgeTask {
  private readonly logger = new Logger(CircleKnowledgeTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledge: CircleKnowledgeService,
    private readonly rag: RagService,
  ) {}

  /** 每日自动扫描精华帖入库 */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scanEssencePosts() {
    this.logger.log("开始扫描精华帖...");
    const posts = await this.prisma.post.findMany({
      where: { isEssence: true, status: "PUBLISHED" },
      select: { id: true, circleId: true, title: true, content: true },
    });

    let added = 0;
    for (const post of posts) {
      try {
        const result = await this.knowledge.addCandidate({
          circleId: post.circleId,
          sourceType: "post",
          sourceId: post.id,
          content: `${post.title || ""}\n${post.content}`.trim(),
        });
        if (result) added++;
      } catch (err) {
        this.logger.debug(`精华帖知识同步跳过: ${(err as Error).message}`);
      }
    }
    this.logger.log(`精华帖扫描完成: ${posts.length} 篇, 新增候选 ${added} 条`);
  }

  /** 每6小时扫描近期优质内容 */
  @Cron("0 */6 * * *")
  async scanRecentPosts() {
    this.logger.log("开始扫描近期优质内容...");
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const posts = await this.prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        createdAt: { gte: oneWeekAgo },
        isEssence: true,
      },
      select: { id: true, circleId: true, title: true, content: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    let added = 0;
    for (const post of posts) {
      try {
        const result = await this.knowledge.addCandidate({
          circleId: post.circleId,
          sourceType: "post",
          sourceId: post.id,
          content: `${post.title || ""}\n${post.content}`.trim(),
        });
        if (result) added++;
      } catch (err) {
        this.logger.debug(`近期内容知识同步跳过: ${(err as Error).message}`);
      }
    }
    this.logger.log(`近期内容扫描完成: ${posts.length} 篇, 新增候选 ${added} 条`);
  }

  /** 每小时对新入库的知识条目做向量索引 */
  @Cron(CronExpression.EVERY_HOUR)
  async indexPendingVectors() {
    const count = await this.rag.indexUnindexed(50);
    if (count > 0) {
      this.logger.log(`向量索引完成: ${count} 条`);
    }
  }
}
