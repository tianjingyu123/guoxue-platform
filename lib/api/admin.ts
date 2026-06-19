// 管理员面板 API

import { apiGet, apiPost } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { AdminPanelData, AdminInfo, AdminPendingItem } from '../types/admin'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

// Mock 数据 - 管理员信息
const mockAdminInfo: AdminInfo = {
  id: 1,
  name: '张管理',
  role: 'super_admin',
  roleName: '超级管理员',
  permissions: ['all'],
  lastLoginAt: '2026-06-03 09:30'
}

// Mock 数据 - 数据概览
const mockOverview = [
  {
    key: 'today_users',
    label: '今日新增用户',
    value: 156,
    unit: '人',
    trend: { type: 'up' as const, value: 12.5, label: '较昨日' },
    icon: 'users'
  },
  {
    key: 'today_orders',
    label: '今日订单',
    value: 89,
    unit: '单',
    trend: { type: 'up' as const, value: 8.3, label: '较昨日' },
    icon: 'shopping-bag'
  },
  {
    key: 'today_revenue',
    label: '今日收入',
    value: 12680,
    unit: '元',
    trend: { type: 'down' as const, value: 3.2, label: '较昨日' },
    icon: 'dollar-sign'
  },
  {
    key: 'online_users',
    label: '当前在线',
    value: 1234,
    unit: '人',
    trend: { type: 'flat' as const, value: 0, label: '' },
    icon: 'activity'
  }
]

// Mock 数据 - 快捷功能
const mockQuickActions = [
  { id: 'content_review', label: '内容审核', icon: 'file-check', href: '/admin/content-review', badge: 23, color: '#C41E3A' },
  { id: 'user_manage', label: '用户管理', icon: 'users', href: '/admin/users', color: '#C9A96E' },
  { id: 'order_manage', label: '订单管理', icon: 'shopping-bag', href: '/admin/orders', badge: 5, color: '#4A90A4' },
  { id: 'data_analysis', label: '数据分析', icon: 'bar-chart-2', href: '/admin/analytics', color: '#6B8E23' },
  { id: 'finance', label: '财务管理', icon: 'dollar-sign', href: '/admin/finance', badge: 8, color: '#8B4513' },
  { id: 'certification', label: '认证审核', icon: 'award', href: '/admin/certification', badge: 12, color: '#9370DB' },
  { id: 'report_handle', label: '举报处理', icon: 'alert-triangle', href: '/admin/reports', badge: 7, color: '#DC143C' },
  { id: 'system_setting', label: '系统设置', icon: 'settings', href: '/admin/settings', color: '#708090' }
]

// Mock 数据 - 待处理事项
const mockPendingItems: AdminPendingItem[] = [
  {
    id: 1,
    type: 'content_review',
    title: '文章待审核',
    description: '《八字命理高级技巧》需要审核',
    createdAt: '10分钟前',
    priority: 'high',
    href: '/admin/content-review/1'
  },
  {
    id: 2,
    type: 'user_report',
    title: '用户举报',
    description: '用户"国学爱好者"被举报发布不当内容',
    createdAt: '30分钟前',
    priority: 'high',
    href: '/admin/reports/2'
  },
  {
    id: 3,
    type: 'order_refund',
    title: '退款申请',
    description: '订单 #20260603001 申请退款',
    createdAt: '1小时前',
    priority: 'medium',
    href: '/admin/orders/refund/3'
  },
  {
    id: 4,
    type: 'withdraw',
    title: '提现审核',
    description: '讲师"易学大师"申请提现 ¥5,000',
    createdAt: '2小时前',
    priority: 'medium',
    href: '/admin/finance/withdraw/4'
  },
  {
    id: 5,
    type: 'certification',
    title: '讲师认证',
    description: '用户"周易研究者"申请讲师认证',
    createdAt: '3小时前',
    priority: 'low',
    href: '/admin/certification/5'
  },
  {
    id: 6,
    type: 'feedback',
    title: '用户反馈',
    description: '收到关于课程播放问题的反馈',
    createdAt: '5小时前',
    priority: 'low',
    href: '/admin/feedback/6'
  }
]

// Mock 数据 - 待处理数量
const mockPendingCounts = {
  contentReview: 23,
  userReport: 7,
  orderRefund: 5,
  withdraw: 8,
  certification: 12,
  feedback: 15
}

/**
 * 获取管理员信息
 */
export async function getAdminInfo(): Promise<ApiResponse<AdminInfo>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: mockAdminInfo,
      message: 'success'
    }
  }
  
  return apiGet<AdminInfo>('/api/admin/info')
}

/**
 * 获取管理员面板数据
 */
export async function getAdminPanelData(): Promise<ApiResponse<AdminPanelData>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      code: 200,
      data: {
        overview: mockOverview,
        quickActions: mockQuickActions,
        pendingItems: mockPendingItems,
        pendingCounts: mockPendingCounts
      },
      message: 'success'
    }
  }
  
  return apiGet<AdminPanelData>('/api/admin/panel')
}

/**
 * 处理待办事项
 */
export async function handlePendingItem(
  itemId: number, 
  action: 'approve' | 'reject' | 'ignore'
): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return {
      code: 200,
      data: null,
      message: '处理成功'
    }
  }
  
  return apiPost<null>(`/api/admin/pending/${itemId}`, { action })
}

/**
 * 获取待处理事项类型名称
 */
export function getPendingTypeName(type: AdminPendingItem['type']): string {
  const names: Record<AdminPendingItem['type'], string> = {
    content_review: '内容审核',
    user_report: '用户举报',
    order_refund: '退款申请',
    withdraw: '提现审核',
    certification: '认证审核',
    feedback: '用户反馈'
  }
  return names[type] || '待处理'
}

/**
 * 获取优先级样式
 */
export function getPriorityStyle(priority: AdminPendingItem['priority']): { bg: string; text: string; label: string } {
  const styles = {
    high: { bg: 'bg-red-100', text: 'text-red-700', label: '紧急' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '一般' },
    low: { bg: 'bg-gray-100', text: 'text-gray-600', label: '低' }
  }
  return styles[priority] || styles.low
}
