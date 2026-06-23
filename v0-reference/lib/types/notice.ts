// 公告相关类型定义

// 公告类型
export type NoticeType = 'system' | 'update' | 'activity' | 'maintenance' | 'policy'

// 公告状态
export type NoticeStatus = 'published' | 'draft' | 'archived'

// 公告项
export interface NoticeItem {
  id: number
  title: string
  summary: string
  content: string
  type: NoticeType
  // 是否置顶
  isPinned: boolean
  // 是否已读
  isRead: boolean
  // 发布时间
  publishedAt: string
  // 创建时间
  createdAt: string
  // 阅读数
  viewCount: number
  // 封面图（可选）
  cover?: string
}

// 公告列表响应
export interface NoticeListResponse {
  list: NoticeItem[]
  total: number
  hasMore: boolean
}

// 公告详情
export interface NoticeDetail extends NoticeItem {
  // 富文本内容
  htmlContent: string
  // 附件
  attachments?: {
    name: string
    url: string
    size: number
  }[]
  // 相关公告
  relatedNotices?: {
    id: number
    title: string
  }[]
}

// ========== 系统升级公告相关 ==========

// 升级内容项类型
export type UpgradeItemType = 'feature' | 'optimization' | 'fix' | 'security'

// 升级内容项
export interface UpgradeItem {
  type: UpgradeItemType
  title: string
  description?: string
}

// 系统升级公告
export interface UpgradeNotice {
  id: number
  // 版本信息
  version: string
  versionName?: string
  // 标题和描述
  title: string
  subtitle?: string
  // 升级内容分类
  features: UpgradeItem[]      // 新功能
  optimizations: UpgradeItem[] // 优化
  fixes: UpgradeItem[]         // 修复
  // 维护时间（如有停机）
  maintenanceStart?: string
  maintenanceEnd?: string
  // 显示模式
  mode: 'normal' | 'forced'    // 普通/强制
  // 强制模式倒计时秒数
  forcedCountdown?: number
  // 发布时间
  publishedAt: string
  // 是否已读
  isRead: boolean
}
