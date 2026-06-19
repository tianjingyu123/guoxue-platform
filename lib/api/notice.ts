import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { NoticeItem, NoticeListResponse, NoticeDetail, NoticeType } from '../types/notice'

// Mock 公告数据
const mockNotices: NoticeItem[] = [
  {
    id: 1,
    title: '热卜平台2026年春节放假通知',
    summary: '尊敬的用户，热卜平台将于2026年1月28日至2月4日放假，期间客服暂停服务，课程可正常观看。',
    content: '',
    type: 'system',
    isPinned: true,
    isRead: false,
    publishedAt: '2026-06-03 10:00',
    createdAt: '2026-06-03 09:00',
    viewCount: 12580,
  },
  {
    id: 2,
    title: '平台功能升级公告：新增AI命盘解读功能',
    summary: '热卜平台全新上线AI智能命盘解读功能，支持八字、紫微斗数等多种命理分析，为您提供更专业的命理服务。',
    content: '',
    type: 'update',
    isPinned: true,
    isRead: false,
    publishedAt: '2026-06-02 14:00',
    createdAt: '2026-06-02 12:00',
    viewCount: 8920,
  },
  {
    id: 3,
    title: '618国学狂欢节活动正式开启',
    summary: '全场课程低至5折起，会员专享额外9折优惠，更有限时秒杀、拼团特惠等多重福利等你来拿！',
    content: '',
    type: 'activity',
    isPinned: false,
    isRead: true,
    publishedAt: '2026-06-01 00:00',
    createdAt: '2026-05-31 18:00',
    viewCount: 25680,
    cover: '/placeholder.svg?height=120&width=200',
  },
  {
    id: 4,
    title: '系统维护通知：6月5日凌晨服务暂停',
    summary: '为提升系统稳定性，平台将于2026年6月5日凌晨2:00-6:00进行系统维护，届时将暂停部分服务。',
    content: '',
    type: 'maintenance',
    isPinned: false,
    isRead: true,
    publishedAt: '2026-05-30 16:00',
    createdAt: '2026-05-30 15:00',
    viewCount: 5420,
  },
  {
    id: 5,
    title: '用户协议更新通知',
    summary: '为更好地保护您的权益，我们对《用户协议》和《隐私政策》进行了更新，请您查阅。',
    content: '',
    type: 'policy',
    isPinned: false,
    isRead: true,
    publishedAt: '2026-05-28 10:00',
    createdAt: '2026-05-28 09:00',
    viewCount: 3280,
  },
  {
    id: 6,
    title: '讲师入驻审核标准调整说明',
    summary: '为保证平台内容质量，自2026年6月1日起，讲师入驻审核将提高资质要求，具体标准请查看详情。',
    content: '',
    type: 'policy',
    isPinned: false,
    isRead: true,
    publishedAt: '2026-05-25 14:00',
    createdAt: '2026-05-25 12:00',
    viewCount: 4560,
  },
  {
    id: 7,
    title: '直播功能全新升级：支持多人连麦',
    summary: '直播间新增多人连麦功能，最多支持4人同时连麦互动，让直播教学更加生动有趣。',
    content: '',
    type: 'update',
    isPinned: false,
    isRead: true,
    publishedAt: '2026-05-20 10:00',
    createdAt: '2026-05-20 08:00',
    viewCount: 7890,
  },
]

/**
 * 获取公告列表
 */
export async function getNoticeList(params?: {
  page?: number
  pageSize?: number
  type?: NoticeType
}): Promise<ApiResponse<NoticeListResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let list = [...mockNotices]
    
    // 按类型筛选
    if (params?.type) {
      list = list.filter(n => n.type === params.type)
    }
    
    // 置顶排序
    list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })
    
    // 分页
    const page = params?.page || 1
    const pageSize = params?.pageSize || 10
    const start = (page - 1) * pageSize
    const paged = list.slice(start, start + pageSize)
    
    return {
      code: 200,
      data: {
        list: paged,
        total: list.length,
        hasMore: start + pageSize < list.length,
      },
      message: 'success',
    }
  }
  return apiGet<NoticeListResponse>('/notices', params)
}

/**
 * 获取公告详情
 */
export async function getNoticeDetail(id: number): Promise<ApiResponse<NoticeDetail>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const notice = mockNotices.find(n => n.id === id)
    if (!notice) {
      return { code: 404, data: null as unknown as NoticeDetail, message: '公告不存在' }
    }
    return {
      code: 200,
      data: {
        ...notice,
        htmlContent: `<p>${notice.summary}</p><p>详细内容请查看完整公告...</p>`,
        relatedNotices: mockNotices
          .filter(n => n.id !== id && n.type === notice.type)
          .slice(0, 3)
          .map(n => ({ id: n.id, title: n.title })),
      },
      message: 'success',
    }
  }
  return apiGet<NoticeDetail>(`/notices/${id}`)
}

