import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  ActivityDetail, 
  ActivityListItem, 
  ActivityType, 
  FlashSaleActivity, 
  GroupBuyActivity, 
  PromotionActivity,
  Countdown
} from '../types/marketing'

// Mock 秒杀活动
const mockFlashSale: FlashSaleActivity = {
  id: 1,
  title: '国学经典限时秒杀',
  subtitle: '每日10点准时开抢',
  type: 'flash_sale',
  status: 'ongoing',
  bannerUrl: '/placeholder.svg?height=200&width=400&text=秒杀活动',
  startTime: new Date(Date.now() - 3600000).toISOString(),
  endTime: new Date(Date.now() + 86400000).toISOString(),
  rules: [
    '每人每件商品限购1件',
    '活动商品不支持退换货',
    '优惠不与其他活动同享',
    '如有疑问请联系客服',
  ],
  shareTitle: '超值秒杀，不容错过！',
  items: [
    {
      id: 1,
      productId: 101,
      title: '八字命理入门精讲',
      cover: '/placeholder.svg?height=120&width=120',
      originalPrice: 299,
      salePrice: 99,
      totalStock: 100,
      soldCount: 78,
      limitPerUser: 1,
      status: 'ongoing',
    },
    {
      id: 2,
      productId: 102,
      title: '风水布局实战课程',
      cover: '/placeholder.svg?height=120&width=120',
      originalPrice: 399,
      salePrice: 149,
      totalStock: 50,
      soldCount: 50,
      limitPerUser: 1,
      status: 'sold_out',
    },
    {
      id: 3,
      productId: 103,
      title: '紫微斗数全解',
      cover: '/placeholder.svg?height=120&width=120',
      originalPrice: 599,
      salePrice: 199,
      totalStock: 80,
      soldCount: 35,
      limitPerUser: 1,
      status: 'ongoing',
    },
  ],
}

// Mock 拼团活动
const mockGroupBuy: GroupBuyActivity = {
  id: 2,
  title: '国学好课拼团购',
  subtitle: '邀请好友，一起省钱',
  type: 'group_buy',
  status: 'ongoing',
  bannerUrl: '/placeholder.svg?height=200&width=400&text=拼团活动',
  startTime: new Date(Date.now() - 86400000).toISOString(),
  endTime: new Date(Date.now() + 86400000 * 3).toISOString(),
  rules: [
    '2人成团，24小时内成团有效',
    '团长和团员享受相同价格',
    '拼团失败自动退款',
    '每人每件商品限参团1次',
  ],
  items: [
    {
      id: 1,
      productId: 201,
      title: '易经入门到精通',
      cover: '/placeholder.svg?height=120&width=120',
      originalPrice: 499,
      groupPrice: 299,
      groupSize: 2,
      completedGroups: 156,
      ongoingGroups: [
        {
          id: 1001,
          leaderId: 10001,
          leaderAvatar: '/placeholder.svg?height=32&width=32',
          leaderName: '张**',
          currentSize: 1,
          expireAt: new Date(Date.now() + 3600000 * 5).toISOString(),
        },
        {
          id: 1002,
          leaderId: 10002,
          leaderAvatar: '/placeholder.svg?height=32&width=32',
          leaderName: '李**',
          currentSize: 1,
          expireAt: new Date(Date.now() + 3600000 * 12).toISOString(),
        },
      ],
    },
    {
      id: 2,
      productId: 202,
      title: '国学养生智慧',
      cover: '/placeholder.svg?height=120&width=120',
      originalPrice: 399,
      groupPrice: 199,
      groupSize: 3,
      completedGroups: 89,
      ongoingGroups: [],
    },
  ],
}

// Mock 促销活动
const mockPromotion: PromotionActivity = {
  id: 3,
  title: '年中大促',
  subtitle: '全场低至5折',
  type: 'promotion',
  status: 'ongoing',
  bannerUrl: '/placeholder.svg?height=200&width=400&text=年中大促',
  startTime: new Date(Date.now() - 86400000 * 2).toISOString(),
  endTime: new Date(Date.now() + 86400000 * 5).toISOString(),
  rules: [
    '活动期间下单享受折扣价',
    '部分商品数量有限，售完即止',
    '可与优惠券叠加使用',
  ],
  items: [
    {
      id: 1,
      productId: 301,
      title: '六爻预测入门',
      cover: '/placeholder.svg?height=120&width=120',
      originalPrice: 299,
      promotionPrice: 149,
      discountLabel: '5折',
      tags: ['热卖'],
    },
    {
      id: 2,
      productId: 302,
      title: '梅花易数精讲',
      cover: '/placeholder.svg?height=120&width=120',
      originalPrice: 399,
      promotionPrice: 299,
      discountLabel: '立减100',
      tags: ['新品'],
    },
    {
      id: 3,
      productId: 303,
      title: '奇门遁甲实战',
      cover: '/placeholder.svg?height=120&width=120',
      originalPrice: 599,
      promotionPrice: 399,
      discountLabel: '6.7折',
    },
  ],
}

