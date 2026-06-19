// IM 会话相关 API
import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  ConversationItem, 
  ConversationsResponse, 
  FriendItem, 
  FriendsResponse,
  FriendGroup,
  ConversationSearchResult,
  ChatTarget,
  ChatMessage,
  ChatHistoryResponse,
  SendMessageRequest,
  SendMessageResponse,
  ProductCard,
  FriendRequestItem,
  FriendRequestsResponse,
  GroupItem,
  GroupListResponse,
  GroupDetail,
  GroupMember,
  GroupChatMessage,
  GroupChatHistoryResponse,
  SendGroupMessageRequest,
  GroupSettings,
  GroupPermissions
} from '../types/im'

// ========== Mock 数据 ==========

const mockConversations: ConversationItem[] = [
  {
    id: 'conv_1',
    type: 'private',
    targetId: 101,
    targetName: '张明德',
    targetAvatar: '/placeholder.svg?height=48&width=48',
    lastMessage: {
      type: 'text',
      content: '好的，那我们明天下午3点见面详谈',
      senderId: 101,
      time: '10:30',
    },
    unreadCount: 3,
    isPinned: true,
    isMuted: false,
    updatedAt: '2026-06-03T10:30:00',
  },
  {
    id: 'conv_2',
    type: 'group',
    targetId: 201,
    targetName: '国学研习群',
    targetAvatar: '/placeholder.svg?height=48&width=48',
    memberCount: 128,
    lastMessage: {
      type: 'text',
      content: '今天的八字讲座非常精彩',
      senderId: 102,
      senderName: '李老师',
      time: '09:45',
    },
    unreadCount: 12,
    isPinned: true,
    isMuted: false,
    updatedAt: '2026-06-03T09:45:00',
  },
  {
    id: 'conv_3',
    type: 'service',
    targetId: 0,
    targetName: '智能客服',
    targetAvatar: '/placeholder.svg?height=48&width=48',
    lastMessage: {
      type: 'text',
      content: '您好，有什么可以帮助您的？',
      senderId: 0,
      time: '昨天',
    },
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    updatedAt: '2026-06-02T18:00:00',
  },
  {
    id: 'conv_4',
    type: 'private',
    targetId: 103,
    targetName: '王老师',
    targetAvatar: '/placeholder.svg?height=48&width=48',
    lastMessage: {
      type: 'image',
      content: '[图片]',
      senderId: 103,
      time: '昨天',
    },
    unreadCount: 0,
    isPinned: false,
    isMuted: true,
    updatedAt: '2026-06-02T15:30:00',
  },
  {
    id: 'conv_5',
    type: 'system',
    targetId: 0,
    targetName: '系统通知',
    targetAvatar: '/placeholder.svg?height=48&width=48',
    lastMessage: {
      type: 'system',
      content: '您购买的课程《八字入门》已开放学习',
      senderId: 0,
      time: '前天',
    },
    unreadCount: 1,
    isPinned: false,
    isMuted: false,
    updatedAt: '2026-06-01T12:00:00',
  },
  {
    id: 'conv_6',
    type: 'private',
    targetId: 104,
    targetName: '赵师兄',
    targetAvatar: '/placeholder.svg?height=48&width=48',
    lastMessage: {
      type: 'voice',
      content: '[语音消息] 0:15',
      senderId: 104,
      time: '周一',
    },
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    draft: '关于上次讨论的问题...',
    updatedAt: '2026-06-01T10:00:00',
  },
  {
    id: 'conv_7',
    type: 'group',
    targetId: 202,
    targetName: '风水学习交流',
    targetAvatar: '/placeholder.svg?height=48&width=48',
    memberCount: 56,
    lastMessage: {
      type: 'text',
      content: '请问这个户型怎么看？',
      senderId: 105,
      senderName: '新人小白',
      time: '周日',
    },
    unreadCount: 0,
    isPinned: false,
    isMuted: true,
    updatedAt: '2026-05-31T20:00:00',
  },
]

const mockFriends: FriendItem[] = [
  { id: 101, nickname: '张明德', avatar: '/placeholder.svg', remark: '八字师傅', isOnline: true },
  { id: 102, nickname: '李老师', avatar: '/placeholder.svg', signature: '专注风水20年', isOnline: true },
  { id: 103, nickname: '王老师', avatar: '/placeholder.svg', isOnline: false, lastActiveAt: '2小时前' },
  { id: 104, nickname: '赵师兄', avatar: '/placeholder.svg', isOnline: false, lastActiveAt: '昨天' },
  { id: 105, nickname: '刘师妹', avatar: '/placeholder.svg', isOnline: true },
]

// ========== API 函数 ==========

/**
 * 获取会话列表
 */
export async function getConversations(): Promise<ApiResponse<ConversationsResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    const totalUnread = mockConversations.reduce((sum, c) => sum + c.unreadCount, 0)
    return { 
      code: 200, 
      data: { list: mockConversations, totalUnread }, 
      message: 'success' 
    }
  }
  return apiGet<ConversationsResponse>('/im/conversations')
}

/**
 * 获取好友列表
 */
export async function getFriendList(): Promise<ApiResponse<FriendsResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { 
      code: 200, 
      data: { list: mockFriends, total: mockFriends.length }, 
      message: 'success' 
    }
  }
  return apiGet<FriendsResponse>('/im/friends')
}

/**
 * 搜索会话和好友
 */
export async function searchConversationsAndFriends(
  keyword: string
): Promise<ApiResponse<ConversationSearchResult>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    const conversations = mockConversations.filter(c => 
      c.targetName.includes(keyword) || c.lastMessage.content.includes(keyword)
    )
    const friends = mockFriends.filter(f => 
      f.nickname.includes(keyword) || f.remark?.includes(keyword)
    )
    return { code: 200, data: { conversations, friends }, message: 'success' }
  }
  return apiGet<ConversationSearchResult>('/im/search', { keyword })
}

