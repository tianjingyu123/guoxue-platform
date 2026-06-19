// 钱包相关类型定义

// 钱包信息
export interface WalletInfo {
  balance: number           // 国学币余额
  rmb: number               // 等值人民币
  totalRecharge: number     // 累计充值
  totalSpent: number        // 累计消费
  points: number            // 积分
  growthValue: number       // 成长值
  level: number             // 会员等级
  nextLevelGrowth: number   // 下一等级所需成长值
}

// 充值选项
export interface RechargeOption {
  coins: number             // 国学币数量
  price: number             // 价格（元）
  bonus: number             // 赠送数量
  popular?: boolean         // 是否推荐
}

// 交易类型
export type TransactionType = 'recharge' | 'spend' | 'bonus' | 'refund' | 'withdraw' | 'income'

// 交易记录
export interface TransactionItem {
  id: number
  type: TransactionType
  title: string
  amount: number            // 正数为收入，负数为支出
  time: string
  icon: string              // 图标名称
}

// 交易记录响应
export interface TransactionsResponse {
  list: TransactionItem[]
  total: number
  hasMore: boolean
}

// 提现方式
export type WithdrawMethod = 'alipay' | 'bank'

// 提现账户信息
export interface WithdrawAccount {
  method: WithdrawMethod
  // 支付宝
  alipayAccount?: string
  alipayName?: string
  // 银行卡
  bankName?: string
  bankAccount?: string
  bankHolder?: string
}

// 提现余额信息
export interface WithdrawBalanceInfo {
  availableBalance: number    // 可提现余额
  frozenBalance: number       // 冻结中金额
  pendingBalance: number      // 待结算金额
  minWithdraw: number         // 最低提现金额
  maxWithdraw: number         // 单次最高提现
  feeRate: number             // 手续费率 (如 0.006 表示 0.6%)
  minFee: number              // 最低手续费
  savedAccounts: WithdrawAccount[]  // 已保存的提现账户
}

// 提现申请请求
export interface WithdrawRequest {
  amount: number
  account: WithdrawAccount
  paymentPassword: string
}

// 提现申请响应
export interface WithdrawResponse {
  withdrawId: string
  amount: number
  fee: number
  actualAmount: number
  estimatedArrival: string    // 预计到账时间
}
