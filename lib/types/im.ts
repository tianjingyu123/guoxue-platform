// IM 会话相关类型定义

// 会话类型
export type ConversationType = 'private' | 'group' | 'system' | 'service'

// 消息类型
export type MessageContentType = 'text' | 'image' | 'voice' | 'video' | 'file' | 'location' | 'card' | 'system'

// 会话项
export interface ConversationItem {
  id: string
  type: ConversationType
  // 对方信息（私聊）或群信息（群聊）
  targetId: number
  targetName: string
  targetAvatar: string
  // 群聊额外信息
  memberCount?: number
  // 最后一条消息
  lastMessage: {
    type: MessageContentType
    content: string           // 文本内容或摘要
    senderId: number
    senderName?: string       // 群聊显示发送者
    time: string
  }
  // 未读数
  unreadCount: number
  // 是否置顶
  isPinned: boolean
  // 是否免打扰
  isMuted: boolean
  // 草稿
  draft?: string
  // 更新时间（用于排序）
  updatedAt: string
}

// 会话列表响应
export interface ConversationsResponse {
  list: ConversationItem[]
  totalUnread: number
}

// 好友信息
export interface FriendItem {
  id: number
  nickname: string
  avatar: string
  remark?: string           // 备注名
  signature?: string        // 个性签名
  isOnline: boolean
  lastActiveAt?: string
  // 拼音首字母（用于索引）
  pinyin?: string
  pinyinInitial?: string
}

// 好友列表响应
export interface FriendsResponse {
  list: FriendItem[]
  total: number
}

// 好友分组（按首字母）
export interface FriendGroup {
  letter: string
  friends: FriendItem[]
}

// 搜索结果
export interface ConversationSearchResult {
  conversations: ConversationItem[]
  friends: FriendItem[]
}

// ========== 私聊消息相关 ==========

// 消息状态
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

// 商品卡片
export interface ProductCard {
  id: number
  title: string
  cover: string
  price: number
  originalPrice?: number
}

// 聊天消息
export interface ChatMessage {
  id: string
  // 发送者信息
  senderId: number
  senderName: string
  senderAvatar: string
  // 消息内容
  type: MessageContentType
  content: string
  // 图片消息
  image?: {
    url: string
    thumbnail?: string
    width?: number
    height?: number
  }
  // 语音消息
  voice?: {
    url: string
    duration: number  // 秒
  }
  // 商品卡片
  product?: ProductCard
  // 消息状态
  status: MessageStatus
  // 是否已撤回
  isWithdrawn: boolean
  // 时间
  createdAt: string
  timestamp: number
}

// 聊天对象信息
export interface ChatTarget {
  id: number
  nickname: string
  avatar: string
  remark?: string
  isOnline: boolean
  lastActiveAt?: string
  // 是否在黑名单
  isBlocked: boolean
  // 我是否已关注对方
  isFollowed: boolean
  // 对方是否关注我
  followsMe?: boolean
  // 特殊关系（圈主-成员），不受好友关系消息限制
  // 'circle_owner'：对方是圈主，我是成员；'circle_member'：对方是我圈子的成员，我是圈主
  relation?: 'normal' | 'circle_owner' | 'circle_member'
}

// 私聊消息权限状态
export type ChatPermissionState =
  | 'unrestricted'   // 自由聊天（互关 / 圈主成员关系）
  | 'can_greet'      // 可发送1条打招呼消息
  | 'waiting_reply'  // 已发出招呼消息，等待对方回复
  | 'replied'        // 对方已回复，可继续聊天
  | 'blocked'        // 已拉黑

export interface ChatPermission {
  state: ChatPermissionState
  canSend: boolean        // 输入框是否可用
  hint: string            // 输入框下方提示文案
  reason?: string         // 不可发送的原因
}

// 聊天历史响应
export interface ChatHistoryResponse {
  messages: ChatMessage[]
  hasMore: boolean
  oldestMsgId?: string
}