/**
 * 删除会话
 */
export async function deleteConversation(conversationId: string): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '删除成功' }
  }
  return apiPost<{ success: boolean }>(`/im/conversations/${conversationId}/delete`)
}

/**
 * 置顶/取消置顶会话
 */
export async function togglePinConversation(
  conversationId: string, 
  isPinned: boolean
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: { success: true }, message: isPinned ? '已置顶' : '已取消置顶' }
  }
  return apiPost<{ success: boolean }>(`/im/conversations/${conversationId}/pin`, { isPinned })
}

/**
 * 设置免打扰
 */
export async function toggleMuteConversation(
  conversationId: string, 
  isMuted: boolean
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: { success: true }, message: isMuted ? '已设为免打扰' : '已取消免打扰' }
  }
  return apiPost<{ success: boolean }>(`/im/conversations/${conversationId}/mute`, { isMuted })
}

/**
 * 标记会话已读
 */
export async function markConversationRead(conversationId: string): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 100))
    return { code: 200, data: { success: true }, message: 'success' }
  }
  return apiPost<{ success: boolean }>(`/im/conversations/${conversationId}/read`)
}

/**
 * 获取会话类型图标
 */
export function getConversationTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    private: 'User',
    group: 'Users',
    system: 'Bell',
    service: 'Headphones',
  }
  return icons[type] || 'MessageCircle'
}

/**
 * 获取消息摘要
 */
export function getMessageSummary(message: { type: string; content: string; senderName?: string }): string {
  const prefix = message.senderName ? `${message.senderName}: ` : ''
  const typeLabels: Record<string, string> = {
    image: '[图片]',
    voice: '[语音消息]',
    video: '[视频]',
    file: '[文件]',
    location: '[位置]',
    card: '[名片]',
  }
  return prefix + (typeLabels[message.type] || message.content)
}

// ========== 私聊相关 API ==========

// Mock 聊天对象
const mockChatTargets: Record<number, ChatTarget> = {
  // 互相关注：自由聊天
  101: {
    id: 101,
    nickname: '张明德',
    avatar: '/placeholder.svg?height=48&width=48',
    remark: '八字师傅',
    isOnline: true,
    isBlocked: false,
    isFollowed: true,
    followsMe: true,
    relation: 'normal',
  },
  // 圈主：不受好友规则限制
  102: {
    id: 102,
    nickname: '李老师',
    avatar: '/placeholder.svg?height=48&width=48',
    isOnline: true,
    isBlocked: false,
    isFollowed: false,
    followsMe: false,
    relation: 'circle_owner',
  },
  // 陌生人（未互关）：仅能发 1 条打招呼消息
  103: {
    id: 103,
    nickname: '王老师',
    avatar: '/placeholder.svg?height=48&width=48',
    isOnline: false,
    lastActiveAt: '2小时前',
    isBlocked: false,
    isFollowed: false,
    followsMe: false,
    relation: 'normal',
  },
}

// Mock 聊天历史
const mockChatHistory: ChatMessage[] = [
  {
    id: 'msg_1',
    senderId: 101,
    senderName: '张明德',
    senderAvatar: '/placeholder.svg',
    type: 'text',
    content: '您好，请问有什么可以帮您的？',
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 09:00',
    timestamp: Date.now() - 3600000 * 2,
  },
  {
    id: 'msg_2',
    senderId: 0, // 当前用户
    senderName: '我',
    senderAvatar: '/placeholder.svg',
    type: 'text',
    content: '老师好，我想咨询一下八字命盘的问题',
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 09:05',
    timestamp: Date.now() - 3600000 * 1.9,
  },
  {
    id: 'msg_3',
    senderId: 101,
    senderName: '张明德',
    senderAvatar: '/placeholder.svg',
    type: 'text',
    content: '好的，请您提供一下出生的年月日时，最好是农历和具体时辰',
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 09:08',
    timestamp: Date.now() - 3600000 * 1.8,
  },
  {
    id: 'msg_4',
    senderId: 0,
    senderName: '我',
    senderAvatar: '/placeholder.svg',
    type: 'text',
    content: '我是1990年农历三月初八，上午9点左右出生的',
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 09:15',
    timestamp: Date.now() - 3600000 * 1.7,
  },
  {
    id: 'msg_5',
    senderId: 101,
    senderName: '张明德',
    senderAvatar: '/placeholder.svg',
    type: 'image',
    content: '',
    image: {
      url: '/placeholder.svg?height=300&width=400',
      thumbnail: '/placeholder.svg?height=150&width=200',
      width: 400,
      height: 300,
    },
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 09:25',
    timestamp: Date.now() - 3600000 * 1.5,
  },
  {
    id: 'msg_6',
    senderId: 101,
    senderName: '张明德',
    senderAvatar: '/placeholder.svg',
    type: 'text',
    content: '这是您的八字命盘，我来为您详细解读一下：\n\n您是庚午年生人，日主为甲木...',
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 09:30',
    timestamp: Date.now() - 3600000 * 1.4,
  },
  {
    id: 'msg_7',
    senderId: 101,
    senderName: '张明德',
    senderAvatar: '/placeholder.svg',
    type: 'voice',
    content: '',
    voice: {
      url: '/audio/voice_sample.mp3',
      duration: 45,
    },
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 09:35',
    timestamp: Date.now() - 3600000 * 1.3,
  },
  {
    id: 'msg_8',
    senderId: 0,
    senderName: '我',
    senderAvatar: '/placeholder.svg',
    type: 'text',
    content: '太感谢老师了，分析得很详细！请问有没有推荐的学习资料？',
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 10:00',
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'msg_9',
    senderId: 101,
    senderName: '张明德',
    senderAvatar: '/placeholder.svg',
    type: 'card',
    content: '',
    product: {
      id: 1001,
      title: '八字命理入门到精通',
      cover: '/placeholder.svg?height=80&width=80',
      price: 199,
      originalPrice: 299,
    },
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 10:05',
    timestamp: Date.now() - 3600000 * 0.9,
  },
  {
    id: 'msg_10',
    senderId: 101,
    senderName: '张明德',
    senderAvatar: '/placeholder.svg',
    type: 'text',
    content: '推荐这门课程给您，是我亲自录制的，从基础到实战都有讲解',
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 10:06',
    timestamp: Date.now() - 3600000 * 0.85,
  },
  {
    id: 'msg_11',
    senderId: 0,
    senderName: '我',
    senderAvatar: '/placeholder.svg',
    type: 'text',
    content: '好的，那我们明天下午3点见面详谈',
    status: 'delivered',
    isWithdrawn: false,
    createdAt: '2026-06-03 10:30',
    timestamp: Date.now() - 1800000,
  },
]

