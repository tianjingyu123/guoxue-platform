// ===== 商家经营管理板块 mock 数据 —— 严格照搬原型 /merchant/* =====

import { apiGet, apiPost, apiPut, useMock } from '@/utils/request'

// ---- 工作台 dashboard ----
export const merchantDashboard = {
  shopName: '墨香阁文化',
  level: '金牌商家',
  status: '正常营业',
  todayStats: {
    orders: { value: 12, change: 20, trend: 'up' as const },
    sales: { value: 2680, change: 15.5, trend: 'up' as const },
    visitors: { value: 156, change: -8, trend: 'down' as const },
    conversion: { value: 7.7, change: 2.3, trend: 'up' as const },
  },
  pending: { toShip: 8, refund: 2, review: 5, inquiry: 3 },
  weeklyTrend: {
    orders: [8, 12, 15, 10, 18, 22, 12],
    sales: [1200, 1800, 2200, 1500, 2800, 3500, 2680],
    visitors: [120, 145, 168, 132, 178, 195, 156],
  },
  notices: [
    { id: '1', title: '双十一活动报名开始', type: '活动', time: '2小时前' },
    { id: '2', title: '新版商品发布规则已更新', type: '规则', time: '1天前' },
  ],
}

export const merchantQuickActions = [
  { icon: 'package', label: '发布商品', path: '/merchant/product-edit', color: '#2563eb', bg: '#eff6ff' },
  { icon: 'shopping-cart', label: '订单管理', path: '/merchant/orders', color: '#ea580c', bg: '#fff7ed' },
  { icon: 'star', label: '评价管理', path: '/merchant/reviews', color: '#d97706', bg: '#fffbeb' },
  { icon: 'wallet', label: '收入管理', path: '/merchant/revenue', color: '#16a34a', bg: '#f0fdf4' },
  { icon: 'bar-chart-3', label: '数据分析', path: '/merchant/analytics', color: '#9333ea', bg: '#faf5ff' },
  { icon: 'settings', label: '店铺设置', path: '/merchant/profile', color: '#4b5563', bg: '#f9fafb' },
]

// ---- 商品列表 products ----
export interface MerchantProduct {
  id: string
  title: string
  price: number
  originalPrice: number | null
  stock: number
  sales: number
  status: 'online' | 'offline' | 'soldout' | 'pending'
  category: string
  createdAt: string
}

export const merchantProducts: MerchantProduct[] = [
  { id: '1', title: '滴天髓精解', price: 68, originalPrice: 98, stock: 156, sales: 328, status: 'online', category: '命理书籍', createdAt: '2024-01-15' },
  { id: '2', title: '子平真诠评注', price: 88, originalPrice: 128, stock: 89, sales: 215, status: 'online', category: '命理书籍', createdAt: '2024-01-10' },
  { id: '3', title: '文房四宝套装', price: 268, originalPrice: 368, stock: 0, sales: 56, status: 'soldout', category: '文房用品', createdAt: '2024-01-08' },
  { id: '4', title: '紫砂茶壶礼盒', price: 588, originalPrice: null, stock: 23, sales: 12, status: 'offline', category: '茶道用品', createdAt: '2024-01-05' },
  { id: '5', title: '八字命理基础课', price: 199, originalPrice: 299, stock: 999, sales: 456, status: 'online', category: '在线课程', createdAt: '2024-01-01' },
]

export const productStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  online: { label: '已上架', color: '#15803d', bg: '#dcfce7' },
  offline: { label: '已下架', color: '#374151', bg: '#f3f4f6' },
  soldout: { label: '已售罄', color: '#b91c1c', bg: '#fee2e2' },
  pending: { label: '审核中', color: '#b45309', bg: '#fef3c7' },
}

// ---- 商品编辑 product-edit ----
export const productCategories = [
  { id: 'guoxue', name: '国学课程', fee: '5%' },
  { id: 'guji', name: '古籍图书', fee: '3%' },
  { id: 'wenchuang', name: '文创用品', fee: '5%' },
  { id: 'wenfang', name: '文房四宝', fee: '5%' },
  { id: 'chadao', name: '茶道用品', fee: '5%' },
  { id: 'mingli', name: '命理咨询', fee: '10%' },
  { id: 'fengshui', name: '风水服务', fee: '10%' },
  { id: 'shufa', name: '书法字画', fee: '8%' },
]

