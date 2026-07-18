import { Injectable, Logger, Optional } from "@nestjs/common";
import { Observable } from "rxjs";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { SystemService } from "../system/system.service";
import { CozeOAuthService } from "./coze-oauth.service";

/** Coze 流式结构化事件（chatStreamEx 输出） */
export interface CozeStreamEvent {
  type: "chunk" | "meta";
  /** type=chunk：回答文本增量 */
  content?: string;
  /** type=meta：会话 id（前端续聊用） */
  conversationId?: string;
  /** type=meta：本次 chat id（审计用） */
  chatId?: string;
}

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

  constructor(
    // SystemModule 为 @Global 导出·@Optional 保证单测缺 provider 时回退默认品牌名
    @Optional() private readonly systemService?: SystemService,
    // @Optional：配了 OAuth 则所有 Coze 调用统一用自动刷新的 OAuth 令牌；未配/单测缺 provider 时回退传入的 PAT
    @Optional() private readonly oauth?: CozeOAuthService,
  ) {}

  /** 品牌名（后台 BrandConfig 可配·拉取失败/未注入时兜底"热卜国学"，与历史口径一致） */
  private async getBrandName(): Promise<string> {
    try {
      const cfg = await this.systemService?.getBrandConfig();
      return (cfg as { siteName?: string } | undefined)?.siteName || "热卜国学";
    } catch {
      return "热卜国学";
    }
  }

  /**
   * 解析实际使用的令牌：配置了 Coze OAuth 则用自动签名/刷新的 access_token；
   * 未配置或换取失败则回退传入的 PAT（过渡不断服务）。所有对 Coze 的调用统一经此。
   */
  private async resolveApiKey(fallback: string): Promise<string> {
    if (this.oauth?.isConfigured()) {
      const token = await this.oauth.getAccessToken();
      if (token) return token;
    }
    return fallback;
  }

  /** 是否已配置 Coze OAuth（供调用方在缺 PAT 时放行守卫） */
  isOAuthConfigured(): boolean {
    return this.oauth?.isConfigured() ?? false;
  }

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
    // 历史消息在前，当前提问必须作为最后一条 user 消息追加——
    // 否则 Coze 创建的 chat 没有新用户消息，永远不会产生回答，轮询必超时
    const body: Record<string, unknown> = {
      bot_id: params.botId,
      user_id: params.userId,
      additional_messages: [
        ...(params.chatHistory?.map((m) => ({
          role: m.role,
          content: m.content,
          content_type: "text",
        })) || []),
        { role: "user", content: params.query, content_type: "text" },
      ],
      auto_save_history: true,
    };

    if (params.conversationId) {
      body.conversation_id = params.conversationId;
    }
    if (params.additionalParams) {
      body.additional_params = params.additionalParams;
    }

    const apiKey = await this.resolveApiKey(params.apiKey);

    // 先发送用户消息创建chat
    const createResp = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000), // 防 COZE 无响应挂死请求线程
    });

    const createData = await createResp.json() as Record<string, unknown>;
    if (createData.code !== 0) {
      this.logger.error("COZE创建对话失败", createData);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `COZE对话失败: ${createData.msg}`);
    }

    const createDataBody = createData.data as Record<string, unknown>;
    const chatId = createDataBody.id as string;
    const conversationId = createDataBody.conversation_id as string;

    // 轮询获取对话结果（复用已解析的令牌，避免二次换取）
    return this.pollChatResult(chatId, conversationId, apiKey);
  }

  /** 发起对话（流式·仅文本增量），返回SSE Observable —— 兼容旧调用方 */
  chatStream(params: {
    botId: string;
    apiKey: string;
    userId: string;
    query: string;
    conversationId?: string;
    additionalParams?: Record<string, unknown>;
  }): Observable<string> {
    return new Observable((subscriber) => {
      const sub = this.chatStreamEx(params).subscribe({
        next: (ev) => {
          if (ev.type === "chunk" && ev.content) subscriber.next(ev.content);
        },
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });
      return () => sub.unsubscribe();
    });
  }

  /**
   * 发起对话（流式·结构化事件）：
   * - {type:"chunk", content} —— 回答文本增量（只取 conversation.message.delta 的 answer，
   *   修复旧实现 data.content 与 type==="answer" 双条件重复发送、completed 全文重放的问题）
   * - {type:"meta", conversationId, chatId} —— 会话建立即下发，供前端续聊
   */
  chatStreamEx(params: {
    botId: string;
    apiKey: string;
    userId: string;
    query: string;
    conversationId?: string;
    additionalParams?: Record<string, unknown>;
  }): Observable<CozeStreamEvent> {
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
          const apiKey = await this.resolveApiKey(params.apiKey);
          const resp = await fetch(`${this.baseUrl}/chat`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            // 流式回答整体可能超 10s，用较宽裕超时仅防"永不响应"挂死，避免截断正常长回答
            signal: AbortSignal.timeout(120000),
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
          // Coze v3 SSE：event: 行标识事件类型，紧随的 data: 行携带载荷
          let currentEvent = "";
          let metaSent = false;

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("event:")) {
                currentEvent = line.slice(6).trim();
                if (currentEvent === "done") {
                  subscriber.complete();
                  return;
                }
                continue;
              }
              if (!line.startsWith("data:")) continue;
              const jsonStr = line.slice(5).trim();
              if (jsonStr === "[DONE]" || jsonStr === '"[DONE]"') {
                subscriber.complete();
                return;
              }
              try {
                const data = JSON.parse(jsonStr) as Record<string, unknown>;
                // 会话元信息：chat 创建即下发 conversation_id 供前端续聊
                if (!metaSent && data.conversation_id) {
                  metaSent = true;
                  subscriber.next({
                    type: "meta",
                    conversationId: String(data.conversation_id),
                    chatId: data.id ? String(data.id) : undefined,
                  });
                }
                if (currentEvent === "conversation.chat.failed") {
                  const lastError = data.last_error as Record<string, unknown> | undefined;
                  subscriber.error(new Error(`COZE对话失败: ${lastError?.msg || "unknown"}`));
                  return;
                }
                // 文本增量：宽容接收带 content 的载荷，但排除全文重放/状态类事件
                // （completed 是整段全文重放，取了会与 delta 增量重复；同时修复旧实现
                //   data.content 与 type===answer 双条件各发一次导致的逐块双发）
                const isReplayEvent =
                  currentEvent === "conversation.message.completed" ||
                  currentEvent === "conversation.chat.completed" ||
                  currentEvent === "conversation.chat.created" ||
                  currentEvent === "conversation.chat.in_progress";
                const typeOk = data.type === undefined || data.type === "answer";
                const ctypeOk = data.content_type === undefined || data.content_type === "text";
                if (!isReplayEvent && typeOk && ctypeOk && typeof data.content === "string" && data.content) {
                  subscriber.next({ type: "chunk", content: data.content });
                }
              } catch (err) {
                this.logger.warn(`Coze 响应行 JSON 解析失败`, err);
                // 非JSON行，忽略
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
          signal: AbortSignal.timeout(10000), // 防 COZE 轮询无响应挂死请求线程
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
    apiKey = await this.resolveApiKey(apiKey);
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
    apiKey = await this.resolveApiKey(apiKey);
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
    apiKey = await this.resolveApiKey(apiKey);
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
    apiKey = await this.resolveApiKey(apiKey);
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
    apiKey = await this.resolveApiKey(apiKey);
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

  /**
   * 在 Coze 平台创建智能体 + 自动发布（完整能力版）
   *
   * 支持 Coze REST API v1 全部字段：
   *   prompt_info          — 人设提示词（支持模板变量）
   *   model_info_config    — 大模型选择（如 deepseek-r1-0528）
   *   plugin_id_list       — 绑定的插件ID列表
   *   workflow_id_list     — 绑定的工作流ID列表
   *   onboarding_info      — 开场白配置（prologue + suggested_questions）
   *   voice_id             — 语音音色ID
   */
  async createBot(params: {
    apiKey: string;
    name: string;
    description?: string;
    prompt?: string;
    spaceId?: string;
    /** 大模型配置 { model: "deepseek-r1-0528", temperature: 0.7, maxTokens: 4096 } */
    modelConfig?: Record<string, unknown>;
    /** 插件ID列表，如 ["plugin_abc", "plugin_xyz"] */
    pluginIds?: string[];
    /** 工作流ID列表 */
    workflowIds?: string[];
    /** 开场白 { prologue: "你好！", suggestedQuestions: ["什么是八字？"] } */
    onboarding?: Record<string, unknown>;
    /** 语音音色ID */
    voiceId?: string;
  }) {
    const body: Record<string, unknown> = {
      name: params.name,
      description: params.description || "",
      prompt_info: params.prompt || `你是${await this.getBrandName()}平台的${params.name}，请根据用户需求提供专业服务。`,
    };

    if (params.spaceId)               body.space_id = params.spaceId;
    if (params.modelConfig)           body.model_info_config = params.modelConfig;
    if (params.pluginIds?.length)     body.plugin_id_list = params.pluginIds;
    if (params.workflowIds?.length)   body.workflow_id_list = params.workflowIds;
    if (params.onboarding)            body.onboarding_info = params.onboarding;
    if (params.voiceId)               body.voice_id = params.voiceId;

    const apiKey = await this.resolveApiKey(params.apiKey);
    const resp = await fetch("https://api.coze.cn/v1/bot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    const data = await resp.json() as Record<string, unknown>;
    if (data.code !== 0) {
      this.logger.error("Coze 创建智能体失败", data);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `创建智能体失败: ${data.msg}`);
    }
    const botData = data.data as Record<string, unknown>;
    // 创建后自动发布
    try {
      await fetch("https://api.coze.cn/v1/bot/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ bot_id: botData.bot_id, connector_ids: [1024] }),
      });
    } catch { /* 发布失败不影响创建 */ }
    return botData;
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

    const apiKey = await this.resolveApiKey(params.apiKey);
    const resp = await fetch("https://api.coze.cn/v1/audio/rooms", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
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
    apiKey = await this.resolveApiKey(apiKey);
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
    const apiKey = await this.resolveApiKey(params.apiKey);
    const resp = await fetch("https://api.coze.cn/v1/workflow/run", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
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
    apiKey = await this.resolveApiKey(apiKey);
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