/**
 * 标记公告已读
 */
export async function markNoticeRead(id: number): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 100))
    return { code: 200, data: { success: true }, message: 'success' }
  }
  return apiPost<{ success: boolean }>(`/notices/${id}/read`)
}

/**
 * 获取未读公告数
 */
export async function getUnreadNoticeCount(): Promise<ApiResponse<{ count: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 100))
    const count = mockNotices.filter(n => !n.isRead).length
    return { code: 200, data: { count }, message: 'success' }
  }
  return apiGet<{ count: number }>('/notices/unread-count')
}

/**
 * 获取公告类型标签
 */
export function getNoticeTypeLabel(type: NoticeType): string {
  const labels: Record<NoticeType, string> = {
    system: '系统公告',
    update: '功能更新',
    activity: '活动通知',
    maintenance: '维护通知',
    policy: '政策更新',
  }
  return labels[type]
}

/**
 * 获取公告类型颜色
 */
export function getNoticeTypeColor(type: NoticeType): string {
  const colors: Record<NoticeType, string> = {
    system: 'bg-primary/10 text-primary',
    update: 'bg-blue-100 text-blue-600',
    activity: 'bg-orange-100 text-orange-600',
    maintenance: 'bg-amber-100 text-amber-600',
    policy: 'bg-gray-100 text-gray-600',
  }
  return colors[type]
}

// ========== 系统升级公告相关 API ==========

import type { UpgradeNotice, UpgradeItemType } from '../types/notice'

// Mock 升级公告
const mockUpgradeNotice: UpgradeNotice = {
  id: 1001,
  version: '3.2.0',
  versionName: '国学新篇',
  title: '热卜 v3.2.0 重大更新',
  subtitle: '全新升级，更好体验',
  features: [
    { type: 'feature', title: '全新AI排盘助手', description: '智能解读命盘，一键生成分析报告' },
    { type: 'feature', title: '群聊功能上线', description: '支持创建学习群组，在线交流讨论' },
    { type: 'feature', title: '直播连麦功能', description: '学员可申请连麦，与老师实时互动' },
    { type: 'feature', title: '每日运势推送', description: '根据八字定制，每天早晨推送运势' },
  ],
  optimizations: [
    { type: 'optimization', title: '课程播放体验优化', description: '支持倍速播放、后台播放' },
    { type: 'optimization', title: '搜索功能增强', description: '新增语音搜索、历史记录' },
    { type: 'optimization', title: '界面视觉升级', description: '更精致的国风设计' },
  ],
  fixes: [
    { type: 'fix', title: '修复视频卡顿问题' },
    { type: 'fix', title: '修复消息通知延迟' },
    { type: 'fix', title: '修复部分机型兼容性问题' },
  ],
  maintenanceStart: '2026-06-05 02:00',
  maintenanceEnd: '2026-06-05 06:00',
  mode: 'normal',
  forcedCountdown: 10,
  publishedAt: '2026-06-03 10:00',
  isRead: false,
}

/**
 * 获取最新升级公告
 */
export async function getLatestUpgradeNotice(): Promise<ApiResponse<UpgradeNotice | null>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: mockUpgradeNotice, message: 'success' }
  }
  return apiGet<UpgradeNotice | null>('/notices/upgrade/latest')
}

/**
 * 标记升级公告已读
 */
export async function markUpgradeNoticeRead(id: number): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 100))
    return { code: 200, data: { success: true }, message: 'success' }
  }
  return apiPost<{ success: boolean }>(`/notices/upgrade/${id}/read`)
}

/**
 * 获取升级项类型图标和颜色
 */
export function getUpgradeItemStyle(type: UpgradeItemType): { icon: string; color: string; bgColor: string } {
  const styles: Record<UpgradeItemType, { icon: string; color: string; bgColor: string }> = {
    feature: { icon: 'sparkles', color: 'text-primary', bgColor: 'bg-primary/10' },
    optimization: { icon: 'zap', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    fix: { icon: 'wrench', color: 'text-green-600', bgColor: 'bg-green-50' },
    security: { icon: 'shield', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  }
  return styles[type]
}

/**
 * 获取升级项类型标签
 */
export function getUpgradeItemLabel(type: UpgradeItemType): string {
  const labels: Record<UpgradeItemType, string> = {
    feature: '新功能',
    optimization: '优化',
    fix: '修复',
    security: '安全',
  }
  return labels[type]
}
