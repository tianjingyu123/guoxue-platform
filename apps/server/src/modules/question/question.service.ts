import { Injectable, Logger } from "@nestjs/common";
import { HttpStatus } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinService } from "../coin/coin.service";
import { RevenueService } from "../revenue/revenue.service";

@Injectable()
export class QuestionService {
  private readonly logger = new Logger(QuestionService.name);
  constructor(
    private prisma: PrismaService,
    private coin: CoinService,
    private revenue: RevenueService,
  ) {}

  /** 发起付费提问 */
  async ask(userId: string, dto: {
    circleId: string;
    answererId: string;
    questionTitle: string;
    question: string;
    images?: string[];
    priceCoin: number;
    peekPriceCoin?: number;
    isPublic?: boolean;
  }) {
    if (userId === dto.answererId) throw new BusinessException(ErrorCode.BAD_REQUEST, "不能向自己提问", HttpStatus.CONFLICT);

    const circle = await this.prisma.circle.findUnique({ where: { id: dto.circleId } });
    if (!circle) throw new BusinessException(ErrorCode.NOT_FOUND, "圈子不存在");

    const member = await this.prisma.circleMember.findFirst({
      where: { circleId: dto.circleId, userId: dto.answererId },
    });
    if (!member) throw new BusinessException(ErrorCode.BAD_REQUEST, "回答者不在该圈子中");

    await this.coin.spend(userId, {
      amountCoin: dto.priceCoin,
      scene: "PAID_QUESTION",
      description: `向圈主/嘉宾付费提问`,
    });

    const questionText = dto.questionTitle
      ? `【${dto.questionTitle}】${dto.question}`
      : dto.question;

    return this.prisma.paidQuestion.create({
      data: {
        circleId: dto.circleId,
        stationId: (dto as any).stationId || circle.stationId || null,
        askerId: userId,
        answererId: dto.answererId,
        question: questionText,
        images: dto.images || [],
        priceCoin: dto.priceCoin,
        peekPriceCoin: dto.peekPriceCoin || 0,
        status: "PENDING",
      },
      include: {
        asker: { select: { id: true, nickname: true, avatar: true } },
        answerer: { select: { id: true, nickname: true, avatar: true } },
        circle: { select: { id: true, name: true } },
      },
    });
  }

  /** 回答提问 */
  async answer(answererId: string, questionId: string, dto: { answer: string; images?: string[]; answerAudioUrl?: string }) {
    const question = await this.prisma.paidQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new BusinessException(ErrorCode.NOT_FOUND, "问题不存在");
    if (question.answererId !== answererId) throw new BusinessException(ErrorCode.FORBIDDEN, "只有被提问者可以回答");
    if (question.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "问题状态不允许回答");

    const answerText = dto.answerAudioUrl
      ? `${dto.answer}\n[音频回复: ${dto.answerAudioUrl}]`
      : dto.answer;

    const updated = await this.prisma.paidQuestion.update({
      where: { id: questionId },
      data: {
        answer: answerText,
        status: "ANSWERED",
        answeredAt: new Date(),
      },
      include: {
        asker: { select: { id: true, nickname: true, avatar: true } },
        answerer: { select: { id: true, nickname: true, avatar: true } },
      },
    });

    this.revenue.record({
      userId: answererId,
      scene: "QUESTION",
      refId: questionId,
      amountCoin: question.priceCoin,
    }).catch((err) => this.logger.warn("退款通知失败", err));

    return updated;
  }

  /** 拒绝提问 */
  async reject(answererId: string, questionId: string, reason?: string) {
    const question = await this.prisma.paidQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new BusinessException(ErrorCode.NOT_FOUND, "问题不存在");
    if (question.answererId !== answererId) throw new BusinessException(ErrorCode.FORBIDDEN, "只有被提问者可以拒绝");
    if (question.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "问题状态不允许拒绝");

    await this.coin.refund(question.askerId, question.priceCoin, `回答者拒绝了您的提问（问题ID: ${questionId}）${reason ? `，理由: ${reason}` : ""}`);

    return this.prisma.paidQuestion.update({
      where: { id: questionId },
      data: {
        status: "REFUNDED",
        answer: reason || "回答者拒绝了该提问",
      },
    });
  }