// 发送消息请求
export interface SendMessageRequest {
  targetId: number
  type: MessageContentType
  content?: string
  imageUrl?: string
  voiceUrl?: string
  voiceDuration?: number
  productId?: number
}

// 发送消息响应
export interface SendMessageResponse {
  messageId: string
  timestamp: number
}

// ========== 好友请求相关 ==========

// 好友请求状态
export type FriendRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired'

// 好友请求项
export interface FriendRequestItem {
  id: number
  // 请求发起者
  fromUser: {
    id: number
    nickname: string
    avatar: string
    signature?: string
  }
  // 附加消息
  message?: string
  // 状态
  status: FriendRequestStatus
  // 请求时间
  createdAt: string
  // 处理时间
  processedAt?: string
  // 拒绝理由
  rejectReason?: string
}

// 好友请求列表响应
export interface FriendRequestsResponse {
  pending: FriendRequestItem[]
  processed: FriendRequestItem[]
  totalPending: number
}

// ========== 群聊相关 ==========

// 群聊角色
export type GroupRole = 'owner' | 'admin' | 'member'

// 群聊成员
export interface GroupMember {
  id: number
  nickname: string
  avatar: string
  role: GroupRole
  joinedAt: string
  remark?: string
}

// 群聊信息
export interface GroupItem {
  id: number
  name: string
  avatar: string
  // 群主
  ownerId: number
  ownerName: string
  // 成员数
  memberCount: number
  maxMembers: number
  // 最后消息
  lastMessage?: {
    content: string
    senderName: string
    time: string
  }
  // 未读数
  unreadCount: number
  // 是否置顶
  isPinned: boolean
  // 是否免打扰
  isMuted: boolean
  // 我的角色
  myRole: GroupRole
  // 群公告
  notice?: string
  // 创建时间
  createdAt: string
}

// 群聊列表响应
export interface GroupListResponse {
  list: GroupItem[]
  total: number
}

// ========== 群聊对话相关 ==========

// 群聊详情
export interface GroupDetail extends GroupItem {
  // 群简介
  description?: string
  // 群公告详情
  noticeDetail?: {
    content: string
    publisher: string
    publishedAt: string
  }
  // 是否允许成员邀请
  allowMemberInvite: boolean
  // 是否需要验证
  needApproval: boolean
  // 群成员列表（部分）
  members: GroupMember[]
}

// 群聊消息
export interface GroupChatMessage {
  id: string
  // 发送者
  senderId: number
  senderName: string
  senderAvatar: string
  senderRole?: GroupRole
  // 消息内容
  type: MessageContentType
  content: string
  // 图片
  image?: {
    url: string
    thumbnail?: string
    width?: number
    height?: number
  }
  // 语音
  voice?: {
    url: string
    duration: number
  }
  // @的成员
  atMembers?: number[]
  atAll?: boolean
  // 状态
  status: MessageStatus
  isWithdrawn: boolean
  // 时间
  createdAt: string
  timestamp: number
}

// 群聊历史响应
export interface GroupChatHistoryResponse {
  messages: GroupChatMessage[]
  hasMore: boolean
  oldestMsgId?: string
}

// 发送群消息请求
export interface SendGroupMessageRequest {
  groupId: number
  type: MessageContentType
  content?: string
  imageUrl?: string
  voiceUrl?: string
  voiceDuration?: number
  atMembers?: number[]
  atAll?: boolean
}

// ========== 群详情管理相关 ==========

// 群设置
export interface GroupSettings {
  // 我的群昵称
  myNickname?: string
  // 消息免打扰
  isMuted: boolean
  // 置顶聊天
  isPinned: boolean
  // 显示群成员昵称
  showMemberNickname: boolean
  // 保存到通讯录
  savedToContacts: boolean
}

// 群管理操作类型
export type GroupManageAction = 'remove' | 'setAdmin' | 'removeAdmin' | 'transfer'

// 群管理权限
export interface GroupPermissions {
  canInvite: boolean
  canRemoveMember: boolean
  canSetAdmin: boolean
  canUpdateNotice: boolean
  canDismiss: boolean
  canTransfer: boolean
}
