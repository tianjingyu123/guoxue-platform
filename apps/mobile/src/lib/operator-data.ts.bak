// 分站运营商 - 加入运营商页数据（对齐原型 app/join/operator）

import { apiGet, apiPost, useMock } from '@/utils/request'

export interface PlanCompareRow {
  feature: string
  station: string | boolean
  operator: string | boolean
}

export interface OperatorBenefit {
  icon: string
  title: string
  desc: string
  highlight: boolean
}

export interface EarningCase {
  name: string
  days: number
  earnings: number
  teamSize: number
  soldQuota: number
}

export interface FaqItem {
  q: string
  a: string
}

// 价格
export const operatorPricing = {
  price: 4999,
  originalPrice: 5999,
  quotaUnitPrice: 999,
  quotaCount: 6,
  get quotaValue() {
    return this.quotaUnitPrice * this.quotaCount
  },
}

// 权益对比
export const planComparison: PlanCompareRow[] = [
  { feature: '专属分站入口', station: true, operator: true },
  { feature: '入圈费用分佣', station: '10%-30%', operator: '15%-35%' },
  { feature: '分站名额', station: '1个（自用）', operator: '6个（自用1+售卖5）' },
  { feature: '团队管理', station: false, operator: true },
  { feature: '下级站长分佣', station: false, operator: '5%' },
  { feature: '专属培训', station: false, operator: true },
  { feature: '优先客服', station: false, operator: true },
  { feature: '线下活动', station: false, operator: true },
]

// 运营商权益
export const operatorBenefits: OperatorBenefit[] = [
  { icon: 'award', title: '开通专属分站', desc: '分站名称显示在首页，提升标识性', highlight: true },
  { icon: 'trending-up', title: '分享赚佣金', desc: '分享商品/课程/会员等，购买成功获得佣金', highlight: true },
  { icon: 'wallet', title: '自购也省钱', desc: '自己购买平台内容同样获得返佣', highlight: true },
  { icon: 'layers', title: '5个销售名额', desc: '赠送5个销售金额全返的分站推荐名额', highlight: true },
  { icon: 'users', title: '管理奖励', desc: '管理分站得相应比例的管理奖', highlight: true },
  { icon: 'gift', title: '赠送视频课程', desc: '国学视频课程免费学习', highlight: false },
  { icon: 'book-open', title: '赠送精装书籍', desc: '精装国学书籍一套', highlight: false },
]

// 收益案例
export const operatorEarningCases: EarningCase[] = [
  { name: '张***运营', days: 365, earnings: 86800, teamSize: 12, soldQuota: 8 },
  { name: '李***商', days: 180, earnings: 32500, teamSize: 6, soldQuota: 4 },
  { name: '王***营', days: 90, earnings: 18600, teamSize: 3, soldQuota: 2 },
]

// 常见问题
export const operatorFaqs: FaqItem[] = [
  { q: '运营商和站长有什么区别？', a: '运营商是更高级别的合作伙伴，拥有6个分站名额，可以发展和管理站长团队，享受团队分佣收益。' },
  { q: '6个分站名额如何使用？', a: '1个自用建立分站，剩余5个可以999元/个的价格售卖给他人，售卖收入100%归您。' },
  { q: '下级站长的分佣怎么算？', a: '您招募的站长产生的入圈分佣，您额外获得5%的团队奖励。' },
  { q: '已经是站长可以升级吗？', a: '可以，补差价4000元即可升级为运营商，原站长权益继续有效。' },
]

// ===== 加入站长页数据（对齐原型 app/join/station）=====

export interface StationEarningCase {
  name: string
  days: number
  earnings: number
  users: number
}

// 价格
export const stationPricing = {
  price: 999,
  originalPrice: 1299,
}

// 站长权益（对齐原型 benefits）
export const stationBenefits: OperatorBenefit[] = [
  { icon: 'award', title: '专属分站入口', desc: '分站名称显示在首页，提升标识性', highlight: true },
  { icon: 'trending-up', title: '分享赚佣金', desc: '分享商品/课程/会员等，购买成功获得佣金', highlight: true },
  { icon: 'wallet', title: '自购也省钱', desc: '自己购买平台内容同样获得返佣', highlight: true },
  { icon: 'gift', title: '赠送视频课程', desc: '国学视频课程免费学习', highlight: false },
  { icon: 'book-open', title: '赠送精装书籍', desc: '精装国学书籍一套', highlight: false },
  { icon: 'star', title: '专属海报', desc: '生成推广海报和二维码', highlight: false },
]

// 站长收益案例（对齐原型 earningCases）
export const stationEarningCases: StationEarningCase[] = [
  { name: '易***师', days: 180, earnings: 12680, users: 256 },
  { name: '国***阁', days: 90, earnings: 5680, users: 128 },
  { name: '命***堂', days: 365, earnings: 28900, users: 512 },
]