/**
 * 根据路由获取活动页面
 */
export async function getActivityByRoute(route: string): Promise<ApiResponse<ActivityDetail>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    // 根据路由返回不同类型活动
    if (route.includes('flash') || route.includes('seckill')) {
      return { code: 200, data: mockFlashSale, message: 'success' }
    } else if (route.includes('group') || route.includes('pintuan')) {
      return { code: 200, data: mockGroupBuy, message: 'success' }
    } else {
      return { code: 200, data: mockPromotion, message: 'success' }
    }
  }
  return apiGet<ActivityDetail>('/marketing/page', { route })
}

/**
 * 获取活动详情
 */
export async function getActivityDetail(id: number, type: ActivityType): Promise<ApiResponse<ActivityDetail>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    if (type === 'flash_sale') return { code: 200, data: mockFlashSale, message: 'success' }
    if (type === 'group_buy') return { code: 200, data: mockGroupBuy, message: 'success' }
    return { code: 200, data: mockPromotion, message: 'success' }
  }
  return apiGet<ActivityDetail>(`/marketing/activity/${id}`, { type })
}

/**
 * 获取活动列表
 */
export async function getActivityList(status?: string): Promise<ApiResponse<ActivityListItem[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const list: ActivityListItem[] = [
      { id: 1, title: '国学经典限时秒杀', type: 'flash_sale', status: 'ongoing', bannerUrl: '/placeholder.svg', startTime: mockFlashSale.startTime, endTime: mockFlashSale.endTime, productCount: 3 },
      { id: 2, title: '国学好课拼团购', type: 'group_buy', status: 'ongoing', bannerUrl: '/placeholder.svg', startTime: mockGroupBuy.startTime, endTime: mockGroupBuy.endTime, productCount: 2 },
      { id: 3, title: '年中大促', type: 'promotion', status: 'ongoing', bannerUrl: '/placeholder.svg', startTime: mockPromotion.startTime, endTime: mockPromotion.endTime, productCount: 3 },
    ]
    return { code: 200, data: list, message: 'success' }
  }
  return apiGet<ActivityListItem[]>('/marketing/activities', { status })
}

/**
 * 秒杀抢购
 */
export async function flashSaleBuy(itemId: number): Promise<ApiResponse<{ orderId: string }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { code: 200, data: { orderId: 'FS' + Date.now() }, message: '抢购成功' }
  }
  return apiPost<{ orderId: string }>('/marketing/flash-sale/buy', { itemId })
}

/**
 * 发起拼团
 */
export async function createGroupBuy(itemId: number): Promise<ApiResponse<{ groupId: number; orderId: string }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { code: 200, data: { groupId: Date.now(), orderId: 'GB' + Date.now() }, message: '开团成功' }
  }
  return apiPost<{ groupId: number; orderId: string }>('/marketing/group-buy/create', { itemId })
}

/**
 * 参与拼团
 */
export async function joinGroupBuy(groupId: number): Promise<ApiResponse<{ orderId: string }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { code: 200, data: { orderId: 'GB' + Date.now() }, message: '参团成功' }
  }
  return apiPost<{ orderId: string }>('/marketing/group-buy/join', { groupId })
}

/**
 * 计算倒计时
 */
export function calculateCountdown(targetTime: string): Countdown {
  const now = Date.now()
  const target = new Date(targetTime).getTime()
  const diff = target - now

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, isEnded: false }
}

/**
 * 获取活动状态文本
 */
export function getActivityStatusText(status: string): string {
  const texts: Record<string, string> = {
    upcoming: '即将开始',
    ongoing: '进行中',
    ended: '已结束',
  }
  return texts[status] || status
}

/**
 * 获取活动类型文本
 */
export function getActivityTypeText(type: ActivityType): string {
  const texts: Record<ActivityType, string> = {
    flash_sale: '限时秒杀',
    group_buy: '拼团购',
    promotion: '促销活动',
    coupon: '优惠券',
    lottery: '抽奖活动',
  }
  return texts[type]
}