// 编辑态预填数据（?id= 时）
export const productEditPreset = {
  images: ['1', '2'],
  title: '滴天髓精解',
  subtitle: '命理学经典著作精装版',
  description: '详细描述内容...',
  price: '68',
  originalPrice: '98',
  stock: '156',
  category: 'guji',
  tags: ['命理', '八字', '经典'],
  isVirtual: false,
  allowRefund: true,
  limitPerPerson: '',
}

// ---- 订单列表 orders ----
export interface MerchantOrder {
  id: string
  productTitle: string
  price: number
  quantity: number
  totalAmount: number
  status: 'pending' | 'shipped' | 'completed' | 'refunding' | 'cancelled'
  buyerName: string
  buyerPhone: string
  createdAt: string
  trackingNo?: string
  refundReason?: string
}

export const merchantOrders: MerchantOrder[] = [
  { id: '202401150001', productTitle: '滴天髓精解', price: 68, quantity: 2, totalAmount: 136, status: 'pending', buyerName: '张***', buyerPhone: '138****8888', createdAt: '2024-01-15 14:30:00' },
  { id: '202401150002', productTitle: '子平真诠评注', price: 88, quantity: 1, totalAmount: 88, status: 'shipped', buyerName: '李***', buyerPhone: '139****9999', createdAt: '2024-01-14 10:20:00', trackingNo: 'SF1234567890' },
  { id: '202401150003', productTitle: '文房四宝套装', price: 268, quantity: 1, totalAmount: 268, status: 'completed', buyerName: '王***', buyerPhone: '137****7777', createdAt: '2024-01-10 09:00:00' },
  { id: '202401150004', productTitle: '八字命理基础课', price: 199, quantity: 1, totalAmount: 199, status: 'refunding', buyerName: '赵***', buyerPhone: '136****6666', createdAt: '2024-01-12 15:00:00', refundReason: '买错了' },
  { id: '202401150005', productTitle: '紫砂茶壶礼盒', price: 588, quantity: 1, totalAmount: 588, status: 'cancelled', buyerName: '孙***', buyerPhone: '135****5555', createdAt: '2024-01-08 11:00:00' },
]

export const orderStatusConfig: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  pending: { label: '待发货', icon: 'package', color: '#ea580c', bg: '#fff7ed' },
  shipped: { label: '已发货', icon: 'truck', color: '#2563eb', bg: '#eff6ff' },
  completed: { label: '已完成', icon: 'check-circle', color: '#16a34a', bg: '#f0fdf4' },
  refunding: { label: '退款中', icon: 'clock', color: '#dc2626', bg: '#fef2f2' },
  cancelled: { label: '已取消', icon: 'x-circle', color: '#4b5563', bg: '#f9fafb' },
}

// ---- 订单详情 order-detail ----
export const expressCompanies = [
  { id: 'sf', name: '顺丰速运' },
  { id: 'yd', name: '韵达快递' },
  { id: 'zt', name: '中通快递' },
  { id: 'yt', name: '圆通速递' },
  { id: 'st', name: '申通快递' },
  { id: 'jd', name: '京东物流' },
  { id: 'ems', name: 'EMS' },
  { id: 'db', name: '德邦物流' },
]

export const merchantOrderDetail = {
  id: '202401150001',
  status: 'pending',
  createdAt: '2024-01-15 14:30:00',
  paidAt: '2024-01-15 14:32:00',
  payMethod: '微信支付',
  buyer: {
    name: '张三',
    phone: '13888888888',
    address: '北京市朝阳区建国路88号SOHO现代城A座1801室',
  },
  products: [
    { id: '1', title: '滴天髓精解', specs: '精装版', price: 68, quantity: 2 },
  ],
  amounts: { productTotal: 136, shipping: 0, discount: 0, total: 136 },
  remark: '请用气泡膜包装好，谢谢',
  timeline: [
    { time: '2024-01-15 14:32:00', title: '买家已付款', desc: '等待商家发货' },
    { time: '2024-01-15 14:30:00', title: '订单创建', desc: '买家提交订单' },
  ],
}

