/**
 * 圈主助理数据层 — 对接后端 RAG 对话接口
 * 后端: POST /circles/:circleId/assistant/ask（非流式，含双层联邦知识库检索）
 * 平台自建对话机器人，区别于智能体广场(Coze)。
 */
import { apiPost } from '@/utils/request'

export interface AssistantSource {
  id: string
  content: string
  similarity: number
}

export interface AssistantReply {
  answer: string
  sources: AssistantSource[]
}

export type AssistantHistory = Array<{ role: 'system' | 'user' | 'assistant'; content: string }>

export const assistantApi = {
  /** 向圈主助理提问（非流式） */
  ask: async (circleId: string, question: string, history?: AssistantHistory): Promise<AssistantReply> => {
    return apiPost<AssistantReply>(`/circles/${circleId}/assistant/ask`, { question, history })
  },
}
