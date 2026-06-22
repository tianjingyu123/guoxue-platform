import { Injectable, Logger, Inject } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { RedisService } from "../../redis/redis.service";
import { CoinService } from "../coin/coin.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { CreateBountyDto, AnswerBountyDto } from "./bounty.dto";

@Injectable()
export class BountyService {
  private readonly logger = new Logger(BountyService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Inject(CoinService) private coinSvc?: CoinService,
  ) {}

  // ───────── 创建悬赏 ─────────

  async createQuestion(userId: string, dto: CreateBountyDto) {
    if (this.coinSvc) {
      await this.coinSvc.freeze(userId, dto.bountyCoin, "BOUNTY");
    }

    return this.prisma.bountyQuestion.create({
      data: {
        title: dto.title,
        description: dto.description,
        bountyCoin: dto.bountyCoin,
        category: dto.category || "BAZI",
        stationId: dto.stationId || null,
        circleId: dto.circleId,
        images: dto.images || [],
        askerId: userId,
      },
    });
  }

  // ───────── 抢答 ─────────

  async claim(userId: string, questionId: string) {
    const question = await this.prisma.bountyQuestion.findUnique({ where: { id: questionId } });
    if (!question || question.status !== "OPEN") throw new BusinessException(ErrorCode.BAD_REQUEST, "悬赏不可抢答");
    if (question.askerId === userId) throw new BusinessException(ErrorCode.BAD_REQUEST, "不能抢答自己的悬赏");

    return this.prisma.bountyQuestion.update({
      where: { id: questionId },
      data: { status: "CLAIMED", answererId: userId, lockExpireAt: new Date(Date.now() + 72 * 3600 * 1000) },
    });
  }

  // ───────── 回答 ─────────