export const orderDetailStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '待发货', color: '#ea580c' },
  shipped: { label: '已发货', color: '#2563eb' },
  completed: { label: '已完成', color: '#16a34a' },
  refunding: { label: '退款中', color: '#dc2626' },
  cancelled: { label: '已取消', color: '#4b5563' },
}

// ---- 收入 revenue ----
export const merchantRevenue = {
  balance: 12680.5,
  pendingSettle: 2350.0,
  frozen: 500.0,
  totalIncome: 56800.0,
  totalWithdraw: 41769.5,
  monthIncome: 8560.0,
  monthCompare: 12.5,
}

export interface RevenueTransaction {
  id: string
  type: 'income' | 'withdraw' | 'refund' | 'fee'
  title: string
  orderNo?: string
  bankCard?: string
  amount: number
  status: string
  createdAt: string
}

export const revenueTransactions: RevenueTransaction[] = [
  { id: '1', type: 'income', title: '订单收入', orderNo: '202401150001', amount: 136.0, status: 'settled', createdAt: '2024-01-15 14:35' },
  { id: '2', type: 'income', title: '订单收入', orderNo: '202401140001', amount: 88.0, status: 'pending', createdAt: '2024-01-14 10:25' },
  { id: '3', type: 'withdraw', title: '提现到银行卡', bankCard: '招商银行 ****8888', amount: -2000.0, status: 'success', createdAt: '2024-01-10 09:00' },
  { id: '4', type: 'refund', title: '订单退款', orderNo: '202401080001', amount: -199.0, status: 'completed', createdAt: '2024-01-08 15:00' },
  { id: '5', type: 'fee', title: '平台服务费', orderNo: '202401050001', amount: -29.4, status: 'completed', createdAt: '2024-01-05 00:00' },
]

export const revenueTypeConfig: Record<string, { icon: string; color: string }> = {
  income: { icon: 'trending-up', color: '#16a34a' },
  withdraw: { icon: 'credit-card', color: '#2563eb' },
  refund: { icon: 'trending-down', color: '#dc2626' },
  fee: { icon: 'circle-dollar-sign', color: '#ea580c' },
}

export const revenueStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  settled: { label: '已结算', color: '#15803d', bg: '#dcfce7' },
  pending: { label: '待结算', color: '#b45309', bg: '#fef3c7' },
  success: { label: '提现成功', color: '#15803d', bg: '#dcfce7' },
  completed: { label: '已完成', color: '#374151', bg: '#f3f4f6' },
  processing: { label: '处理中', color: '#1d4ed8', bg: '#dbeafe' },
}

// ===== 评价管理 reviews =====
export const merchantReviews = [
  { id: '1', productTitle: '滴天髓精解', rating: 5, content: '书的质量很好，印刷清晰，内容详实，对于学习命理很有帮助。卖家发货也很快，包装仔细，好评！', images: [] as string[], buyer: '张***', createdAt: '2024-01-15 14:30', replied: false, replyContent: '', replyTime: '', hasImage: false },
  { id: '2', productTitle: '子平真诠评注', rating: 4, content: '整体不错，但是有些地方注解不够详细，希望能有更多的案例分析。', images: [] as string[], buyer: '李***', createdAt: '2024-01-14 10:20', replied: true, replyContent: '感谢您的反馈，我们会在新版中增加更多案例分析，祝您学习愉快！', replyTime: '2024-01-14 15:00', hasImage: false },
  { id: '3', productTitle: '文房四宝套装', rating: 5, content: '非常满意！毛笔质量很好，墨汁浓淡适中，宣纸手感细腻。送朋友的，他非常喜欢。', images: ['1', '2'], buyer: '王***', createdAt: '2024-01-13 09:00', replied: true, replyContent: '感谢您的支持与好评！欢迎再次光临~', replyTime: '2024-01-13 10:00', hasImage: true },
  { id: '4', productTitle: '八字命理基础课', rating: 2, content: '课程内容比较基础，感觉不太适合有一定基础的人，希望能有进阶课程。', images: [] as string[], buyer: '赵***', createdAt: '2024-01-12 15:00', replied: false, replyContent: '', replyTime: '', hasImage: false },
]

