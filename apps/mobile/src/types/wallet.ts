/**
 * 钱包/虚拟币/支付类型定义
 * 基于后端 API /coin/**、/users/me/points/** 等端点
 */

// ==================== 虚拟币（Coin） ====================

/** 虚拟币余额响应 */
export interface CoinBalance {
  balance: number            // 当前虚拟币余额
  totalRecharged?: number    // 累计充值
  totalSpent?: number        // 累计消费
}

/** 虚拟币交易类型 */
export type CoinTransactionType = 'RECHARGE' | 'SPEND' | 'REFUND' | 'BONUS' | 'INCOME' | 'WITHDRAW'

/** 虚拟币交易记录 */
export interface CoinTransaction {
  id: string
  type: CoinTransactionType
  scene: string              // 消费场景：course_purchase | product_purchase | question | gift 等
  amountCoin: number         // 变动数量（正=收入，负=支出）
  balanceAfter: number       // 变动后余额
  description?: string
  refId?: string             // 关联业务ID
  createdAt: string
}

/** 充值档位 */
export interface CoinTier {
  id: string
  amount: number             // 人民币金额（元）
  coin: number               // 获得虚拟币数量
  bonus?: number             // 额外赠送
  badge?: string             // 角标文案，如"热卖"
}

/** 消费虚拟币请求 */
export interface SpendCoinRequest {
  amountCoin: number
  scene: string
  refId?: string
  description?: string
}

// ==================== 积分 ====================

/** 积分信息 */
export interface PointsInfo {
  points: number             // 当前积分
  totalEarned?: number       // 累计获得
  totalSpent?: number        // 累计消耗
}

/** 积分记录 */
export interface PointsRecord {
  id: string
  type: 'EARN' | 'SPEND' | 'EXPIRE'
  amount: number
  balanceAfter: number
  scene: string              // checkin | purchase | exchange 等
  description?: string
  createdAt: string
}

/** 积分兑换请求 */
export interface ExchangePointsRequest {
  points: number
  target: string             // 兑换目标
  description?: string
}

// ==================== 成长值 ====================

/** 成长值信息 */
export interface GrowthInfo {
  growthValue: number        // 当前成长值
  level: number              // 当前等级
  levelName?: string
  nextLevelGrowth?: number   // 下一级所需成长值
  totalEarned?: number
}

/** 成长值记录 */
export interface GrowthRecord {
  id: string
  type: 'EARN' | 'SPEND'
  amount: number
  scene: string
  description?: string
  createdAt: string
}

// ==================== 提现 ====================

/** 提现方式 */
export type WithdrawMethod = 'alipay' | 'bank'

/** 提现账户 */
export interface WithdrawAccount {
  method: WithdrawMethod
  alipayAccount?: string
  alipayName?: string
  bankName?: string
  bankAccount?: string
  bankHolder?: string
}

/** 提现余额信息 */
export interface WithdrawBalanceInfo {
  availableBalance: number
  frozenBalance: number
  pendingBalance: number
  minWithdraw: number
  maxWithdraw: number
  feeRate: number            // 如 0.006 表示 0.6%
  minFee: number
  savedAccounts: WithdrawAccount[]
}

/** 提现申请请求 */
export interface WithdrawRequest {
  amount: number
  account: WithdrawAccount
  paymentPassword: string
  stationId?: string
}

/** 提现申请响应 */
export interface WithdrawResponse {
  withdrawId: string
  amount: number
  fee: number
  actualAmount: number
  estimatedArrival: string
}

/** 提现记录 */
export interface WithdrawRecord {
  id: string
  amount: number
  fee: number
  actualAmount: number
  status: 'pending' | 'success' | 'failed'
  account: WithdrawAccount
  createdAt: string
  processedAt?: string
}

// ==================== 支付密码 ====================

/** 设置支付密码请求 */
export interface SetPaymentPasswordRequest {
  password: string
}

/** 更新支付密码请求 */
export interface UpdatePaymentPasswordRequest {
  oldPassword: string
  newPassword: string
}

/** 重置支付密码请求 */
export interface ResetPaymentPasswordRequest {
  phone: string
  code: string
  newPassword: string
}

// ==================== 收益 ====================

/** 收益概览 */
export interface RevenueSummary {
  totalEarnings: number
  thisMonth: number
  lastMonth: number
  pendingSettlement: number
  withdrawn: number
}

/** 收益记录 */
export interface EarningRecord {
  id: string
  type: string               // commission | tip | question | sale
  amount: number
  status: 'pending' | 'settled' | 'withdrawn'
  source: string
  description?: string
  createdAt: string
  settledAt?: string
}