// 站长常见问题（对齐原型 faqs）
export const stationFaqs: FaqItem[] = [
  { q: '站长权益有效期多久？', a: '站长权益有效期为1年，到期后可续费继续享有权益。' },
  { q: '分佣比例是多少？', a: '入圈费用分佣比例为10%-30%，具体根据圈子类型和平台政策而定。' },
  { q: '可以升级为运营商吗？', a: '可以，补差价即可升级为运营商，享受更多权益和名额。' },
  { q: '通过运营商链接购买有区别吗？', a: '价格相同，区别是您将归属该运营商团队，享受团队支持。' },
]

// ===== 协议页数据（对齐原型 app/agreement/operator & station）=====

export interface AgreementSection {
  title: string
  content: string
}

// 运营商协议条款
export const operatorAgreementSections: AgreementSection[] = [
  { title: '第一条 总则', content: '本协议是运营商与本平台之间的法律文件，规范双方在平台运营中的权利和义务。运营商应在同意本协议全部条款后才能进行运营活动。' },
  { title: '第二条 运营商资格', content: '运营商必须具有完全民事行为能力，且在相关部门已依法注册。运营商应对其提供的所有信息的真实性负责。' },
  { title: '第三条 运营商权利', content: '运营商有权在平台上发布内容、创建圈子、开设店铺等。运营商获得的收益由平台与运营商按照约定比例分成。' },
  { title: '第四条 运营商义务', content: '运营商不得发布违反法律法规的内容，不得骚扰其他用户，不得从事欺诈活动。运营商应积极配合平台的管理和审查。' },
  { title: '第五条 内容规范', content: '所有发布的内容应符合国家法律法规和平台规范。不得包含色情、暴力、歧视等违法违规内容。' },
  { title: '第六条 费用结算', content: '平台与运营商的收益分成比例为：平台25%，运营商75%。结算周期为自然月，次月1日起可申请提现。' },
  { title: '第七条 违约处理', content: '若运营商违反本协议，平台有权进行警告、限制功能或封禁账户等处理。情节严重的将移交司法部门处理。' },
  { title: '第八条 协议变更', content: '平台保留修改本协议的权利。重大修改会提前30天通知运营商。继续使用平台即视为接受新协议。' },
]

// 运营商协议提示
export const operatorAgreementTip = '本协议自您成为平台运营商时生效。请仔细阅读，如有任何疑问，请联系客服。'

// 站长协议条款
export const stationAgreementSections: AgreementSection[] = [
  { title: '第一条 总则', content: '本协议是站长与本平台之间的法律文件，规范站长在平台上发布内容和管理社区的权利义务。站长应在同意本协议后才能开始发布活动。' },
  { title: '第二条 站长定义', content: '站长是指在平台上创建并运营专题、栏目或社区的个人或组织。站长应具有完全民事行为能力，且对发布的内容负全责。' },
  { title: '第三条 站长权利', content: '站长有权创建专属社区，发布各类内容，管理粉丝互动。站长可获得平台分配的流量和广告收益。' },
  { title: '第四条 站长义务', content: '站长应确保所有内容合法合规，不得发布虚假或误导性信息。站长需定期维护社区秩序，删除违规内容。' },
  { title: '第五条 内容审核', content: '平台将对所有发布的内容进行审核。站长应配合平台审核工作，及时修改或删除违规内容。' },
  { title: '第六条 收益分配', content: '站长的收益来源包括：直播打赏、商品销售、广告收入等。平台按照不同收益类型进行分成，具体比例见《收益分成协议》。' },
  { title: '第七条 社区管理', content: '站长应维护社区健康环境，禁止骚扰、诋毁等行为。平台有权干预和处理严重违规的社区。' },
  { title: '第八条 违约处理', content: '违反本协议的站长将被暂停发布功能、降低流量或解除合作。严重违规将被永久封禁。' },
]

// 站长协议提示
export const stationAgreementTip = '本协议自您注册成为站长时生效。请仔细阅读所有条款，了解您的权利和义务。'

// ===== 运营商角色面板数据（对齐原型 lib/api/operator mock）=====

export interface OperatorOverviewItem {
  key: string
  label: string
  value: number | string
  unit?: string
  trend?: number
  trendLabel?: string
}

export interface TeamMemberRanking {
  rank: number
  userId: number
  nickname: string
  performance: number
  performanceUnit: string
  change?: number
  isSelf?: boolean
}

export interface QuotaUsageItem {
  key: string
  label: string
  used: number
  total: number
  unit: string
  expireAt?: string
  isLow?: boolean
}

export interface OperatorQuickAction {
  key: string
  label: string
  icon: string
  href: string
  badge?: number
}

export const operatorPanelInfo = {
  id: 1001,
  name: '华东区运营中心',
  level: '金牌运营商',
  joinDate: '2024-03-15',
}

