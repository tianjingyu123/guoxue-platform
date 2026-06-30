/**
 * 智能体对话数据层 —— 接真实后端 /bots（BotConfig + Coze 运行时）。
 *
 * 数据真实性约定（铁律）：
 * - 详情走 GET /bots/:id；对话走 POST /bots/:id/chat（返回真实 Coze 回复 content）。
 * - 智玄助手(zhixuan)/智能客服(cs) 是「按类型查到的具体智能体」：
 *   cs → GET /bots?type=CUSTOMER_SERVICE 取首个；zhixuan → GET /bots 取首个（默认主智能体）。
 * - welcome/quickPrompts/quickQuestions 为前端运营文案常量（非后端业务数据），保留。
 * - 推荐内容(课程/圈子/商品) 与「用户全部对话历史」后端无对应端点 → 返回空数组走空态。
 * - 失败直接 throw，让页面走 error 态，禁止 catch 返回假回复。
 */
import { apiGet, apiPost } from '@/utils/request'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  time: string
  isStreaming?: boolean
  recommendations?: RecommendItem[]
  /** AI 输出风险免责声明（后端下发，仅 assistant 消息有） */
  disclaimer?: string
  /** 软性导流推荐（征求同意后才展开卡片） */
  recommendation?: Recommendation
  /** 用户是否已同意查看推荐 */
  recoConsented?: boolean
}

export interface RecommendItem {
  type: 'course' | 'circle' | 'product' | 'paipan'
  // 推荐卡片载荷：course/circle/product/paipan 四类结构各异，页面按 type 动态渲染，保留 any
  data: any
}

/** 软性导流推荐（后端 bot.chat 下发） */
export interface Recommendation {
  /** 征求同意话术 */
  consentPrompt: string
  /** 推荐卡片（同意后展示） */
  items: RecommendItem[]
}

export interface AgentDetail {
  id: string
  name: string
  description: string
  tags: string[]
  /** 单次对话价格（后端 price），0 表示免费 */
  pricePerChat: number
  /** 每日免费次数（后端 dailyLimit） */
  freeQuota: number
  /** 每分钟通话价格：后端无对应字段 → 0（页面降级隐藏） */
  callPrice: number
  voiceEnabled: boolean
}

// 快捷提问（前端运营文案）
export const quickQuestions = [
  '帮我看看今年的运势如何？',
  '我的八字五行缺什么？',
  '分析一下我的事业运',
  '看看我的婚姻宫情况',
  '帮我解读一下命盘',
]

