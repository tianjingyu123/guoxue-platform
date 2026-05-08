import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinService } from "../coin/coin.service";
import { RevenueService } from "../revenue/revenue.service";

@Injectable()
export class QuestionService {
  constructor(
    private prisma: PrismaService,
    private coin: CoinService,
    private revenue: RevenueService,
  ) {}

  /** 发起付费提问 */
  async ask(userId: string, dto: { circleId: string; answererId: string; question: string; images?: string[]; priceCoin: number; peekPriceCoin?: number }) {
    if (userId === dto.answererId) throw new BadRequestException("不能向自己提问");

    // 验证圈子
    const circle = await this.prisma.circle.findUnique({ where: { id: dto.circleId } });
    if (!circle) throw new NotFoundException("圈子不存在");

    // 验证回答者是圈子成员
    const member = await this.prisma.circleMember.findFirst({
      where: { circleId: dto.circleId, userId: dto.answererId },
    });
    if (!member) throw new BadRequestException("回答者不在该圈子中");

    // 扣减虚拟币
    await this.coin.spend(userId, {
      amountCoin: dto.priceCoin,
      scene: "PAID_QUESTION",
      description: `向圈主/嘉宾付费提问`,
    });

    // 创建提问
    return this.prisma.paidQuestion.create({
      data: {
        circleId: dto.circleId,
        askerId: userId,
        answererId: dto.answererId,
        question: dto.question,
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
  async answer(answererId: string, questionId: string, dto: { answer: string; images?: string[] }) {
    const question = await this.prisma.paidQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException("问题不存在");
    if (question.answererId !== answererId) throw new BadRequestException("只有被提问者可以回答");
    if (question.status !== "PENDING") throw new BadRequestException("问题状态不允许回答");

    const updated = await this.prisma.paidQuestion.update({
      where: { id: questionId },
      data: { answer: dto.answer, status: "ANSWERED", answeredAt: new Date() },
      include: {
        asker: { select: { id: true, nickname: true, avatar: true } },
        answerer: { select: { id: true, nickname: true, avatar: true } },
      },
    });

    // 回答者获得提问收益（默认80%）
    this.revenue.record({
      userId: answererId,
      scene: "QUESTION",
      refId: questionId,
      amountCoin: question.priceCoin,
    }).catch(() => {});

    return updated;
  }

  /** 围观答案 */
  async peek(userId: string, questionId: string) {
    const question = await this.prisma.paidQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException("问题不存在");
    if (question.status !== "ANSWERED") throw new BadRequestException("问题尚未回答");
    if (question.peekPriceCoin <= 0) throw new BadRequestException("该问题不支持围观");

    // 提问者和回答者不需要付费围观
    if (userId === question.askerId || userId === question.answererId) {
      return question;
    }

    // 扣减虚拟币
    await this.coin.spend(userId, {
      amountCoin: question.peekPriceCoin,
      scene: "PEEK_ANSWER",
      refId: questionId,
      description: `围观答案`,
    });

    // 增加围观计数
    await this.prisma.paidQuestion.update({
      where: { id: questionId },
      data: { peekCount: { increment: 1 } },
    });

    // 回答者获得围观收益（默认70%）
    this.revenue.record({
      userId: question.answererId,
      scene: "PEEK",
      refId: questionId,
      amountCoin: question.peekPriceCoin,
    }).catch(() => {});

    return question;
  }

  /** 退款（7天未回答自动退款） */
  async refundExpiredQuestions() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const expired = await this.prisma.paidQuestion.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: sevenDaysAgo },
      },
    });

    let refunded = 0;
    for (const q of expired) {
      await this.coin.refund(q.askerId, q.priceCoin, `提问超时自动退款（问题ID: ${q.id}）`);
      await this.prisma.paidQuestion.update({
        where: { id: q.id },
        data: { status: "REFUNDED" },
      });
      refunded++;
    }

    return { refunded };
  }

  /** 圈子问答列表 */
  async listQuestions(dto: { circleId?: string; status?: string; page?: number; pageSize?: number }) {
    const page = dto.page || 1;
    const pageSize = dto.pageSize || 20;
    const where: any = {};
    if (dto.circleId) where.circleId = dto.circleId;
    if (dto.status) where.status = dto.status;

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
    if (!question) throw new NotFoundException("问题不存在");
    return question;
  }
}
