import { Injectable, Logger, Optional } from "@nestjs/common";
import { RagService, CircleKnowledgeMatches } from "../ai-gateway/rag.service";
import { AiMessage } from "../ai-gateway/adapters/base.adapter";
import { PrismaService } from "../../prisma/prisma.service";
import { PreferredNameService } from "../dialogue/preferred-name.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { RecommendationService, type Recommendation } from "../bot/recommendation.service";

export interface AssistantReply {
  answer: string;
  sources: Array<{ id: string; content: string; similarity: number }>;
  recommendation?: Recommendation;
}

/**
 * 圈主助理服务 — 使用 RAG 回答圈子内的问题
 */
@Injectable()
export class CircleAssistantService {
  private readonly logger = new Logger(CircleAssistantService.name);

  /** 客户端历史仅作为对话上下文，不允许伪造系统消息或无限扩大模型输入。 */
  private sanitizeHistory(history?: AiMessage[]): AiMessage[] | undefined {
    if (history === undefined) return undefined;
    if (!Array.isArray(history)) return [];
    return history
      .filter((message) =>
        message != null &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
      )
      .slice(-12)
      .map((message) => ({ role: message.role, content: message.content.trim().slice(0, 2000) }));
  }

  constructor(
    private readonly rag: RagService,
    private readonly prisma: PrismaService,
    private readonly recommendations: RecommendationService,
    /** 可选：称呼记忆。三个对话入口（报告、伴读、圈子助理）共用同一套口径 */
    @Optional() private readonly names?: PreferredNameService,
  ) {}

  /** 仅提供与本轮问题相关的已上架资源；推荐失败不影响问答。 */
  private async recommendSafe(question: string, answer: string, circleId: string): Promise<Recommendation | undefined> {
    if (!answer.trim()) return undefined;
    try {
      const result = await this.recommendations.build(answer, question);
      if (!result.recommendation) return undefined;
      const items = result.recommendation.items.filter((item) =>
        item.type !== "circle" || String(item.data.id || "") !== circleId,
      );
      if (!items.length) return undefined;
      if (items.length === result.recommendation.items.length) return result.recommendation;
      const hasCommerce = items.some((item) => ["course", "circle", "product"].includes(item.type));
      return {
        ...result.recommendation,
        items,
        title: "顺着这个问题继续",
        lead: "还有这些相关资源可供查看",
        presentation: hasCommerce ? result.recommendation.presentation : "inline",
        consentPrompt: hasCommerce ? "还有相关内容和商业服务，价格会明确标注。要继续看看吗？" : "还有相关内容，要继续看看吗？",
        commercialDisclosure: hasCommerce ? result.recommendation.commercialDisclosure : undefined,
      };
    } catch {
      this.logger.warn(`圈主助理资源推荐失败 [circle=${circleId}]`);
      return undefined;
    }
  }

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
    this.logger.log(`圈主助理提问 [circle=${circleId} role=${who.role}]`);
    const reply = await this.rag.askCircle(question, circleId, userId, this.sanitizeHistory(history), who, address);
    // 问过称呼就留痕，只问一次
    if (userId && address?.shouldAsk) await this.names?.markAsked(userId);
    return { ...reply, recommendation: await this.recommendSafe(question, reply.answer, circleId) };
  }

  /** 向圈主助理提问（流式） */
  async *askStream(
    question: string,
    circleId: string,
    userId?: string,
    history?: AiMessage[],
    onMatches?: (matches: CircleKnowledgeMatches) => void,
    onRecommendation?: (recommendation: Recommendation) => void,
  ): AsyncIterable<string> {
    const who = await this.assertActiveMember(circleId, userId);
    this.logger.log(`圈主助理流式提问 [circle=${circleId} role=${who.role}]`);
    let answer = "";
    for await (const chunk of this.rag.askCircleStream(question, circleId, userId, this.sanitizeHistory(history), onMatches, who)) {
      answer += chunk;
      yield chunk;
    }
    const recommendation = await this.recommendSafe(question, answer, circleId);
    if (recommendation) onRecommendation?.(recommendation);
  }
}
