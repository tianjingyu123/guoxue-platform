import { Injectable, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/**
 * COZE 智能体 API 服务
 *
 * ## 选型理由
 * - **为什么纯原生 HTTP 而非 Coze SDK：** SDK 版本更新滞后于 API，且引入额外依赖。
 *   Coze v3 API 是标准 RESTful，fetch 直接调用更轻量可控
 * - **为什么用 Observable 流式：** 兼容 NestJS SSE 管道，前端可统一处理流式/非流式
 * - **为什么不在 Coze 侧做业务逻辑：** 对话体验归 Coze，业务数据（用户/订单/课程）
 *   归自建 PostgreSQL，Coze 通过 HTTP 插件回调获取业务上下文
 * - **未来注意：** 如果 Coze 推出 WebSocket 流式协议，需评估迁移收益；
 *   当前 HTTP SSE 方案在 95% 场景下足够
 *
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
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `COZE对话失败: ${createData.msg}`);
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

          for (;;) {
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
                } catch (err) {
                  this.logger.warn(`Coze 响应行 JSON 解析失败`, err);
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
        throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `获取消息列表失败: ${messagesData.msg}`);
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
    throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "COZE对话超时，未获取到响应");
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
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `获取消息失败: ${data.msg}`);
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
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `获取对话详情失败: ${data.msg}`);
    }
    return data.data;
  }

  /** 获取单条消息详情 */
  async retrieveMessage(
    conversationId: string,
    chatId: string,
    messageId: string,
    apiKey: string,
  ) {
    const resp = await fetch(
      `${this.baseUrl}/chat/message/retrieve?chat_id=${chatId}&conversation_id=${conversationId}&message_id=${messageId}`,
      { headers: { "Authorization": `Bearer ${apiKey}` } },
    );
    const data = await resp.json() as Record<string, unknown>;
    if (data.code !== 0) {
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `获取消息详情失败: ${data.msg}`);
    }
    return data.data;
  }

  // ───────── 智能体管理 ─────────

  /** 从 Coze 获取智能体详情（含 voice_id 等配置） */
  async retrieveBot(botId: string, apiKey: string) {
    const resp = await fetch(`https://api.coze.cn/v1/bot/retrieve?bot_id=${botId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const data = await resp.json() as Record<string, unknown>;
    if (data.code !== 0) {
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `获取智能体信息失败: ${data.msg}`);
    }
    return data.data as Record<string, unknown>;
  }

  /** 获取 Coze 空间下的所有智能体列表 */
  async listBots(apiKey: string, spaceId?: string) {
    const params = new URLSearchParams();
    if (spaceId) params.set("space_id", spaceId);
    const url = `https://api.coze.cn/v1/space/list_bot${params.toString() ? "?" + params.toString() : ""}`;
    const resp = await fetch(url, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const data = await resp.json() as Record<string, unknown>;
    if (data.code !== 0) {
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `获取智能体列表失败: ${data.msg}`);
    }
    return data.data as Record<string, unknown>;
  }

  // ───────── 语音通话 ─────────

  /** 创建 RTC 语音通话房间 */
  async createVoiceRoom(params: {
    botId: string;
    apiKey: string;
    voiceId?: string;
    prologue?: string;
  }) {
    const body: Record<string, unknown> = {
      bot_id: params.botId,
      config: {
        room_mode: "default",
        audio_config: { codec: "OPUS" },
        turn_detection: { type: "server_vad" },
      },
    };
    if (params.voiceId) body.voice_id = params.voiceId;
    if (params.prologue) (body.config as Record<string, unknown>).prologue_content = params.prologue;

    const resp = await fetch("https://api.coze.cn/v1/audio/rooms", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await resp.json() as Record<string, unknown>;
    if (data.code !== 0) {
      this.logger.error("创建语音房间失败", data);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `创建语音房间失败: ${data.msg}`);
    }
    return data.data as Record<string, unknown>;
  }

  /** 获取可用音色列表 */
  async listVoices(apiKey: string) {
    const resp = await fetch("https://api.coze.cn/v1/audio/voices", {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const data = await resp.json() as Record<string, unknown>;
    if (data.code !== 0) {
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `获取音色列表失败: ${data.msg}`);
    }
    return data.data as Record<string, unknown>;
  }

  // ───────── 工作流 ─────────

  /** 执行 Coze 工作流 */
  async runWorkflow(params: {
    workflowId: string;
    apiKey: string;
    parameters?: Record<string, unknown>;
  }) {
    const resp = await fetch("https://api.coze.cn/v1/workflow/run", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workflow_id: params.workflowId,
        parameters: params.parameters || {},
      }),
    });
    const data = await resp.json() as Record<string, unknown>;
    if (data.code !== 0) {
      this.logger.error("工作流执行失败", data);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `工作流执行失败: ${data.msg}`);
    }
    return {
      result: data.data,
      debugUrl: data.debug_url as string | undefined,
      usage: data.usage,
    };
  }

  // ───────── 文件上传 ─────────

  /** 上传文件到 Coze（用于多模态对话） */
  async uploadFile(file: Buffer, filename: string, apiKey: string) {
    const form = new FormData();
    form.append("file", new Blob([file]), filename);

    const resp = await fetch("https://api.coze.cn/v1/file/upload", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: form,
    });
    const data = await resp.json() as Record<string, unknown>;
    if (data.code !== 0) {
      this.logger.error("文件上传失败", data);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `文件上传失败: ${data.msg}`);
    }
    return data.data as Record<string, unknown>;
  }
}
