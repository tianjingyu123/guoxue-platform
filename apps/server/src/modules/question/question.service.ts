import { Injectable, Logger } from "@nestjs/common";
import { HttpStatus } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinService } from "../coin/coin.service";
import { RevenueService } from "../revenue/revenue.service";
import { AuditService } from "../audit/audit.service";
import { safePagination } from "../../common/pagination";

@Injectable()
export class QuestionService {
  private readonly logger = new Logger(QuestionService.name);
  constructor(
    private prisma: PrismaService,
    private coin: CoinService,
    private revenue: RevenueService,
    private audit: AuditService,
  ) {}

  /** 发起付费提问（扣币与建记录同一事务，防丢钱） */
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

    // 圈子治理 #10（2026-07-11）：被禁言成员在该圈内不能发起付费提问（轻量直查 CircleViolation·避免跨模块依赖·置于扣币前）
    const mute = await this.prisma.circleViolation.findFirst({
      where: { circleId: dto.circleId, userId, type: "MUTE", status: "ACTIVE", expiresAt: { gt: new Date() } },
      select: { expiresAt: true },
    });
    if (mute) {
      const until = mute.expiresAt ? mute.expiresAt.toISOString().slice(0, 16).replace("T", " ") : "";
      throw new BusinessException(ErrorCode.FORBIDDEN, `你在该圈处于禁言期${until ? `（至 ${until}）` : ""}，暂不能发起提问`);
    }

    // 内容审核（先审后发；置于扣币事务前，违规内容不扣币）
    await this.audit.moderateTextOrThrow([dto.questionTitle, dto.question].filter(Boolean).join(" "), {
      scene: "PAID_QUESTION",
      userId,
    });

    const questionText = dto.questionTitle
      ? `【${dto.questionTitle}】${dto.question}`
      : dto.question;