// Mock 商品列表（用于搜索推荐）
const mockProducts: ProductCard[] = [
  { id: 1001, title: '八字命理入门到精通', cover: '/placeholder.svg', price: 199, originalPrice: 299 },
  { id: 1002, title: '风水布局实战课程', cover: '/placeholder.svg', price: 299, originalPrice: 399 },
  { id: 1003, title: '紫微斗数精讲', cover: '/placeholder.svg', price: 399 },
  { id: 1004, title: '六爻预测入门', cover: '/placeholder.svg', price: 159, originalPrice: 199 },
  { id: 1005, title: '专业风水罗盘', cover: '/placeholder.svg', price: 688 },
]

/**
 * 获取聊天对象信息
 */
export async function getChatTarget(targetId: number): Promise<ApiResponse<ChatTarget>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    const target = mockChatTargets[targetId] || {
      id: targetId,
      nickname: `用户${targetId}`,
      avatar: '/placeholder.svg',
      isOnline: false,
      isBlocked: false,
      isFollowed: false,
    }
    return { code: 200, data: target, message: 'success' }
  }
  return apiGet<ChatTarget>(`/im/chat/target/${targetId}`)
}

/**
 * 获取聊天历史
 */
export async function getChatHistory(
  targetId: number,
  beforeMsgId?: string,
  limit: number = 20
): Promise<ApiResponse<ChatHistoryResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    // 陌生人（未互关、无往来）返回空历史，用于演示"打招呼"流程
    if (targetId !== 101) {
      return { code: 200, data: { messages: [], hasMore: false }, message: 'success' }
    }
    // 模拟分页
    let messages = [...mockChatHistory]
    if (beforeMsgId) {
      const idx = messages.findIndex(m => m.id === beforeMsgId)
      if (idx > 0) {
        messages = messages.slice(0, idx)
      }
    }
    return {
      code: 200,
      data: {
        messages: messages.slice(-limit),
        hasMore: messages.length > limit,
        oldestMsgId: messages[0]?.id,
      },
      message: 'success',
    }
  }
  return apiGet<ChatHistoryResponse>(`/im/chat/${targetId}/history`, { beforeMsgId, limit })
}

/**
 * 发送消息
 */
export async function sendC2CMessage(
  request: SendMessageRequest
): Promise<ApiResponse<SendMessageResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: {
        messageId: 'msg_' + Date.now(),
        timestamp: Date.now(),
      },
      message: 'success',
    }
  }
  return apiPost<SendMessageResponse>('/im/chat/send', request)
}

/**
 * 撤回消息
 */
export async function withdrawMessage(messageId: string): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: { success: true }, message: '消息已撤回' }
  }
  return apiPost<{ success: boolean }>(`/im/chat/message/${messageId}/withdraw`)
}

/**
 * 删除消息
 */
export async function deleteMessage(messageId: string): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: { success: true }, message: '删��成功' }
  }
  return apiPost<{ success: boolean }>(`/im/chat/message/${messageId}/delete`)
}

/**
 * 搜索商品（用于发送商品卡片）
 */
export async function searchProducts(keyword: string): Promise<ApiResponse<ProductCard[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const results = keyword 
      ? mockProducts.filter(p => p.title.includes(keyword))
      : mockProducts
    return { code: 200, data: results, message: 'success' }
  }
  return apiGet<ProductCard[]>('/shop/products/search', { keyword, limit: 10 })
}

/**
 * 上传聊天图片
 */
export async function uploadChatImage(file: File): Promise<ApiResponse<{ url: string }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      code: 200,
      data: { url: URL.createObjectURL(file) },
      message: 'success',
    }
  }
  const formData = new FormData()
  formData.append('file', file)
  return apiPost<{ url: string }>('/im/chat/upload/image', formData)
}

/**
 * 上传语音消息
 */
export async function uploadVoice(blob: Blob, duration: number): Promise<ApiResponse<{ url: string; duration: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: { url: URL.createObjectURL(blob), duration },
      message: 'success',
    }
  }
  const formData = new FormData()
  formData.append('file', blob, 'voice.webm')
  formData.append('duration', duration.toString())
  return apiPost<{ url: string; duration: number }>('/im/chat/upload/voice', formData)
}

/**
 * 格式化消息时间
 */
export function formatMessageTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const date = new Date(timestamp)
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()
  
  const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  
  if (isToday) return timeStr
  if (isYesterday) return `昨天 ${timeStr}`
  
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' + timeStr
}

/**
 * 判断是否需要显示时间标签（间隔5分钟以上）
 */
export function shouldShowTimeLabel(currentTimestamp: number, prevTimestamp?: number): boolean {
  if (!prevTimestamp) return true
  return currentTimestamp - prevTimestamp > 5 * 60 * 1000
}