// ===== 数据分析 analytics（原型 getMerchantAnalytics API 缺失，合理 mock）=====
export const merchantAnalytics = {
  metrics: [
    { title: '销售额', value: 48520, unit: '元', trend: 'up' as const, change: 12.5, description: '较上月增长' },
    { title: '订单数', value: 385, unit: '单', trend: 'up' as const, change: 8.2, description: '较上月增长' },
    { title: '访客数', value: 12680, unit: '人', trend: 'up' as const, change: 15.3, description: '较上月增长' },
    { title: '转化率', value: 3.04, unit: '%', trend: 'down' as const, change: 2.1, description: '较上月下降' },
  ],
  salesTrend: [
    { date: '01-15', sales: 3200, orders: 22 },
    { date: '01-16', sales: 4100, orders: 28 },
    { date: '01-17', sales: 3800, orders: 25 },
    { date: '01-18', sales: 5200, orders: 34 },
    { date: '01-19', sales: 4600, orders: 30 },
    { date: '01-20', sales: 5800, orders: 38 },
  ],
  categorySales: [
    { name: '命理书籍', sales: 18500, orders: 145, percentage: 38 },
    { name: '文房用品', sales: 13200, orders: 98, percentage: 27 },
    { name: '付费课程', sales: 10800, orders: 86, percentage: 22 },
    { name: '风水摆件', sales: 6020, orders: 56, percentage: 13 },
  ],
  topProducts: [
    { id: '1', name: '《易经》进阶课程', sales: 185, revenue: 8250, change: 12 },
    { id: '2', name: '八字算命付费咨询', sales: 128, revenue: 5120, change: 8 },
    { id: '3', name: '紫微斗数秘籍合集', sales: 72, revenue: 3600, change: -5 },
  ],
  customerRetention: { newCustomers: 168, repeatCustomers: 112, retention: 40 },
}

export const analyticsCategoryColors = ['#C41E3A', '#E85D75', '#C9A96E', '#8B7355']

// ===== 店铺设置 profile / 店铺预览 shop-preview =====
export const merchantShopProfile = {
  logo: '',
  name: '墨香阁文化',
  slogan: '传承国学经典，弘扬传统文化',
  description: '墨香阁专注于国学文化传播，提供命理、风水、书法等传统文化产品和服务。我们致力于让更多人了解和热爱中华优秀传统文化。',
  phone: '400-888-8888',
  address: '北京市朝阳区建国路88号',
  businessHours: '09:00-21:00',
  isOpen: true,
  autoReply: true,
  autoReplyContent: '您好，欢迎光临墨香阁！有什么可以帮您的吗？',
  rating: 4.9,
  reviewCount: 328,
  followerCount: 1256,
  productCount: 45,
  salesCount: 2680,
  level: '金牌商家',
  badges: ['品质保障', '极速发货', '7天无理由'],
}

export const shopPreviewProducts = [
  { id: '1', title: '滴天髓精解', price: 68, originalPrice: 98, sales: 328 },
  { id: '2', title: '子平真诠评注', price: 88, originalPrice: 128, sales: 215 },
  { id: '3', title: '文房四宝套装', price: 268, originalPrice: 368, sales: 56 },
  { id: '4', title: '紫砂茶壶礼盒', price: 588, originalPrice: null as number | null, sales: 12 },
  { id: '5', title: '八字命理基础课', price: 199, originalPrice: 299, sales: 456 },
  { id: '6', title: '毛笔书法入门套装', price: 128, originalPrice: 168, sales: 89 },
]

