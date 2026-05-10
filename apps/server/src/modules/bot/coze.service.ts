import { Injectable, Logger } from "@nestjs/common";
import { Observable } from "rxjs";

/**
 * COZE智能体 API 服务（纯原生HTTP，不依赖SDK）
 * Base URL: https://api.coze.cn/v3
 */
@Injectable()
export class CozeService {
  private readonly logger = new Logger(CozeService.name);
  private readonly baseUrl = "https://api.coze.cn/v3";

  // ───────── 对话 ─────────

  /** 发起对话（非流式），返回完整响应 */
  async chat(params: {
    botId: string;
    apiKey: string;
    userId: string;
    query: string;
    chatHistory?: { role: "user" | "assistant"; content: string }[];
    conversationId?: string;
    additionalParams?: Record<string, unknown>;
  }) {
    const body: Record<string, unknown> = {
      bot_id: params.botId,
      user_id: params.userId,
      additional_messages: params.chatHistory?.map((m) => ({
        role: m.role,
        content: m.content,
        content_type: "text",
      })) || [],
      auto_save_history: true,
    };

    if (params.conversationId) {
      body.conversation_id = params.conversationId;
    }
    if (params.additionalParams) {
      body.additional_params = params.additionalParams;
    }

    // 先发送用户消息创建chat
    const createResp = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const createData = await createResp.json() as Record<string, unknown>;
    if (createData.code !== 0) {
      this.logger.error("COZE创建对话失败", createData);
      throw new Error(`COZE对话失败: ${createData.msg}`);
    }

    const createDataBody = createData.data as Record<string, unknown>;
    const chatId = createDataBody.id as string;
    const conversationId = createDataBody.conversation_id as string;

    // 轮询获取对话结果
    return this.pollChatResult(chatId, conversationId, params.apiKey);
  }

  /** 发起对话（流式），返回SSE Observable */
  chatStream(params: {
    botId: string;
    apiKey: string;
    userId: string;
    query: string;
    conversationId?: string;
    additionalParams?: Record<string, unknown>;
  }): Observable<string> {
    return new Observable((subscriber) => {
      const body: Record<string, unknown> = {
        bot_id: params.botId,
        user_id: params.userId,
        additional_messages: [
          { role: "user", content: params.query, content_type: "text" },
        ],
        stream: true,
        auto_save_history: true,
      };

      if (params.conversationId) {
        body.conversation_id = params.conversationId;
      }
      if (params.additionalParams) {
        body.additional_params = params.additionalParams;
      }

      (async () => {
        try {
          const resp = await fetch(`${this.baseUrl}/chat`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${params.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });

          if (resp.status !== 200) {
            const errText = await resp.text();
            subscriber.error(new Error(`COZE流式请求失败: ${errText}`));
            return;
          }

          const reader = resp.body?.getReader();
          if (!reader) {
            subscriber.error(new Error("无法获取流式响应"));
            return;
          }

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data:")) {
                const jsonStr = line.slice(5).trim();
                if (jsonStr === "[DONE]") {
                  subscriber.complete();
                  return;
                }
                try {
                  const data = JSON.parse(jsonStr);
                  if (data.content) {
                    subscriber.next(data.content);
                  }
                  if (data.type === "answer" && data.content_type === "text") {
                    subscriber.next(data.content);
                  }
                } catch {
                  // 非JSON行，忽略
                }
              }
              if (line.startsWith("event:")) {
                const eventType = line.slice(6).trim();
                if (eventType === "done") {
                  subscriber.complete();
                  return;
                }
              }
            }
          }
          subscriber.complete();
        } catch (err: unknown) {
          subscriber.error(err as Error);
        }
      })();
    });
  }

  /** 轮询对话结果 */
  private async pollChatResult(
    chatId: string,
    conversationId: string,
    apiKey: string,
    maxRetries = 30,
  ) {
    for (let i = 0; i < maxRetries; i++) {
      const messagesResp = await fetch(
        `${this.baseUrl}/chat/message/list?chat_id=${chatId}&conversation_id=${conversationId}`,
        {
          headers: { "Authorization": `Bearer ${apiKey}` },
        },
      );

      const messagesData = await messagesResp.json() as Record<string, unknown>;
      if (messagesData.code !== 0) {
        throw new Error(`获取消息列表失败: ${messagesData.msg}`);
      }

      const messages = (messagesData.data as Array<Record<string, unknown>>) || [];
      const assistantMsg = messages.find(
        (m) => (m as Record<string, unknown>).role === "assistant" && (m as Record<string, unknown>).type === "answer",
      );

      if (assistantMsg) {
        return {
          chatId,
          conversationId,
          content: assistantMsg.content,
          messages,
        };
      }

      // 等待1秒后重试
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error("COZE对话超时，未获取到响应");
  }

  /** 获取对话消息列表 */
  async getMessages(
    conversationId: string,
    chatId: string,
    apiKey: string,
  ) {
    const resp = await fetch(
      `${this.baseUrl}/chat/message/list?chat_id=${chatId}&conversation_id=${conversationId}`,
      {
        headers: { "Authorization": `Bearer ${apiKey}` },
      },
    );

    const data = await resp.json() as Record<string, unknown>;
    if (data.code !== 0) {
      throw new Error(`获取消息失败: ${data.msg}`);
    }
    return data.data;
  }

  /** 获取对话详情 */
  async getChatDetail(conversationId: string, chatId: string, apiKey: string) {
    const resp = await fetch(
      `${this.baseUrl}/chat/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`,
      {
        headers: { "Authorization": `Bearer ${apiKey}` },
      },
    );

    const data = await resp.json() as Record<string, unknown>;
    if (data.code !== 0) {
      throw new Error(`获取对话详情失败: ${data.msg}`);
    }
    return data.data;
  }
}