/**
 * 判断消息是否可撤回（2分钟内）
 */
export function canWithdrawMessage(timestamp: number): boolean {
  return Date.now() - timestamp < 2 * 60 * 1000
}

/**
 * 计算私聊消息权限（对标小红书的陌生人私信规则）
 *
 * 规则：
 * - 互相关注 / 圈主-成员关系：自由聊天，无限制
 * - 未互关：发送方仅可发 1 条打招呼消息，对方回复后才能继续
 * - 已拉黑：不可发送
 *
 * @param target 聊天对象（含关系字段）
 * @param messages 当前会话消息列表（用于推断是否已发招呼、对方是否已回复）
 * @param currentUserId 当前用户 id
 */
export function getChatPermission(
  target: Pick<ChatTarget, 'isBlocked' | 'isFollowed' | 'followsMe' | 'relation'>,
  messages: Pick<ChatMessage, 'senderId' | 'isWithdrawn'>[],
  currentUserId: number
): ChatPermission {
  // 已拉黑
  if (target.isBlocked) {
    return { state: 'blocked', canSend: false, hint: '你已将对方加入黑名单，无法发送消息', reason: 'blocked' }
  }

  // 圈主-成员关系：不受好友规则限制
  if (target.relation === 'circle_owner' || target.relation === 'circle_member') {
    return { state: 'unrestricted', canSend: true, hint: '' }
  }

  // 互相关注：自由聊天
  if (target.isFollowed && target.followsMe) {
    return { state: 'unrestricted', canSend: true, hint: '你们已互相关注，可以自由聊天了' }
  }

  // 未互关：统计有效消息（排除撤回）
  const valid = messages.filter(m => !m.isWithdrawn)
  const myMessages = valid.filter(m => m.senderId === currentUserId)
  const theirMessages = valid.filter(m => m.senderId === target.id || (m.senderId !== currentUserId))

  // 对方已回复 → 临时对话关系建立，可继续聊天
  if (theirMessages.length > 0) {
    return { state: 'replied', canSend: true, hint: '对方已回复，你们可以继续聊天了' }
  }

  // 已发出招呼消息，等待对方回复
  if (myMessages.length >= 1) {
    return {
      state: 'waiting_reply',
      canSend: false,
      hint: '消息已发送，等待对方回复...',
      reason: 'waiting_reply',
    }
  }

  // 尚未发送，可发 1 条打招呼消息
  return {
    state: 'can_greet',
    canSend: true,
    hint: '你们还未互相关注，发送消息需要对方回复后才能继续聊天',
  }
}

// ========== 通讯录相关 API ==========

// Mock 好友列表（带拼音）
const mockFriendsWithPinyin: FriendItem[] = [
  { id: 101, nickname: '安然', avatar: '/placeholder.svg', isOnline: true, pinyinInitial: 'A', signature: '国学爱好者' },
  { id: 102, nickname: '白云', avatar: '/placeholder.svg', isOnline: false, pinyinInitial: 'B', lastActiveAt: '3小时前' },
  { id: 103, nickname: '陈明', avatar: '/placeholder.svg', isOnline: true, pinyinInitial: 'C', remark: '八字老师' },
  { id: 104, nickname: '陈思远', avatar: '/placeholder.svg', isOnline: false, pinyinInitial: 'C', lastActiveAt: '昨天' },
  { id: 105, nickname: '丁一', avatar: '/placeholder.svg', isOnline: true, pinyinInitial: 'D' },
  { id: 106, nickname: '方圆', avatar: '/placeholder.svg', isOnline: false, pinyinInitial: 'F', lastActiveAt: '2天前' },
  { id: 107, nickname: '高远', avatar: '/placeholder.svg', isOnline: true, pinyinInitial: 'G', signature: '风水师' },
  { id: 108, nickname: '韩雪', avatar: '/placeholder.svg', isOnline: false, pinyinInitial: 'H', remark: '易经学员' },
  { id: 109, nickname: '黄晓明', avatar: '/placeholder.svg', isOnline: true, pinyinInitial: 'H' },
  { id: 110, nickname: '江涛', avatar: '/placeholder.svg', isOnline: false, pinyinInitial: 'J', lastActiveAt: '1小时前' },
  { id: 111, nickname: '李明德', avatar: '/placeholder.svg', isOnline: true, pinyinInitial: 'L', remark: '张老师', signature: '传道授业' },
  { id: 112, nickname: '刘思远', avatar: '/placeholder.svg', isOnline: false, pinyinInitial: 'L' },
  { id: 113, nickname: '马腾', avatar: '/placeholder.svg', isOnline: true, pinyinInitial: 'M' },
  { id: 114, nickname: '欧阳修', avatar: '/placeholder.svg', isOnline: false, pinyinInitial: 'O', signature: '诗词爱好者' },
  { id: 115, nickname: '秦风', avatar: '/placeholder.svg', isOnline: true, pinyinInitial: 'Q' },
  { id: 116, nickname: '孙悟空', avatar: '/placeholder.svg', isOnline: false, pinyinInitial: 'S', lastActiveAt: '5分钟前' },
  { id: 117, nickname: '唐三藏', avatar: '/placeholder.svg', isOnline: true, pinyinInitial: 'T' },
  { id: 118, nickname: '王老师', avatar: '/placeholder.svg', isOnline: true, pinyinInitial: 'W', signature: '国学导师' },
  { id: 119, nickname: '吴承恩', avatar: '/placeholder.svg', isOnline: false, pinyinInitial: 'W' },
  { id: 120, nickname: '徐志摩', avatar: '/placeholder.svg', isOnline: false, pinyinInitial: 'X', lastActiveAt: '昨天' },
  { id: 121, nickname: '杨过', avatar: '/placeholder.svg', isOnline: true, pinyinInitial: 'Y' },
  { id: 122, nickname: '张无忌', avatar: '/placeholder.svg', isOnline: false, pinyinInitial: 'Z', remark: '武学爱好者' },
  { id: 123, nickname: '周芷若', avatar: '/placeholder.svg', isOnline: true, pinyinInitial: 'Z' },
  { id: 124, nickname: '赵敏', avatar: '/placeholder.svg', isOnline: false, pinyinInitial: 'Z', signature: '蒙古郡主' },
]

