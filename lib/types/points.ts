// 积分中心相关类型定义

// 积分信息
export interface PointsInfo {
  balance: number           // 当前积分余额
  totalEarned: number       // 累计获取
  totalSpent: number        // 累计使用
  todayEarned: number       // 今日获取
}

// 积分任务
export interface PointsTask {
  id: number
  title: string
  points: number
  icon: string              // 图标名称
  action: string            // 按钮文字
  limit: string             // 限制说明
  completed: boolean
  current?: number          // 当前进度
  max?: number              // 最大次数
}

// 积分历史记录
export interface PointsHistoryItem {
  id: number
  title: string
  points: number            // 正数为获取，负数为消费
  time: string
  type: 'earn' | 'spend'
}

// 积分兑换商品
export interface PointsExchangeItem {
  id: number
  type: 'coupon' | 'coin' | 'vip' | 'gift'
  title: string
  points: number            // 所需积分
  icon: string              // 图标名称
  stock: number             // 库存
  color: string             // 图标颜色类名
}
