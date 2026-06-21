import { apiGet, useMock } from '@/utils/request'

export const CURRENT_USER_ID = 'u0'

/* ============================================================
   会话列表
   ============================================================ */

export type ConversationType = 'private' | 'group' | 'service' | 'system'

export interface LastMessage { content: string; time: string }

export interface ConversationItem {
  id: string
  type: ConversationType
  targetId: string
  targetAvatar: string
  targetName: string
  unreadCount: number
  isPinned: boolean
  isMuted: boolean
  updatedAt: string
  draft?: string
  lastMessage: LastMessage
}

export const convTypeIcon: Record<ConversationType, string> = {
  private: 'user',
  group: 'users',
  service: 'headphones',
  system: 'bell',
}

export function getMessageSummary(message: LastMessage): string {
  return message.content.length > 30 ? message.content.slice(0, 30) + '...' : message.content
}

export const mockConversations: ConversationItem[] = [
  { id: 'c1', type: 'private', targetId: 'u1', targetAvatar: '/static/images/avatar/u1.png', targetName: '周易大师', unreadCount: 3, isPinned: true, isMuted: false, updatedAt: '2024-01-15T14:30:00', lastMessage: { content: '好的，八字排盘结果我发你了，你看一下', time: '14:30' } },
  { id: 'c2', type: 'group', targetId: 'g1', targetAvatar: '/static/images/avatar/group1.png', targetName: '八字命理研习社', unreadCount: 28, isPinned: false, isMuted: false, updatedAt: '2024-01-15T12:15:00', lastMessage: { content: '今天晚上的直播课别忘了', time: '12:15' } },
  { id: 'c3', type: 'private', targetId: 'u2', targetAvatar: '/static/images/avatar/u2.png', targetName: '风水大师', unreadCount: 0, isPinned: false, isMuted: true, updatedAt: '2024-01-14T20:00:00', lastMessage: { content: '罗盘已发出，单号SF12345678', time: '昨天' } },
  { id: 'c4', type: 'service', targetId: 's1', targetAvatar: '/static/images/avatar/service.png', targetName: '平台客服', unreadCount: 1, isPinned: false, isMuted: false, updatedAt: '2024-01-13T09:00:00', lastMessage: { content: '您好，您的退款已处理，请查收', time: '2天前' } },
  { id: 'c5', type: 'system', targetId: 'sys1', targetAvatar: '/static/images/avatar/system.png', targetName: '系统通知', unreadCount: 5, isPinned: false, isMuted: false, updatedAt: '2024-01-15T08:00:00', lastMessage: { content: '恭喜！您的课程《八字入门》已通过审核', time: '08:00' } },
]

/* ============================================================
   聊天消息
   ============================================================ */

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderAvatar: string
  type: 'text' | 'image' | 'voice' | 'card'
  content: string
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  isWithdrawn: boolean
  createdAt: string
  timestamp: number
  image?: { url: string }
  voice?: { duration: number }
  product?: { cover: string; title: string; price: number; originalPrice?: number }
}

export interface ChatTarget {
  avatar: string
  isOnline: boolean
  isBlocked: boolean
  remark?: string
  nickname: string
  lastActiveAt?: string
}

export interface ChatPermission {
  state: 'unrestricted' | 'replied' | 'blocked' | 'muted' | 'waiting_reply' | 'can_greet'
  hint: string
  canSend: boolean
}