export const operatorOverview: OperatorOverviewItem[] = [
  { key: 'monthRevenue', label: '本月业绩', value: 128600, unit: '元', trend: 12.5, trendLabel: '较上月' },
  { key: 'teamMembers', label: '团队成员', value: 45, unit: '人', trend: 3, trendLabel: '本月新增' },
  { key: 'newCustomers', label: '新增客户', value: 386, unit: '人', trend: 8.2, trendLabel: '较上月' },
  { key: 'commission', label: '待结算佣金', value: 15680, unit: '元' },
  { key: 'coursesSold', label: '课程销售', value: 892, unit: '份', trend: 15.3, trendLabel: '较上月' },
  { key: 'conversionRate', label: '转化率', value: '23.5%', trend: 2.1, trendLabel: '较上月' },
]

export const operatorTeamRanking: TeamMemberRanking[] = [
  { rank: 1, userId: 101, nickname: '张明华', performance: 28500, performanceUnit: '元', change: 15.2 },
  { rank: 2, userId: 102, nickname: '李小红', performance: 24300, performanceUnit: '元', change: 8.5 },
  { rank: 3, userId: 103, nickname: '王建国', performance: 21800, performanceUnit: '元', change: -2.3 },
  { rank: 4, userId: 104, nickname: '赵雅琴', performance: 19600, performanceUnit: '元', change: 12.1, isSelf: true },
  { rank: 5, userId: 105, nickname: '陈志强', performance: 17200, performanceUnit: '元', change: 5.8 },
  { rank: 6, userId: 106, nickname: '刘芳芳', performance: 15800, performanceUnit: '元', change: -1.2 },
  { rank: 7, userId: 107, nickname: '孙伟', performance: 14500, performanceUnit: '元', change: 3.4 },
  { rank: 8, userId: 108, nickname: '周丽娟', performance: 12900, performanceUnit: '元', change: 7.6 },
]

export const operatorQuotaUsage: QuotaUsageItem[] = [
  { key: 'courseQuota', label: '课程推广配额', used: 450, total: 500, unit: '次', expireAt: '2026-06-30', isLow: true },
  { key: 'liveQuota', label: '直播推广配额', used: 28, total: 100, unit: '场', expireAt: '2026-06-30', isLow: false },
  { key: 'memberQuota', label: '团队成员上限', used: 45, total: 50, unit: '人', isLow: true },
  { key: 'storageQuota', label: '存储空间', used: 8.5, total: 20, unit: 'GB', isLow: false },
]

export const operatorQuickActions: OperatorQuickAction[] = [
  { key: 'team', label: '团队管理', icon: 'users', href: '/operator/dashboard', badge: 3 },
  { key: 'commission', label: '佣金明细', icon: 'wallet', href: '/station/earnings' },
  { key: 'promote', label: '推广中心', icon: 'megaphone', href: '/station/materials' },
  { key: 'customers', label: '客户管理', icon: 'user-check', href: '/operator/dashboard', badge: 12 },
  { key: 'materials', label: '推广素材', icon: 'image', href: '/station/materials' },
  { key: 'statistics', label: '数据统计', icon: 'bar-chart-3', href: '/operator/dashboard' },
  { key: 'quota', label: '名额管理', icon: 'book-open', href: '/operator/quota' },
  { key: 'settlement', label: '结算申请', icon: 'credit-card', href: '/station/earnings' },
]

// ===== 站长角色面板数据（对齐原型 lib/api/station mock）=====

export interface StationOverviewItem {
  label: string
  value: number | string
  unit?: string
  trend?: number
  trendType?: 'up' | 'down' | 'flat'
  icon?: string
}

export interface StationTrendPoint {
  date: string
  value: number
}

export interface StationTrendData {
  type: 'revenue' | 'orders'
  label: string
  total: number
  change: number
  data: StationTrendPoint[]
}

export interface StationNotice {
  id: number
  title: string
  type: 'info' | 'warning' | 'success'
  createdAt: string
}

export interface StationPanelQuickAction {
  id: string
  label: string
  icon: string
  path: string
  badge?: number
  description?: string
}

// 概览 icon 语义键 → 真实图标名映射
export const stationOverviewIconMap: Record<string, string> = {
  users: 'users',
  revenue: 'wallet',
  orders: 'shopping-cart',
  total: 'circle-dollar-sign',
  visits: 'eye',
  conversion: 'target',
}

// 快捷入口 icon 语义键 → 真实图标名映射
export const stationActionIconMap: Record<string, string> = {
  users: 'users',
  image: 'image',
  settings: 'settings',
  wallet: 'wallet',
  list: 'list',
  chart: 'bar-chart-3',
  money: 'circle-dollar-sign',
  share: 'share-2',
  help: 'help-circle',
}

export const stationPanelInfo = {
  id: 1001,
  name: '国学文化推广站',
  level: 3,
  levelName: '金牌分站',
  createTime: '2025-01-15',
  expireTime: '2027-01-15',
  status: 'active' as 'active' | 'expired' | 'paused',
}

