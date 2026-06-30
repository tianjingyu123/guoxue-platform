import { Injectable, Logger } from "@nestjs/common";
import { RagService } from "../ai-gateway/rag.service";
import { AiMessage } from "../ai-gateway/adapters/base.adapter";
import { PrismaService } from "../../prisma/prisma.service";
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
  ) {}

  /**
   * 校验调用者是该圈"有效成员"，否则拒绝。
   * 防止任意登录用户对任意 circleId 提问，越权套取该圈（含付费圈）私有知识库内容。
   */
  private async assertActiveMember(circleId: string, userId?: string) {
    if (!userId) throw new BusinessException(ErrorCode.FORBIDDEN, "请先登录");
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: { role: true, expireAt: true },
    });
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, "请先加入该圈子才能使用圈主助理");
    if (member.expireAt && new Date(member.expireAt) < new Date()) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "圈子会员已过期，请续费后使用");
    }
  }

  /** 向圈主助理提问（非流式） */
  async ask(
    question: string,
    circleId: string,
    userId?: string,
    history?: AiMessage[],
  ): Promise<AssistantReply> {
    await this.assertActiveMember(circleId, userId);
    this.logger.log(`圈主助理提问 [circle=${circleId}]: ${question.slice(0, 100)}`);
    return this.rag.askCircle(question, circleId, userId, history);
  }

  /** 向圈主助理提问（流式） */
  async *askStream(
    question: string,
    circleId: string,
    userId?: string,
    history?: AiMessage[],
  ): AsyncIterable<string> {
    await this.assertActiveMember(circleId, userId);
    this.logger.log(`圈主助理流式提问 [circle=${circleId}]: ${question.slice(0, 100)}`);
    yield* this.rag.askCircleStream(question, circleId, userId, history);
  }
}
