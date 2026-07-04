import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { VectorService } from "./vector.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { serverConfig } from "../../config/server-config";
import * as crypto from "crypto";

@Injectable()
export class KnowledgeSyncService {
  private readonly logger = new Logger(KnowledgeSyncService.name);
  private isRunning = false;

  /** 向量相似度阈值（可配置） */
  private similarityThreshold = 0.9;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly vector: VectorService,
  ) {
    // 从统一配置加载去重阈值
    this.similarityThreshold = serverConfig.knowledgeDedupThreshold;
  }

  /** 每日凌晨4点：自动同步所有开通圈主助理的圈子知识库（分布式锁防多实例重复执行） */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async autoSyncAll() {
    await this.redis.runExclusive("knowledge_sync_auto_sync_all", 1800, () =>
      this._autoSyncAll(),
    );
  }

  private async _autoSyncAll() {
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

    // 批量预取已有知识库条目的 contentHash，消除 N+1
    const articles = await this.prisma.article.findMany({
      where: { circleId, auditStatus: "APPROVED" },
      select: { id: true, title: true, content: true },
      orderBy: { createdAt: "desc" },
    });
    const essencePosts = await this.prisma.post.findMany({
      where: { circleId, isEssence: true, status: "PUBLISHED" },
      select: { id: true, title: true, content: true },
      orderBy: { createdAt: "desc" },
    });
    const courses = await this.prisma.course.findMany({
      where: { circleId, auditStatus: "APPROVED" },
      select: { id: true, title: true, intro: true },
      orderBy: { createdAt: "desc" },
    });

    // 收集所有候选 contentHash
    const allHashes: string[] = [];
    for (const a of articles) allHashes.push(crypto.createHash("md5").update(`${a.title}\n${a.content}`).digest("hex"));
    for (const p of essencePosts) allHashes.push(crypto.createHash("md5").update(`${p.title || p.content.slice(0, 30)}\n${p.content}`).digest("hex"));
    for (const c of courses) {
      const content = `${c.title}。${c.intro || ""}`;
      allHashes.push(crypto.createHash("md5").update(content).digest("hex"));
    }

    // 一次查询获取所有已存在的 contentHash
    const existingSet = new Set(
      allHashes.length > 0
        ? (await this.prisma.circleKnowledge.findMany({
            where: { circleId, contentHash: { in: allHashes } },
            select: { contentHash: true },
          })).map((e) => e.contentHash)
        : [],
    );

    // 1. 同步圈主文章（自动入库）
    for (const article of articles) {
      const added = await this.autoAddToKnowledge(
        circleId, "article", article.id, article.title, article.content, "SYSTEM", existingSet,
      );
      if (added) syncedCount++;
    }

    // 2. 同步精华帖（自动入库）
    for (const post of essencePosts) {
      const added = await this.autoAddToKnowledge(
        circleId, "post", post.id, post.title || post.content.slice(0, 30), post.content, "SYSTEM", existingSet,
      );
      if (added) syncedCount++;
    }

    // 3. 同步课程（自动入库）
    for (const course of courses) {
      const content = `${course.title}。${course.intro || ""}`;
      const added = await this.autoAddToKnowledge(
        circleId, "course", course.id, course.title, content, "SYSTEM", existingSet,
      );
      if (added) syncedCount++;
    }

    // 4. 同步近期活跃帖（近30天，候选入库需圈主确认）
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentPosts = await this.prisma.post.findMany({
      where: {
        circleId,
        status: "PUBLISHED",
        isEssence: false,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { id: true, title: true, content: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // 批量查询已存在的 contentHash，消除 N+1
    const recentHashes = recentPosts.map((p) =>
      crypto.createHash("md5").update(p.content).digest("hex"),
    );
    const recentExistingSet = new Set(
      recentHashes.length > 0
        ? (await this.prisma.circleKnowledge.findMany({
            where: { circleId, contentHash: { in: recentHashes } },
            select: { contentHash: true },
          })).map((e) => e.contentHash)
        : [],
    );

    for (let i = 0; i < recentPosts.length; i++) {
      const post = recentPosts[i];
      const contentHash = recentHashes[i];

      if (!recentExistingSet.has(contentHash)) {
        const isDuplicate = await this.checkVectorSimilarity(circleId, post.content);
        if (!isDuplicate) {
          await this.prisma.circleKnowledgeCandidate.upsert({
            where: { id: `candidate_${circleId}_${post.id}` },
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

    // 5. 同步嘉宾帖（GUEST 角色成员帖子，候选入库）
    const guestMemberUserIds = await this.prisma.circleMember.findMany({
      where: { circleId, role: "GUEST" },
      select: { userId: true },
    });

    if (guestMemberUserIds.length > 0) {
      const guestPosts = await this.prisma.post.findMany({
        where: {
          circleId,
          userId: { in: guestMemberUserIds.map((m) => m.userId) },
          status: "PUBLISHED",
          isEssence: false,
        },
        select: { id: true, title: true, content: true },
        orderBy: { createdAt: "desc" },
      });

      // 批量查询已存在的 contentHash，消除 N+1
      const guestHashes = guestPosts.map((p) =>
        crypto.createHash("md5").update(p.content).digest("hex"),
      );
      const guestExistingSet = new Set(
        guestHashes.length > 0
          ? (await this.prisma.circleKnowledge.findMany({
              where: { circleId, contentHash: { in: guestHashes } },
              select: { contentHash: true },
            })).map((e) => e.contentHash)
          : [],
      );

      for (let i = 0; i < guestPosts.length; i++) {
        const post = guestPosts[i];
        const contentHash = guestHashes[i];

        if (!guestExistingSet.has(contentHash)) {
          const isDuplicate = await this.checkVectorSimilarity(circleId, post.content);
          if (!isDuplicate) {
            await this.prisma.circleKnowledgeCandidate.upsert({
              where: { id: `candidate_${circleId}_${post.id}` },
              create: {
                id: `candidate_${circleId}_${post.id}`,
                circleId,
                sourceType: "guest_post",
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
    existingHashes?: Set<string>,
  ): Promise<boolean> {
    const fullContent = `${title}\n${content}`;
    const contentHash = crypto.createHash("md5").update(fullContent).digest("hex");

    // 去重检查：优先用预取集合
    if (existingHashes) {
      if (existingHashes.has(contentHash)) return false;
    } else {
      const existing = await this.prisma.circleKnowledge.findUnique({
        where: { contentHash_circleId: { contentHash, circleId } },
      });
      if (existing) return false;
    }

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

  /** 校验当前用户是该圈子圈主，跨模块只读 circle 表 */
  async assertCircleOwner(circleId: string, userId: string) {
    const circle = await this.prisma.circle.findUnique({
      where: { id: circleId },
      select: { ownerId: true },
    });
    if (!circle) throw new BusinessException(ErrorCode.NOT_FOUND, "圈子不存在");
    if (circle.ownerId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "仅圈主可操作圈子知识库");
    }
  }

  /** 手动添加内容到知识库（圈主操作） */
  async manuallyAddToKnowledge(
    circleId: string,
    userId: string,
    targetType: string,
    targetId: string,
    extra?: { title?: string; content?: string; fileName?: string },
  ) {
    // 安全：校验当前用户为圈主，userId 由控制器强制取自 req.user.id
    await this.assertCircleOwner(circleId, userId);

    let title = "";
    let content = "";

    // 获取目标内容
    switch (targetType) {
      case "post": {
        const post = await this.prisma.post.findUnique({ where: { id: targetId } });
        if (!post) throw new BusinessException(ErrorCode.CIRCLE_POST_NOT_FOUND, "帖子不存在");
        title = post.title || "";
        content = post.content;
        break;
      }
      case "article": {
        const article = await this.prisma.article.findUnique({ where: { id: targetId } });
        if (!article) throw new BusinessException(ErrorCode.ARTICLE_NOT_FOUND, "文章不存在");
        title = article.title;
        content = article.content;
        break;
      }
      case "file": {
        if (!extra?.content) throw new BusinessException(ErrorCode.BAD_REQUEST, "文件内容不能为空");
        title = extra.fileName || extra.title || targetId;
        content = extra.content;
        break;
      }
      case "course": {
        const course = await this.prisma.course.findUnique({ where: { id: targetId } });
        if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");
        title = course.title;
        content = `${course.title}。${course.intro || ""}`;
        break;
      }
      case "free_text": {
        if (!extra?.content) throw new BusinessException(ErrorCode.BAD_REQUEST, "自由文本内容不能为空");
        title = extra.title || "";
        content = extra.content;
        break;
      }
      default:
        throw new BusinessException(ErrorCode.BAD_REQUEST, `不支持的内容类型: ${targetType}`);
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
    // 安全：校验当前用户为圈主
    await this.assertCircleOwner(circleId, userId);

    // 安全：where 加 circleId 约束，禁止越权删除其他圈子的知识条目
    const result = await this.prisma.circleKnowledge.updateMany({
      where: { id: knowledgeId, circleId },
      data: { status: "removed" },
    });
    if (result.count === 0) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "知识条目不存在或不属于该圈子");
    }

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
    if (!candidate) throw new BusinessException(ErrorCode.NOT_FOUND, "候选内容不存在");

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