export const stationPanelOverview: StationOverviewItem[] = [
  { label: '团队成员', value: 1286, unit: '人', trend: 12.5, trendType: 'up', icon: 'users' },
  { label: '本月收益', value: 28650, unit: '元', trend: 8.3, trendType: 'up', icon: 'revenue' },
  { label: '本月订单', value: 486, unit: '单', trend: -2.1, trendType: 'down', icon: 'orders' },
  { label: '累计收益', value: 156800, unit: '元', trend: 0, trendType: 'flat', icon: 'total' },
  { label: '今日访问', value: 328, unit: '次', trend: 15.6, trendType: 'up', icon: 'visits' },
  { label: '转化率', value: '6.8%', trend: 0.5, trendType: 'up', icon: 'conversion' },
]

export const stationPanelTrends: StationTrendData[] = [
  {
    type: 'revenue', label: '收益趋势', total: 28650, change: 8.3,
    data: [
      { date: '05-28', value: 3200 },
      { date: '05-29', value: 4100 },
      { date: '05-30', value: 3800 },
      { date: '05-31', value: 5200 },
      { date: '06-01', value: 4600 },
      { date: '06-02', value: 3950 },
      { date: '06-03', value: 3800 },
    ],
  },
  {
    type: 'orders', label: '订单趋势', total: 486, change: -2.1,
    data: [
      { date: '05-28', value: 62 },
      { date: '05-29', value: 78 },
      { date: '05-30', value: 71 },
      { date: '05-31', value: 85 },
      { date: '06-01', value: 69 },
      { date: '06-02', value: 65 },
      { date: '06-03', value: 56 },
    ],
  },
]

export const stationPanelBalance = {
  available: 12680,
  pending: 5230,
  withdrawn: 138890,
  frozen: 0,
}

export const stationPanelQuickActions: StationPanelQuickAction[] = [
  { id: 'promote', label: '推广中心', icon: 'share', path: '/station/promote', description: '生成推广链接/二维码/临时推荐' },
  { id: 'team', label: '团队管理', icon: 'users', path: '/station/team', badge: 5, description: '查看和管理团队成员' },
  { id: 'materials', label: '推广素材', icon: 'image', path: '/station/materials', description: '获取推广海报和文案' },
  { id: 'config', label: '分站配置', icon: 'settings', path: '/station/config', description: '自定义分站设置' },
  { id: 'income', label: '收益明细', icon: 'wallet', path: '/station/earnings', badge: 3, description: '查看收益和提现记录' },
  { id: 'orders', label: '订单管理', icon: 'list', path: '/orders/center', description: '查看团队订单' },
  { id: 'assistant', label: '站长助理', icon: 'chart', path: '/station/assistant', description: 'AI 运营助理' },
  { id: 'help', label: '帮助中心', icon: 'help', path: '/help', description: '常见问题解答' },
]

export const stationPanelNotices: StationNotice[] = [
  { id: 1, title: '恭喜！本月业绩达成奖励已发放', type: 'success', createdAt: '2026-06-03 10:00' },
  { id: 2, title: '端午节活动推广素材已更新', type: 'info', createdAt: '2026-06-01 09:00' },
  { id: 3, title: '分站等级即将到期，请及时续费', type: 'warning', createdAt: '2026-05-28 14:00' },
]

// ===== 运营商工作台 dashboard 数据（对齐原型 app/operator/dashboard，页面内联）=====

export interface OperatorDashboardData {
  name: string
  level: string
  joinDate: string
  quota: { total: number; used: number; sold: number; available: number }
  team: { total: number; thisMonth: number }
  earnings: { total: number; thisMonth: number; pending: number; teamBonus: number; quotaSales: number }
  stats: { totalUsers: number; thisMonthUsers: number; conversionRate: number }
}

export interface DashboardTeamMember {
  id: number
  name: string
  joinDate: string
  status: 'active' | 'pending'
  users: number
  earnings: number
  myBonus: number
}

export interface DashboardQuotaRecord {
  id: number
  type: 'self' | 'sold'
  name: string
  date: string
  price?: number
  status: 'active' | 'pending'
}

export const operatorDashboardData: OperatorDashboardData = {
  name: '国学推广联盟',
  level: '金牌运营商',
  joinDate: '2024-01-15',
  quota: { total: 6, used: 1, sold: 3, available: 2 },
  team: { total: 3, thisMonth: 1 },
  earnings: { total: 32680, thisMonth: 5680, pending: 1280, teamBonus: 8600, quotaSales: 2997 },
  stats: { totalUsers: 580, thisMonthUsers: 86, conversionRate: 12.5 },
}

export const dashboardTeamMembers: DashboardTeamMember[] = [
  { id: 1, name: '易学驿站', joinDate: '2024-03-15', status: 'active', users: 128, earnings: 3680, myBonus: 184 },
  { id: 2, name: '国学小站', joinDate: '2024-05-20', status: 'active', users: 86, earnings: 2560, myBonus: 128 },
  { id: 3, name: '命理之家', joinDate: '2024-06-01', status: 'pending', users: 0, earnings: 0, myBonus: 0 },
]

