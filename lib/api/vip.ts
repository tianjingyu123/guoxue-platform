// 会员相关 API
import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { VipStatus, VipBenefit, VipPlan, VipPlanGroup, VipCenterData, VipPurchaseRequest, VipPurchaseResponse } from '../types/vip'

// ========== Mock 数据 ==========

const mockVipStatus: VipStatus = {
  level: 'pro',
  levelName: '专业会员',
  expireAt: '2026-12-31',
  isExpired: false,
  daysLeft: 211,
  autoRenew: true,
  points: 3680,
  growthValue: 4520,
}

const mockBenefits: VipBenefit[] = [
  { id: '1', icon: 'crown', title: '身份标识', description: '专属会员头像框和昵称徽章', levels: ['basic', 'pro', 'premium'] },
  { id: '2', icon: 'video', title: '视频加速', description: '视频播放免广告，支持2倍速', levels: ['basic', 'pro', 'premium'] },
  { id: '3', icon: 'download', title: '离线下载', description: '课程视频支持离线观看', levels: ['pro', 'premium'] },
  { id: '4', icon: 'discount', title: '购课优惠', description: '课程购买享9折优惠', levels: ['basic', 'pro', 'premium'] },
  { id: '5', icon: 'gift', title: '专属礼包', description: '每月领取会员专属礼包', levels: ['pro', 'premium'] },
  { id: '6', icon: 'customer-service', title: '专属客服', description: '1对1专属客服服务', levels: ['premium'] },
  { id: '7', icon: 'book', title: '古籍阅读', description: '解锁全部古籍内容', levels: ['pro', 'premium'] },
  { id: '8', icon: 'calculator', title: '高级排盘', description: '解锁所有排盘工具', levels: ['premium'] },
]

const mockPlanGroups: VipPlanGroup[] = [
  {
    level: 'basic',
    levelName: '基础会员',
    description: '入门首选，享基础权益',
    plans: [
      { id: 'basic_1', level: 'basic', levelName: '基础会员', duration: 1, durationName: '月付', originalPrice: 28, price: 28, dailyPrice: 0.93, features: ['免广告', '9折购课'] },
      { id: 'basic_3', level: 'basic', levelName: '基础会员', duration: 3, durationName: '季付', originalPrice: 84, price: 68, dailyPrice: 0.76, discount: '8.1折', features: ['免广告', '9折购课'] },
      { id: 'basic_12', level: 'basic', levelName: '基础会员', duration: 12, durationName: '年付', originalPrice: 336, price: 198, dailyPrice: 0.54, discount: '5.9折', popular: true, features: ['免广告', '9折购课'] },
    ]
  },
  {
    level: 'pro',
    levelName: '专业会员',
    description: '进阶学习，权益全面升级',
    plans: [
      { id: 'pro_1', level: 'pro', levelName: '专业会员', duration: 1, durationName: '月付', originalPrice: 68, price: 68, dailyPrice: 2.27, features: ['全部基础权益', '离线下载', '古籍阅读', '每月礼包'] },
      { id: 'pro_3', level: 'pro', levelName: '专业会员', duration: 3, durationName: '季付', originalPrice: 204, price: 168, dailyPrice: 1.87, discount: '8.2折', features: ['全部基础权益', '离线下载', '古籍阅读', '每月礼包'] },
      { id: 'pro_12', level: 'pro', levelName: '专业会员', duration: 12, durationName: '年付', originalPrice: 816, price: 498, dailyPrice: 1.36, discount: '6.1折', popular: true, features: ['全部基础权益', '离线下载', '古籍阅读', '每月礼包'] },
    ]
  },
  {
    level: 'premium',
    levelName: '尊享会员',
    description: '顶级权益，专属尊贵体验',
    plans: [
      { id: 'premium_1', level: 'premium', levelName: '尊享会员', duration: 1, durationName: '月付', originalPrice: 128, price: 128, dailyPrice: 4.27, features: ['全部专业权益', '高级排盘', '专属客服', '优先体验'] },
      { id: 'premium_3', level: 'premium', levelName: '尊享会员', duration: 3, durationName: '季付', originalPrice: 384, price: 328, dailyPrice: 3.64, discount: '8.5折', features: ['全部专业权益', '高级排盘', '专属客服', '优先体验'] },
      { id: 'premium_12', level: 'premium', levelName: '尊享会员', duration: 12, durationName: '年付', originalPrice: 1536, price: 998, dailyPrice: 2.74, discount: '6.5折', popular: true, features: ['全部专业权益', '高级排盘', '专属客服', '优先体验'] },
    ]
  }
]

// ========== API 函数 ==========

// 获取会员中心数据
export async function getVipCenterData(): Promise<ApiResponse<VipCenterData>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      code: 200,
      data: {
        status: mockVipStatus,
        benefits: mockBenefits,
        planGroups: mockPlanGroups,
      },
      message: 'success'
    }
  }
  return apiGet<VipCenterData>('/vip/center')
}

// 获取会员状态
export async function getVipStatus(): Promise<ApiResponse<VipStatus>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: mockVipStatus, message: 'success' }
  }
  return apiGet<VipStatus>('/vip/status')
}

// 获取会员权益列表
export async function getVipBenefits(): Promise<ApiResponse<VipBenefit[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: mockBenefits, message: 'success' }
  }
  return apiGet<VipBenefit[]>('/vip/benefits')
}

// 获取会员套餐
export async function getVipPlans(): Promise<ApiResponse<VipPlanGroup[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: mockPlanGroups, message: 'success' }
  }
  return apiGet<VipPlanGroup[]>('/vip/plans')
}

// 购买会员
export async function purchaseVip(request: VipPurchaseRequest): Promise<ApiResponse<VipPurchaseResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 800))
    return {
      code: 200,
      data: {
        orderId: 'VIP_' + Date.now(),
        payUrl: 'https://pay.example.com/mock',
        expireAt: '2027-06-03',
      },
      message: '购买成功'
    }
  }
  return apiPost<VipPurchaseResponse>('/vip/purchase', request)
}

// 续费会员
export async function renewVip(planId: string, paymentMethod: string): Promise<ApiResponse<VipPurchaseResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 800))
    return {
      code: 200,
      data: {
        orderId: 'VIP_RENEW_' + Date.now(),
        payUrl: 'https://pay.example.com/mock',
        expireAt: '2027-12-31',
      },
      message: '续费成功'
    }
  }
  return apiPost<VipPurchaseResponse>('/vip/renew', { planId, paymentMethod })
}

// 切换自动续费
export async function toggleAutoRenew(enabled: boolean): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: enabled ? '已开启自动续费' : '已关闭自动续费' }
  }
  return apiPost<{ success: boolean }>('/vip/auto-renew', { enabled })
}
