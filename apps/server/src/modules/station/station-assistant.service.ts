import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AiGatewayService, GatewayChatRequest } from "../ai-gateway/ai-gateway.service";
import { AiMessage } from "../ai-gateway/adapters/base.adapter";
import { StationAssistantChatDto } from "./station-assistant.dto";
import { StationDashboardService } from "./station-dashboard.service";

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_SESSION_MESSAGES = 20;
const AI_SCENE = "station_assistant";

export const STATION_ASSISTANT_DISCLAIMER =
  "AI 建议仅供经营参考，不构成收益承诺或财务决策依据；请以平台实际数据与规则为准。";

const STATION_ASSISTANT_PROMPT = `你是热卜国学平台的“站长 AI 经营助理”。你的职责是依据系统提供的分站经营汇总数据，帮助站长理解现状、发现问题并制定可执行的运营动作。

必须遵守：
1. 只能引用系统提供的真实汇总指标；数据缺失时明确说“当前暂无该指标”，禁止猜测、补全或编造数字。
2. 禁止作出保本、保收益、保证成交或确定性增长承诺；所有建议都必须表述为经营参考。
3. 不索取、不推断、不输出客户姓名、手机号、用户 ID、头像等个人信息，也不得要求查看客户明细。
4. 优先给出具体、低风险、可执行的动作，并说明所依据的指标和观察周期。
5. 不代表平台执行改价、结算、提现、发券、群发等操作；涉及规则与资金时提醒站长以平台实际页面和规则为准。
6. 回答使用清晰、克制的简体中文；不知道就明确说明，不得用行业常识冒充本站数据。`;

export interface StationAssistantMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  incomplete?: boolean;
}

interface StationAssistantSession {
  messages: StationAssistantMessage[];
  updatedAt: string;
}

export interface PreparedStationAssistantStream {
  conversationId: string;
  disclaimer: string;
  stream: AsyncIterable<string>;
}

@Injectable()
export class StationAssistantService {
  private readonly logger = new Logger(StationAssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: StationDashboardService,
    private readonly gateway: AiGatewayService,
    private readonly redis: RedisService,
  ) {}

  async chat(userId: string, dto: StationAssistantChatDto) {
    const prepared = await this.prepare(userId, dto);
    const result = await this.gateway.chat(prepared.request);
    const content = result.content?.trim();
    if (!content) {
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI 暂未返回有效内容，请稍后重试");
    }

    await this.appendMessages(prepared.sessionKey, [
      prepared.userMessage,
      {
        role: "assistant",
        content,
        createdAt: new Date().toISOString(),
      },
    ]);
    return {
      content,
      conversationId: prepared.conversationId,
      disclaimer: STATION_ASSISTANT_DISCLAIMER,
    };
  }

  async chatStream(
    userId: string,
    dto: StationAssistantChatDto,
  ): Promise<PreparedStationAssistantStream> {
    const prepared = await this.prepare(userId, dto);
    return {
      conversationId: prepared.conversationId,
      disclaimer: STATION_ASSISTANT_DISCLAIMER,
      stream: this.rememberingStream(prepared.request, prepared.sessionKey, prepared.userMessage),
    };
  }

  async getSession(userId: string, conversationId: string) {
    const station = await this.requireActiveStation(userId);
    const session = await this.readSession(this.sessionKey(userId, station.id, conversationId));
    return {
      conversationId,
      messages: session.messages,
      disclaimer: STATION_ASSISTANT_DISCLAIMER,
    };
  }

  async clearSession(userId: string, conversationId: string) {
    const station = await this.requireActiveStation(userId);
    await this.redis.del(this.sessionKey(userId, station.id, conversationId));
    return { success: true, conversationId };
  }

  private async prepare(userId: string, dto: StationAssistantChatDto) {
    const query = dto.query.trim();
    if (!query) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请输入经营问题");
    }

    const station = await this.requireActiveStation(userId);
    const conversationId = dto.conversationId ?? randomUUID();
    const sessionKey = this.sessionKey(userId, station.id, conversationId);
    const [session, context] = await Promise.all([
      this.readSession(sessionKey),
      this.buildBusinessContext(station.id),
    ]);

    const history: AiMessage[] = session.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const userMessage: StationAssistantMessage = {
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
    };

    const request: GatewayChatRequest = {
      scene: AI_SCENE,
      userId,
      skipCache: true,
      messages: [
        { role: "system", content: STATION_ASSISTANT_PROMPT },
        {
          role: "system",
          content: `当前分站经营汇总数据（仅限本次回答使用）：\n${JSON.stringify(context)}`,
        },
        ...history,
        { role: "user", content: query },
      ],
      options: { temperature: 0.2, maxTokens: 1536 },
    };