export const dashboardQuotaRecords: DashboardQuotaRecord[] = [
  { id: 1, type: 'self', name: '自用', date: '2024-01-15', status: 'active' },
  { id: 2, type: 'sold', name: '易学驿站', date: '2024-03-15', price: 999, status: 'active' },
  { id: 3, type: 'sold', name: '国学小站', date: '2024-05-20', price: 999, status: 'active' },
  { id: 4, type: 'sold', name: '命理之家', date: '2024-06-01', price: 999, status: 'pending' },
]

export const operatorInviteLink = 'https://rebu.com/join/station?ref=OP12345'

// ===== 团队管理 team 数据（对齐原型 lib/api/team mock）=====

export interface TeamMgmtOverview {
  totalMembers: number
  newMembersThisMonth: number
  totalCommission: number
  commissionRate: number
  myLevel: string
  nextLevelRequirement: number
}

export interface TeamMgmtMember {
  id: number
  nickname: string
  phone: string
  level: string
  levelIcon: string
  joinDate: string
  totalCommission: number
  thisMonthCommission: number
  inviteCount: number
  status: 'active' | 'inactive'
  lastActiveTime: string
}

export interface TeamLeaderboardItem {
  rank: number
  userId: number
  nickname: string
  level: string
  value: number
  change: number
}

export interface TeamActivityItem {
  id: number
  type: 'join' | 'upgrade' | 'commission' | 'invite' | 'achievement'
  userId: number
  userNickname: string
  content: string
  amount?: number
  createdAt: string
}

export interface TeamSuccessCaseItem {
  id: number
  userId: number
  nickname: string
  title: string
  description: string
  achievement: string
  duration: string
  totalEarnings: number
  createdAt: string
}

export interface TeamMemberOrder {
  id: number
  amount: number
  commission: number
  time: string
}

export interface TeamMemberInvited {
  id: number
  nickname: string
  joinDate: string
}

export const teamMgmtOverview: TeamMgmtOverview = {
  totalMembers: 156,
  newMembersThisMonth: 23,
  totalCommission: 28650.0,
  commissionRate: 15,
  myLevel: '金牌站长',
  nextLevelRequirement: 50000,
}

export const teamMgmtMembers: TeamMgmtMember[] = [
  { id: 1, nickname: '易学传人', phone: '138****6688', level: '银牌推广员', levelIcon: '🥈', joinDate: '2026-03-15', totalCommission: 3580.0, thisMonthCommission: 680.0, inviteCount: 12, status: 'active', lastActiveTime: '2026-06-03 10:30' },
  { id: 2, nickname: '国学爱好者', phone: '139****8899', level: '铜牌推广员', levelIcon: '🥉', joinDate: '2026-04-20', totalCommission: 1260.0, thisMonthCommission: 320.0, inviteCount: 5, status: 'active', lastActiveTime: '2026-06-02 18:45' },
  { id: 3, nickname: '命理研究员', phone: '136****7766', level: '金牌推广员', levelIcon: '🥇', joinDate: '2026-02-10', totalCommission: 8920.0, thisMonthCommission: 1580.0, inviteCount: 28, status: 'active', lastActiveTime: '2026-06-03 09:15' },
  { id: 4, nickname: '风水学徒', phone: '135****5544', level: '普通推广员', levelIcon: '⭐', joinDate: '2026-05-08', totalCommission: 380.0, thisMonthCommission: 180.0, inviteCount: 2, status: 'inactive', lastActiveTime: '2026-05-28 14:20' },
]

export const teamLeaderboard: TeamLeaderboardItem[] = [
  { rank: 1, userId: 3, nickname: '命理研究员', level: '金牌', value: 8920, change: 2 },
  { rank: 2, userId: 1, nickname: '易学传人', level: '银牌', value: 3580, change: 0 },
  { rank: 3, userId: 5, nickname: '玄学探索者', level: '银牌', value: 2860, change: 1 },
  { rank: 4, userId: 2, nickname: '国学爱好者', level: '铜牌', value: 1260, change: -1 },
  { rank: 5, userId: 6, nickname: '八字初学者', level: '铜牌', value: 980, change: 3 },
]
export const teamMyRank = 8

export const teamActivities: TeamActivityItem[] = [
  { id: 1, type: 'join', userId: 10, userNickname: '新成员小张', content: '加入了您的团队', createdAt: '2026-06-03 14:30' },
  { id: 2, type: 'commission', userId: 3, userNickname: '命理研究员', content: '完成一笔推广订单', amount: 128.0, createdAt: '2026-06-03 11:20' },
  { id: 3, type: 'upgrade', userId: 1, userNickname: '易学传人', content: '升级为银牌推广员', createdAt: '2026-06-02 16:45' },
  { id: 4, type: 'invite', userId: 2, userNickname: '国学爱好者', content: '成功邀请了 2 位新成员', createdAt: '2026-06-02 10:30' },
  { id: 5, type: 'achievement', userId: 3, userNickname: '命理研究员', content: '达成"月入过千"成就', createdAt: '2026-06-01 20:00' },
]

