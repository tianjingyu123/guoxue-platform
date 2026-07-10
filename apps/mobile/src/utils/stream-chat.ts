/**
 * AI 流式对话消费工具（SSE over fetch）
 *
 * 为什么不用 uni.request：uni.request 不支持读取响应流（只能整包返回），
 * 所以 H5 端用原生 fetch + ReadableStream + TextDecoder 逐块解析 SSE；
 * 非 H5 端（小程序/App）不支持 fetch 流 → streamChatSupported() 返回 false，
 * 调用方降级走原有非流式接口（一次性返回后前端做打字机动效）。
 *
 * 服务端 SSE 事件契约（apps/server ai-gateway/stream-unifier.service.ts）：
 *   data: {"type":"chunk","content":"文本增量"}
 *   data: {"type":"card","cardType":"bazi-card","payload":{...}}   ← 富消息结构化卡片
 *   data: {"type":"meta","conversationId":"...","disclaimer":"..."}
 *   data: {"type":"done"} / {"type":"error","message":"..."}
 */
import { getToken } from './storage'
import { refreshAccessToken } from './request'

const BASE_URL = (import.meta as any).env?.VITE_API_URL || ''
const PREFIX = '/api/v1'

/** 富消息卡片事件 */
export interface StreamCardEvent {
  cardType: string
  payload: unknown
}

/** 流末元信息（会话续聊 id / 免责声明 / 软性导流推荐） */
export interface StreamMetaEvent {
  conversationId?: string
  disclaimer?: string
  recommendation?: unknown
}

export interface StreamChatHandlers {
  /** 文本增量（逐块回调，调用方负责追加渲染） */
  onChunk: (text: string) => void
  /** 结构化卡片（如八字盘面卡） */
  onCard?: (card: StreamCardEvent) => void
  /** 流末元信息 */
  onMeta?: (meta: StreamMetaEvent) => void
}

/** 当前端是否支持流式消费（H5 且宿主支持 fetch 流） */
export function streamChatSupported(): boolean {
  // #ifdef H5
  return (
    typeof fetch === 'function' &&
    typeof TextDecoder === 'function' &&
    typeof ReadableStream === 'function'
  )
  // #endif
  // #ifndef H5
  return false
  // #endif
}

/**
 * 发起流式对话（POST SSE）。resolve 表示流正常走完（done），
 * 服务端/网络错误以 reject 抛出，调用方按需展示错误态。
 * 401 时自动走 refreshToken 无感续期并重试一次（复用 request.ts 的并发去重锁）。
 */
export async function streamChat(
  path: string,
  body: unknown,
  handlers: StreamChatHandlers,
  _retried = false,
): Promise<void> {
  // #ifdef H5
  const token = getToken()
  const resp = await fetch(`${BASE_URL}${PREFIX}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  })

  // 401：access token 过期 → 无感续期后重试一次
  if (resp.status === 401 && !_retried) {
    const ok = await refreshAccessToken()
    if (ok) return streamChat(path, body, handlers, true)
    throw new Error('未登录或登录已过期')
  }

  if (!resp.ok) {
    // 门控/限流等错误：后端在 SSE 头之前以普通 JSON 返回（如额度耗尽引导开会员）
    let msg = `请求失败(${resp.status})`
    try {
      const j = (await resp.json()) as { message?: string }
      if (j?.message) msg = j.message
    } catch { /* 非 JSON 响应，用默认错误文案 */ }
    throw new Error(msg)
  }

  const reader = resp.body?.getReader()
  if (!reader) throw new Error('当前浏览器不支持流式响应')

  const decoder = new TextDecoder()
  let buffer = ''
  let serverError = ''

  const handleLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return
    const jsonStr = trimmed.slice(5).trim()
    if (!jsonStr) return
    let ev: { type?: string; content?: string; cardType?: string; payload?: unknown; message?: string; conversationId?: string; disclaimer?: string; recommendation?: unknown }
    try {
      ev = JSON.parse(jsonStr)
    } catch {
      return // 非 JSON 行忽略
    }
    switch (ev.type) {
      case 'chunk':
        if (ev.content) handlers.onChunk(ev.content)
        break
      case 'card':
        // 富消息：未注册的 cardType 由渲染层降级为文本（rich-message.vue 向前兼容）
        if (ev.cardType) handlers.onCard?.({ cardType: ev.cardType, payload: ev.payload })
        break
      case 'meta':
        handlers.onMeta?.({ conversationId: ev.conversationId, disclaimer: ev.disclaimer, recommendation: ev.recommendation })
        break
      case 'error':
        serverError = ev.message || 'AI 服务异常'
        break
      // 'done' / 'source' 等其余事件当前无需处理
    }
  }

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) handleLine(line)
    }
    if (buffer) handleLine(buffer)
  } finally {
    reader.releaseLock()
  }

  if (serverError) throw new Error(serverError)
  // #endif
  // #ifndef H5
  throw new Error('当前端不支持流式对话')
  // #endif
}
