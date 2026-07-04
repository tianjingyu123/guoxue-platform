/**
 * IM 消息板块数据层（mock + 类型 + 工具）
 * v0 迁移：会话列表/聊天/通知三页公用
 */
import { apiGet, apiPost, apiPut } from '@/utils/request'
import { useTim, type TimMessage, type TimConversation, type TimGroup, type TimGroupMember } from '@/composables/useTim'

const AVATAR = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`

export type ConversationType = 'private' | 'group' | 'service' | 'system'
export type MessageType = 'text' | 'image' | 'voice' | 'video' | 'file' | 'system' | 'product'

export interface LastMessage {
  type: MessageType
  content: string
  senderId: string
  senderName?: string
  time: string
}

export interface ConversationItem {
  id: string
  type: ConversationType
  /** 单聊=对端 user.id（腾讯 IM identifier，字符串）；群聊=群ID */
  targetId: string
  targetName: string
  targetAvatar: string
  memberCount?: number
  lastMessage: LastMessage
  unreadCount: number
  isPinned: boolean
  isMuted: boolean
  draft?: string
  updatedAt: string
}

/** SDK lastMessage.type → 前端 MessageType（文本以外显示占位摘要） */
function timLastMsgType(t?: string): MessageType {
  switch (t) {
    case 'TIMImageElem': return 'image'
    case 'TIMSoundElem': return 'voice'
    case 'TIMVideoFileElem': return 'video'
    case 'TIMFileElem': return 'file'
    default: return 'text'
  }
}

/** 腾讯 IM SDK 会话 → 页面 ConversationItem；系统会话(@TIM#SYSTEM)返回 null 由调用方过滤 */
export function timConvToConversationItem(c: TimConversation): ConversationItem | null {
  const last = c.lastMessage
  const lastTimeMs = (last?.lastTime || 0) * 1000
  const base = {
    id: c.conversationID,
    unreadCount: c.unreadCount || 0,
    isPinned: !!c.isPinned,
    isMuted: c.messageRemindType === 'AcceptNotNotify',
    draft: c.draftText || undefined,
    updatedAt: lastTimeMs ? new Date(lastTimeMs).toISOString() : new Date(0).toISOString(),
    lastMessage: {
      type: timLastMsgType(last?.type),
      content: last?.messageForShow || '',
      senderId: last?.fromAccount || '',
      time: lastTimeMs ? formatMessageTime(lastTimeMs) : '',
    } as LastMessage,
  }
  if (c.type === 'C2C' && c.userProfile) {
    return {
      ...base,
      type: 'private',
      targetId: c.userProfile.userID,
      targetName: c.remark || c.userProfile.nick || c.userProfile.userID.slice(0, 8),
      targetAvatar: c.userProfile.avatar || '',
    }
  }
  if (c.type === 'GROUP' && c.groupProfile) {
    return {
      ...base,
      type: 'group',
      targetId: c.groupProfile.groupID,
      targetName: c.groupProfile.name || c.groupProfile.groupID,
      targetAvatar: c.groupProfile.avatar || '',
      memberCount: c.groupProfile.memberNum,
    }
  }
  return null // @TIM#SYSTEM 等系统会话不进会话列表
}

/** 会话列表中最后一条消息的摘要文本（与原型一致：senderName 存在则统一加前缀） */
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

/** 会话类型 → 头像右下角标识图标（private 无标识） */
export const convTypeIcon: Record<ConversationType, string | null> = {
  private: null,
  group: 'users',
  service: 'headphones',
  system: 'bell',
}

/* —— 单聊 chat —— */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface ChatTarget {
  id: number
  nickname: string
  avatar: string
  remark?: string
  isOnline: boolean
  lastActiveAt?: string
  isBlocked: boolean
  isFollowed: boolean
  followsMe?: boolean
  relation?: 'normal' | 'circle_owner' | 'circle_member'
}

export interface ChatProduct {
  id: number
  title: string
  cover: string
  price: number
  originalPrice?: number
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderAvatar: string
  type: 'text' | 'image' | 'voice' | 'card'
  content: string
  image?: { url: string; thumbnail?: string; width: number; height: number }
  voice?: { url: string; duration: number }
  product?: ChatProduct
  status: MessageStatus
  isWithdrawn: boolean
  createdAt: string
  timestamp: number
  /** 是否本人发送（腾讯 SDK flow==='out'）；单聊页据此判断气泡左右 */
  isSelf?: boolean
}

/** 腾讯 IM SDK 消息 → 页面 ChatMessage（最小闭环：文本；其他类型占位提示） */
export function timToChatMessage(m: TimMessage): ChatMessage {
  const isText = m.type === 'TIMTextElem'
  return {
    id: m.ID,
    senderId: m.from,
    senderName: m.nick || '',
    senderAvatar: m.avatar || '',
    type: 'text',
    content: isText ? (m.payload?.text || '') : '[暂不支持的消息类型]',
    status: 'read',
    isWithdrawn: false,
    createdAt: formatMessageTime(m.time * 1000),
    timestamp: m.time * 1000,
    isSelf: m.flow === 'out',
  }
}

const AVA_ME = AVATAR('me')
const AVA_101 = AVATAR('im-101')

// @data-needs: 聊天对象信息, 参数 {targetId}, 返回 {ChatTarget}
export const mockChatTarget: ChatTarget = {
  id: 101,
  nickname: '张明德',
  avatar: AVA_101,
  remark: '八字师傅',
  isOnline: true,
  isBlocked: false,
  isFollowed: true,
  followsMe: true,
  relation: 'normal',
}

const HOUR = 3600000
// @data-needs: 聊天历史, 参数 {targetId, beforeMsgId, limit}, 返回 {messages:[ChatMessage], hasMore}
export const mockChatHistory: ChatMessage[] = [
  { id: 'msg_1', senderId: '101', senderName: '张明德', senderAvatar: AVA_101, type: 'text', content: '您好，请问有什么可以帮您的？', status: 'read', isWithdrawn: false, createdAt: '2026-06-03 09:00', timestamp: Date.now() - HOUR * 2 },
  { id: 'msg_2', senderId: '0', senderName: '我', senderAvatar: AVA_ME, type: 'text', content: '老师好，我想咨询一下八字命盘的问题', status: 'read', isWithdrawn: false, createdAt: '2026-06-03 09:05', timestamp: Date.now() - HOUR * 1.9 },
  { id: 'msg_3', senderId: '101', senderName: '张明德', senderAvatar: AVA_101, type: 'text', content: '好的，请您提供一下出生的年月日时，最好是农历和具体时辰', status: 'read', isWithdrawn: false, createdAt: '2026-06-03 09:08', timestamp: Date.now() - HOUR * 1.8 },
  { id: 'msg_4', senderId: '0', senderName: '我', senderAvatar: AVA_ME, type: 'text', content: '我是1990年农历三月初八，上午9点左右出生的', status: 'read', isWithdrawn: false, createdAt: '2026-06-03 09:15', timestamp: Date.now() - HOUR * 1.7 },
  { id: 'msg_5', senderId: '101', senderName: '张明德', senderAvatar: AVA_101, type: 'image', content: '', image: { url: '', thumbnail: '', width: 400, height: 300 }, status: 'read', isWithdrawn: false, createdAt: '2026-06-03 09:25', timestamp: Date.now() - HOUR * 1.5 },
  { id: 'msg_6', senderId: '101', senderName: '张明德', senderAvatar: AVA_101, type: 'text', content: '这是您的八字命盘，我来为您详细解读一下：\n\n您是庚午年生人，日主为甲木...', status: 'read', isWithdrawn: false, createdAt: '2026-06-03 09:30', timestamp: Date.now() - HOUR * 1.4 },
  { id: 'msg_7', senderId: '101', senderName: '张明德', senderAvatar: AVA_101, type: 'voice', content: '', voice: { url: '', duration: 45 }, status: 'read', isWithdrawn: false, createdAt: '2026-06-03 09:35', timestamp: Date.now() - HOUR * 1.3 },
  { id: 'msg_8', senderId: '0', senderName: '我', senderAvatar: AVA_ME, type: 'text', content: '太感谢老师了，分析得很详细！请问有没有推荐的学习资料？', status: 'read', isWithdrawn: false, createdAt: '2026-06-03 10:00', timestamp: Date.now() - HOUR },
  { id: 'msg_9', senderId: '101', senderName: '张明德', senderAvatar: AVA_101, type: 'card', content: '', product: { id: 1001, title: '八字命理入门到精通', cover: '', price: 199, originalPrice: 299 }, status: 'read', isWithdrawn: false, createdAt: '2026-06-03 10:05', timestamp: Date.now() - HOUR * 0.9 },
  { id: 'msg_10', senderId: '101', senderName: '张明德', senderAvatar: AVA_101, type: 'text', content: '推荐这门课程给您，是我亲自录制的，从基础到实战都有讲解', status: 'read', isWithdrawn: false, createdAt: '2026-06-03 10:06', timestamp: Date.now() - HOUR * 0.85 },
  { id: 'msg_11', senderId: '0', senderName: '我', senderAvatar: AVA_ME, type: 'text', content: '好的，那我们明天下午3点见面详谈', status: 'delivered', isWithdrawn: false, createdAt: '2026-06-03 10:30', timestamp: Date.now() - 1800000 },
]

/** 消息时间标签格式化 */
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

/** 相邻消息间隔 >5分钟才显示时间标签 */
export function shouldShowTimeLabel(currentTimestamp: number, prevTimestamp?: number): boolean {
  if (!prevTimestamp) return true
  return currentTimestamp - prevTimestamp > 5 * 60 * 1000
}

/** 2分钟内可撤回 */
export function canWithdrawMessage(timestamp: number): boolean {
  return Date.now() - timestamp < 2 * 60 * 1000
}

export interface ChatPermission {
  state: 'unrestricted' | 'replied' | 'waiting_reply' | 'can_greet' | 'blocked'
  canSend: boolean
  hint: string
  reason?: string
}

// 注：旧的前端本地权限推断 getChatPermission 已删除，私信权限统一由后端 /im/relation/:id 判定（toChatPermission）

// ============ 私信社交策略（后端 /im/relation/:id 真连） ============

/** 与目标用户的私信关系层级（与后端 ImPolicyService.ImRelation 对齐） */
export type ImRelation =
  | 'self'
  | 'blocked'
  | 'circle'
  | 'paid'
  | 'mutual'
  | 'following'
  | 'stranger'

/** 后端返回的私信关系与权限判定结果 */
export interface RelationPolicy {
  relation: ImRelation
  canSend: boolean
  /** 本会话剩余可发条数；-1 表示不限 */
  remaining: number
  mediaPerms: { image: boolean; voice: boolean; file: boolean }
  hint: string
  reason?: string
}

/** 将后端 RelationPolicy 映射为聊天页 UI 使用的 ChatPermission 状态 */
export function toChatPermission(p: RelationPolicy): ChatPermission {
  if (p.reason === 'blocked') {
    return { state: 'blocked', canSend: false, hint: p.hint, reason: p.reason }
  }
  if (p.canSend) {
    const unrestricted = p.relation === 'circle' || p.relation === 'paid' || p.relation === 'mutual'
    return {
      state: unrestricted ? 'unrestricted' : 'can_greet',
      canSend: true,
      hint: p.hint,
      reason: p.reason,
    }
  }
  if (p.reason === 'waiting_reply') {
    return { state: 'waiting_reply', canSend: false, hint: p.hint, reason: p.reason }
  }
  // 陌生人不可发 / 自己等其余不可发场景：统一禁用输入
  return { state: 'blocked', canSend: false, hint: p.hint, reason: p.reason }
}

// ============ 消息中心(im/messages) ============
// @data-needs: 消息中心列表, 参数 type(all|system|interaction|transaction|service), 返回 NotifyMessage[]
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

export interface MessageUnreadCounts {
  interaction: number
  system: number
  income: number
  transaction: number
  service: number
  total: number
}

export const messageTabs: Array<{ key: NotifyType; label: string; icon: string }> = [
  { key: 'system', label: '系统通知', icon: 'bell' },
  { key: 'interaction', label: '互动消息', icon: 'heart' },
  { key: 'transaction', label: '交易消息', icon: 'credit-card' },
  { key: 'service', label: '客服消息', icon: 'headphones' },
]

export const mockUnreadCounts: MessageUnreadCounts = {
  system: 2,
  interaction: 3,
  transaction: 1,
  service: 0,
  income: 0,
  total: 6,
}

// ───────── 后端通知 → 前端 NotifyMessage 映射（真连 /notifications） ─────────

/** 后端 Notification 原始结构（DMMF 权威字段：type 为自由 String） */
interface RawNotification {
  id: string
  type: string
  title: string
  content: string
  targetType?: string | null
  targetId?: string | null
  isRead: boolean
  createdAt: string
}

/** 后端自由 type(String) → 前端四类 NotifyType（宽松关键词匹配 + 兜底 system；收益类并入交易 tab 避免隐形） */
function mapNotifyType(t: string): NotifyType {
  const s = (t || '').toUpperCase()
  if (/COMMENT|REPLY|LIKE|COLLECT|FAVORITE|FOLLOW|MENTION/.test(s)) return 'interaction'
  if (/EARN|INCOME|SETTLE|WITHDRAW|COMMISSION|REVENUE|ORDER|REFUND|LOGISTIC|SHIP|PAY|TRADE|DELIVER|RECHARGE/.test(s)) return 'transaction'
  if (/SERVICE|SUPPORT|CUSTOMER|KEFU/.test(s)) return 'service'
  return 'system'
}

/** 后端 type → 中文分类标签 */
function notifyCategory(t: string): string {
  const s = (t || '').toUpperCase()
  const map: Record<string, string> = {
    COMMENT: '评论', REPLY: '评论', LIKE: '点赞', COLLECT: '收藏', FAVORITE: '收藏',
    FOLLOW: '关注', MENTION: '提及',
    ORDER: '订单', REFUND: '退款', LOGISTIC: '物流', RECHARGE: '充值', PAY: '支付',
    EARN: '收益', INCOME: '收益', WITHDRAW: '提现', COMMISSION: '分成',
    SERVICE: '客服', SYSTEM: '系统',
  }
  for (const key of Object.keys(map)) {
    if (s.includes(key)) return map[key]
  }
  return '通知'
}

/** targetType/targetId → 站内跳转链接（已知类型才给，未知返回 undefined 诚实降级） */
function notifyLink(targetType?: string | null, targetId?: string | null): string | undefined {
  if (!targetType || !targetId) return undefined
  const t = targetType.toUpperCase()
  if (t.includes('COURSE')) return `/pkg-course/detail?id=${targetId}`
  if (t.includes('ARTICLE') || t.includes('POST')) return `/pkg-circle/articles/detail?id=${targetId}`
  if (t.includes('ORDER')) return `/pkg-order/detail?id=${targetId}`
  if (t.includes('CIRCLE')) return `/pkg-circle/detail?id=${targetId}`
  if (t.includes('LIVE')) return `/pkg-live/vertical/index?id=${targetId}`
  return undefined
}

/** 单条后端通知 → 前端展示模型 */
function toNotifyMessage(n: RawNotification): NotifyMessage {
  return {
    id: n.id,
    type: mapNotifyType(n.type),
    category: notifyCategory(n.type),
    title: n.title,
    content: n.content,
    time: formatMessageTime(new Date(n.createdAt).getTime()),
    isRead: n.isRead,
    link: notifyLink(n.targetType, n.targetId),
  }
}

/** 按 NotifyType 聚合未读数（tab badge 用）；total 取后端权威总未读 */
function buildUnreadCounts(list: NotifyMessage[], totalUnread: number): MessageUnreadCounts {
  const c: MessageUnreadCounts = { system: 0, interaction: 0, transaction: 0, service: 0, income: 0, total: totalUnread }
  for (const m of list) {
    if (m.isRead) continue
    if (m.type === 'system') c.system++
    else if (m.type === 'interaction') c.interaction++
    else if (m.type === 'transaction') c.transaction++
    else if (m.type === 'service') c.service++
    else if (m.type === 'income') c.income++
  }
  return c
}

export const mockNotifyMessages: NotifyMessage[] = [
  // 系统通知
  { id: 'm1', type: 'system', category: '直播', title: '直播开播提醒', content: '您关注的「张明远·易学研究员」正在直播《周易》六十四卦精讲，快去看看吧。', time: '10分钟前', isRead: false, link: '/pkg-live/vertical/index' },
  { id: 'm2', type: 'system', category: '课程', title: '课程更新通知', content: '您购买的《八字命理入门》已更新第12讲：泰卦与否卦，点击继续学习。', time: '2小时前', isRead: false, link: '/pkg-course/detail' },
  { id: 'm3', type: 'system', category: '系统', title: '账号安全提醒', content: '您的账号于01月15日 09:23在新设备登录，如非本人操作请及时修改密码。', time: '01月15日', isRead: true, link: '/pkg-mine/security' },
  { id: 'm4', type: 'system', category: '活动', title: '新春祈福活动开启', content: '甲辰龙年新春祈福活动现已开启，参与即可领取专属开运礼包。', time: '01月12日', isRead: true },

  // 互动消息
  { id: 'm5', type: 'interaction', category: '评论', title: '玄机子', content: '回复了你的帖子：「这篇关于紫微斗数的解读很到位，受教了。」', time: '30分钟前', isRead: false, avatar: '/static/images/circles/circle-1.jpg', link: '/pkg-circle/articles/detail' },
  { id: 'm6', type: 'interaction', category: '点赞', title: '清风道长', content: '赞了你的文章《五行调和与日常养生》', time: '1小时前', isRead: false, avatar: '/static/images/circles/circle-2.jpg' },
  { id: 'm7', type: 'interaction', category: '关注', title: '紫微星君', content: '关注了你', time: '3小时前', isRead: false, avatar: '/static/images/circles/circle-3.jpg', link: '/pages/profile' },
  { id: 'm8', type: 'interaction', category: '点赞', title: '问道居士', content: '赞了你在「八字命理」圈子的评论', time: '01月14日', isRead: true, avatar: '/static/images/circles/circle-4.jpg' },

  // 交易消息
  { id: 'm9', type: 'transaction', category: '订单', title: '订单发货通知', content: '您购买的「开光招财貔貅摆件」已发货，物流单号 SF1234567890，请注意查收。', time: '1小时前', isRead: false, link: '/pkg-order/detail' },
  { id: 'm10', type: 'transaction', category: '退款', title: '退款处理完成', content: '您申请的订单退款 ¥299.00 已原路退回，预计1-3个工作日到账。', time: '01月13日', isRead: true, link: '/pkg-order/refund' },
  { id: 'm11', type: 'transaction', category: '物流', title: '商品已签收', content: '您的订单「天然黑曜石手串」已签收，期待您的评价。', time: '01月11日', isRead: true, link: '/pkg-order/review' },

  // 客服消息
  { id: 'm12', type: 'service', category: '客服', title: '在线客服', content: '您好，关于您咨询的开光商品保养问题，我们已为您整理了详细说明，请查收。', time: '01月10日', isRead: true, link: '/pkg-agent/agent/customer-service' },
]

// ============ 群聊（腾讯 TIM SDK 为真源：群资料/成员/历史/收发；id 均为字符串 groupID/userID）============

export type GroupRole = 'owner' | 'admin' | 'member'

export interface GroupMember {
  /** 腾讯 IM userID（字符串） */
  id: string
  nickname: string
  remark?: string
  avatar: string
  role: GroupRole
}

export interface GroupNoticeDetail {
  publisher: string
  publishedAt: string
  content: string
}

export interface GroupDetail {
  /** 腾讯 IM groupID（字符串） */
  id: string
  name: string
  avatar: string
  memberCount: number
  notice?: string
  noticeDetail?: GroupNoticeDetail
  myRole: GroupRole
  ownerId?: string
}

export interface GroupChatMessage {
  id: string
  /** 发送者 userID（字符串） */
  senderId: string
  senderName: string
  senderAvatar: string
  senderRole?: GroupRole
  type: 'text' | 'image' | 'voice'
  content: string
  image?: { url: string }
  voice?: { duration: number }
  atMembers?: string[]
  atAll?: boolean
  status?: 'sending' | 'delivered' | 'read' | 'failed'
  isWithdrawn: boolean
  createdAt: string
  timestamp: number
  /** 是否本人发送（SDK flow==='out'）；群聊气泡据此判断左右，不再依赖固定 CURRENT_USER_ID */
  isSelf?: boolean
}

// 群角色中文名
export function getGroupRoleName(role?: GroupRole): string {
  switch (role) {
    case 'owner':
      return '群主'
    case 'admin':
      return '管理员'
    default:
      return '成员'
  }
}

/** SDK 群角色（Owner|Admin|Member）→ 前端 GroupRole */
function timGroupRole(r?: string): GroupRole {
  const s = (r || '').toLowerCase()
  if (s === 'owner') return 'owner'
  if (s === 'admin') return 'admin'
  return 'member'
}

/** 腾讯 IM 群资料 → 群详情（公告仅有纯文本，无发布人/时间元数据，诚实降级） */
export function timToGroupDetail(g: TimGroup): GroupDetail {
  const notice = g.notification || undefined
  return {
    id: g.groupID,
    name: g.name || g.groupID,
    avatar: g.avatar || '',
    memberCount: g.memberCount || 0,
    notice,
    noticeDetail: notice ? { publisher: '', publishedAt: '', content: notice } : undefined,
    myRole: timGroupRole(g.selfInfo?.role),
    ownerId: g.ownerID,
  }
}

/** 腾讯 IM 群成员 → 前端 GroupMember（优先群名片 nameCard，其次昵称） */
export function timToGroupMember(m: TimGroupMember): GroupMember {
  return {
    id: m.userID,
    nickname: m.nameCard || m.nick || m.userID.slice(0, 8),
    avatar: m.avatar || '',
    role: timGroupRole(m.role),
  }
}

/** 腾讯 IM 群消息 → 群聊气泡（最小闭环：文本；其他类型占位提示） */
export function timToGroupChatMessage(m: TimMessage): GroupChatMessage {
  const isText = m.type === 'TIMTextElem'
  return {
    id: m.ID,
    senderId: m.from,
    senderName: m.nick || m.from.slice(0, 8),
    senderAvatar: m.avatar || '',
    type: 'text',
    content: isText ? (m.payload?.text || '') : '[暂不支持的消息类型]',
    isWithdrawn: false,
    createdAt: formatMessageTime(m.time * 1000),
    timestamp: m.time * 1000,
    isSelf: m.flow === 'out',
  }
}

// @ 成员搜索（在已加载的群成员中过滤，不再依赖 mock）
export function searchGroupMembersForAt(members: GroupMember[], keyword: string): GroupMember[] {
  const k = keyword.trim()
  if (!k) return members
  return members.filter((m) => (m.remark || m.nickname).includes(k))
}

// ========== 群设置 / 群管理权限（群资料页）==========

export interface GroupSettings {
  myNickname: string
  isMuted: boolean
  isPinned: boolean
  showMemberNickname: boolean
  savedToContacts: boolean
}

export interface GroupPermissions {
  canInvite: boolean
  canRemoveMember: boolean
  canSetAdmin: boolean
  canUpdateNotice: boolean
  canDismiss: boolean
  canTransfer: boolean
}

// 根据我的角色计算群管理权限
export function getGroupPermissions(myRole: GroupRole): GroupPermissions {
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

// ========== 通讯录相关 ==========

export interface FriendItem {
  id: number
  nickname: string
  avatar: string
  remark?: string
  signature?: string
  isOnline: boolean
  lastActiveAt?: string
  pinyinInitial?: string
}

export interface FriendGroup {
  letter: string
  friends: FriendItem[]
}

const friendAvatar = (i: number) => `/static/images/circles/circle-${(i % 3) + 1}.jpg`

// @data-needs: 通讯录好友列表(带拼音首字母), 返回 FriendItem[]
export const mockFriendsWithPinyin: FriendItem[] = [
  { id: 101, nickname: '安然', avatar: friendAvatar(0), isOnline: true, pinyinInitial: 'A', signature: '国学爱好者' },
  { id: 102, nickname: '白云', avatar: friendAvatar(1), isOnline: false, pinyinInitial: 'B', lastActiveAt: '3小时前' },
  { id: 103, nickname: '陈明', avatar: friendAvatar(2), isOnline: true, pinyinInitial: 'C', remark: '八字老师' },
  { id: 104, nickname: '陈思远', avatar: friendAvatar(3), isOnline: false, pinyinInitial: 'C', lastActiveAt: '昨天' },
  { id: 105, nickname: '丁一', avatar: friendAvatar(4), isOnline: true, pinyinInitial: 'D' },
  { id: 106, nickname: '方圆', avatar: friendAvatar(5), isOnline: false, pinyinInitial: 'F', lastActiveAt: '2天前' },
  { id: 107, nickname: '高远', avatar: friendAvatar(6), isOnline: true, pinyinInitial: 'G', signature: '风水师' },
  { id: 108, nickname: '韩雪', avatar: friendAvatar(7), isOnline: false, pinyinInitial: 'H', remark: '易经学员' },
  { id: 109, nickname: '黄晓明', avatar: friendAvatar(8), isOnline: true, pinyinInitial: 'H' },
  { id: 110, nickname: '江涛', avatar: friendAvatar(9), isOnline: false, pinyinInitial: 'J', lastActiveAt: '1小时前' },
  { id: 111, nickname: '李明德', avatar: friendAvatar(10), isOnline: true, pinyinInitial: 'L', remark: '张老师', signature: '传道授业' },
  { id: 112, nickname: '刘思远', avatar: friendAvatar(11), isOnline: false, pinyinInitial: 'L' },
  { id: 113, nickname: '马腾', avatar: friendAvatar(12), isOnline: true, pinyinInitial: 'M' },
  { id: 114, nickname: '欧阳修', avatar: friendAvatar(13), isOnline: false, pinyinInitial: 'O', signature: '诗词爱好者' },
  { id: 115, nickname: '秦风', avatar: friendAvatar(14), isOnline: true, pinyinInitial: 'Q' },
  { id: 116, nickname: '孙悟空', avatar: friendAvatar(15), isOnline: false, pinyinInitial: 'S', lastActiveAt: '5分钟前' },
  { id: 117, nickname: '唐三藏', avatar: friendAvatar(16), isOnline: true, pinyinInitial: 'T' },
  { id: 118, nickname: '王老师', avatar: friendAvatar(17), isOnline: true, pinyinInitial: 'W', signature: '国学导师' },
  { id: 119, nickname: '吴承恩', avatar: friendAvatar(18), isOnline: false, pinyinInitial: 'W' },
  { id: 120, nickname: '徐志摩', avatar: friendAvatar(19), isOnline: false, pinyinInitial: 'X', lastActiveAt: '昨天' },
  { id: 121, nickname: '杨过', avatar: friendAvatar(20), isOnline: true, pinyinInitial: 'Y' },
  { id: 122, nickname: '张无忌', avatar: friendAvatar(21), isOnline: false, pinyinInitial: 'Z', remark: '武学爱好者' },
  { id: 123, nickname: '周芷若', avatar: friendAvatar(22), isOnline: true, pinyinInitial: 'Z' },
  { id: 124, nickname: '赵敏', avatar: friendAvatar(23), isOnline: false, pinyinInitial: 'Z', signature: '蒙古郡主' },
]

// 按首字母分组好友
export function groupFriendsByLetter(friends: FriendItem[]): FriendGroup[] {
  const groups: Record<string, FriendItem[]> = {}
  friends.forEach((friend) => {
    const letter = friend.pinyinInitial?.toUpperCase() || '#'
    if (!groups[letter]) groups[letter] = []
    groups[letter].push(friend)
  })
  const sortedLetters = Object.keys(groups).sort((a, b) => {
    if (a === '#') return 1
    if (b === '#') return -1
    return a.localeCompare(b)
  })
  return sortedLetters.map((letter) => ({
    letter,
    friends: groups[letter].sort((a, b) =>
      (a.remark || a.nickname).localeCompare(b.remark || b.nickname),
    ),
  }))
}

// 搜索好友（昵称/备注/拼音首字母）
export function searchFriends(keyword: string): FriendItem[] {
  return mockFriendsWithPinyin.filter(
    (f) =>
      f.nickname.includes(keyword) ||
      f.remark?.includes(keyword) ||
      f.pinyinInitial?.toLowerCase() === keyword.toLowerCase(),
  )
}

// 字母索引列表
export function getLetterIndexList(groups: FriendGroup[]): string[] {
  return groups.map((g) => g.letter)
}

// ========== 群聊列表相关 ==========

export interface GroupListItem {
  /** 腾讯 IM groupID（字符串） */
  id: string
  name: string
  avatar: string
  ownerId?: string
  ownerName?: string
  memberCount: number
  maxMembers?: number
  lastMessage?: { content: string; senderName: string; time: string }
  unreadCount: number
  isPinned: boolean
  isMuted: boolean
  myRole: GroupRole
  notice?: string
  createdAt?: string
}

// ========== 好友请求相关 ==========

export type FriendRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface FriendRequestUser {
  id: number
  nickname: string
  avatar: string
  signature?: string
}

export interface FriendRequestItem {
  id: number
  fromUser: FriendRequestUser
  message?: string
  status: FriendRequestStatus
  createdAt: string
  processedAt?: string
  rejectReason?: string
}

export interface FriendRequestsResponse {
  pending: FriendRequestItem[]
  processed: FriendRequestItem[]
  totalPending: number
}

// @data-needs: 好友请求列表
export const mockFriendRequests: FriendRequestItem[] = [
  {
    id: 1,
    fromUser: { id: 201, nickname: '周易爱好者', avatar: friendAvatar(0), signature: '研究周易五年，求交流' },
    message: '您好，我是周易爱好者，想向您请教八字命理的问题',
    status: 'pending',
    createdAt: '2026-06-03 10:30',
  },
  {
    id: 2,
    fromUser: { id: 202, nickname: '风水学徒', avatar: friendAvatar(1), signature: '初学风水，多多指教' },
    message: '老师好，看了您的风水课程很受启发',
    status: 'pending',
    createdAt: '2026-06-03 09:15',
  },
  {
    id: 3,
    fromUser: { id: 203, nickname: '国学新人', avatar: friendAvatar(2) },
    status: 'pending',
    createdAt: '2026-06-02 18:40',
  },
  {
    id: 4,
    fromUser: { id: 204, nickname: '紫微斗数研究者', avatar: friendAvatar(0), signature: '紫微斗数十年经验' },
    message: '希望能加您好友，一起探讨紫微斗数',
    status: 'approved',
    createdAt: '2026-06-01 14:20',
    processedAt: '2026-06-01 15:00',
  },
  {
    id: 5,
    fromUser: { id: 205, nickname: '测试用户', avatar: friendAvatar(1) },
    message: '请加我好友',
    status: 'rejected',
    createdAt: '2026-05-30 10:00',
    processedAt: '2026-05-30 12:00',
    rejectReason: '暂时不加陌生人',
  },
]

// 获取好友请求列表（分待处理/已处理）
export function getFriendRequestsData(): FriendRequestsResponse {
  const pending = mockFriendRequests.filter((r) => r.status === 'pending')
  const processed = mockFriendRequests.filter((r) => r.status !== 'pending')
  return { pending, processed, totalPending: pending.length }
}

// 请求状态文本
export function getRequestStatusText(status: FriendRequestStatus): string {
  switch (status) {
    case 'approved':
      return '已同意'
    case 'rejected':
      return '已拒绝'
    case 'expired':
      return '已过期'
    default:
      return '待处理'
  }
}

// ============ API 层 ============

export const imApi = {
  /** 查询与目标用户的私信关系与权限（真连，错误向上抛由页面走三态，不回退假数据） */
  async getRelationPolicy(targetId: string): Promise<RelationPolicy> {
    return await apiGet<RelationPolicy>(`/im/relation/${targetId}`)
  },

  /** 获取会话列表（TIM SDK 为真源：列表/未读/置顶/免打扰；错误向上抛走三态） */
  async getConversations(): Promise<ConversationItem[]> {
    const list = await useTim().getConversationList()
    return list.map(timConvToConversationItem).filter((c): c is ConversationItem => c !== null)
  },

  /** 置顶/取消置顶会话（TIM SDK） */
  async pinConversation(conversationID: string, isPinned: boolean): Promise<void> {
    await useTim().pinConversation(conversationID, isPinned)
  },

  /** 会话免打扰开关（TIM SDK） */
  async muteConversation(conv: ConversationItem, mute: boolean): Promise<void> {
    await useTim().setConversationMute(
      { type: conv.type === 'group' ? 'GROUP' : 'C2C', id: conv.targetId },
      mute,
    )
  },

  /** 删除会话（TIM SDK，聊天记录一并清除） */
  async deleteConversation(conversationID: string): Promise<void> {
    await useTim().deleteConversation(conversationID)
  },

  /** 获取聊天对象信息 */
  async getChatTarget(_targetId: number): Promise<ChatTarget> {
    if (true) return mockChatTarget
    try { return await apiGet<ChatTarget>(`/im/chat-target/${_targetId}`) } catch { return mockChatTarget }
  },

  /** 获取聊天历史 */
  async getChatHistory(_targetId: number, _beforeMsgId?: string, _limit?: number): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
    if (true) return { messages: mockChatHistory, hasMore: false }
    try { return await apiGet<{ messages: ChatMessage[]; hasMore: boolean }>(`/im/chat-history/${_targetId}`) } catch { return { messages: mockChatHistory, hasMore: false } }
  },

  /** 发送消息 */
  async sendMessage(_targetId: number, _content: string, _type: string = 'text'): Promise<ChatMessage | null> {
    if (true) return null
    try { return await apiPost<ChatMessage>(`/im/send/${_targetId}`, { content: _content, type: _type }) } catch { return null }
  },

  /** 获取通知消息列表（真连 /notifications，映射为前端展示模型；错误向上抛走三态，不回退假数据） */
  async getMessages(): Promise<{ list: NotifyMessage[]; unreadCounts: MessageUnreadCounts }> {
    const res = await apiGet<{ notifications: RawNotification[]; total: number; unreadCount: number }>(
      '/notifications?page=1&pageSize=50',
    )
    const list = (res.notifications || []).map(toNotifyMessage)
    return { list, unreadCounts: buildUnreadCounts(list, res.unreadCount ?? 0) }
  },

  /** 标记单条通知已读 */
  async markNotifyRead(id: string): Promise<void> {
    await apiPut(`/notifications/${id}/read`)
  },

  /** 全部通知标记已读 */
  async markAllNotifyRead(): Promise<void> {
    await apiPut('/notifications/read-all')
  },

  /** 获取群详情（TIM SDK getGroupProfile；错误向上抛走三态） */
  async getGroupDetail(groupId: string): Promise<GroupDetail> {
    const g = await useTim().getGroupProfile(groupId)
    return timToGroupDetail(g)
  },

  /** 获取群成员列表（TIM SDK getGroupMemberList） */
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const list = await useTim().getGroupMemberList(groupId)
    return list.map(timToGroupMember)
  },

  /** 获取群聊历史消息（TIM SDK getMessageList；分页游标 nextReqMessageID） */
  async getGroupChatHistory(groupId: string, nextReqMessageID?: string): Promise<{ messages: GroupChatMessage[]; nextReqMessageID: string; isCompleted: boolean }> {
    const res = await useTim().getGroupHistory(groupId, nextReqMessageID)
    return {
      messages: res.messageList.map(timToGroupChatMessage),
      nextReqMessageID: res.nextReqMessageID,
      isCompleted: res.isCompleted,
    }
  },

  /** 发送群消息（TIM SDK sendMessage，实时下发群内成员），返回落地消息 */
  async sendGroupMessage(groupId: string, content: string): Promise<GroupChatMessage> {
    const msg = await useTim().sendGroupText(groupId, content)
    return timToGroupChatMessage(msg)
  },

  /** 标记群会话已读（TIM SDK） */
  async markGroupRead(groupId: string): Promise<void> {
    await useTim().setGroupRead(groupId)
  },

  /** 退出群聊（TIM SDK quitGroup；群主不可退出，需解散） */
  async quitGroup(groupId: string): Promise<void> {
    await useTim().quitGroup(groupId)
  },

  /** 群会话置顶（TIM SDK；conversationID=GROUP{groupId}） */
  async setGroupPin(groupId: string, isPinned: boolean): Promise<void> {
    await useTim().pinConversation(`GROUP${groupId}`, isPinned)
  },

  /** 群会话免打扰（TIM SDK） */
  async setGroupMute(groupId: string, mute: boolean): Promise<void> {
    await useTim().setConversationMute({ type: 'GROUP', id: groupId }, mute)
  },

  /** 获取群聊列表（TIM SDK 群名录 + 会话列表合并补齐未读/最后一条） */
  async getGroupList(): Promise<GroupListItem[]> {
    const tim = useTim()
    const [groups, convs] = await Promise.all([tim.getJoinedGroupList(), tim.getConversationList()])
    const convMap = new Map<string, TimConversation>()
    for (const c of convs) {
      if (c.type === 'GROUP' && c.groupProfile) convMap.set(c.groupProfile.groupID, c)
    }
    return groups.map((g) => {
      const c = convMap.get(g.groupID)
      const last = c?.lastMessage
      const lastTimeMs = (last?.lastTime || 0) * 1000
      return {
        id: g.groupID,
        name: g.name || g.groupID,
        avatar: g.avatar || '',
        ownerId: g.ownerID,
        memberCount: g.memberCount || 0,
        maxMembers: g.maxMemberCount,
        lastMessage: last
          ? { content: last.messageForShow || '', senderName: last.nick || '', time: lastTimeMs ? formatMessageTime(lastTimeMs) : '' }
          : undefined,
        unreadCount: c?.unreadCount || 0,
        isPinned: !!c?.isPinned,
        isMuted: c?.messageRemindType === 'AcceptNotNotify',
        myRole: timGroupRole(g.selfInfo?.role),
      }
    })
  },

  /** 获取好友列表 */
  async getFriends(): Promise<FriendItem[]> {
    if (true) return mockFriendsWithPinyin
    try { return await apiGet<FriendItem[]>('/im/friends') } catch { return mockFriendsWithPinyin }
  },

  /** 获取好友请求列表 */
  async getFriendRequests(): Promise<FriendRequestsResponse> {
    if (true) return getFriendRequestsData()
    try { return await apiGet<FriendRequestsResponse>('/im/friend-requests') } catch { return getFriendRequestsData() }
  },

  /** 处理好友请求（同意/拒绝） */
  async handleFriendRequest(_requestId: number, _action: 'approve' | 'reject'): Promise<boolean> {
    if (true) return true
    try { await apiPost(`/im/friend-requests/${_requestId}/${_action}`, {}); return true } catch { return false }
  },

  /** 获取群设置（TIM SDK：群名片=我的群昵称，会话态=免打扰/置顶；成员昵称展示/保存通讯录 SDK 无对应项，默认开启诚实降级） */
  async getGroupSettings(groupId: string): Promise<GroupSettings> {
    const tim = useTim()
    const [g, convs] = await Promise.all([tim.getGroupProfile(groupId), tim.getConversationList()])
    const c = convs.find((x) => x.type === 'GROUP' && x.groupProfile?.groupID === groupId)
    return {
      myNickname: g.selfInfo?.nameCard || '',
      isMuted: c?.messageRemindType === 'AcceptNotNotify',
      isPinned: !!c?.isPinned,
      showMemberNickname: true,
      savedToContacts: true,
    }
  },
}
