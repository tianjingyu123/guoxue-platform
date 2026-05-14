import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
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
    @Inject(forwardRef(() => CoinService)) private coinSvc?: CoinService,
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

  async refund(questionId: string) {
    const question = await this.prisma.bountyQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new BusinessException(ErrorCode.NOT_FOUND, "悬赏不存在");
    if (!["OPEN", "CLAIMED"].includes(question.status)) throw new BusinessException(ErrorCode.BAD_REQUEST, "当前状态不可退款");

    if (this.coinSvc) {
      await this.coinSvc.unfreeze(question.askerId, question.bountyCoin);
    }

    return this.prisma.bountyQuestion.update({
      where: { id: questionId },
      data: { status: "REFUNDED" },
    });
  }

  // ───────── 列表/详情 ─────────

  list(page = 1, pageSize = 20, category?: string, status?: string) {
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
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

  // ───────── 超时处理 ─────────

  @Cron(CronExpression.EVERY_HOUR)
  async processExpiredLocks() {
    const expired = await this.prisma.bountyQuestion.findMany({
      where: { status: "CLAIMED", lockExpireAt: { lt: new Date() } },
    });
    for (const q of expired) {
      await this.prisma.bountyQuestion.update({
        where: { id: q.id },
        data: { status: "OPEN", answererId: null, lockExpireAt: null },
      });
    }
    if (expired.length) this.logger.log(`释放超时悬赏: ${expired.length}`);
  }
}
