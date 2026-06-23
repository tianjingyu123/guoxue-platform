// 视频创作者中心数据 —— 照搬原型 app/videos/creator/**

/** 格式化数字：>=10000 显示「万」 —— 照搬原型 formatNumber */
export function formatCreatorNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toLocaleString()
}

// ===== 创作者概览数据 —— 照搬原型 creatorStats =====
export const creatorStats = {
  // 概览数据
  totalViews: 1256800,
  totalLikes: 89600,
  totalComments: 12800,
  totalShares: 5680,
  followers: 28900,
  // 收益数据
  totalEarnings: 12680.5,
  pendingEarnings: 2350.0,
  withdrawnEarnings: 10330.5,
  // 带货数据
  totalSales: 568,
  totalGMV: 45680,
  commission: 4568,
  conversionRate: 3.2,
  // 趋势数据（相比上周）
  viewsTrend: 12.5,
  likesTrend: 8.3,
  followersTrend: 15.2,
  salesTrend: -2.5,
}

export interface CreatorVideo {
  id: string
  title: string
  cover: string
  views: number
  likes: number
  comments: number
  shares: number
  sales: number
  gmv: number
  status: string
  publishTime: string
  products: Array<{ id: string; name: string; price: number }>
}

// ===== 我的作品 —— 照搬原型 myVideos =====
export const myVideos: CreatorVideo[] = [
  {
    id: '1',
    title: '八字命理入门：教你看懂自己的命盘',
    cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop',
    views: 128000,
    likes: 8960,
    comments: 856,
    shares: 234,
    sales: 128,
    gmv: 8704,
    status: 'published',
    publishTime: '2024-01-15',
    products: [{ id: 'p1', name: '八字入门书籍', price: 68 }],
  },
  {
    id: '2',
    title: '风水布局：客厅财位怎么找？',
    cover: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&h=300&fit=crop',
    views: 235000,
    likes: 15600,
    comments: 1280,
    shares: 567,
    sales: 256,
    gmv: 25600,
    status: 'published',
    publishTime: '2024-01-12',
    products: [
      { id: 'p2', name: '招财貔貅', price: 298 },
      { id: 'p3', name: '五帝钱', price: 128 },
    ],
  },
  {
    id: '3',
    title: '姓名学：名字里这几个字最旺运势',
    cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&h=300&fit=crop',
    views: 456000,
    likes: 32800,
    comments: 3420,
    shares: 1890,
    sales: 184,
    gmv: 11376,
    status: 'published',
    publishTime: '2024-01-10',
    products: [{ id: 'p4', name: '姓名学全解', price: 88 }],
  },
]

export interface CreatorProduct {
  id: string
  name: string
  price: number
  sales: number
  commission: number
  stock: number
  image: string
}