/**
 * 计算秒杀进度
 */
export function calculateSaleProgress(soldCount: number, totalStock: number): number {
  if (totalStock <= 0) return 100
  return Math.round((soldCount / totalStock) * 100)
}

// ========== 活动日历相关 API ==========

import type { CalendarEvent, CalendarMonthData, DateMarker, CalendarEventType } from '../types/marketing'

// 生成 Mock 日历数据
function generateMockCalendarData(year: number, month: number): CalendarMonthData {
  const markers: DateMarker[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  
  // 为部分日期生成活动
  const eventDays = [3, 5, 8, 10, 12, 15, 18, 20, 22, 25, 28]
  
  eventDays.forEach(day => {
    if (day <= daysInMonth) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const events: CalendarEvent[] = []
      
      // 随机生成活动
      if (day % 3 === 0) {
        events.push({
          id: day * 100 + 1,
          type: 'flash_sale',
          title: '限时秒杀专场',
          cover: '/placeholder.svg',
          startTime: `${dateStr} 10:00`,
          endTime: `${dateStr} 22:00`,
          status: day < new Date().getDate() ? 'ended' : day === new Date().getDate() ? 'ongoing' : 'upcoming',
          extra: { productCount: 12 },
        })
      }
      if (day % 5 === 0) {
        events.push({
          id: day * 100 + 2,
          type: 'live',
          title: '八字命理直播课',
          cover: '/placeholder.svg',
          startTime: `${dateStr} 20:00`,
          endTime: `${dateStr} 22:00`,
          status: day < new Date().getDate() ? 'ended' : 'upcoming',
          extra: { viewerCount: 1280, hostName: '张明德' },
        })
      }
      if (day % 4 === 0) {
        events.push({
          id: day * 100 + 3,
          type: 'group_buy',
          title: '国学课程拼团',
          cover: '/placeholder.svg',
          startTime: `${dateStr} 00:00`,
          endTime: `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day + 3, daysInMonth)).padStart(2, '0')} 23:59`,
          status: 'ongoing',
          extra: { productCount: 5 },
        })
      }
      if (day % 7 === 0) {
        events.push({
          id: day * 100 + 4,
          type: 'course',
          title: '紫微斗数公开课',
          cover: '/placeholder.svg',
          startTime: `${dateStr} 14:00`,
          endTime: `${dateStr} 16:00`,
          status: day < new Date().getDate() ? 'ended' : 'upcoming',
          extra: { price: 0 },
        })
      }
      
      if (events.length > 0) {
        markers.push({
          date: dateStr,
          events,
          hasFlashSale: events.some(e => e.type === 'flash_sale'),
          hasGroupBuy: events.some(e => e.type === 'group_buy'),
          hasPromotion: events.some(e => e.type === 'promotion'),
          hasLive: events.some(e => e.type === 'live'),
          hasCourse: events.some(e => e.type === 'course'),
        })
      }
    }
  })
  
  return { year, month, markers }
}

/**
 * 获取月历活动数据
 */
export async function getCalendarMonthData(year: number, month: number): Promise<ApiResponse<CalendarMonthData>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { code: 200, data: generateMockCalendarData(year, month), message: 'success' }
  }
  return apiGet<CalendarMonthData>('/activity/calendar', { year, month })
}

/**
 * 获取指定日期的活动列表
 */
export async function getDateEvents(date: string): Promise<ApiResponse<CalendarEvent[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    const [year, month] = date.split('-').map(Number)
    const data = generateMockCalendarData(year, month)
    const marker = data.markers.find(m => m.date === date)
    return { code: 200, data: marker?.events || [], message: 'success' }
  }
  return apiGet<CalendarEvent[]>('/activity/calendar/date', { date })
}

/**
 * 获取活动类型图标颜色
 */
export function getEventTypeColor(type: CalendarEventType): string {
  const colors: Record<CalendarEventType, string> = {
    flash_sale: '#C41E3A',
    group_buy: '#FF6B35',
    promotion: '#10B981',
    live: '#8B5CF6',
    course: '#3B82F6',
  }
  return colors[type]
}

/**
 * 获取活动类型标签
 */
export function getEventTypeLabel(type: CalendarEventType): string {
  const labels: Record<CalendarEventType, string> = {
    flash_sale: '秒杀',
    group_buy: '拼团',
    promotion: '促销',
    live: '直播',
    course: '课程',
  }
  return labels[type]
}
