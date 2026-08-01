/**
 * 圈内通知中心数据层（V0 待办 #36·2026-07-11 新建）
 * 复用全局 Notification 表的圈子视图：后端按 category（INTERACT 互动 / TRADE 交易 / GOVERN 圈务 / LIVE 直播）过滤。
 * 端点：GET /notifications/circle · PUT /notifications/:id/read · PUT /notifications/circle/read-all
 */
import { apiGet, apiPut } from '@/utils/request'

export type CircleNotifCategory = 'INTERACT' | 'TRADE' | 'GOVERN' | 'LIVE'

export interface CircleNotification {
  id: string
  type: string
  category: CircleNotifCategory
  circleId: string | null
  title: string
  content: string
  targetType: string | null
  targetId: string | null
  isRead: boolean
  createdAt: string
}

/** 各类未读计数（ALL=四类合计） */
export interface CircleNotifUnread {
  ALL: number
  INTERACT: number
  TRADE: number
  GOVERN: number
  LIVE: number
}

export interface CircleNotifPage {
  items: CircleNotification[]
  total: number
  page: number
  pageSize: number
  unread: CircleNotifUnread
}

const EMPTY_UNREAD: CircleNotifUnread = { ALL: 0, INTERACT: 0, TRADE: 0, GOVERN: 0, LIVE: 0 }

interface RawPage {
  items?: CircleNotification[]
  total?: number
  page?: number
  pageSize?: number
  unread?: Partial<CircleNotifUnread>
}

export const circleNotificationsApi = {
  /** 我的圈内通知（分类筛选+分页+未读计数） */
  async list(params: { category?: CircleNotifCategory; page?: number; pageSize?: number } = {}): Promise<CircleNotifPage> {
    // 手拼 query（URLSearchParams 小程序端不可用）
    const qs = [
      params.category ? `category=${params.category}` : '',
      `page=${params.page ?? 1}`,
      `pageSize=${params.pageSize ?? 20}`,
    ].filter(Boolean).join('&')
    const r = await apiGet<RawPage>(`/notifications/circle?${qs}`)
    return {
      items: Array.isArray(r?.items) ? r.items : [],
      total: r?.total ?? 0,
      page: r?.page ?? params.page ?? 1,
      pageSize: r?.pageSize ?? params.pageSize ?? 20,
      unread: { ...EMPTY_UNREAD, ...(r?.unread ?? {}) },
    }
  },

  /** 单条已读（复用全局端点） */
  async markRead(id: string): Promise<void> {
    await apiPut(`/notifications/${id}/read`, {})
  },

  /** 圈内通知全部已读（可按分类） */
  async markAllRead(category?: CircleNotifCategory): Promise<void> {
    await apiPut('/notifications/circle/read-all', category ? { category } : {})
  },
}
