// 视频创作者中心数据层 —— 真连后端 @Controller("videos/creator")
// 数据流铁律：页面只 import creatorApi/类型/纯函数；不直接用 mock；错误上抛走三态，不回退假数据。

import { apiGet, apiPost, apiPut } from '@/utils/request'

/** 格式化数字：>=10000 显示「万」 */
export function formatCreatorNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return (num ?? 0).toLocaleString()
}

// ===== 类型定义（对齐 video-creator.service.ts 响应结构）=====

/** GET overview */
export interface CreatorOverview {
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  followers: number
  totalEarnings: number
  pendingEarnings: number
  withdrawnEarnings: number
  totalSales: number
  // 以下字段后端当前恒 0（缺销售统计支撑）→ 页面诚实降级隐藏，勿展示
  totalGMV: number
  commission: number
  conversionRate: number
  viewsTrend: number
  likesTrend: number
  followersTrend: number
  salesTrend: number
}

/** GET videos —— 单条作品 */
export interface CreatorVideo {
  id: string
  title: string
  cover: string
  views: number
  likes: number
  comments: number
  shares: number
  sales: number
  gmv: number // 后端恒 0
  status: string // published | draft | removed(严重违规已下架)
  selfOnly?: boolean // 机审降级仅自己可见（作品列表灰色小标·点击看说明与申诉指引）
  publishTime: string
  products: Array<{ id: string; name: string; price: number }> // 后端当前恒空
}

/** GET products —— 可带货平台商品 */
export interface CreatorProduct {
  id: string
  name: string
  price: number
  sales: number
  commission: number
  stock: number
  image: string
}

/** GET earnings/preview —— 单条收益明细 */
export interface CreatorEarningItem {
  type: string
  amount: number
  time: string
  product: string
}

/** GET analytics */
export interface CreatorAnalytics {
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  viewTrend: Array<{ date: string; views: number; likes: number; comments: number }> // 后端无每日快照→当前返空，页面隐藏趋势图
  videoMetrics: Array<{
    id: string
    title: string
    views: number
    likes: number
    comments: number
    shares: number
    duration: string
    uploadDate: string
  }>
}

/** GET sales —— 后端当前全 0/空（缺销售统计支撑）→ 页面诚实空态 */
export interface CreatorSales {
  totalSales: number
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  salesTrend: Array<{ date: string; sales: number; revenue: number; orders: number }>
  topProducts: Array<{ id: string; title: string; sales: number; revenue: number; conversion: number }>
}

/** GET revenue */
export interface CreatorRevenue {
  withdrawable: number
  frozen: number
  pending: number
  totalRevenue: number
  monthRevenue: number
}

/** GET withdraw-history —— 单条提现记录 */
export interface CreatorWithdrawRecord {
  id: string
  amount: number
  fee: number
  actualAmount: number
  method: string
  account: string
  status: string // success | processing | failed
  createdAt: string
  completedAt?: string
}

/** GET earnings/history */
export interface CreatorEarningsHistory {
  totalEarnings: number
  monthlyEarnings: number
  records: Array<{
    id: string
    month: string
    earnings: number
    orders: number
    trend: string // up | down
    change: number
  }>
}

/** GET settings */
export interface CreatorSettings {
  profile: { nickname: string; avatar: string; bio: string; specialty: string; website: string }
  notify: Record<string, boolean>
  privacy: Record<string, boolean>
}

// ============ API 层 ============

export const creatorApi = {
  /** 创作者概览 — GET videos/creator/overview */
  getOverview() {
    return apiGet<CreatorOverview>('/videos/creator/overview')
  },

  /** 我的作品列表 — GET videos/creator/videos */
  getMyVideos() {
    return apiGet<CreatorVideo[]>('/videos/creator/videos')
  },

  /** 可带货商品库 — GET videos/creator/products */
  getProducts() {
    return apiGet<CreatorProduct[]>('/videos/creator/products')
  },

  /** 收益预览 — GET videos/creator/earnings/preview */
  getEarningsPreview() {
    return apiGet<CreatorEarningItem[]>('/videos/creator/earnings/preview')
  },

  /** 数据分析 — GET videos/creator/analytics */
  getAnalytics() {
    return apiGet<CreatorAnalytics>('/videos/creator/analytics')
  },

  /** 销售数据 — GET videos/creator/sales */
  getSales() {
    return apiGet<CreatorSales>('/videos/creator/sales')
  },

  /** 收益概览 — GET videos/creator/revenue */
  getRevenueOverview() {
    return apiGet<CreatorRevenue>('/videos/creator/revenue')
  },

  /** 提现记录 — GET videos/creator/withdraw-history */
  getWithdrawHistory() {
    return apiGet<CreatorWithdrawRecord[]>('/videos/creator/withdraw-history')
  },

  /** 收益历史 — GET videos/creator/earnings/history */
  getEarningsHistory() {
    return apiGet<CreatorEarningsHistory>('/videos/creator/earnings/history')
  },

  /** 创作者设置 — GET videos/creator/settings */
  getSettings() {
    return apiGet<CreatorSettings>('/videos/creator/settings')
  },

  /** 提交提现 — POST videos/creator/withdraw（真扣余额，余额不足返 success:false） */
  submitWithdraw(data: { amount: number; method: string; account: string }) {
    return apiPost<{ success: boolean; message: string }>('/videos/creator/withdraw', data)
  },

  /** 给视频关联已有商品 — POST videos/creator/products（需 videoId+productId，IDOR 校验） */
  addProduct(data: { videoId: string; productId: string }) {
    return apiPost<{ success: boolean; message: string }>('/videos/creator/products', data)
  },

  /** 保存创作者设置 — PUT videos/creator/settings */
  saveSettings(data: {
    profile?: { nickname?: string; bio?: string; specialty?: string; website?: string }
    notify?: Record<string, boolean>
    privacy?: Record<string, boolean>
  }) {
    return apiPut<{ success: boolean; message: string }>('/videos/creator/settings', data)
  },
}
