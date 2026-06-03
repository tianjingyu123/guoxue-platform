import type { ChatMessage, SseChunk } from './types'

/** 解析 SSE 文本行，返回 JSON 对象或 null */
function parseSseLine(line: string): SseChunk | null {
  if (!line.startsWith('data: ')) return null
  const json = line.slice(6).trim()
  if (json === '[DONE]') return { type: 'done' }
  try {
    return JSON.parse(json) as SseChunk
  } catch {
    return null
  }
}

/** 生成唯一 ID */
let _id = 0
function uid(): string { return `msg-${Date.now()}-${++_id}` }

export interface StreamCallbacks {
  onChunk: (text: string) => void
  onSource: (source: { index: number; title: string; excerpt: string }) => void
  onDone: (usage?: { promptTokens?: number; completionTokens?: number }) => void
  onError: (message: string) => void
}

/** POST 请求 + SSE 流式读取 */
export async function chatStream(
  endpoint: string,
  body: Record<string, unknown>,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem('token') || ''
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let msg = `HTTP ${response.status}`
    try {
      const j = JSON.parse(text)
      msg = j.message || j.error || msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('不支持流式响应')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // 最后一行可能不完整，保留到下次处理
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const chunk = parseSseLine(trimmed)
        if (!chunk) continue

        switch (chunk.type) {
          case 'chunk':
            if (chunk.content) callbacks.onChunk(chunk.content)
            break
          case 'source':
            callbacks.onSource({
              index: chunk.index ?? 0,
              title: chunk.title ?? '',
              excerpt: chunk.excerpt ?? '',
            })
            break
          case 'done':
            callbacks.onDone(chunk.usage)
            return
          case 'error':
            callbacks.onError(chunk.message ?? '未知错误')
            return
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}

/** 非流式 fallback */
export async function chatNonStream(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<{ content: string; sources?: any[]; usage?: any }> {
  const token = localStorage.getItem('token') || ''
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let msg = `HTTP ${response.status}`
    try {
      const j = JSON.parse(text)
      msg = j.message || j.error || msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }

  const data = await response.json()
  // 兼容多种后端响应格式
  const unwrapped = data?.data ?? data
  return {
    content: unwrapped?.content ?? unwrapped?.reply ?? unwrapped?.answer ?? JSON.stringify(unwrapped),
    sources: unwrapped?.sources,
    usage: unwrapped?.usage,
  }
}

/** 创建助手消息占位 */
export function createAssistantMsg(): ChatMessage {
  return {
    id: uid(),
    role: 'assistant',
    content: '',
    sources: [],
    isStreaming: true,
    createdAt: new Date(),
  }
}

/** 创建用户消息 */
export function createUserMsg(text: string): ChatMessage {
  return {
    id: uid(),
    role: 'user',
    content: text,
    createdAt: new Date(),
  }
}