export function nowTime(): string {
  const d = new Date()
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

// 对话页初始欢迎语（前端运营文案，不绑定具体智能体名）
export const chatWelcome = `您好！我是您的国学智能助手，精通八字命理、紫微斗数、奇门遁甲等传统命理学。

我可以为您提供以下服务：
- 命盘排盘与解读
- 流年运势分析
- 婚姻事业预测
- 五行调理建议

请告诉我您的需求，我来为您详细分析。`

// ===== 智玄助手（main）运营文案 =====
export const zhixuanWelcome = `您好！我是智玄 AI 助手，精通八字命理、奇门遁甲、紫微斗数等传统命理学。

您可以向我提问：
- 八字分析与五行解读
- 流年运势与注意事项
- 婚姻、事业、财运预测
- 风水布局与趋吉避凶

请告诉我您的需求，我将竭诚为您服务。`

export const zhixuanQuickPrompts = ['帮我分析今年运势', '我的八字五行缺什么', '解读事业宫位走势', '分析近期财运方向']

// ===== 智能客服（customer-service）运营文案 =====
export const csWelcome = `您好，欢迎联系智玄客服！

我可以帮您解决：
• 账号注册与登录问题
• 课程购买与退款申请
• VIP 会员开通与续费
• 内容投诉与举报
• 其他使用问题

请描述您的问题，我们将尽快为您解答。`

export const csQuick = ['课程退款', 'VIP开通', '账号问题', '内容举报', '联系人工客服']

// ===== 对话历史（history）=====
export interface HistoryItem {
  id: number
  /** 智能体 BotConfig id（跳转加载用） */
  botConfigId: string
  /** Coze 会话 id（续聊用） */
  conversationId: string
  agentName: string
  agentAvatar: string
  agentType: string
  lastMessage: string
  time: string
  timeGroup: string
  unread: number
  isFree: boolean
}

export const historyGroups = ['今天', '昨天', '本周', '更早']

/** 会话时间分组 */
function timeGroupOf(iso?: string): string {
  if (!iso) return '更早'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '更早'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = d.getTime()
  if (t >= today) return '今天'
  if (t >= today - 86400000) return '昨天'
  if (t >= today - 6 * 86400000) return '本周'
  return '更早'
}

/** 消息时刻短格式：时:分（用于回填历史消息时间） */
function clockOf(iso?: string | Date): string {
  const d = iso ? new Date(iso) : new Date()
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

/** 会话时间短格式：当天显示时:分，否则月-日 */
function shortTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

// ============ API 层 ============

/* —— 后端原始响应类型（容错适配用，字段全 optional，仅声明 adapter 访问到的） —— */
interface RawBot { id?: string | number; name?: string; intro?: string; type?: string; price?: number | string; dailyLimit?: number | string; voiceEnabled?: boolean }
interface RawChatResp { content?: string; conversationId?: string; disclaimer?: string; recommendation?: Recommendation }
interface RawChatHistoryMsg { role?: string; content?: string; time?: string }
interface RawConversation { botConfigId?: string; conversationId?: string; botName?: string; botAvatar?: string; botType?: string; lastMessage?: string; lastQuery?: string; lastTime?: string; messageCount?: number }

/** 兼容数组 / 分页信封返回 */
function unwrap<T = Record<string, unknown>>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  const o = res as { rows?: T[]; items?: T[] } | null
  return o?.rows ?? o?.items ?? []
}

/** 按类型解析具体智能体 id（取该类型/全部中的首个） */
async function resolveBotId(type?: string): Promise<string> {
  const res = await apiGet<unknown>(`/bots${type ? `?type=${encodeURIComponent(type)}` : ''}`)
  const arr = unwrap<RawBot>(res)
  if (!arr.length) {
    throw new Error(type === 'CUSTOMER_SERVICE' ? '暂无可用客服智能体' : '暂无可用智能体')
  }
  return String(arr[0].id)
}

// 会话上下文（保持多轮对话的 conversationId）
let _zhixuanBotId = ''
let _zhixuanConv = ''
let _csBotId = ''
let _csConv = ''
const _agentConv: Record<string, string> = {}

export const agentApi = {
  /** 智能体详情 —— GET /bots/:id */
  async getDetail(id: string): Promise<AgentDetail> {
    const b = await apiGet<RawBot>(`/bots/${id}`)
    return {
      id: String(b.id),
      name: b.name || '智能体',
      description: b.intro || '',
      tags: [],
      pricePerChat: b.price != null ? Number(b.price) : 0,
      freeQuota: b.dailyLimit != null ? Number(b.dailyLimit) : 0,
      callPrice: 0,
      voiceEnabled: !!b.voiceEnabled,
    }
  },

  /** 快捷提问（前端运营文案） */
  async getQuickQuestions(): Promise<string[]> {
    return quickQuestions
  },

  /** 发送消息 —— POST /bots/:id/chat（真实 Coze 回复，附风险免责声明） */
  async sendMessage(agentId: string, content: string): Promise<{ text: string; disclaimer?: string; recommendation?: Recommendation }> {
    const res = await apiPost<RawChatResp>(`/bots/${agentId}/chat`, {
      query: content,
      conversationId: _agentConv[agentId] || undefined,
    })
    if (res?.conversationId) _agentConv[agentId] = res.conversationId
    return { text: res?.content || '', disclaimer: res?.disclaimer, recommendation: res?.recommendation || undefined }
  },

  /** 设定某智能体的续聊会话 id（从历史进入时调用） */
  setConversation(agentId: string, conversationId: string) {
    if (conversationId) _agentConv[agentId] = conversationId
  },

  /** 清除某智能体的会话上下文（下一条消息将开启全新 Coze 会话） */
  clearConversation(agentId: string) {
    delete _agentConv[agentId]
  },

  /** 拉取某会话的历史消息 —— GET /bots/:id/chat-history/:conversationId（续聊回填） */
  async getChatHistory(agentId: string, conversationId: string): Promise<ChatMessage[]> {
    const res = await apiGet<RawChatHistoryMsg[]>(`/bots/${agentId}/chat-history/${encodeURIComponent(conversationId)}`)
    const arr = Array.isArray(res) ? res : []
    return arr.map((m: RawChatHistoryMsg, i: number) => ({
      id: i,
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content || '',
      time: clockOf(m.time),
    }))
  },

  /** 智玄助手欢迎语（前端运营文案） */
  async getZhixuanWelcome(): Promise<{ welcome: string; quickPrompts: string[] }> {
    return { welcome: zhixuanWelcome, quickPrompts: zhixuanQuickPrompts }
  },

  /** 智玄助手对话 —— 解析默认主智能体后 POST /bots/:id/chat */
  async sendZhixuanMessage(content: string): Promise<string> {
    if (!_zhixuanBotId) _zhixuanBotId = await resolveBotId()
    const res = await apiPost<RawChatResp>(`/bots/${_zhixuanBotId}/chat`, {
      query: content,
      conversationId: _zhixuanConv || undefined,
    })
    if (res?.conversationId) _zhixuanConv = res.conversationId
    return res?.content || ''
  },

  /** 客服欢迎语（前端运营文案） */
  async getCsWelcome(): Promise<{ welcome: string; quick: string[] }> {
    return { welcome: csWelcome, quick: csQuick }
  },

  /** 客服对话 —— 解析 CUSTOMER_SERVICE 类型智能体后 POST /bots/:id/chat */
  async sendCsMessage(content: string): Promise<string> {
    if (!_csBotId) _csBotId = await resolveBotId('CUSTOMER_SERVICE')
    const res = await apiPost<RawChatResp>(`/bots/${_csBotId}/chat`, {
      query: content,
      conversationId: _csConv || undefined,
    })
    if (res?.conversationId) _csConv = res.conversationId
    return res?.content || ''
  },

  /** 对话历史 —— GET /bots/my-conversations（按 conversationId 聚合的我的会话） */
  async getHistory(): Promise<HistoryItem[]> {
    const res = await apiGet<unknown>('/bots/my-conversations')
    return unwrap<RawConversation>(res).map((c: RawConversation, i: number) => ({
      id: i + 1,
      botConfigId: String(c.botConfigId),
      conversationId: String(c.conversationId),
      agentName: c.botName || '智能体',
      agentAvatar: c.botAvatar || '',
      agentType: c.botType || '',
      lastMessage: c.lastMessage || c.lastQuery || '',
      time: shortTime(c.lastTime),
      timeGroup: timeGroupOf(c.lastTime),
      unread: 0,
      isFree: true,
    }))
  },

  /** 推荐内容 —— 后端无对应端点，返回空走空态 */
  async getRecommendations(): Promise<{ courses: unknown[]; circles: unknown[]; products: unknown[] }> {
    return { courses: [], circles: [], products: [] }
  },
}
