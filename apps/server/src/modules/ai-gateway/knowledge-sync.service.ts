import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { VectorService } from "./vector.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import * as crypto from "crypto";

@Injectable()
export class KnowledgeSyncService {
  private readonly logger = new Logger(KnowledgeSyncService.name);
  private isRunning = false;

  /** 向量相似度阈值（可配置） */
  private similarityThreshold = 0.9;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vector: VectorService,
  ) {
    // 从环境变量加载阈值
    const envThreshold = process.env.KNOWLEDGE_DEDUP_THRESHOLD;
    if (envThreshold) {
      this.similarityThreshold = parseFloat(envThreshold);
    }
  }

  /** 每日凌晨4点：自动同步所有开通圈主助理的圈子知识库 */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async autoSyncAll() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logger.log("开始自动同步圈子知识库");

    try {
      // 找到有开通圈主助理的圈子（有知识库条目的圈子）
      const activeCircles = await this.prisma.circleKnowledge.groupBy({
        by: ["circleId"],
        where: { status: "active" },
      });
      const circleIds = activeCircles.map((c) => c.circleId);

      let totalSynced = 0;
      for (const circleId of circleIds) {
        try {
          const synced = await this.syncCircleKnowledge(circleId);
          totalSynced += synced;
        } catch (err: any) {
          this.logger.error(`同步圈子 [${circleId}] 失败: ${err.message}`);
        }
      }

      this.logger.log(`知识库自动同步完成: ${circleIds.length} 个圈子, ${totalSynced} 条新内容`);
    } finally {
      this.isRunning = false;
    }
  }

  /** 同步单个圈子的知识库 */
  async syncCircleKnowledge(circleId: string): Promise<number> {
    let syncedCount = 0;

    // 1. 同步圈主文章（自动入库）
    const articles = await this.prisma.article.findMany({
      where: { circleId, auditStatus: "APPROVED" },
      select: { id: true, title: true, content: true },
      orderBy: { createdAt: "desc" },
    });
    for (const article of articles) {
      const added = await this.autoAddToKnowledge(
        circleId,
        "article",
        article.id,
        article.title,
        article.content,
        "SYSTEM",
      );
      if (added) syncedCount++;
    }

    // 2. 同步精华帖（自动入库）
    const essencePosts = await this.prisma.post.findMany({
      where: { circleId, isEssence: true, status: "PUBLISHED" },
      select: { id: true, title: true, content: true },
      orderBy: { createdAt: "desc" },
    });
    for (const post of essencePosts) {
      const added = await this.autoAddToKnowledge(
        circleId,
        "post",
        post.id,
        post.title || post.content.slice(0, 30),
        post.content,
        "SYSTEM",
      );
      if (added) syncedCount++;
    }

    // 3. 同步课程（自动入库）
    const courses = await this.prisma.course.findMany({
      where: { circleId, auditStatus: "APPROVED" },
      select: { id: true, title: true, intro: true },
      orderBy: { createdAt: "desc" },
    });
    for (const course of courses) {
      const content = `${course.title}。${course.intro || ""}`;
      const added = await this.autoAddToKnowledge(
        circleId,
        "course",
        course.id,
        course.title,
        content,
        "SYSTEM",
      );
      if (added) syncedCount++;
    }

    // 4. 同步热门帖（候选入库，需圈主确认）
    const hotPosts = await this.prisma.post.findMany({
      where: {
        circleId,
        status: "PUBLISHED",
        isEssence: false,
        // 假设点赞数≥10为热门（未来可配置）
      },
      select: {
        id: true,
        title: true,
        content: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    for (const post of hotPosts) {
      const contentHash = crypto.createHash("md5").update(post.content).digest("hex");
      const existing = await this.prisma.circleKnowledge.findUnique({
        where: { contentHash_circleId: { contentHash, circleId } },
      });

      if (!existing) {
        // 检查向量相似度
        const isDuplicate = await this.checkVectorSimilarity(circleId, post.content);
        if (!isDuplicate) {
          // 加入候选列表
          await this.prisma.circleKnowledgeCandidate.upsert({
            where: {
              id: `candidate_${circleId}_${post.id}`,
            },
            create: {
              id: `candidate_${circleId}_${post.id}`,
              circleId,
              sourceType: "post",
              sourceId: post.id,
              content: `${post.title || ""}\n${post.content}`,
              contentHash,
              status: "pending",
            },
            update: {
              content: `${post.title || ""}\n${post.content}`,
              contentHash,
            },
          });
          syncedCount++;
        }
      }
    }

    return syncedCount;
  }

  /** 自动添加内容到知识库（含去重） */
  private async autoAddToKnowledge(
    circleId: string,
    sourceType: string,
    sourceId: string,
    title: string,
    content: string,
    addedBy: string,
  ): Promise<boolean> {
    const fullContent = `${title}\n${content}`;
    const contentHash = crypto.createHash("md5").update(fullContent).digest("hex");

    // 去重检查
    const existing = await this.prisma.circleKnowledge.findUnique({
      where: { contentHash_circleId: { contentHash, circleId } },
    });
    if (existing) return false;

    // 向量相似度去重
    const isDuplicate = await this.checkVectorSimilarity(circleId, fullContent);
    if (isDuplicate) {
      this.logger.debug(`向量去重跳过: [${circleId}] ${title}`);
      return false;
    }

    // 入库
    await this.prisma.circleKnowledge.create({
      data: {
        circleId,
        sourceType,
        sourceId,
        content: fullContent,
        contentHash,
        addedBy,
        status: "active",
      },
    });

    return true;
  }

  /** 向量相似度去重检查 */
  private async checkVectorSimilarity(
    circleId: string,
    content: string,
  ): Promise<boolean> {
    try {
      const [queryVec] = await this.vector.embed([content]);
      const results = await this.vector.searchCircleKnowledge(queryVec, circleId, 1);
      if (results.length > 0 && results[0].similarity >= this.similarityThreshold) {
        return true; // 高度相似，视为重复
      }
    } catch (err: any) {
      this.logger.warn(`向量去重检查失败: ${err.message}`);
    }
    return false;
  }

  /** 手动添加内容到知识库（圈主操作） */
  async manuallyAddToKnowledge(
    circleId: string,
    userId: string,
    targetType: string,
    targetId: string,
  ) {
    let title = "";
    let content = "";

    // 获取目标内容
    switch (targetType) {
      case "post": {
        const post = await this.prisma.post.findUnique({ where: { id: targetId } });
        if (!post) throw new Error("帖子不存在");
        title = post.title || "";
        content = post.content;
        break;
      }
      case "article": {
        const article = await this.prisma.article.findUnique({ where: { id: targetId } });
        if (!article) throw new Error("文章不存在");
        title = article.title;
        content = article.content;
        break;
      }
      default:
        throw new Error(`不支持的内容类型: ${targetType}`);
    }

    const added = await this.autoAddToKnowledge(
      circleId,
      targetType,
      targetId,
      title,
      content,
      userId,
    );

    // 记录操作日志
    await this.prisma.circleKnowledgeManual.create({
      data: {
        circleId,
        userId,
        targetType,
        targetId,
        action: "add",
      },
    });

    return { added, message: added ? "已添加到知识库" : "内容已存在（已去重）" };
  }

  /** 从知识库移除内容 */
  async removeFromKnowledge(circleId: string, userId: string, knowledgeId: string) {
    await this.prisma.circleKnowledge.update({
      where: { id: knowledgeId },
      data: { status: "removed" },
    });

    await this.prisma.circleKnowledgeManual.create({
      data: {
        circleId,
        userId,
        targetType: "knowledge",
        targetId: knowledgeId,
        action: "remove",
      },
    });

    return { removed: true, message: "已从知识库移除" };
  }

  /** 获取候选内容列表 */
  async getCandidates(circleId: string, status: "pending" | "confirmed" | "rejected" = "pending") {
    return this.prisma.circleKnowledgeCandidate.findMany({
      where: { circleId, status },
      orderBy: { createdAt: "desc" },
    });
  }

  /** 确认候选内容（圈主操作） */
  async confirmCandidate(candidateId: string) {
    const candidate = await this.prisma.circleKnowledgeCandidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) throw new Error("候选内容不存在");

    // 加入正式知识库
    await this.prisma.circleKnowledge.create({
      data: {
        circleId: candidate.circleId,
        sourceType: candidate.sourceType,
        sourceId: candidate.sourceId,
        content: candidate.content,
        contentHash: candidate.contentHash,
        addedBy: "OWNER_CONFIRMED",
        status: "active",
      },
    });

    // 更新候选状态
    await this.prisma.circleKnowledgeCandidate.update({
      where: { id: candidateId },
      data: { status: "confirmed" },
    });

    return { confirmed: true, message: "候选项已加入知识库" };
  }

  /** 拒绝候选内容 */
  async rejectCandidate(candidateId: string) {
    await this.prisma.circleKnowledgeCandidate.update({
      where: { id: candidateId },
      data: { status: "rejected" },
    });
    return { rejected: true };
  }
}