export const teamSuccessCases: TeamSuccessCaseItem[] = [
  { id: 1, userId: 3, nickname: '命理研究员', title: '从小白到金牌的蜕变', description: '分享我如何在3个月内实现月入过万的推广之路，关键在于持续学习和真诚分享...', achievement: '月入过万', duration: '4个月', totalEarnings: 32580, createdAt: '2026-05-20' },
  { id: 2, userId: 8, nickname: '风水大师徒弟', title: '边学边赚的推广心得', description: '作为国学爱好者，我把推广当作分享好东西给朋友，没想到收益超出预期...', achievement: '百人团队', duration: '6个月', totalEarnings: 18960, createdAt: '2026-04-15' },
]

// 成员详情弹窗 mock（对齐原型 getMemberDetail）
export const teamMemberRecentOrders: TeamMemberOrder[] = [
  { id: 1, amount: 299, commission: 44.85, time: '2026-06-03 10:20' },
  { id: 2, amount: 599, commission: 89.85, time: '2026-06-01 15:30' },
]
export const teamMemberInvitedMembers: TeamMemberInvited[] = [
  { id: 101, nickname: '小明', joinDate: '2026-05-20' },
  { id: 102, nickname: '小红', joinDate: '2026-05-15' },
]

export const teamActivityIconMap: Record<string, string> = {
  join: '👋', upgrade: '⬆️', commission: '💰', invite: '🤝', achievement: '🏆',
}

export const teamInviteLink = 'https://rebu.com/invite/ABC123'

// ===== 名额管理 quota 数据（对齐原型 app/operator/quota，页面内联）=====

export interface QuotaRecord {
  id: number
  type: 'self' | 'sold' | 'gifted'
  name: string
  phone?: string
  date: string
  amount?: number
  status: string
}

export const quotaData = {
  total: 6,
  used: 1,
  sold: 3,
  gifted: 0,
  available: 2,
  price: 999,
}

export const quotaRecords: QuotaRecord[] = [
  { id: 1, type: 'self', name: '自用开站', date: '2024-01-01', status: 'active' },
  { id: 2, type: 'sold', name: '张***', phone: '138****8888', date: '2024-02-15', amount: 999, status: 'active' },
  { id: 3, type: 'sold', name: '李***', phone: '139****9999', date: '2024-03-20', amount: 999, status: 'active' },
  { id: 4, type: 'sold', name: '王***', phone: '137****7777', date: '2024-05-10', amount: 999, status: 'active' },
]

export const quotaSaleLink = `https://rebu.com/join/station?ref=OP12345&price=${quotaData.price}`

// ===== 邀请站长 invite 数据（对齐原型 app/operator/invite，页面内联）=====

export interface InvitedStation {
  id: string
  name: string
  joinedAt: string
  status: 'active' | 'pending'
  revenue: string
  commission: string
}

export const invitedStations: InvitedStation[] = [
  { id: '1', name: '北京命理文化站', joinedAt: '2024-01-10', status: 'active', revenue: '¥28,400', commission: '¥2,840' },
  { id: '2', name: '上海国学传播站', joinedAt: '2024-01-18', status: 'active', revenue: '¥15,600', commission: '¥1,560' },
  { id: '3', name: '广州易学研究站', joinedAt: '2024-02-05', status: 'pending', revenue: '¥0', commission: '¥0' },
]

export const operatorInviteLinkFull = 'https://rebu.com/join?ref=OP20240001'
export const operatorInviteCode = 'OP20240001'

// ===== 沉寂站长预警 dormant 数据（对齐原型 app/operator/dormant，页面内联）=====

export interface DormantMember {
  id: string
  name: string
  level: string
  lastActiveDays: number
  totalCommission: number
  reminded: boolean
}

export const dormantMembers: DormantMember[] = [
  { id: 'm1', name: '李静雅', level: '金牌站长', lastActiveDays: 32, totalCommission: 4820, reminded: false },
  { id: 'm2', name: '王德发', level: '普通站长', lastActiveDays: 45, totalCommission: 1280, reminded: false },
  { id: 'm3', name: '陈明', level: '普通站长', lastActiveDays: 38, totalCommission: 960, reminded: false },
  { id: 'm4', name: '赵丽', level: '银牌站长', lastActiveDays: 61, totalCommission: 2340, reminded: true },
]

// ===== 下线业绩分析 analysis 数据（对齐原型 app/operator/analysis，页面内联）=====

export interface MemberPerf {
  id: string
  name: string
  level: string
  visits: number
  clicks: number
  orders: number
  commission: number
  trend: number
  diagnosis: { type: 'good' | 'warn'; text: string }
}