/**
 * 获取好友列表（带拼音索引）
 */
export async function getFriendListWithPinyin(): Promise<ApiResponse<FriendItem[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { code: 200, data: mockFriendsWithPinyin, message: 'success' }
  }
  return apiGet<FriendItem[]>('/im/friends', { withPinyin: true })
}

/**
 * 按首字母分组好友
 */
export function groupFriendsByLetter(friends: FriendItem[]): FriendGroup[] {
  const groups: Record<string, FriendItem[]> = {}
  
  friends.forEach(friend => {
    const letter = friend.pinyinInitial?.toUpperCase() || '#'
    if (!groups[letter]) {
      groups[letter] = []
    }
    groups[letter].push(friend)
  })
  
  // 按字母排序
  const sortedLetters = Object.keys(groups).sort((a, b) => {
    if (a === '#') return 1
    if (b === '#') return -1
    return a.localeCompare(b)
  })
  
  return sortedLetters.map(letter => ({
    letter,
    friends: groups[letter].sort((a, b) => 
      (a.remark || a.nickname).localeCompare(b.remark || b.nickname)
    ),
  }))
}

/**
 * 搜索好友
 */
export async function searchFriends(keyword: string): Promise<ApiResponse<FriendItem[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    const results = mockFriendsWithPinyin.filter(f => 
      f.nickname.includes(keyword) || 
      f.remark?.includes(keyword) ||
      f.pinyinInitial?.toLowerCase() === keyword.toLowerCase()
    )
    return { code: 200, data: results, message: 'success' }
  }
  return apiGet<FriendItem[]>('/im/friends/search', { keyword })
}

/**
 * 获取所有字母索引列表
 */
export function getLetterIndexList(groups: FriendGroup[]): string[] {
  return groups.map(g => g.letter)
}

// ========== 好友请求相关 API ==========

// Mock 好友请求数���
const mockFriendRequests: FriendRequestItem[] = [
  {
    id: 1,
    fromUser: {
      id: 201,
      nickname: '周易爱好者',
      avatar: '/placeholder.svg?height=48&width=48',
      signature: '研究周易五年，求交流',
    },
    message: '您好，我是周易爱好者，想向您请教八字命理的问题',
    status: 'pending',
    createdAt: '2026-06-03 10:30',
  },
  {
    id: 2,
    fromUser: {
      id: 202,
      nickname: '风水学徒',
      avatar: '/placeholder.svg?height=48&width=48',
      signature: '初学风水，多多指教',
    },
    message: '老师好，看了您的风水课程很受启发',
    status: 'pending',
    createdAt: '2026-06-03 09:15',
  },
  {
    id: 3,
    fromUser: {
      id: 203,
      nickname: '国学新人',
      avatar: '/placeholder.svg?height=48&width=48',
    },
    status: 'pending',
    createdAt: '2026-06-02 18:40',
  },
  {
    id: 4,
    fromUser: {
      id: 204,
      nickname: '紫微斗数研究者',
      avatar: '/placeholder.svg?height=48&width=48',
      signature: '紫微斗数十年经验',
    },
    message: '希望能加您好友，一起探讨紫微斗数',
    status: 'approved',
    createdAt: '2026-06-01 14:20',
    processedAt: '2026-06-01 15:00',
  },
  {
    id: 5,
    fromUser: {
      id: 205,
      nickname: '测试用户',
      avatar: '/placeholder.svg?height=48&width=48',
    },
    message: '请加我好友',
    status: 'rejected',
    createdAt: '2026-05-30 10:00',
    processedAt: '2026-05-30 12:00',
    rejectReason: '暂时不加陌生人',
  },
]

/**
 * 获取好友请求列表
 */
export async function getFriendRequests(): Promise<ApiResponse<FriendRequestsResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    const pending = mockFriendRequests.filter(r => r.status === 'pending')
    const processed = mockFriendRequests.filter(r => r.status !== 'pending')
    return {
      code: 200,
      data: {
        pending,
        processed,
        totalPending: pending.length,
      },
      message: 'success',
    }
  }
  return apiGet<FriendRequestsResponse>('/im/friend-requests')
}

/**
 * 同意好友请求
 */
export async function approveFriendRequest(requestId: number): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '已添加好友' }
  }
  return apiPost<{ success: boolean }>(`/im/friend-requests/${requestId}/approve`)
}

/**
 * 拒绝好友请求
 */
export async function rejectFriendRequest(
  requestId: number, 
  reason?: string
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '已拒绝请求' }
  }
  return apiPost<{ success: boolean }>(`/im/friend-requests/${requestId}/reject`, { reason })
}

/**
 * 批量同意好友请求
 */
export async function approveAllFriendRequests(
  requestIds: number[]
): Promise<ApiResponse<{ successCount: number; failCount: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { 
      code: 200, 
      data: { successCount: requestIds.length, failCount: 0 }, 
      message: `已添加${requestIds.length}位好友` 
    }
  }
  return apiPost<{ successCount: number; failCount: number }>('/im/friend-requests/approve-batch', { requestIds })
}

/**
 * 忽略过期请求
 */
export async function ignoreExpiredRequests(): Promise<ApiResponse<{ count: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: { count: 0 }, message: 'success' }
  }
  return apiPost<{ count: number }>('/im/friend-requests/ignore-expired')
}

// ========== 群聊相关 API ==========

