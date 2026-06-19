// 推广收益相关类型定义

// 收益总览
export interface EarningsOverview {
  availableBalance: number    // 可提现余额
  frozenBalance: number       // 冻结中金额
  totalEarnings: number       // 累计收益
  todayEarnings: number       // 今日收益
  monthEarnings: number       // 本月收益
  lastMonthEarnings: number   // 上月收益
}

// 收益来源类型
export type EarningsSourceType = 
  | 'course_commission'       // 课程分销佣金
  | 'product_commission'      // 商品分销佣金
  | 'member_commission'       // 会员推广佣金
  | 'team_bonus'              // 团队奖励
  | 'platform_reward'         // 平台奖励
  | 'invite_reward'           // 邀请奖励

// 收益明细项
export interface EarningsItem {
  id: number
  type: EarningsSourceType
  title: string               // 收益标题
  description: string         // 描述（如：用户xxx购买了xxx）
  amount: number              // 收益金额
  status: 'settled' | 'pending' | 'frozen'  // 已结算/待结算/冻结
  createdAt: string
  settledAt?: string          // 结算时间
  // 关联信息
  relatedUser?: {
    id: number
    nickname: string
    avatar: string
  }
  relatedOrder?: {
    orderId: string
    orderAmount: number
  }
}

// 收益明细列表响应
export interface EarningsListResponse {
  list: EarningsItem[]
  total: number
  hasMore: boolean
}

// 提现记录项
export interface WithdrawRecord {
  id: number
  amount: number
  fee: number
  actualAmount: number
  status: 'pending' | 'processing' | 'success' | 'failed'
  method: 'alipay' | 'bank'
  account: string             // 脱敏账号
  createdAt: string
  completedAt?: string
  failReason?: string
}

// 提现记录列表响应
export interface WithdrawRecordsResponse {
  list: WithdrawRecord[]
  total: number
  hasMore: boolean
}