    return { conversationId, sessionKey, request, userMessage };
  }

  private async requireActiveStation(userId: string): Promise<{ id: string }> {
    const station = await this.prisma.station.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        OR: [{ expireAt: null }, { expireAt: { gt: new Date() } }],
      },
      select: { id: true },
    });
    if (!station) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        "站长 AI 经营助理仅限已开通且在有效期内的分站使用",
      );
    }
    return station;
  }

  /** 只挑选经营汇总字段；沉默用户仅注入数量，绝不把客户明细或标识送入模型。 */
  private async buildBusinessContext(stationId: string) {
    const [overview, trends, linkRanking, silentUsers, settlement] = await Promise.all([
      this.dashboard.getOverview(stationId),
      this.dashboard.getTrends(stationId),
      this.dashboard.getLinkRanking(stationId),
      this.dashboard.getSilentUsers(stationId),
      this.dashboard.getSettlementTimer(stationId),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      overview: {
        monthEarned: Number(overview.monthEarned || 0),
        monthAmount: Number(overview.monthAmount || 0),
        monthOrders: Number(overview.monthOrders || 0),
        conversionRate: String(overview.conversionRate ?? "0"),
        qualification: {
          status: overview.qualification.status,
          expireAt: overview.qualification.expireAt,
          daysLeft: overview.qualification.daysLeft,
          expired: overview.qualification.expired,
          expiringSoon: overview.qualification.expiringSoon,
        },
      },
      recentThirtyDayTrends: trends.trends.map((item) => ({
        date: item.date,
        earned: Number(item.earned || 0),
      })),
      channelRanking: linkRanking.ranking.map((item) => ({
        type: item.type,
        earned: Number(item.earned || 0),
        count: Number(item.count || 0),
      })),
      silentCustomerCount: Number(silentUsers.count || 0),
      settlement: {
        nextSettleDate: settlement.nextSettleDate,
        remainingDays: Number(settlement.remainingDays || 0),
        pendingSettlement: Number(settlement.pendingSettlement || 0),
      },
    };
  }

  private async *rememberingStream(
    request: GatewayChatRequest,
    sessionKey: string,
    userMessage: StationAssistantMessage,
  ): AsyncIterable<string> {
    let fullContent = "";
    try {
      for await (const chunk of this.gateway.chatStream(request)) {
        if (!chunk) continue;
        fullContent += chunk;
        yield chunk;
      }
      if (!fullContent.trim()) {
        throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI 暂未返回有效内容，请稍后重试");
      }
      await this.appendMessages(sessionKey, [
        userMessage,
        {
          role: "assistant",
          content: fullContent,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      // 已经真实输出给用户的部分内容仍记入会话；绝不构造兜底答案冒充模型回复。
      if (fullContent.trim()) {
        await this.appendMessages(sessionKey, [
          userMessage,
          {
            role: "assistant",
            content: fullContent,
            createdAt: new Date().toISOString(),
            incomplete: true,
          },
        ]);
      }
      throw error;
    }
  }

  private sessionKey(userId: string, stationId: string, conversationId: string): string {
    return `station:assistant:session:${userId}:${stationId}:${conversationId}`;
  }

  private async readSession(key: string): Promise<StationAssistantSession> {
    try {
      const session = await this.redis.getJson<StationAssistantSession>(key);
      if (!session || !Array.isArray(session.messages))
        return { messages: [], updatedAt: new Date(0).toISOString() };
      return {
        messages: session.messages
          .filter((message) => message?.role === "user" || message?.role === "assistant")
          .slice(-MAX_SESSION_MESSAGES),
        updatedAt: session.updatedAt,
      };
    } catch (error) {
      this.logger.warn("站长经营助理读取会话失败，按无历史继续", error);
      return { messages: [], updatedAt: new Date(0).toISOString() };
    }
  }

  private async appendMessages(key: string, messages: StationAssistantMessage[]): Promise<void> {
    try {
      const session = await this.readSession(key);
      const next: StationAssistantSession = {
        messages: [...session.messages, ...messages].slice(-MAX_SESSION_MESSAGES),
        updatedAt: new Date().toISOString(),
      };
      await this.redis.setJson(key, next, SESSION_TTL_SECONDS);
    } catch (error) {
      // 经营助理不是资金功能：记忆设施故障时允许继续问答，但不得伪造回复。
      this.logger.warn("站长经营助理写入会话失败，当前问答继续", error);
    }
  }
}