// Mock 群聊列表
const mockGroups: GroupItem[] = [
  {
    id: 1,
    name: '八字命理交流群',
    avatar: '/placeholder.svg?height=48&width=48',
    ownerId: 101,
    ownerName: '张明德',
    memberCount: 128,
    maxMembers: 500,
    lastMessage: {
      content: '今天的课程讲得很好',
      senderName: '李老师',
      time: '10:30',
    },
    unreadCount: 12,
    isPinned: true,
    isMuted: false,
    myRole: 'member',
    notice: '群规：文明交流，禁止广告',
    createdAt: '2026-01-15',
  },
  {
    id: 2,
    name: '风水研究小组',
    avatar: '/placeholder.svg?height=48&width=48',
    ownerId: 102,
    ownerName: '王风水',
    memberCount: 56,
    maxMembers: 200,
    lastMessage: {
      content: '[图片]',
      senderName: '小明',
      time: '09:45',
    },
    unreadCount: 3,
    isPinned: false,
    isMuted: false,
    myRole: 'admin',
    createdAt: '2026-02-20',
  },
  {
    id: 3,
    name: '紫微斗数学习群',
    avatar: '/placeholder.svg?height=48&width=48',
    ownerId: 0,
    ownerName: '我',
    memberCount: 89,
    maxMembers: 200,
    lastMessage: {
      content: '有人在线吗？',
      senderName: '新成员',
      time: '昨天',
    },
    unreadCount: 0,
    isPinned: true,
    isMuted: true,
    myRole: 'owner',
    notice: '欢迎加入紫微斗数学习群',
    createdAt: '2026-03-10',
  },
  {
    id: 4,
    name: '国学爱好者俱乐部',
    avatar: '/placeholder.svg?height=48&width=48',
    ownerId: 105,
    ownerName: '国学先生',
    memberCount: 256,
    maxMembers: 500,
    lastMessage: {
      content: '下周有线下活动，大家踊跃报名',
      senderName: '管理员',
      time: '昨天',
    },
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    myRole: 'member',
    createdAt: '2025-12-01',
  },
  {
    id: 5,
    name: '六爻预测实战群',
    avatar: '/placeholder.svg?height=48&width=48',
    ownerId: 108,
    ownerName: '六爻大师',
    memberCount: 42,
    maxMembers: 100,
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    myRole: 'member',
    createdAt: '2026-04-05',
  },
]

/**
 * 获取群聊列表
 */
export async function getGroupList(): Promise<ApiResponse<GroupListResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    // 排序：置顶优先，然后按最后消息时间
    const sorted = [...mockGroups].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return 0
    })
    return {
      code: 200,
      data: { list: sorted, total: sorted.length },
      message: 'success',
    }
  }
  return apiGet<GroupListResponse>('/im/groups')
}

/**
 * 搜索群聊
 */
export async function searchGroups(keyword: string): Promise<ApiResponse<GroupItem[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    const results = mockGroups.filter(g => g.name.includes(keyword))
    return { code: 200, data: results, message: 'success' }
  }
  return apiGet<GroupItem[]>('/im/groups/search', { keyword })
}

/**
 * 创建群聊
 */
export async function createGroup(params: {
  name: string
  memberIds: number[]
  avatar?: string
}): Promise<ApiResponse<GroupItem>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    const newGroup: GroupItem = {
      id: Date.now(),
      name: params.name,
      avatar: params.avatar || '/placeholder.svg',
      ownerId: 0,
      ownerName: '我',
      memberCount: params.memberIds.length + 1,
      maxMembers: 200,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      myRole: 'owner',
      createdAt: new Date().toISOString().split('T')[0],
    }
    return { code: 200, data: newGroup, message: '群聊创建成功' }
  }
  return apiPost<GroupItem>('/im/groups/create', params)
}

/**
 * 退出群聊
 */
export async function quitGroup(groupId: number): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '已退出群聊' }
  }
  return apiPost<{ success: boolean }>(`/im/groups/${groupId}/quit`)
}

/**
 * 解散群聊（仅群主）
 */
export async function dismissGroup(groupId: number): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '群聊已解散' }
  }
  return apiPost<{ success: boolean }>(`/im/groups/${groupId}/dismiss`)
}

/**
 * 置顶/取消置顶群聊
 */
export async function togglePinGroup(groupId: number): Promise<ApiResponse<{ isPinned: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    const group = mockGroups.find(g => g.id === groupId)
    return { code: 200, data: { isPinned: !group?.isPinned }, message: 'success' }
  }
  return apiPost<{ isPinned: boolean }>(`/im/groups/${groupId}/pin`)
}

/**
 * 设置群聊免打扰
 */
export async function toggleMuteGroup(groupId: number): Promise<ApiResponse<{ isMuted: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    const group = mockGroups.find(g => g.id === groupId)
    return { code: 200, data: { isMuted: !group?.isMuted }, message: 'success' }
  }
  return apiPost<{ isMuted: boolean }>(`/im/groups/${groupId}/mute`)
}

/**
 * 获取群成员角色显示名
 */
export function getGroupRoleName(role: string): string {
  const names: Record<string, string> = {
    owner: '群主',
    admin: '管理员',
    member: '成员',
  }
  return names[role] || '成员'
}

// ========== 群聊对话相关 API ==========