  async answer(userId: string, questionId: string, dto: AnswerBountyDto) {
    const question = await this.prisma.bountyQuestion.findUnique({ where: { id: questionId } });
    if (!question || question.answererId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权回答该悬赏");

    return this.prisma.bountyQuestion.update({
      where: { id: questionId },
      data: {
        status: "ANSWERED",
        answer: dto.answer,
        answerImages: dto.images || [],
        answerAudioUrl: dto.audioUrl,
        answeredAt: new Date(),
      },
    });
  }

  // ───────── 满意解付 ─────────

  async settle(userId: string, questionId: string) {
    const question = await this.prisma.bountyQuestion.findUnique({ where: { id: questionId } });
    if (!question || question.askerId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作");
    if (question.status !== "ANSWERED") throw new BusinessException(ErrorCode.BAD_REQUEST, "悬赏无可解付的回答");

    if (this.coinSvc && question.answererId) {
      await this.coinSvc.transferFrozen(userId, question.answererId, question.bountyCoin);
    }

    return this.prisma.bountyQuestion.update({
      where: { id: questionId },
      data: { status: "SETTLED", settledAt: new Date() },
    });
  }

  // ───────── 退款 ─────────

  async refund(userId: string, questionId: string) {
    const question = await this.prisma.bountyQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new BusinessException(ErrorCode.NOT_FOUND, "悬赏不存在");
    // 安全：仅悬赏提问者本人可触发退款，禁止任意登录用户对他人悬赏退款
    if (question.askerId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作该悬赏");
    if (!["OPEN", "CLAIMED"].includes(question.status)) throw new BusinessException(ErrorCode.BAD_REQUEST, "当前状态不可退款");

    if (this.coinSvc) {
      await this.coinSvc.unfreeze(question.askerId, question.bountyCoin);
    }

    const updated = await this.prisma.bountyQuestion.update({
      where: { id: questionId },
      data: { status: "REFUNDED" },
    });

    // 审计：记录退款操作（执行者、目标悬赏、金额）
    this.logger.log(
      `悬赏退款 [审计] 操作人=${userId} 悬赏=${questionId} 金额=${question.bountyCoin}币 原状态=${question.status}`,
    );

    return updated;
  }

  // ───────── 列表/详情 ─────────

  list(page = 1, pageSize = 20, category?: string, status?: string, stationId?: string) {
    const where: Prisma.BountyQuestionWhereInput = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (stationId !== undefined) where.stationId = stationId;
    return Promise.all([
      this.prisma.bountyQuestion.findMany({
        where,
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.bountyQuestion.count({ where }),
    ]).then(([questions, total]) => ({ questions, total, page, pageSize }));
  }

  getById(id: string) {
    return this.prisma.bountyQuestion.findUnique({
      where: { id },
    });
  }

  // ───────── 管理端 ─────────

  async closeQuestion(id: string) {
    const question = await this.prisma.bountyQuestion.findUnique({ where: { id } });
    if (!question) throw new BusinessException(ErrorCode.NOT_FOUND, "悬赏不存在");
    // 如果是未回答的悬赏，退还款项
    if (["OPEN", "CLAIMED"].includes(question.status) && this.coinSvc) {
      await this.coinSvc.unfreeze(question.askerId, question.bountyCoin);
    }
    return this.prisma.bountyQuestion.update({
      where: { id },
      data: { status: "CLOSED" },
    });
  }

  async listReviews(page = 1, pageSize = 20) {
    const [reviews, total] = await Promise.all([
      this.prisma.bountyReview.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.bountyReview.count(),
    ]);
    // 批量查询关联问题标题
    const questionIds = [...new Set(reviews.map((r) => r.questionId))];
    const questions = questionIds.length
      ? await this.prisma.bountyQuestion.findMany({
          where: { id: { in: questionIds } },
          select: { id: true, title: true },
        })
      : [];
    const titleMap = new Map(questions.map((q) => [q.id, q.title]));
    const list = reviews.map((r) => ({
      ...r,
      questionTitle: titleMap.get(r.questionId) || "",
    }));
    return { list, total, page, pageSize };
  }

  async approveReview(id: string) {
    const review = await this.prisma.bountyReview.findUnique({ where: { id } });
    if (!review) throw new BusinessException(ErrorCode.NOT_FOUND, "审核记录不存在");
    return this.prisma.bountyReview.update({
      where: { id },
      data: { status: "APPROVED" },
    });
  }

  async rejectReview(id: string, reason: string) {
    const review = await this.prisma.bountyReview.findUnique({ where: { id } });
    if (!review) throw new BusinessException(ErrorCode.NOT_FOUND, "审核记录不存在");
    return this.prisma.bountyReview.update({
      where: { id },
      data: { status: "REJECTED", reason },
    });
  }

  // ───────── 超时处理 ─────────

  @Cron(CronExpression.EVERY_HOUR)
  async processExpiredLocks() {
    const expired = await this.prisma.bountyQuestion.findMany({
      where: { status: "CLAIMED", lockExpireAt: { lt: new Date() } },
      select: { id: true },
    });
    if (expired.length > 0) {
      await this.prisma.bountyQuestion.updateMany({
        where: { id: { in: expired.map((q) => q.id) } },
        data: { status: "OPEN", answererId: null, lockExpireAt: null },
      });
      this.logger.log(`释放超时悬赏: ${expired.length}`);
    }
  }

  /** 每天检查超过30天无人抢答的悬赏，自动退款 */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async processExpiredBounties() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000);
    const expired = await this.prisma.bountyQuestion.findMany({
      where: {
        status: { in: ["OPEN", "CLAIMED"] },
        createdAt: { lt: thirtyDaysAgo },
      },
      select: { id: true, askerId: true, bountyCoin: true, status: true },
      take: 50,
    });

    if (expired.length === 0) return;

    for (const bounty of expired) {
      try {
        if (this.coinSvc && bounty.status === "CLAIMED") {
          await this.coinSvc.unfreeze(bounty.askerId, bounty.bountyCoin);
        } else if (this.coinSvc) {
          await this.coinSvc.unfreeze(bounty.askerId, bounty.bountyCoin);
        }
        await this.prisma.bountyQuestion.update({
          where: { id: bounty.id },
          data: { status: "EXPIRED" },
        });
        this.logger.log(`悬赏自动退款: ${bounty.id}, ${bounty.bountyCoin}币`);
      } catch (err: any) {
        this.logger.warn(`悬赏退款失败: ${bounty.id}, ${err.message}`);
      }
    }

    if (expired.length > 0) {
      this.logger.log(`悬赏过期处理完成: ${expired.length} 个`);
    }
  }
}
