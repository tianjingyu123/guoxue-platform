// 推广收益相关 API
import { apiGet, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  EarningsOverview, 
  EarningsItem, 
  EarningsListResponse, 
  EarningsSourceType,
  WithdrawRecord,
  WithdrawRecordsResponse
} from '../types/earnings'

// ========== Mock 数据 ==========

const mockEarningsOverview: EarningsOverview = {
  availableBalance: 3680.50,
  frozenBalance: 520.00,
  totalEarnings: 28650.00,
  todayEarnings: 168.00,
  monthEarnings: 3280.00,
  lastMonthEarnings: 4520.00,
}

const mockEarningsItems: EarningsItem[] = [
  {
    id: 1,
    type: 'course_commission',
    title: '课程分销佣金',
    description: '用户"国学爱好者"购买了《八字命理入门》',
    amount: 29.90,
    status: 'settled',
    createdAt: '2026-06-03 14:30',
    settledAt: '2026-06-03 14:30',
    relatedUser: { id: 101, nickname: '国学爱好者', avatar: '/placeholder.svg?height=32&width=32' },
    relatedOrder: { orderId: 'ORD202606031430', orderAmount: 299.00 },
  },
  {
    id: 2,
    type: 'member_commission',
    title: '会员推广佣金',
    description: '用户"易学新人"开通了年度VIP',
    amount: 99.00,
    status: 'settled',
    createdAt: '2026-06-03 10:15',
    settledAt: '2026-06-03 10:15',
    relatedUser: { id: 102, nickname: '易学新人', avatar: '/placeholder.svg?height=32&width=32' },
    relatedOrder: { orderId: 'ORD202606031015', orderAmount: 998.00 },
  },
  {
    id: 3,
    type: 'team_bonus',
    title: '团队奖励',
    description: '团队本周业绩达标奖励',
    amount: 200.00,
    status: 'pending',
    createdAt: '2026-06-02 18:00',
  },
  {
    id: 4,
    type: 'product_commission',
    title: '商品分销佣金',
    description: '用户"风水学徒"购买了专业风水罗盘',
    amount: 58.00,
    status: 'frozen',
    createdAt: '2026-06-02 15:20',
    relatedUser: { id: 103, nickname: '风水学徒', avatar: '/placeholder.svg?height=32&width=32' },
    relatedOrder: { orderId: 'ORD202606021520', orderAmount: 580.00 },
  },
  {
    id: 5,
    type: 'invite_reward',
    title: '邀请奖励',
    description: '成功邀请用户"玄学入门者"注册',
    amount: 10.00,
    status: 'settled',
    createdAt: '2026-06-01 09:30',
    settledAt: '2026-06-01 09:30',
    relatedUser: { id: 104, nickname: '玄学入门者', avatar: '/placeholder.svg?height=32&width=32' },
  },
  {
    id: 6,
    type: 'platform_reward',
    title: '平台奖励',
    description: '月度推广达人奖励',
    amount: 500.00,
    status: 'settled',
    createdAt: '2026-06-01 00:00',
    settledAt: '2026-06-01 00:00',
  },
]

const mockWithdrawRecords: WithdrawRecord[] = [
  {
    id: 1,
    amount: 1000.00,
    fee: 6.00,
    actualAmount: 994.00,
    status: 'success',
    method: 'alipay',
    account: '138****8888',
    createdAt: '2026-05-28 10:00',
    completedAt: '2026-05-28 12:30',
  },
  {
    id: 2,
    amount: 500.00,
    fee: 3.00,
    actualAmount: 497.00,
    status: 'processing',
    method: 'bank',
    account: '6222****1234',
    createdAt: '2026-06-02 14:00',
  },
]

// ========== API 函数 ==========

// 获取收益总览
export async function getEarningsOverview(): Promise<ApiResponse<EarningsOverview>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { code: 200, data: mockEarningsOverview, message: 'success' }
  }
  return apiGet<EarningsOverview>('/station/earnings/overview')
}

// 获取收益明细列表
export async function getEarningsList(
  page: number = 1,
  pageSize: number = 20,
  filter?: {
    type?: EarningsSourceType
    status?: 'settled' | 'pending' | 'frozen'
    startDate?: string
    endDate?: string
  }
): Promise<ApiResponse<EarningsListResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    let filtered = mockEarningsItems
    if (filter?.type) {
      filtered = filtered.filter(item => item.type === filter.type)
    }
    if (filter?.status) {
      filtered = filtered.filter(item => item.status === filter.status)
    }
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = filtered.slice(start, end)
    return {
      code: 200,
      data: {
        list,
        total: filtered.length,
        hasMore: end < filtered.length,
      },
      message: 'success',
    }
  }
  return apiGet<EarningsListResponse>('/station/earnings/list', { page, pageSize, ...filter })
}

// 获取提现记录
export async function getWithdrawRecords(
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<WithdrawRecordsResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = mockWithdrawRecords.slice(start, end)
    return {
      code: 200,
      data: {
        list,
        total: mockWithdrawRecords.length,
        hasMore: end < mockWithdrawRecords.length,
      },
      message: 'success',
    }
  }
  return apiGet<WithdrawRecordsResponse>('/station/withdraw/records', { page, pageSize })
}

// 获取收益来源类型名称
export function getEarningsTypeName(type: EarningsSourceType): string {
  const names: Record<EarningsSourceType, string> = {
    course_commission: '课程佣金',
    product_commission: '商品佣金',
    member_commission: '会员佣金',
    team_bonus: '团队奖励',
    platform_reward: '平台奖励',
    invite_reward: '邀请奖励',
  }
  return names[type] || '其他收益'
}

// 获取收益状态名称
export function getEarningsStatusName(status: 'settled' | 'pending' | 'frozen'): string {
  const names = {
    settled: '已结算',
    pending: '待结算',
    frozen: '冻结中',
  }
  return names[status]
}

// 获取提现状态名称
export function getWithdrawStatusName(status: 'pending' | 'processing' | 'success' | 'failed'): string {
  const names = {
    pending: '待处理',
    processing: '处理中',
    success: '已到账',
    failed: '提现失败',
  }
  return names[status]
}