    // 扣币与创建问题在同一事务内，确保中间异常时币不会丢失
    return this.prisma.$transaction(async (tx) => {
      await this.coin.spend(userId, {
        amountCoin: dto.priceCoin,
        scene: "PAID_QUESTION",
        description: `向圈主/嘉宾付费提问`,
      }, tx);

      return tx.paidQuestion.create({
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
    });
  }

  /** 回答提问 */
  async answer(answererId: string, questionId: string, dto: { answer: string; images?: string[]; answerAudioUrl?: string }) {
    const question = await this.prisma.paidQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new BusinessException(ErrorCode.NOT_FOUND, "问题不存在");
    if (question.answererId !== answererId) throw new BusinessException(ErrorCode.FORBIDDEN, "只有被提问者可以回答");
    if (question.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "问题状态不允许回答");

    // 内容审核（回答文本，先审后发）
    await this.audit.moderateTextOrThrow(dto.answer, {
      scene: "PAID_ANSWER",
      userId: answererId,
      dataId: questionId,
    });

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

    // 扣币与围观计数在同一事务，防重复扣费
    const checkPeeked = await this.prisma.virtualCoinTransaction.findFirst({
      where: { userId, scene: "PEEK_ANSWER", refId: questionId },
      select: { id: true },
    });
    if (checkPeeked) return question; // 已围观，直接返回

    await this.prisma.$transaction(async (tx) => {
      await this.coin.spend(userId, {
        amountCoin: question.peekPriceCoin,
        scene: "PEEK_ANSWER",
        refId: questionId,
        description: `围观答案`,
      }, tx); // 传入外层 tx，避免嵌套事务

      await tx.paidQuestion.update({
        where: { id: questionId },
        data: { peekCount: { increment: 1 } },
      });
    });

    // 围观分成（董事长拍板 2026-07-10）：平台 40% / 提问者 30% / 达人 30%
    this.revenue.record({
      userId: question.answererId,
      scene: "PEEK",
      refId: questionId,
      amountCoin: question.peekPriceCoin,
    }).catch((err) => this.logger.warn("围观达人分成入账失败", err));
    this.revenue.record({
      userId: question.askerId,
      scene: "PEEK_ASKER",
      refId: questionId,
      amountCoin: question.peekPriceCoin,
    }).catch((err) => this.logger.warn("围观提问者分成入账失败", err));

    return question;
  }

  /** 超时自动退款（由定时任务调用） */
  async refundExpiredQuestions() {
    const now = new Date();
    const TIMEOUT_HOURS = 48; // 董事长拍板 2026-07-10：图文提问超时退款与悬赏统一为 48 小时
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

  /**
   * 管理员单条退款（按 questionId）
   * 仅 PENDING（未回答）的提问可退款；退还提问者灵石、状态流转 REFUNDED。
   * 防重：状态流转用条件 updateMany（仅 PENDING→REFUNDED）与退款置于同一事务，
   * 并发/重复调用时只有一次能命中 PENDING，杜绝重复退款。
   */
  async refundQuestion(questionId: string, _operatorId?: string, reason?: string) {
    const question = await this.prisma.paidQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new BusinessException(ErrorCode.NOT_FOUND, "问题不存在");
    if (question.status !== "PENDING") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "仅待回答的提问可退款");
    }

    return this.prisma.$transaction(async (tx) => {
      // 先抢占状态：仅当仍为 PENDING 时才翻转，count===0 说明已被他人处理（防重）
      const flipped = await tx.paidQuestion.updateMany({
        where: { id: questionId, status: "PENDING" },
        data: {
          status: "REFUNDED",
          answer: reason ? `管理员已退款，理由：${reason}` : "管理员已为该提问退款",
        },
      });
      if (flipped.count === 0) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "提问状态已变更，退款失败（可能已被处理）");
      }

      // 退款与状态流转同事务，确保钱货一致
      await this.coin.refund(
        question.askerId,
        question.priceCoin,
        `管理员退款（问题ID: ${questionId}）${reason ? `，理由: ${reason}` : ""}`,
        tx,
      );

      return { refunded: true, questionId, amountCoin: question.priceCoin };
    });
  }

  /** 圈子问答列表 */
  async listQuestions(dto: { circleId?: string; status?: string; isPublic?: boolean; askerId?: string; answererId?: string; participantId?: string; page?: number; pageSize?: number }) {
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize);
    const where: Prisma.PaidQuestionWhereInput = {};
    if (dto.circleId) where.circleId = dto.circleId;
    if (dto.status) where.status = dto.status;
    if (dto.askerId) where.askerId = dto.askerId;
    if (dto.answererId) where.answererId = dto.answererId;
    // 参与者维度（我提问的 + 我回答的）；由调用方在 askerId/answererId/participantId 中择一使用
    if (dto.participantId) where.OR = [{ askerId: dto.participantId }, { answererId: dto.participantId }];
    if ((dto as any).stationId !== undefined) where.stationId = (dto as any).stationId || null;

    const [questions, total] = await Promise.all([
      this.prisma.paidQuestion.findMany({
        where,
        include: {
          asker: { select: { id: true, nickname: true, avatar: true } },
          answerer: { select: { id: true, nickname: true, avatar: true } },
          circle: { select: { id: true, name: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.paidQuestion.count({ where }),
    ]);
    return { questions, total, page, pageSize };
  }

  /**
   * 问答详情
   *
   * 安全：付费问答的 answer 全文受付费墙保护。仅以下用户可见 answer：
   *  - 提问者本人 / 回答者本人
   *  - 已围观（存在 PEEK_ANSWER 消费记录）的用户
   *  - 公开问答（isPublic=true）且 peekPriceCoin<=0（免费围观）时所有人可见
   * 其余情况剔除 answer 字段，避免绕过围观币付费墙。
   */
  async getQuestion(questionId: string, currentUserId?: string) {
    const question = await this.prisma.paidQuestion.findUnique({
      where: { id: questionId },
      include: {
        asker: { select: { id: true, nickname: true, avatar: true } },
        answerer: { select: { id: true, nickname: true, avatar: true } },
        circle: { select: { id: true, name: true } },
      },
    });
    if (!question) throw new BusinessException(ErrorCode.NOT_FOUND, "问题不存在");

    const canViewAnswer = await this.canViewAnswer(question, currentUserId);
    if (!canViewAnswer && question.answer != null) {
      // 剔除 answer 全文，仅保留是否已回答的状态
      const { answer: _answer, ...rest } = question;
      return { ...rest, answer: null, answerLocked: true };
    }
    return question;
  }

  /** 判断当前用户是否有权查看 answer 全文 */
  private async canViewAnswer(
    question: { id: string; askerId: string; answererId: string; isPublic: boolean; peekPriceCoin: number },
    currentUserId?: string,
  ): Promise<boolean> {
    // 当事人始终可见
    if (currentUserId && (currentUserId === question.askerId || currentUserId === question.answererId)) {
      return true;
    }
    // 公开且免费围观：任何人可见
    if (question.isPublic && question.peekPriceCoin <= 0) {
      return true;
    }
    // 已围观（付费查看过）：查 PEEK_ANSWER 消费记录
    if (currentUserId) {
      const peeked = await this.prisma.virtualCoinTransaction.findFirst({
        where: { userId: currentUserId, scene: "PEEK_ANSWER", refId: question.id },
        select: { id: true },
      });
      if (peeked) return true;
    }
    return false;
  }
}
