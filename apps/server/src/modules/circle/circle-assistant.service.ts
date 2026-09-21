import { Injectable, Logger, Optional } from "@nestjs/common";
import { RagService } from "../ai-gateway/rag.service";
import { AiMessage } from "../ai-gateway/adapters/base.adapter";
import { PrismaService } from "../../prisma/prisma.service";
import { PreferredNameService } from "../dialogue/preferred-name.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

export interface AssistantReply {
  answer: string;
  sources: Array<{ id: string; content: string; similarity: number }>;
}

/**
 * 圈主助理服务 — 使用 RAG 回答圈子内的问题
 */
@Injectable()
export class CircleAssistantService {
  private readonly logger = new Logger(CircleAssistantService.name);

  constructor(
    private readonly rag: RagService,
    private readonly prisma: PrismaService,
    /** 可选：称呼记忆。三个对话入口（报告、伴读、圈子助理）共用同一套口径 */
    @Optional() private readonly names?: PreferredNameService,
  ) {}

  /**
   * 校验调用者是该圈"有效成员"，否则拒绝。
   * 防止任意登录用户对任意 circleId 提问，越权套取该圈（含付费圈）私有知识库内容。
   */
  private async assertActiveMember(circleId: string, userId?: string) {
    if (!userId) throw new BusinessException(ErrorCode.FORBIDDEN, "请先登录");
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
      // joinedAt 用于识别新成员（决策人要求助理按角色调整回答角度，新成员另给一层入门引导）
      select: { role: true, joinedAt: true, expireAt: true, circle: { select: { status: true, deletedAt: true } } },
    });
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, "请先加入该圈子才能使用圈主助理");
    if (member.circle && (member.circle.deletedAt || member.circle.status !== "ACTIVE")) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "该圈子当前不可用，暂不能使用圈主助理");
    }
    if (member.expireAt && new Date(member.expireAt) < new Date()) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "圈子会员已过期，请续费后使用");
    }
    // 角色原先查出来就丢了——助理据此调整回答角度，必须一路传到提示词
    return { role: member.role as string, joinedAt: member.joinedAt as Date };
  }

  /** 向圈主助理提问（非流式） */
  async ask(
    question: string,
    circleId: string,
    userId?: string,
    history?: AiMessage[],
  ): Promise<AssistantReply> {
    const who = await this.assertActiveMember(circleId, userId);
    // 用户这句话里若说了「叫我XX」，先记下来
    if (userId) await this.names?.captureFromMessage(userId, question);
    const address = await this.names?.addressPrompt(userId);
    this.logger.log(`圈主助理提问 [circle=${circleId} role=${who.role}]: ${question.slice(0, 100)}`);
    const reply = await this.rag.askCircle(question, circleId, userId, history, who, address);
    // 问过称呼就留痕，只问一次
    if (userId && address?.shouldAsk) await this.names?.markAsked(userId);
    return reply;
  }

  /** 向圈主助理提问（流式） */
  async *askStream(
    question: string,
    circleId: string,
    userId?: string,
    history?: AiMessage[],
  ): AsyncIterable<string> {
    const who = await this.assertActiveMember(circleId, userId);
    this.logger.log(`圈主助理流式提问 [circle=${circleId} role=${who.role}]: ${question.slice(0, 100)}`);
    yield* this.rag.askCircleStream(question, circleId, userId, history, who);
  }
}