export function formatMessageTime(timestamp: number): string {
  const d = new Date(timestamp)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

export function shouldShowTimeLabel(current: number, previous?: number): boolean {
  if (!previous) return true
  return current - previous > 5 * 60 * 1000
}

export function getChatPermission(_target: ChatTarget, messages: ChatMessage[], userId: string): ChatPermission {
  const myMsgs = messages.filter((m) => m.senderId === userId)
  if (myMsgs.length === 0) return { state: 'can_greet', hint: '发送第一条消息打个招呼吧', canSend: true }
  const last = messages[messages.length - 1]
  if (last.senderId === userId) return { state: 'waiting_reply', hint: '等待对方回复', canSend: true }
  return { state: 'unrestricted', hint: '', canSend: true }
}

export const mockChatTarget: ChatTarget = {
  avatar: '/static/images/avatar/u1.png',
  isOnline: true,
  isBlocked: false,
  nickname: '周易大师',
  lastActiveAt: '刚刚在线',
}

export const mockChatHistory: ChatMessage[] = [
  { id: 'm1', senderId: 'u1', senderName: '周易大师', senderAvatar: '/static/images/avatar/u1.png', type: 'text', content: '你好，有什么可以帮你的？', status: 'read', isWithdrawn: false, createdAt: '2024-01-15T14:00:00', timestamp: 1705305600000 },
  { id: 'm2', senderId: 'u0', senderName: '我', senderAvatar: '/static/images/avatar/me.png', type: 'text', content: '大师，想请教一下我今年的运势', status: 'read', isWithdrawn: false, createdAt: '2024-01-15T14:05:00', timestamp: 1705305900000 },
  { id: 'm3', senderId: 'u1', senderName: '周易大师', senderAvatar: '/static/images/avatar/u1.png', type: 'text', content: '好的，把你的生辰八字发我一下', status: 'read', isWithdrawn: false, createdAt: '2024-01-15T14:10:00', timestamp: 1705306200000 },
  { id: 'm4', senderId: 'u0', senderName: '我', senderAvatar: '/static/images/avatar/me.png', type: 'text', content: '1990年五月十五 午时', status: 'read', isWithdrawn: false, createdAt: '2024-01-15T14:15:00', timestamp: 1705306500000 },
  { id: 'm5', senderId: 'u1', senderName: '周易大师', senderAvatar: '/static/images/avatar/u1.png', type: 'text', content: '好的，八字排盘结果我发你了，你看一下', status: 'delivered', isWithdrawn: false, createdAt: '2024-01-15T14:30:00', timestamp: 1705307400000 },
]

/* ============================================================
   群聊
   ============================================================ */

export interface GroupChatMessage {
  id: string
  senderId: string
  senderName: string
  senderAvatar: string
  senderRole: 'owner' | 'admin' | 'member'
  type: 'text' | 'image' | 'voice'
  content: string
  atAll?: boolean
  atMembers?: number[]
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  isWithdrawn: boolean
  createdAt: string
  timestamp: number
  image?: { url: string }
  voice?: { duration: number }
}

export interface GroupMember {
  id: number
  avatar: string
  nickname: string
  remark?: string
  role: 'owner' | 'admin' | 'member'
}

export const mockGroupDetail = {
  name: '八字命理研习社',
  notice: '欢迎加入八字命理研习社，请遵守群规',
  noticeDetail: { publisher: '周易大师', publishedAt: '2024-01-01', content: '本群为八字命理爱好者交流群，禁止广告和无关内容' },
  avatar: '/static/images/avatar/group1.png',
  memberCount: 1280,
  myRole: 'member' as 'owner' | 'admin' | 'member',
}

export const mockGroupMembers: GroupMember[] = [
  { id: 1, avatar: '/static/images/avatar/u1.png', nickname: '周易大师', role: 'owner' },
  { id: 2, avatar: '/static/images/avatar/u2.png', nickname: '风水大师', role: 'admin' },
  { id: 3, avatar: '/static/images/avatar/u3.png', nickname: '命理爱好者', role: 'member' },
  { id: 4, avatar: '/static/images/avatar/u4.png', nickname: '易学新人', role: 'member' },
  { id: 5, avatar: '/static/images/avatar/me.png', nickname: '我', role: 'member' },
]

export const mockGroupChatHistory: GroupChatMessage[] = [
  { id: 'g1', senderId: 'u0', senderName: '我', senderAvatar: '/static/images/avatar/me.png', senderRole: 'member', type: 'text', content: '大家好，新人报到', status: 'read', isWithdrawn: false, createdAt: '2024-01-15T10:00:00', timestamp: 1705291200000 },
  { id: 'g2', senderId: 'u1', senderName: '周易大师', senderAvatar: '/static/images/avatar/u1.png', senderRole: 'owner', type: 'text', content: '欢迎欢迎！', status: 'read', isWithdrawn: false, createdAt: '2024-01-15T10:05:00', timestamp: 1705291500000 },
  { id: 'g3', senderId: 'u2', senderName: '风水大师', senderAvatar: '/static/images/avatar/u2.png', senderRole: 'admin', type: 'text', content: '今晚8点有直播课，大家记得参加', status: 'read', isWithdrawn: false, createdAt: '2024-01-15T12:00:00', timestamp: 1705298400000 },
]

export function searchGroupMembersForAt(keyword: string): GroupMember[] {
  if (!keyword.trim()) return mockGroupMembers.slice(0, 3)
  return mockGroupMembers.filter((m) => m.nickname.includes(keyword))
}

export function getGroupRoleName(role: string): string {
  const map: Record<string, string> = { owner: '群主', admin: '管理员', member: '成员' }
  return map[role] || role
}

export function getGroupOnlineCount(_members: GroupMember[]): number {
  return Math.floor(Math.random() * 100) + 10
}

export function canWithdrawMessage(timestamp: number): boolean {
  return Date.now() - timestamp < 2 * 60 * 1000
}

/* ============================================================
   消息通知
   ============================================================ */

export type NotifyType = 'system' | 'interaction' | 'transaction' | 'service' | 'income'

export interface NotifyMessage {
  id: string
  type: NotifyType
  category: string
  title: string
  content: string
  time: string
  isRead: boolean
  avatar?: string
  link?: string
}

export const mockUnreadCounts: Record<NotifyType | 'total', number> = {
  system: 3,
  interaction: 12,
  transaction: 2,
  service: 1,
  income: 0,
  total: 18,
}

export const messageTabs: { key: NotifyType; icon: string; label: string }[] = [
  { key: 'system', icon: 'bell', label: '系统' },
  { key: 'interaction', icon: 'message-circle', label: '互动' },
  { key: 'transaction', icon: 'shopping-cart', label: '交易' },
  { key: 'service', icon: 'headphones', label: '客服' },
  { key: 'income', icon: 'dollar-sign', label: '收益' },
]

export const mockNotifyMessages: NotifyMessage[] = [
  { id: 'n1', type: 'system', category: '平台公告', title: '平台版本更新通知', content: '国学平台V2.0已上线，新增排盘工具和圈子功能', time: '今天 09:00', isRead: false, avatar: '/static/images/avatar/system.png' },
  { id: 'n2', type: 'interaction', category: '评论', title: '有人评论了你的帖子', content: '周易大师评论了你的帖子：讲得太好了', time: '今天 11:30', isRead: false, avatar: '/static/images/avatar/u1.png', link: '/pages/circles/post/detail?id=1' },
  { id: 'n3', type: 'transaction', category: '订单', title: '订单已发货', content: '您购买的商品《渊海子平》已发货', time: '昨天 16:20', isRead: true, link: '/pages/order/detail/index?id=1' },
  { id: 'n4', type: 'service', category: '客服', title: '客服消息', content: '您好，您的咨询已受理，客服将尽快回复', time: '2天前', isRead: true },
  { id: 'n5', type: 'income', category: '收益', title: '推广收益到账', content: '课程推广佣金 ¥29.90 已到账', time: '3天前', isRead: true },
]

// ============================================
// API 层
// ============================================
export const imApi = {
  /** 会话列表 */
  async conversations() {
    if (useMock()) return { conversations: mockConversations }
    try {
      const data = await apiGet<any>('/im/conversations')
      return { conversations: data.conversations || data.items || mockConversations }
    } catch { return { conversations: mockConversations } }
  },

  /** 聊天详情(私聊) */
  async chat(targetId: string) {
    if (useMock()) return { target: mockChatTarget, messages: mockChatHistory }
    try {
      const data = await apiGet<any>(`/im/conversations/${targetId}`)
      return { target: data.target || mockChatTarget, messages: data.messages || mockChatHistory }
    } catch { return { target: mockChatTarget, messages: mockChatHistory } }
  },

  /** 群聊详情 */
  async groupChat(groupId: string) {
    if (useMock()) return { detail: mockGroupDetail, members: mockGroupMembers, messages: mockGroupChatHistory }
    try {
      const data = await apiGet<any>(`/im/groups/${groupId}`)
      return {
        detail: data.detail || mockGroupDetail,
        members: data.members || mockGroupMembers,
        messages: data.messages || mockGroupChatHistory,
      }
    } catch { return { detail: mockGroupDetail, members: mockGroupMembers, messages: mockGroupChatHistory } }
  },

  /** 消息通知 */
  async messages() {
    if (useMock()) return { unreadCounts: mockUnreadCounts, tabs: messageTabs, messages: mockNotifyMessages }
    try {
      const data = await apiGet<any>('/im/messages')
      return {
        unreadCounts: data.unreadCounts || mockUnreadCounts,
        tabs: data.tabs || messageTabs,
        messages: data.messages || mockNotifyMessages,
      }
    } catch { return { unreadCounts: mockUnreadCounts, tabs: messageTabs, messages: mockNotifyMessages } }
  },
}
