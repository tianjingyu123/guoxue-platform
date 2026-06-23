// 智能体/AI Bot 相关类型定义
// 数据来源: Coze API

// Bot 场景分类（一级）
export type BotScene = 'paipan' | 'content' | 'learning' | 'life' | 'all'

// Bot 分类（二级）
export type BotCategory = 'all' | 'bazi' | 'fengshui' | 'health' | 'divination' | 'naming' | 'dream' | 'face' | 'palm' | 'qimen' | 'ziwei' | 'liuyao' | 'other'

// 场景信息
export interface BotSceneInfo {
  id: BotScene
  name: string
  description: string
  icon: string
  color: string
  bgGradient: string
}

// Bot 分类信息
export interface BotCategoryInfo {
  id: BotCategory
  name: string
  icon: string
}

// Bot 基础信息
export interface BotItem {
  id: number | string  // Coze bot_id
  name: string
  avatar: string
  description: string
  scene: BotScene      // 场景分类
  category: BotCategory
  categoryName: string
  // 热度/使用量
  hotScore: number
  useCount: number
  // 评分
  rating: number
  ratingCount: number
  // 创建者
  creator?: {
    id: number
    name: string
    avatar: string
    verified: boolean
  }
  // 标签
  tags: string[]
  // 是否官方
  isOfficial: boolean
  // 是否推荐
  isRecommended: boolean
  // 是否新上
  isNew: boolean
  // 是否免费
  isFree: boolean
  // 价格（如果收费）
  price?: number
  // 能力标签（如：语音对话、图片识别、文件解析）
  capabilities?: string[]
  // 推荐内容关联（课程/圈子/商品ID）
  relatedContent?: {
    courses?: string[]
    circles?: string[]
    products?: string[]
  }
  // Coze API相关
  cozeId?: string
  cozeBotVersion?: string
}

// Bot 排行项
export interface BotRankingItem extends BotItem {
  rank: number
  rankChange: number  // 排名变化，正数上升，负数下降
}

// Feed 卡片类型
export type FeedCardType = 'bot_recommend' | 'hot_topic' | 'user_story' | 'official_notice'

// AI 推荐 Feed 卡片
export interface BotFeedCard {
  id: number
  type: FeedCardType
  title: string
  description: string
  image?: string
  // Bot 推荐卡片
  bot?: BotItem
  // 热门话题卡片
  topic?: {
    name: string
    discussCount: number
  }
  // 用户故事
  story?: {
    user: { name: string; avatar: string }
    content: string
    botName: string
  }
  // 点击跳转
  link: string
}

// Bot 列表响应
export interface BotListResponse {
  list: BotItem[]
  total: number
  hasMore: boolean
}

// Bot 排行响应
export interface BotRankingResponse {
  list: BotRankingItem[]
  updateTime: string
}

// Bot 广场数据
export interface BotMarketplaceData {
  categories: BotCategoryInfo[]
  banners: Array<{
    id: number
    image: string
    link: string
  }>
  hotBots: BotItem[]
  newBots: BotItem[]
  feedCards: BotFeedCard[]
}

// ========== 对话相关 ==========

// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system'

// 消息类型
export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'card'

// 聊天消息
export interface ChatMessage {
  id: string
  role: MessageRole
  type: MessageType
  content: string
  // 附件（图片/文件）
  attachment?: {
    url: string
    name: string
    size?: number
    mimeType?: string
  }
  // 语音消息
  voice?: {
    url: string
    duration: number  // 秒
    transcript?: string  // ASR 转写文本
  }
  // 卡片消息（推荐问题等）
  card?: {
    type: 'suggestions' | 'result' | 'action'
    data: Record<string, unknown>
  }
  createdAt: string
  // 是否正在生成
  isStreaming?: boolean
}

// Bot 详情（对话页用）
export interface BotDetail extends BotItem {
  // 欢迎语
  welcomeMessage: string
  // 推荐问题
  suggestions: string[]
  // 能力说明
  capabilities: string[]
  // 使用限制
  limits?: {
    dailyFreeCount: number
    usedCount: number
  }
  // 语音对话支持
  voiceEnabled: boolean
  // 文件上传支持
  fileEnabled: boolean
}

// 对话会话
export interface ChatSession {
  id: string
  botId: number
  botName: string
  botAvatar: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

// 历史会话列表项
export interface ChatSessionItem {
  id: string
  botId: number
  botName: string
  botAvatar: string
  lastMessage: string
  updatedAt: string
  messageCount: number
}

// 流式响应回调
export interface StreamCallbacks {
  onStart?: () => void
  onToken?: (token: string) => void
  onComplete?: (fullText: string) => void
  onError?: (error: Error) => void
}