// ===== 平台公告 notices =====
export const merchantNotices = [
  { id: '1', type: 'important', title: '紧急：商品发布规则重大调整', content: '自2024年2月1日起，所有商品需通过新的质量审核体系。请及时更新您的商品信息，以确保符合新规则。', category: '规则', time: '2024-01-20 10:30', read: false },
  { id: '2', type: 'activity', title: '春节特卖活动报名开始', content: '春节将至，平台推出春节特卖活动。符合条件的商家可免费参加，机会有限，请尽快报名。', category: '活动', time: '2024-01-19 15:20', read: false },
  { id: '3', type: 'warning', title: '警告：您的店铺存在违规商品', content: '我们发现您的店铺中存在2件违规商品，请在24小时内进行处理，否则可能面临处罚。', category: '警告', time: '2024-01-18 09:45', read: true },
  { id: '4', type: 'success', title: '恭喜！您成功升级为高级商家', content: '感谢您的持续支持与优秀的经营表现，您已经升级为高级商家等级，可享受更多权益。', category: '成就', time: '2024-01-17 14:10', read: true },
  { id: '5', type: 'info', title: '平台系统升级通知', content: '平台将于本周日凌晨进行系统维护，维护期间可能影响服务。感谢您的理解与支持。', category: '系统', time: '2024-01-16 11:20', read: true },
]