export const analysisMembers: MemberPerf[] = [
  { id: 'm1', name: '孙悦', level: '金牌站长', visits: 3200, clicks: 890, orders: 142, commission: 8600, trend: 18, diagnosis: { type: 'good', text: '转化漏斗健康，流量与成交均衡' } },
  { id: 'm2', name: '周明轩', level: '银牌站长', visits: 2800, clicks: 210, orders: 12, commission: 720, trend: -32, diagnosis: { type: 'warn', text: '点击率偏低，建议优化推广文案与素材' } },
  { id: 'm3', name: '吴芳', level: '普通站长', visits: 480, clicks: 156, orders: 38, commission: 2280, trend: 8, diagnosis: { type: 'warn', text: '转化率高但流量不足，建议加大推广曝光' } },
  { id: 'm4', name: '郑浩', level: '普通站长', visits: 1900, clicks: 620, orders: 8, commission: 480, trend: -15, diagnosis: { type: 'warn', text: '点击多成交少，建议推荐高性价比内容' } },
]

// ===== operatorApi — 运营商/站长数据 API 层 =====
export const operatorApi = {
  // === 运营商入驻 (用于 join-operator 页) ===
  async getOperatorPricing() {
    if (useMock()) return operatorPricing
    try { return await apiGet<any>('/operator/pricing') }
    catch { return operatorPricing }
  },
  async getPlanComparison() {
    if (useMock()) return planComparison
    try { return await apiGet<any>('/operator/plan-comparison') }
    catch { return planComparison }
  },
  async getOperatorBenefits() {
    if (useMock()) return operatorBenefits
    try { return await apiGet<any>('/operator/benefits') }
    catch { return operatorBenefits }
  },
  async getOperatorEarningCases() {
    if (useMock()) return operatorEarningCases
    try { return await apiGet<any>('/operator/earning-cases') }
    catch { return operatorEarningCases }
  },
  async getOperatorFaqs() {
    if (useMock()) return operatorFaqs
    try { return await apiGet<any>('/operator/faqs') }
    catch { return operatorFaqs }
  },

  // === 站长入驻 (用于 join-station 页) ===
  async getStationPricing() {
    if (useMock()) return stationPricing
    try { return await apiGet<any>('/station/pricing') }
    catch { return stationPricing }
  },
  async getStationBenefits() {
    if (useMock()) return stationBenefits
    try { return await apiGet<any>('/station/benefits') }
    catch { return stationBenefits }
  },
  async getStationEarningCases() {
    if (useMock()) return stationEarningCases
    try { return await apiGet<any>('/station/earning-cases') }
    catch { return stationEarningCases }
  },
  async getStationFaqs() {
    if (useMock()) return stationFaqs
    try { return await apiGet<any>('/station/faqs') }
    catch { return stationFaqs }
  },

  // === 协议 (用于 agreement-operator, agreement-station 页) ===
  async getOperatorAgreement() {
    if (useMock()) return { sections: operatorAgreementSections, tip: operatorAgreementTip }
    try { return await apiGet<any>('/operator/agreement') }
    catch { return { sections: operatorAgreementSections, tip: operatorAgreementTip } }
  },
  async getStationAgreement() {
    if (useMock()) return { sections: stationAgreementSections, tip: stationAgreementTip }
    try { return await apiGet<any>('/station/agreement') }
    catch { return { sections: stationAgreementSections, tip: stationAgreementTip } }
  },

  // === 运营商面板 (用于 operator-panel 页) ===
  async getPanelInfo() {
    if (useMock()) return operatorPanelInfo
    try { return await apiGet<any>('/operator/panel-info') }
    catch { return operatorPanelInfo }
  },
  async getOverview() {
    if (useMock()) return operatorOverview
    try { return await apiGet<any>('/operator/overview') }
    catch { return operatorOverview }
  },
  async getTeamRanking() {
    if (useMock()) return operatorTeamRanking
    try { return await apiGet<any>('/operator/team-ranking') }
    catch { return operatorTeamRanking }
  },
  async getQuotaUsage() {
    if (useMock()) return operatorQuotaUsage
    try { return await apiGet<any>('/operator/quota-usage') }
    catch { return operatorQuotaUsage }
  },
  async getQuickActions() {
    if (useMock()) return operatorQuickActions
    try { return await apiGet<any>('/operator/quick-actions') }
    catch { return operatorQuickActions }
  },

  // === 站长面板 (用于 station-master-panel 页) ===
  async getStationPanelInfo() {
    if (useMock()) return stationPanelInfo
    try { return await apiGet<any>('/station/panel-info') }
    catch { return stationPanelInfo }
  },
  async getStationPanelOverview() {
    if (useMock()) return stationPanelOverview
    try { return await apiGet<any>('/station/panel-overview') }
    catch { return stationPanelOverview }
  },
  async getStationOverviewIconMap() {
    if (useMock()) return stationOverviewIconMap
    try { return await apiGet<any>('/station/overview-icon-map') }
    catch { return stationOverviewIconMap }
  },
  async getStationPanelTrends() {
    if (useMock()) return stationPanelTrends
    try { return await apiGet<any>('/station/panel-trends') }
    catch { return stationPanelTrends }
  },
  async getStationPanelBalance() {
    if (useMock()) return stationPanelBalance
    try { return await apiGet<any>('/station/panel-balance') }
    catch { return stationPanelBalance }
  },
  async getStationPanelQuickActions() {
    if (useMock()) return stationPanelQuickActions
    try { return await apiGet<any>('/station/panel-quick-actions') }
    catch { return stationPanelQuickActions }
  },
  async getStationActionIconMap() {
    if (useMock()) return stationActionIconMap
    try { return await apiGet<any>('/station/action-icon-map') }
    catch { return stationActionIconMap }
  },
  async getStationPanelNotices() {
    if (useMock()) return stationPanelNotices
    try { return await apiGet<any>('/station/panel-notices') }
    catch { return stationPanelNotices }
  },

  // === 运营商 Dashboard (用于 dashboard 页) ===
  async getDashboardData() {
    if (useMock()) return operatorDashboardData
    try { return await apiGet<any>('/operator/dashboard') }
    catch { return operatorDashboardData }
  },
  async getDashboardTeamMembers() {
    if (useMock()) return dashboardTeamMembers
    try { return await apiGet<any>('/operator/dashboard/team-members') }
    catch { return dashboardTeamMembers }
  },
  async getDashboardQuotaRecords() {
    if (useMock()) return dashboardQuotaRecords
    try { return await apiGet<any>('/operator/dashboard/quota-records') }
    catch { return dashboardQuotaRecords }
  },
  async getDashboardInviteLink() {
    if (useMock()) return operatorInviteLink
    try { return await apiGet<any>('/operator/invite-link') }
    catch { return operatorInviteLink }
  },

  // === 团队管理 (用于 team 页) ===
  async getTeamOverview() {
    if (useMock()) return teamMgmtOverview
    try { return await apiGet<any>('/operator/team/overview') }
    catch { return teamMgmtOverview }
  },
  async getTeamMemberList() {
    if (useMock()) return teamMgmtMembers
    try { return await apiGet<any>('/operator/team/members') }
    catch { return teamMgmtMembers }
  },
  async getTeamLeaderboard() {
    if (useMock()) return teamLeaderboard
    try { return await apiGet<any>('/operator/team/leaderboard') }
    catch { return teamLeaderboard }
  },
  async getTeamMyRank() {
    if (useMock()) return teamMyRank
    try { return await apiGet<any>('/operator/team/my-rank') }
    catch { return teamMyRank }
  },
  async getTeamActivities() {
    if (useMock()) return teamActivities
    try { return await apiGet<any>('/operator/team/activities') }
    catch { return teamActivities }
  },
  async getTeamSuccessCases() {
    if (useMock()) return teamSuccessCases
    try { return await apiGet<any>('/operator/team/success-cases') }
    catch { return teamSuccessCases }
  },
  async getMemberDetailOrders(_memberId: number) {
    if (useMock()) return { orders: teamMemberRecentOrders, invited: teamMemberInvitedMembers }
    try { return await apiGet<any>(`/operator/team/member/${_memberId}/detail`) }
    catch { return { orders: teamMemberRecentOrders, invited: teamMemberInvitedMembers } }
  },
  async getActivityIconMap() {
    if (useMock()) return teamActivityIconMap
    try { return await apiGet<any>('/operator/team/activity-icon-map') }
    catch { return teamActivityIconMap }
  },
  async getTeamInviteLink() {
    if (useMock()) return teamInviteLink
    try { return await apiGet<any>('/operator/team/invite-link') }
    catch { return teamInviteLink }
  },

  // === 名额管理 (用于 quota 页) ===
  async getQuotaData() {
    if (useMock()) return quotaData
    try { return await apiGet<any>('/operator/quota') }
    catch { return quotaData }
  },
  async getQuotaRecords() {
    if (useMock()) return quotaRecords
    try { return await apiGet<any>('/operator/quota/records') }
    catch { return quotaRecords }
  },
  async getQuotaSaleLink() {
    if (useMock()) return quotaSaleLink
    try { return await apiGet<any>('/operator/quota/sale-link') }
    catch { return quotaSaleLink }
  },

  // === 邀请站长 (用于 invite 页) ===
  async getInvitedStations() {
    if (useMock()) return invitedStations
    try { return await apiGet<any>('/operator/invited-stations') }
    catch { return invitedStations }
  },
  async getInviteLinkFull() {
    if (useMock()) return operatorInviteLinkFull
    try { return await apiGet<any>('/operator/invite-link-full') }
    catch { return operatorInviteLinkFull }
  },
  async getInviteCode() {
    if (useMock()) return operatorInviteCode
    try { return await apiGet<any>('/operator/invite-code') }
    catch { return operatorInviteCode }
  },

  // === 沉寂预警 (用于 dormant 页) ===
  async getDormantMembers() {
    if (useMock()) return dormantMembers
    try { return await apiGet<any>('/operator/dormant-members') }
    catch { return dormantMembers }
  },

  // === 业绩分析 (用于 analysis 页) ===
  async getAnalysisMembers() {
    if (useMock()) return analysisMembers
    try { return await apiGet<any>('/operator/analysis-members') }
    catch { return analysisMembers }
  },
}