  /** 围观答案 */
  async peek(userId: string, questionId: string) {
    const question = await this.prisma.paidQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new BusinessException(ErrorCode.NOT_FOUND, "问题不存在");
    if (question.status !== "ANSWERED") throw new BusinessException(ErrorCode.BAD_REQUEST, "问题尚未回答");
    if (question.peekPriceCoin <= 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "该问题不支持围观");

    if (userId === question.askerId || userId === question.answererId) {
      return question;
    }

    await this.prisma.$transaction(async (tx) => {
      await this.coin.spend(userId, {
        amountCoin: question.peekPriceCoin,
        scene: "PEEK_ANSWER",
        refId: questionId,
        description: `围观答案`,
      });

      await tx.paidQuestion.update({
        where: { id: questionId },
        data: { peekCount: { increment: 1 } },
      });
    });

    this.revenue.record({
      userId: question.answererId,
      scene: "PEEK",
      refId: questionId,
      amountCoin: question.peekPriceCoin,
    }).catch((err) => this.logger.warn("退款通知失败", err));

    return question;
  }

  /** 超时自动退款（由定时任务调用） */
  async refundExpiredQuestions() {
    const now = new Date();
    const TIMEOUT_HOURS = 72;
    const deadline = new Date(now.getTime() - TIMEOUT_HOURS * 3600000);

    const expiredQuestions = await this.prisma.paidQuestion.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: deadline },
      },
    });

    if (expiredQuestions.length === 0) return { refunded: 0 };

    // 批量更新问题状态为 CLOSED
    const expiredIds = expiredQuestions.map((q) => q.id);
    await this.prisma.paidQuestion.updateMany({
      where: { id: { in: expiredIds } },
      data: { status: "CLOSED" },
    });

    // 并发退款（coin.refund 涉及余额事务，不能简单批量）
    const results = await Promise.allSettled(
      expiredQuestions.map((q) =>
        this.coin.refund(q.askerId, q.priceCoin, `提问超时自动退款（问题ID: ${q.id}，已超${TIMEOUT_HOURS}小时）`),
      ),
    );
    const refunded = results.filter((r) => r.status === "fulfilled").length;

    return { refunded };
  }

  /** 圈子问答列表 */
  async listQuestions(dto: { circleId?: string; status?: string; isPublic?: boolean; page?: number; pageSize?: number }) {
    const page = dto.page || 1;
    const pageSize = dto.pageSize || 20;
    const where: Prisma.PaidQuestionWhereInput = {};
    if (dto.circleId) where.circleId = dto.circleId;
    if (dto.status) where.status = dto.status;
    if ((dto as any).stationId !== undefined) where.stationId = (dto as any).stationId || null;

    const [questions, total] = await Promise.all([
      this.prisma.paidQuestion.findMany({
        where,
        include: {
          asker: { select: { id: true, nickname: true, avatar: true } },
          answerer: { select: { id: true, nickname: true, avatar: true } },
          circle: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.paidQuestion.count({ where }),
    ]);
    return { questions, total, page, pageSize };
  }

  /** 问答详情 */
  async getQuestion(questionId: string) {
    const question = await this.prisma.paidQuestion.findUnique({
      where: { id: questionId },
      include: {
        asker: { select: { id: true, nickname: true, avatar: true } },
        answerer: { select: { id: true, nickname: true, avatar: true } },
        circle: { select: { id: true, name: true } },
      },
    });
    if (!question) throw new BusinessException(ErrorCode.NOT_FOUND, "问题不存在");
    return question;
  }
}
