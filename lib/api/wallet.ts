// 钱包相关 API
import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { WalletInfo, RechargeOption, TransactionItem, TransactionsResponse, WithdrawBalanceInfo, WithdrawRequest, WithdrawResponse, WithdrawAccount } from '../types/wallet'

// ========== Mock 数据 ==========

const mockWalletInfo: WalletInfo = {
  balance: 1280,
  rmb: 128.00,
  totalRecharge: 2500,
  totalSpent: 1220,
  points: 3680,
  growthValue: 4520,
  level: 3,
  nextLevelGrowth: 6000,
}

const mockRechargeOptions: RechargeOption[] = [
  { coins: 100, price: 10, bonus: 0 },
  { coins: 500, price: 50, bonus: 20 },
  { coins: 1000, price: 100, bonus: 50, popular: true },
  { coins: 2000, price: 200, bonus: 120 },
  { coins: 5000, price: 500, bonus: 350 },
  { coins: 10000, price: 1000, bonus: 800 },
]

const mockTransactions: TransactionItem[] = [
  { id: 1, type: 'recharge', title: '充值国学币', amount: 500, time: '今天 14:30', icon: 'Plus' },
  { id: 2, type: 'spend', title: '购买课程《八字入门》', amount: -199, time: '今天 10:15', icon: 'ShoppingBag' },
  { id: 3, type: 'spend', title: '加入圈子「紫微研习社」', amount: -99, time: '昨天 18:20', icon: 'Minus' },
  { id: 4, type: 'bonus', title: '充值赠送', amount: 20, time: '昨天 15:00', icon: 'Gift' },
  { id: 5, type: 'refund', title: '退款-课程《风水基础》', amount: 299, time: '3天前', icon: 'RefreshCcw' },
  { id: 6, type: 'spend', title: '购买电子书《渊海子平》', amount: -68, time: '5天前', icon: 'ShoppingBag' },
]

// ========== API 函数 ==========

// 获取钱包信息
export async function getWalletInfo(): Promise<ApiResponse<WalletInfo>> {
  if (useMock()) {
    return { code: 200, data: mockWalletInfo, message: 'success' }
  }
  return apiGet<WalletInfo>('/user/wallet')
}

// 获取充值选项
export async function getRechargeOptions(): Promise<ApiResponse<RechargeOption[]>> {
  if (useMock()) {
    return { code: 200, data: mockRechargeOptions, message: 'success' }
  }
  return apiGet<RechargeOption[]>('/wallet/recharge/options')
}

// 获取交易记录
export async function getTransactions(page: number = 1, pageSize: number = 20): Promise<ApiResponse<TransactionsResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = mockTransactions.slice(start, end)
    return { 
      code: 200, 
      data: {
        list,
        total: mockTransactions.length,
        hasMore: end < mockTransactions.length,
      }, 
      message: 'success' 
    }
  }
  return apiGet<TransactionsResponse>('/user/wallet/transactions', { page, pageSize })
}

// 创建充值订单
export interface CreateRechargeOrderParams {
  amount: number
  paymentMethod: 'wechat' | 'alipay' | 'unionpay' | 'huifu'
}

export async function createRechargeOrder(
  params: CreateRechargeOrderParams,
): Promise<ApiResponse<{ orderId: string; payUrl: string }>> {
  if (useMock()) {
    await new Promise((resolve) => setTimeout(resolve, 400))
    return {
      code: 200,
      data: {
        orderId: 'ORDER_' + Date.now(),
        payUrl: 'https://pay.example.com/mock',
      },
      message: 'success',
    }
  }
  return apiPost<{ orderId: string; payUrl: string }>('/wallet/recharge', params)
}

// ========== 提现相关 ==========

const mockWithdrawBalance: WithdrawBalanceInfo = {
  availableBalance: 2580.50,
  frozenBalance: 200.00,
  pendingBalance: 450.00,
  minWithdraw: 10,
  maxWithdraw: 50000,
  feeRate: 0.006,
  minFee: 1,
  savedAccounts: [
    {
      method: 'alipay',
      alipayAccount: '138****8888',
      alipayName: '张*明',
    },
    {
      method: 'bank',
      bankName: '中国工商银行',
      bankAccount: '6222****1234',
      bankHolder: '张*明',
    }
  ]
}

// 获取提现余额信息
export async function getWithdrawBalance(): Promise<ApiResponse<WithdrawBalanceInfo>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { code: 200, data: mockWithdrawBalance, message: 'success' }
  }
  return apiGet<WithdrawBalanceInfo>('/wallet/withdraw/balance')
}

// 验证支付密码
export async function verifyPaymentPassword(password: string): Promise<ApiResponse<{ valid: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    // Mock: 密码为 123456 时验证通过
    return { 
      code: password === '123456' ? 200 : 400, 
      data: { valid: password === '123456' }, 
      message: password === '123456' ? 'success' : '支付密码错误' 
    }
  }
  return apiPost<{ valid: boolean }>('/user/verify-payment-password', { password })
}

// 申请提现
export async function applyWithdrawal(request: WithdrawRequest): Promise<ApiResponse<WithdrawResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 800))
    const fee = Math.max(request.amount * 0.006, 1)
    return {
      code: 200,
      data: {
        withdrawId: 'WD_' + Date.now(),
        amount: request.amount,
        fee: Number(fee.toFixed(2)),
        actualAmount: Number((request.amount - fee).toFixed(2)),
        estimatedArrival: request.account.method === 'alipay' ? '预计2小时内到账' : '预计1-3个工作日到账',
      },
      message: '提现申请已提交',
    }
  }
  return apiPost<WithdrawResponse>('/wallet/withdraw/apply', request)
}

// 保存提现账户
export async function saveWithdrawAccount(account: WithdrawAccount): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '保存成功' }
  }
  return apiPost<{ success: boolean }>('/wallet/withdraw/account/save', account)
}
