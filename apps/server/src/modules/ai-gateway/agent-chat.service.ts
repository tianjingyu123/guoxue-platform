import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { AGENT_BOT_MAP, RISK_DISCLAIMER } from "./agent-bot-mapping";

interface CozeChatMessage {
  role: "user" | "assistant";
  content: string;
  content_type?: "text";
}

interface CozeChatResponse {
  code: number;
  msg: string;
  data?: {
    conversation_id: string;
    messages: Array<{
      role: string;
      content: string;
      type: string;
    }>;
  };
}

interface CozeStreamEvent {
  event: string;
  data?: {
    content?: string;
    message?: { content: string };
    is_finish?: boolean;
    error?: string;
  };
}

/**
 * Coze Agent 聊天代理服务
 *
 * 将国学平台后端的 Agent 聊天请求代理转发到 Coze Bot API
 * 支持 SSE 流式和非流式两种模式
 */
@Injectable()
export class AgentChatService {
  private readonly logger = new Logger(AgentChatService.name);
  private readonly cozeBaseUrl = "https://api.coze.cn";

  /** 获取 Agent 配置 */
  getAgentConfig(agentId: string) {
    const config = AGENT_BOT_MAP[agentId];
    if (!config) {
      return null;
    }
    return config;
  }

  /** 列出所有可用 Agent */
  listAgents() {
    return Object.values(AGENT_BOT_MAP);
  }

  /** 非流式聊天 */
  async chat(
    agentId: string,
    userId: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
  ): Promise<{ content: string; conversationId: string }> {
    const config = this.getAgentConfig(agentId);
    if (!config) {
      throw new BusinessException(ErrorCode.NOT_FOUND, `Agent "${agentId}" 不存在`);
    }

    const cozeMessages: CozeChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
      content_type: "text",
    }));

    const body = JSON.stringify({
      bot_id: config.botId,
      user_id: userId || "anonymous",
      stream: false,
      additional_messages: cozeMessages,
    });

    this.logger.log(`非流式请求 Agent: ${config.name} (${config.botId})`);

    const resp = await fetch(`${this.cozeBaseUrl}/v3/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.COZE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body,
    });

    const json = await resp.json() as CozeChatResponse;
    if (json.code !== 0) {
      this.logger.error(`Coze 非流式错误: ${json.msg}`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `Coze 返回错误: ${json.msg}`);
    }

    const answerMsg = json.data?.messages?.find((m) => m.type === "answer");
    const content = (answerMsg?.content || "抱歉，未能获取回复。") + RISK_DISCLAIMER;

    return {
      content,
      conversationId: json.data?.conversation_id || "",
    };
  }

  /** SSE 流式聊天（async generator） */
  async *chatStream(
    agentId: string,
    userId: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
  ): AsyncGenerator<string> {
    const config = this.getAgentConfig(agentId);
    if (!config) {
      yield `Error: Agent "${agentId}" 不存在`;
      return;
    }

    const cozeMessages: CozeChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
      content_type: "text",
    }));

    const body = JSON.stringify({
      bot_id: config.botId,
      user_id: userId || "anonymous",
      stream: true,
      additional_messages: cozeMessages,
    });

    this.logger.log(`SSE流式请求 Agent: ${config.name} (${config.botId})`);

    const resp = await fetch(`${this.cozeBaseUrl}/v3/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.COZE_API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body,
    });

    if (!resp.ok || !resp.body) {
      yield "Error: Coze API 请求失败";
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const dataStr = line.slice(5).trim();
          if (!dataStr || dataStr === "[DONE]") continue;

          try {
            const event: CozeStreamEvent = JSON.parse(dataStr);

            if (event.event === "error") {
              this.logger.error(`SSE error event: ${JSON.stringify(event.data)}`);
              yield `Error: ${event.data?.error || "流式错误"}`;
              return;
            }

            const content =
              event.data?.content ||
              event.data?.message?.content ||
              "";

            if (content) {
              yield content;
            }
          } catch {
            // 跳过无法解析的行
          }
        }
      }
    } finally {
      reader.releaseLock();
      // 流结束追加风险提示
      yield RISK_DISCLAIMER;
    }
  }
}