export const noticeTypeConfig: Record<string, { icon: string; iconColor: string; bg: string; border: string }> = {
  important: { icon: 'alert-triangle', iconColor: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  activity: { icon: 'megaphone', iconColor: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  warning: { icon: 'alert-circle', iconColor: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  success: { icon: 'check-circle', iconColor: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  info: { icon: 'megaphone', iconColor: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
}

export const noticeCategoryBadge: Record<string, { color: string; bg: string }> = {
  规则: { color: '#991b1b', bg: '#fee2e2' },
  活动: { color: '#1e40af', bg: '#dbeafe' },
  警告: { color: '#9a3412', bg: '#ffedd5' },
  成就: { color: '#166534', bg: '#dcfce7' },
  系统: { color: '#374151', bg: '#f3f4f6' },
}

// ===== 客户咨询 inquiries =====
export const merchantInquiries = [
  { id: '1', productName: '《渊海子平》古籍影印本', customer: '张女士', status: 'unanswered' as const, question: '请问这本书有电子版吗？能否快递到偏远地区？', answer: '', time: '2024-01-20 14:30', replies: 0 },
  { id: '2', productName: '紫砂茶具套装', customer: '李先生', status: 'answered' as const, question: '这套茶具是纯手工制作吗？有发票吗？', answer: '是的，全部由我们的手工艺人制作，购买时可提供发票。', time: '2024-01-20 10:15', replies: 1 },
  { id: '3', productName: '八字算命初学者套装', customer: '王女士', status: 'unanswered' as const, question: '是否有退货政策？如果不满意可以退吗？', answer: '', time: '2024-01-19 16:45', replies: 0 },
  { id: '4', productName: '国学经典诵读课程', customer: '陈先生', status: 'answered' as const, question: '课程有效期是多久？可以重复学习吗？', answer: '课程一次购买终身有效，您可以随时重复学习。', time: '2024-01-19 09:20', replies: 2 },
  { id: '5', productName: '香道入门套装', customer: '赵女士', status: 'answered' as const, question: '香道入门需要什么基础吗？', answer: '无需任何基础，我们的课程从零开始教学，包含详细的视频讲解。', time: '2024-01-18 14:10', replies: 1 },
]

// ===== 内容统计 content-stats（原型 getContentStats/getContentList API缺失，合理mock）=====
export const merchantContentStats = {
  totalProducts: 156,
  publishedProducts: 142,
  draftProducts: 12,
  publishedArticles: 48,
  totalViews: 45680,
  totalLikes: 3240,
}

export const merchantContentList = [
  { id: '1', title: '《渊海子平》古籍影印本', type: '商品' as const, status: '已发布', views: 2850, likes: 340, sales: 85 as number | undefined, createdAt: '2024-01-15' },
  { id: '2', title: '紫砂茶具套装', type: '商品' as const, status: '已发布', views: 2150, likes: 280, sales: 62 as number | undefined, createdAt: '2024-01-14' },
  { id: '3', title: '如何快速入门八字学', type: '文章' as const, status: '已发布', views: 1850, likes: 180, sales: undefined as number | undefined, createdAt: '2024-01-13' },
  { id: '4', title: '新推出：算命初学者套装', type: '商品' as const, status: '草稿', views: 1200, likes: 95, sales: undefined as number | undefined, createdAt: '2024-01-20' },
  { id: '5', title: '古籍分享系列 Vol.2', type: '文章' as const, status: '已发布', views: 980, likes: 75, sales: undefined as number | undefined, createdAt: '2024-01-10' },
]

export const contentStatusBadge: Record<string, { color: string; bg: string }> = {
  已发布: { color: '#15803d', bg: '#dcfce7' },
  草稿: { color: '#374151', bg: '#f3f4f6' },
  下架: { color: '#dc2626', bg: '#fee2e2' },
}

// ===== 圈子绑定 circle-bindding =====
export const merchantCircles = [
  { id: '1', name: '八字算命爱好者', category: '算命', members: 1250, bound: false },
  { id: '2', name: '紫微斗数研究', category: '占卜', members: 980, bound: true },
  { id: '3', name: '道教文化传承', category: '道教', members: 650, bound: false },
  { id: '4', name: '中医养生圈', category: '健康', members: 2100, bound: false },
  { id: '5', name: '古籍收藏交流', category: '文化', members: 380, bound: false },
  { id: '6', name: '国学经典讨论', category: '国学', members: 1520, bound: false },
]

// ===== 违规管理 violations =====
export const merchantViolationStats = { total: 3, pending: 1, score: 12, maxScore: 48 }

export const merchantViolations = [
  { id: '1', type: 'product', title: '商品信息违规', description: '商品标题包含夸大宣传用语', productTitle: '最强命理秘籍', orderNo: '', penalty: '商品下架，扣2分', score: 2, status: 'pending', createdAt: '2024-01-15 10:00', deadline: '2024-01-18 10:00', processedAt: '' },
  { id: '2', type: 'service', title: '服务态度违规', description: '与买家沟通时使用不文明用语', productTitle: '', orderNo: '202401100001', penalty: '警告，扣5分', score: 5, status: 'processed', createdAt: '2024-01-10 15:00', deadline: '', processedAt: '2024-01-11 09:00' },
  { id: '3', type: 'delay', title: '延迟发货', description: '超过承诺时间48小时未发货', productTitle: '', orderNo: '202401050001', penalty: '扣5分，赔付买家5元', score: 5, status: 'processed', createdAt: '2024-01-05 00:00', deadline: '', processedAt: '2024-01-05 12:00' },
]

export const violationTypeConfig: Record<string, { icon: string; color: string; bg: string }> = {
  product: { icon: 'file-warning', color: '#ea580c', bg: '#fff7ed' },
  service: { icon: 'shield-alert', color: '#dc2626', bg: '#fef2f2' },
  delay: { icon: 'alert-triangle', color: '#d97706', bg: '#fffbeb' },
}

export const violationStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待处理', color: '#b91c1c', bg: '#fee2e2' },
  appealing: { label: '申诉中', color: '#1d4ed8', bg: '#dbeafe' },
  processed: { label: '已处理', color: '#374151', bg: '#f3f4f6' },
}

// ============ API 层 ============

const mockApplyData = {
  applicationId: 'MA20240001',
  shopName: '',
  category: '',
  phone: '',
  status: 'draft',
}

export const merchantApi = {
  /** 申请入驻 — POST /merchant/apply */
  async apply(data: Record<string, any>): Promise<any> {
    if (useMock()) return { ...mockApplyData, ...data, applicationId: 'MA20240001', status: 'draft' }
    try {
      return await apiPost('/merchant/apply', data)
    } catch {
      return { ...mockApplyData, ...data, applicationId: 'MA20240001', status: 'draft' }
    }
  },

  /** 获取申请 — GET /merchant/application */
  async getApplication(): Promise<any> {
    if (useMock()) return mockApplyData
    try {
      return await apiGet('/merchant/application')
    } catch {
      return mockApplyData
    }
  },

  /** 修改申请 — PUT /merchant/application */
  async updateApplication(data: Record<string, any>): Promise<any> {
    if (useMock()) return { ...mockApplyData, ...data }
    try {
      return await apiPut('/merchant/application', data)
    } catch {
      return { ...mockApplyData, ...data }
    }
  },

  /** 提交审核 — POST /merchant/submit */
  async submit(): Promise<{ success: boolean; message: string }> {
    if (useMock()) return { success: true, message: '提交成功，请等待审核' }
    try {
      await apiPost('/merchant/submit', {})
      return { success: true, message: '提交成功，请等待审核' }
    } catch (e: any) {
      return { success: false, message: e?.message || '提交失败' }
    }
  },

  /** 保证金信息 — GET /merchant/deposit-info */
  async getDepositInfo(): Promise<any> {
    if (useMock()) return { amount: 5000, paid: false, deadline: '2024-06-30', status: 'unpaid' }
    try {
      return await apiGet('/merchant/deposit-info')
    } catch {
      return { amount: 5000, paid: false, deadline: '2024-06-30', status: 'unpaid' }
    }
  },

  /** 缴纳保证金 — POST /merchant/pay-deposit */
  async payDeposit(): Promise<{ success: boolean; message: string }> {
    if (useMock()) return { success: true, message: '保证金缴纳成功' }
    try {
      await apiPost('/merchant/pay-deposit', {})
      return { success: true, message: '保证金缴纳成功' }
    } catch (e: any) {
      return { success: false, message: e?.message || '缴纳失败' }
    }
  },

  /** 协议预览 — GET /merchant/agreement-preview */
  async getAgreementPreview(): Promise<any> {
    if (useMock()) return { title: '商家入驻协议', content: '协议内容...', version: 'v2.1', updatedAt: '2024-01-01' }
    try {
      return await apiGet('/merchant/agreement-preview')
    } catch {
      return { title: '商家入驻协议', content: '协议内容...', version: 'v2.1', updatedAt: '2024-01-01' }
    }
  },

  /** 签署协议 — POST /merchant/sign-agreement */
  async signAgreement(): Promise<{ success: boolean; message: string }> {
    if (useMock()) return { success: true, message: '签署成功' }
    try {
      await apiPost('/merchant/sign-agreement', {})
      return { success: true, message: '签署成功' }
    } catch (e: any) {
      return { success: false, message: e?.message || '签署失败' }
    }
  },
}

export const merchantAdminApi = {
  /** 商家后台仪表盘 — GET /merchant-admin/dashboard */
  async getDashboard(): Promise<any> {
    if (useMock()) return merchantDashboard
    try {
      return await apiGet('/merchant-admin/dashboard')
    } catch {
      return merchantDashboard
    }
  },

  /** 订单列表 — GET /merchant-admin/orders */
  async getOrders(params?: Record<string, any>): Promise<any[]> {
    if (useMock()) return merchantOrders
    try {
      return await apiGet('/merchant-admin/orders', params)
    } catch {
      return merchantOrders
    }
  },

  /** 商品管理 — GET /merchant-admin/products */
  async getProducts(params?: Record<string, any>): Promise<MerchantProduct[]> {
    if (useMock()) return merchantProducts
    try {
      return await apiGet('/merchant-admin/products', params)
    } catch {
      return merchantProducts
    }
  },

  /** 收益概览 — GET /merchant-admin/revenue */
  async getRevenue(): Promise<any> {
    if (useMock()) return { ...merchantRevenue, transactions: revenueTransactions }
    try {
      return await apiGet('/merchant-admin/revenue')
    } catch {
      return { ...merchantRevenue, transactions: revenueTransactions }
    }
  },

  /** 评价管理 — GET /merchant-admin/reviews */
  async getReviews(params?: Record<string, any>): Promise<any[]> {
    if (useMock()) return merchantReviews
    try {
      return await apiGet('/merchant-admin/reviews', params)
    } catch {
      return merchantReviews
    }
  },

  /** 违规记录 — GET /merchant-admin/violations */
  async getViolations(): Promise<any> {
    if (useMock()) return { stats: merchantViolationStats, items: merchantViolations }
    try {
      return await apiGet('/merchant-admin/violations')
    } catch {
      return { stats: merchantViolationStats, items: merchantViolations }
    }
  },

  /** 平台通知 — GET /merchant-admin/notices */
  async getNotices(): Promise<any[]> {
    if (useMock()) return merchantNotices
    try {
      return await apiGet('/merchant-admin/notices')
    } catch {
      return merchantNotices
    }
  },
}