// ===== 商品库 —— 照搬原型 productLibrary =====
export const creatorProductLibrary: CreatorProduct[] = [
  { id: 'p1', name: '八字命理学入门书籍', price: 68, sales: 128, commission: 10, stock: 500, image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop' },
  { id: 'p2', name: '招财貔貅摆件', price: 298, sales: 256, commission: 15, stock: 200, image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100&h=100&fit=crop' },
  { id: 'p3', name: '五帝钱挂件', price: 128, sales: 89, commission: 12, stock: 350, image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=100&h=100&fit=crop' },
  { id: 'p4', name: '姓名学全解', price: 88, sales: 184, commission: 10, stock: 800, image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop' },
]

// ===== 收益明细（首页收益中心 tab） —— 照搬原型内联数组 =====
export const creatorEarningsPreview = [
  { type: '带货佣金', amount: 128.5, time: '今天 14:30', product: '八字入门书籍' },
  { type: '带货佣金', amount: 298.0, time: '今天 11:20', product: '招财貔貅摆件' },
  { type: '带货佣金', amount: 88.0, time: '昨天 16:45', product: '姓名学全解' },
  { type: '带货佣金', amount: 128.0, time: '昨天 09:15', product: '五帝钱挂件' },
]

// ===== 数据分析 —— 照搬原型 mockAnalyticsData =====
export const creatorAnalytics = {
  totalViews: 158420,
  totalLikes: 8320,
  totalComments: 1250,
  totalShares: 620,
  viewTrend: [
    { date: '周一', views: 2100, likes: 125, comments: 45 },
    { date: '周二', views: 2800, likes: 180, comments: 62 },
    { date: '周三', views: 2400, likes: 140, comments: 48 },
    { date: '周四', views: 3200, likes: 210, comments: 78 },
    { date: '周五', views: 3800, likes: 250, comments: 95 },
    { date: '周六', views: 4200, likes: 280, comments: 120 },
    { date: '周日', views: 3900, likes: 265, comments: 110 },
  ],
  videoMetrics: [
    { id: '1', title: '《易经》30分钟速成课', views: 15820, likes: 1250, comments: 280, shares: 85, duration: '30分', uploadDate: '2024-01-18' },
    { id: '2', title: '八字命理基础讲解', views: 12450, likes: 850, comments: 195, shares: 62, duration: '45分', uploadDate: '2024-01-17' },
    { id: '3', title: '紫微斗数应用技巧', views: 9850, likes: 620, comments: 150, shares: 48, duration: '52分', uploadDate: '2024-01-16' },
  ],
}

// ===== 销售数据 —— 照搬原型 mockSalesData =====
export const creatorSales = {
  totalSales: 48520,
  totalRevenue: 36390,
  totalOrders: 385,
  totalCustomers: 280,
  salesTrend: [
    { date: '01-15', sales: 1200, revenue: 900, orders: 8 },
    { date: '01-16', sales: 1850, revenue: 1388, orders: 12 },
    { date: '01-17', sales: 1520, revenue: 1140, orders: 10 },
    { date: '01-18', sales: 2100, revenue: 1575, orders: 14 },
    { date: '01-19', sales: 1850, revenue: 1388, orders: 12 },
    { date: '01-20', sales: 2450, revenue: 1838, orders: 16 },
  ],
  topProducts: [
    { id: '1', title: '《易经》进阶课程', sales: 185, revenue: 8250, conversion: 12.5 },
    { id: '2', title: '八字算命付费咨询', sales: 128, revenue: 5120, conversion: 8.2 },
    { id: '3', title: '紫微斗数秘籍合集', sales: 72, revenue: 3600, conversion: 4.8 },
  ],
}

// ===== 提现（原型 getCreatorRevenueOverview 在 proto 缺失，按用法内联）=====
export const creatorRevenueOverview = {
  withdrawable: 8650.5,
  frozen: 1200.0,
  pending: 2350.0,
  totalRevenue: 125480,
  monthRevenue: 18520.0,
}

export const creatorWithdrawHistory = [
  { id: 'W001', amount: 2500, fee: 15, actualAmount: 2485, method: '支付宝', account: '138****8888', status: 'success' as const, createdAt: '2026-05-28 10:00', completedAt: '2026-05-28 11:30' },
  { id: 'W002', amount: 1200, fee: 7.2, actualAmount: 1192.8, method: '银行卡', account: '工商银行 尾号1234', status: 'processing' as const, createdAt: '2026-06-02 15:00', completedAt: undefined },
]

// ===== 收益历史 —— 照搬原型 mockEarningsHistory =====
export const creatorEarningsHistory = {
  totalEarnings: 125480,
  monthlyEarnings: 18520,
  records: [
    { id: '1', month: '2024年1月', earnings: 18520, orders: 385, trend: 'up', change: 12 },
    { id: '2', month: '2023年12月', earnings: 16520, orders: 342, trend: 'up', change: 8 },
    { id: '3', month: '2023年11月', earnings: 15280, orders: 315, trend: 'down', change: -3 },
    { id: '4', month: '2023年10月', earnings: 15750, orders: 325, trend: 'up', change: 5 },
    { id: '5', month: '2023年9月', earnings: 15010, orders: 310, trend: 'up', change: 2 },
    { id: '6', month: '2023年8月', earnings: 14720, orders: 305, trend: 'down', change: -1 },
  ],
}