// Mock 群成员列表
const mockGroupMembers: GroupMember[] = [
  { id: 0, nickname: '我', avatar: '/placeholder.svg', role: 'member', joinedAt: '2026-01-20' },
  { id: 101, nickname: '张明德', avatar: '/placeholder.svg', role: 'owner', joinedAt: '2026-01-15' },
  { id: 102, nickname: '李老师', avatar: '/placeholder.svg', role: 'admin', joinedAt: '2026-01-16' },
  { id: 103, nickname: '王风水', avatar: '/placeholder.svg', role: 'admin', joinedAt: '2026-01-17' },
  { id: 104, nickname: '赵小明', avatar: '/placeholder.svg', role: 'member', joinedAt: '2026-01-18' },
  { id: 105, nickname: '钱学易', avatar: '/placeholder.svg', role: 'member', joinedAt: '2026-01-19' },
  { id: 106, nickname: '孙悟空', avatar: '/placeholder.svg', role: 'member', joinedAt: '2026-01-20' },
  { id: 107, nickname: '周芷若', avatar: '/placeholder.svg', role: 'member', joinedAt: '2026-01-21' },
  { id: 108, nickname: '吴承恩', avatar: '/placeholder.svg', role: 'member', joinedAt: '2026-01-22' },
  { id: 109, nickname: '郑和', avatar: '/placeholder.svg', role: 'member', joinedAt: '2026-01-23' },
]

// Mock 群聊消息历史
const mockGroupMessages: GroupChatMessage[] = [
  {
    id: 'gmsg_1',
    senderId: 101,
    senderName: '张明德',
    senderAvatar: '/placeholder.svg',
    senderRole: 'owner',
    type: 'text',
    content: '大家好，欢迎来到八字命理交流群',
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 09:00',
    timestamp: Date.now() - 3600000 * 3,
  },
  {
    id: 'gmsg_2',
    senderId: 102,
    senderName: '李老师',
    senderAvatar: '/placeholder.svg',
    senderRole: 'admin',
    type: 'text',
    content: '今天我们来讨论一下八字中的食神和伤官',
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 09:15',
    timestamp: Date.now() - 3600000 * 2.8,
  },
  {
    id: 'gmsg_3',
    senderId: 104,
    senderName: '赵小明',
    senderAvatar: '/placeholder.svg',
    senderRole: 'member',
    type: 'text',
    content: '李老师，请问食神和伤官有什么区别？',
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 09:20',
    timestamp: Date.now() - 3600000 * 2.7,
  },
  {
    id: 'gmsg_4',
    senderId: 102,
    senderName: '李老师',
    senderAvatar: '/placeholder.svg',
    senderRole: 'admin',
    type: 'text',
    content: '@赵小明 好问题！食神和伤官都是日主所生，但阴阳属性不同...',
    atMembers: [104],
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 09:25',
    timestamp: Date.now() - 3600000 * 2.6,
  },
  {
    id: 'gmsg_5',
    senderId: 102,
    senderName: '李老师',
    senderAvatar: '/placeholder.svg',
    senderRole: 'admin',
    type: 'image',
    content: '',
    image: {
      url: '/placeholder.svg?height=300&width=400',
      thumbnail: '/placeholder.svg?height=150&width=200',
      width: 400,
      height: 300,
    },
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 09:30',
    timestamp: Date.now() - 3600000 * 2.5,
  },
  {
    id: 'gmsg_6',
    senderId: 105,
    senderName: '钱学易',
    senderAvatar: '/placeholder.svg',
    senderRole: 'member',
    type: 'text',
    content: '这张图很清晰，谢谢老师！',
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 09:35',
    timestamp: Date.now() - 3600000 * 2.4,
  },
  {
    id: 'gmsg_7',
    senderId: 101,
    senderName: '张明德',
    senderAvatar: '/placeholder.svg',
    senderRole: 'owner',
    type: 'text',
    content: '@所有人 今晚8点有直播课程，大家记得参加',
    atAll: true,
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 10:00',
    timestamp: Date.now() - 3600000 * 2,
  },
  {
    id: 'gmsg_8',
    senderId: 0,
    senderName: '我',
    senderAvatar: '/placeholder.svg',
    senderRole: 'member',
    type: 'text',
    content: '收到，一定准时参加！',
    status: 'delivered',
    isWithdrawn: false,
    createdAt: '2026-06-03 10:05',
    timestamp: Date.now() - 3600000 * 1.9,
  },
  {
    id: 'gmsg_9',
    senderId: 106,
    senderName: '孙悟空',
    senderAvatar: '/placeholder.svg',
    senderRole: 'member',
    type: 'voice',
    content: '',
    voice: {
      url: '/audio/sample.mp3',
      duration: 15,
    },
    status: 'read',
    isWithdrawn: false,
    createdAt: '2026-06-03 10:30',
    timestamp: Date.now() - 3600000 * 1.5,
  },
]

/**
 * 获取群聊详情
 */
export async function getGroupDetail(groupId: number): Promise<ApiResponse<GroupDetail>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const group = mockGroups.find(g => g.id === groupId) || mockGroups[0]
    const detail: GroupDetail = {
      ...group,
      description: '这是一个专注于八字命理交流的群组，欢迎大家积极讨论。',
      noticeDetail: group.notice ? {
        content: group.notice + '\n\n1. 禁止发布广告\n2. 禁止人身攻击\n3. 尊重每一位成员\n4. 有问题可以@管理员',
        publisher: '群主',
        publishedAt: '2026-06-01 10:00',
      } : undefined,
      allowMemberInvite: true,
      needApproval: false,
      members: mockGroupMembers,
    }
    return { code: 200, data: detail, message: 'success' }
  }
  return apiGet<GroupDetail>(`/im/groups/${groupId}`)
}

/**
 * 获取群聊历史消息
 */
export async function getGroupChatHistory(
  groupId: number,
  beforeMsgId?: string,
  limit: number = 20
): Promise<ApiResponse<GroupChatHistoryResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let messages = [...mockGroupMessages]
    if (beforeMsgId) {
      const idx = messages.findIndex(m => m.id === beforeMsgId)
      if (idx > 0) {
        messages = messages.slice(0, idx)
      }
    }
    return {
      code: 200,
      data: {
        messages: messages.slice(-limit),
        hasMore: messages.length > limit,
        oldestMsgId: messages[0]?.id,
      },
      message: 'success',
    }
  }
  return apiGet<GroupChatHistoryResponse>(`/im/groups/${groupId}/history`, { beforeMsgId, limit })
}

