// 黑名单用户项
export interface BlacklistItem {
  id: number
  // 用户ID
  userId: number
  // 用户昵称
  nickname: string
  // 用户头像
  avatar: string
  // 拉黑时间
  blockedAt: string
  // 拉黑原因（可选）
  reason?: string
}

// 黑名单列表响应
export interface BlacklistResponse {
  list: BlacklistItem[]
  total: number
  hasMore: boolean
}

// 搜索用户结果项（用于添加黑名单）
export interface SearchUserItem {
  id: number
  nickname: string
  avatar: string
  // 是否已在黑名单
  isBlocked: boolean
}

// 搜索用户响应
export interface SearchUserResponse {
  list: SearchUserItem[]
  total: number
}
