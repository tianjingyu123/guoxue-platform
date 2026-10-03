import { apiDelete, apiGet, apiPost } from "@/utils/request";

/** 站长助理会话在各端共用的固定本地索引。消息正文以服务端会话为准。 */
export const STATION_ASSISTANT_CONVERSATION_KEY = "station_assistant_conversation_id";

export interface ActionSuggestion {
  title: string;
  description?: string;
  link?: string;
  priority: "high" | "medium" | "low";
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  disclaimer?: string;
  actions?: ActionSuggestion[];
  isStreaming?: boolean;
  isError?: boolean;
  errorMessage?: string;
  failedQuery?: string;
}

export interface AssistantSuggestion {
  id: string;
  text: string;
  category: "data" | "operation" | "promotion" | "team";
}

export interface StationAssistantConfig {
  name: string;
  welcomeMessage: string;
  suggestions: AssistantSuggestion[];
  capabilities: string[];
}

export interface AssistantChatResponse {
  content: string;
  conversationId: string;
  disclaimer?: string;
}

export interface AssistantSessionMessage {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  incomplete?: boolean;
}

export interface AssistantSession {
  conversationId: string;
  messages: AssistantSessionMessage[];
  disclaimer?: string;
}

/** 仅负责页面引导的静态配置；回答和历史均来自真实后端。 */
export const assistantConfig: StationAssistantConfig = {
  name: "站长助理",
  welcomeMessage:
    "您好，我是您的专属站长运营助理。您可以直接询问分站经营、渠道推广、客户维护和结算提醒，我会结合当前问题给出可执行的建议。",
  suggestions: [
    { id: "1", text: "分析我本周的经营情况", category: "data" },
    { id: "2", text: "我该先处理哪些经营事项？", category: "operation" },
    { id: "3", text: "如何提升分站客户复购？", category: "operation" },
    { id: "4", text: "帮我设计一套推广策略", category: "promotion" },
    { id: "5", text: "哪个推广渠道表现更好？", category: "promotion" },
    { id: "6", text: "解读本月收益变化", category: "data" },
  ],
  capabilities: ["经营概览", "收益趋势", "推广渠道", "沉默客户", "结算提醒"],
};

export const stationAssistantApi = {
  async getConfig(): Promise<StationAssistantConfig> {
    return assistantConfig;
  },

  sendMessage(query: string, conversationId?: string): Promise<AssistantChatResponse> {
    return apiPost<AssistantChatResponse>("/station/assistant/chat", {
      query,
      ...(conversationId ? { conversationId } : {}),
    });
  },

  getSession(conversationId: string): Promise<AssistantSession> {
    return apiGet<AssistantSession>(
      `/station/assistant/session?conversationId=${encodeURIComponent(conversationId)}`,
    );
  },

  clearSession(conversationId: string): Promise<unknown> {
    return apiDelete<unknown>(
      `/station/assistant/session?conversationId=${encodeURIComponent(conversationId)}`,
    );
  },
};