/**
 * 发送群消息
 */
export async function sendGroupMessage(
  request: SendGroupMessageRequest
): Promise<ApiResponse<{ messageId: string; timestamp: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: {
        messageId: 'gmsg_' + Date.now(),
        timestamp: Date.now(),
      },
      message: 'success',
    }
  }
  return apiPost<{ messageId: string; timestamp: number }>(`/im/groups/${request.groupId}/send`, request)
}

/**
 * 获取群成员列表
 */
export async function getGroupMembers(groupId: number): Promise<ApiResponse<GroupMember[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    // 按角色排序：群主 > 管理员 > 成员
    const sorted = [...mockGroupMembers].sort((a, b) => {
      const order: Record<string, number> = { owner: 0, admin: 1, member: 2 }
      return (order[a.role] || 2) - (order[b.role] || 2)
    })
    return { code: 200, data: sorted, message: 'success' }
  }
  return apiGet<GroupMember[]>(`/im/groups/${groupId}/members`)
}

/**
 * @成员搜索
 */
export async function searchGroupMembersForAt(
  groupId: number, 
  keyword: string
): Promise<ApiResponse<GroupMember[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    const results = mockGroupMembers.filter(m => 
      m.nickname.includes(keyword) || m.remark?.includes(keyword)
    )
    return { code: 200, data: results, message: 'success' }
  }
  return apiGet<GroupMember[]>(`/im/groups/${groupId}/members/search`, { keyword })
}

/**
 * 撤回群消息
 */
export async function withdrawGroupMessage(
  groupId: number, 
  messageId: string
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: { success: true }, message: '消息已撤回' }
  }
  return apiPost<{ success: boolean }>(`/im/groups/${groupId}/message/${messageId}/withdraw`)
}

/**
 * 更新群公告
 */
export async function updateGroupNotice(
  groupId: number, 
  notice: string
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '公告已更新' }
  }
  return apiPost<{ success: boolean }>(`/im/groups/${groupId}/notice`, { notice })
}

// ========== 群详情管理相关 API ==========

/**
 * 获取群设置
 */
export async function getGroupSettings(groupId: number): Promise<ApiResponse<GroupSettings>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return {
      code: 200,
      data: {
        myNickname: '',
        isMuted: false,
        isPinned: false,
        showMemberNickname: true,
        savedToContacts: true,
      },
      message: 'success',
    }
  }
  return apiGet<GroupSettings>(`/im/groups/${groupId}/settings`)
}

/**
 * 更新我的群昵称
 */
export async function updateMyGroupNickname(
  groupId: number, 
  nickname: string
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '昵称已更新' }
  }
  return apiPost<{ success: boolean }>(`/im/groups/${groupId}/nickname`, { nickname })
}

/**
 * 更新群设置
 */
export async function updateGroupSettings(
  groupId: number,
  settings: Partial<GroupSettings>
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: { success: true }, message: '设置已更新' }
  }
  return apiPost<{ success: boolean }>(`/im/groups/${groupId}/settings`, settings)
}

/**
 * 获取群管理权限
 */
export function getGroupPermissions(myRole: string): GroupPermissions {
  const isOwner = myRole === 'owner'
  const isAdmin = myRole === 'admin' || isOwner
  return {
    canInvite: true,
    canRemoveMember: isAdmin,
    canSetAdmin: isOwner,
    canUpdateNotice: isAdmin,
    canDismiss: isOwner,
    canTransfer: isOwner,
  }
}

/**
 * 移除群成员
 */
export async function removeGroupMember(
  groupId: number, 
  memberId: number
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '已移除成员' }
  }
  return apiPost<{ success: boolean }>(`/im/groups/${groupId}/members/${memberId}/remove`)
}

/**
 * 设置/取消管理员
 */
export async function toggleGroupAdmin(
  groupId: number, 
  memberId: number,
  isAdmin: boolean
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { 
      code: 200, 
      data: { success: true }, 
      message: isAdmin ? '已设为管理员' : '已取消管理员' 
    }
  }
  return apiPost<{ success: boolean }>(`/im/groups/${groupId}/members/${memberId}/admin`, { isAdmin })
}

/**
 * 转让群主
 */
export async function transferGroupOwner(
  groupId: number, 
  newOwnerId: number
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { code: 200, data: { success: true }, message: '群主已转让' }
  }
  return apiPost<{ success: boolean }>(`/im/groups/${groupId}/transfer`, { newOwnerId })
}

/**
 * 邀请成员入群
 */
export async function inviteToGroup(
  groupId: number, 
  memberIds: number[]
): Promise<ApiResponse<{ successCount: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { code: 200, data: { successCount: memberIds.length }, message: '邀请已发送' }
  }
  return apiPost<{ successCount: number }>(`/im/groups/${groupId}/invite`, { memberIds })
}

/**
 * 更新群信息（群名、头像等）
 */
export async function updateGroupInfo(
  groupId: number,
  info: { name?: string; avatar?: string; description?: string }
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '群信息已更新' }
  }
  return apiPost<{ success: boolean }>(`/im/groups/${groupId}/info`, info)
}

/**
 * 生成群二维码
 */
export async function generateGroupQrcode(groupId: number): Promise<ApiResponse<{ qrcodeUrl: string; expireAt: string }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: {
        qrcodeUrl: '/placeholder.svg?height=200&width=200',
        expireAt: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
      },
      message: 'success',
    }
  }
  return apiGet<{ qrcodeUrl: string; expireAt: string }>(`/im/groups/${groupId}/qrcode`)
}
