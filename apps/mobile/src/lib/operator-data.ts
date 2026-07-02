// 分站运营商 - 加入运营商页数据（对齐原型 app/join/operator）

import { apiGet, apiPost, apiPut } from '@/utils/request'

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
  { feature: '分站名额', station: '1个（自用）', operator: '6个（自用1+推荐5）' },
  { feature: '团队管理', station: false, operator: true },
  { feature: '团队管理奖', station: false, operator: '按等级比例' },
  { feature: '专属培训', station: false, operator: true },
  { feature: '优先客服', station: false, operator: true },
  { feature: '线下活动', station: false, operator: true },
]

// 运营商权益
export const operatorBenefits: OperatorBenefit[] = [
  { icon: 'award', title: '开通专属分站', desc: '分站名称显示在首页，提升标识性', highlight: true },
  { icon: 'trending-up', title: '分享赚佣金', desc: '分享商品/课程/会员等，购买成功获得佣金', highlight: true },
  { icon: 'wallet', title: '自购也省钱', desc: '自己购买平台内容同样获得返佣', highlight: true },
  { icon: 'layers', title: '5个推荐名额', desc: '可推荐5位符合条件的用户申请开通站长（需平台审核）', highlight: true },
  { icon: 'users', title: '管理奖励', desc: '管理分站得相应比例的管理奖', highlight: true },
  { icon: 'gift', title: '赠送视频课程', desc: '国学视频课程免费学习', highlight: false },
  { icon: 'book-open', title: '赠送精装书籍', desc: '精装国学书籍一套', highlight: false },
]

// 常见问题
export const operatorFaqs: FaqItem[] = [
  { q: '运营商和站长有什么区别？', a: '站长专注自有分站的推广运营；运营商在此基础上可组建和管理站长团队，为团队提供培训与运营支持，并按名下站长的推广佣金获得一定比例的团队管理奖。' },
  { q: '6个分站名额如何使用？', a: '1个自用建立分站，其余5个为站长推荐名额：您可推荐符合条件的用户申请开通站长（需平台审核）。站长服务费由平台统一收取，名额本身不产生转让收益。' },
  { q: '团队管理奖怎么算？', a: '您团队内站长因真实推广产生的佣金，平台按您的运营商等级比例向您发放团队管理奖。管理奖仅基于真实商品与服务交易，且计酬不超过两级：您不参与下级运营商管理奖收入的任何分成，仅对其个人分站（站长角色）的推广佣金计管理奖。' },
  { q: '已经是站长可以升级吗？', a: '可以，补差价即可升级为运营商，原站长权益继续有效。' },
  { q: '收益有保障吗？可以退出吗？', a: '推广收益取决于您的实际推广效果，平台不承诺任何固定收益。您可随时申请终止合作，剩余服务期费用按协议约定处理。' },
]

// ===== 加入站长页数据（对齐原型 app/join/station）=====

// 价格
export const stationPricing = {
  price: 999,
  originalPrice: 1299,
}

// 站长权益（对齐原型 benefits）
export const stationBenefits: OperatorBenefit[] = [
  { icon: 'award', title: '专属分站入口', desc: '分站名称显示在首页，提升标识性', highlight: true },
  { icon: 'trending-up', title: '分享赚佣金', desc: '分享商品/课程/会员等，购买成功获得佣金', highlight: true },
  { icon: 'gift', title: '服务费让利承诺', desc: '累计收入不足服务费十倍，次年免收年费；累计收入达5万元，全额返还已缴服务费并永久豁免后续年费', highlight: true },
  { icon: 'wallet', title: '自购也省钱', desc: '自己购买平台内容同样获得返佣', highlight: true },
  { icon: 'gift', title: '赠送视频课程', desc: '国学视频课程免费学习', highlight: false },
  { icon: 'book-open', title: '赠送精装书籍', desc: '精装国学书籍一套', highlight: false },
  { icon: 'star', title: '专属海报', desc: '生成推广海报和二维码', highlight: false },
]

// 站长常见问题（对齐原型 faqs）
export const stationFaqs: FaqItem[] = [
  { q: '999元费用包含什么？', a: '为分站SaaS服务年费，由平台统一收取，包含：专属分站主页与微页面工具、推广素材与海报生成、数据看板、智能站长助理及配套培训服务。' },
  { q: '软件服务费有什么让利承诺？', a: '两项承诺：①若您的累计合规推广收入不足已缴服务费总额的十倍，平台免收次年年费，系统继续免费使用；②累计合规推广收入达到50,000元后，平台一次性返还您已缴纳的全部软件服务费（以服务费返利形式发放至钱包，依法代扣税费），并永久豁免后续年费（平台持续运营期间有效）。累计收入指已结算的合规推广佣金，不含退款冲正部分。本承诺为平台让利安排，不构成任何收益承诺。' },
  { q: '站长权益有效期多久？', a: '站长权益有效期为1年，到期后可续费继续享有权益。' },
  { q: '分佣比例是多少？', a: '入圈费用分佣比例为10%-30%，具体根据圈子类型和平台政策而定。佣金仅基于真实的商品与服务交易结算。' },
  { q: '成为站长一定能赚钱吗？', a: '不能保证。推广佣金取决于真实的推广效果与用户消费，平台不承诺任何固定回报，请理性评估后加入。' },
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
  { title: '第九条 计酬合规', content: '平台各项推广计酬均以真实商品与服务交易为唯一基础，计酬层级不超过两级。运营商团队管理奖仅针对名下站长（含下级运营商个人分站的站长角色收入）的推广佣金计算；运营商不参与下级运营商管理奖收入的任何分成，任何形式的第三层级计酬均被禁止。严禁以发展人员数量作为计酬依据，严禁自买自卖、虚假交易套取佣金。违反者平台有权取消计酬资格并追回已发放款项。' },
  { title: '第十条 宣传规范', content: '运营商在推广中不得使用"保证收益""稳赚""躺赚""回本"等承诺性、夸大性表述，不得虚构收益案例。平台不承诺任何固定收益，推广收益取决于真实的推广效果。' },
  { title: '第十一条 退出与终止', content: '运营商可随时申请终止合作。终止后团队管理关系解除，已产生的合规收益照常结算，剩余服务期费用按本协议及平台规则处理。' },
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
  { title: '第九条 计酬合规', content: '站长推广佣金仅基于真实商品与服务交易结算，计酬层级不超过两级。严禁自买自卖、虚假交易套取佣金，严禁以"保证收益""躺赚"等承诺性表述开展宣传。平台不承诺任何固定收益。' },
  { title: '第十条 服务费让利承诺', content: '分站软件服务费按年收取。若站长累计合规推广收入（指已结算的合规推广佣金，不含退款冲正部分）不足其已缴纳软件服务费总额的十倍，平台免收其次年软件服务年费并继续提供服务；累计合规推广收入达到50,000元的，平台一次性返还其已缴纳的全部软件服务费（以服务费返利形式发放至平台钱包，依法代扣相关税费），并永久豁免其后续软件服务年费（平台持续运营期间有效）。本条为平台单方让利安排，不构成对站长任何收益的承诺或保证。' },
  { title: '第十一条 退出与终止', content: '站长可随时申请终止合作。终止后分站绑定关系按平台规则解除，已产生的合规收益照常结算，剩余服务期费用按本协议及平台规则处理。' },
]

// 站长协议提示
export const stationAgreementTip = '本协议自您注册成为站长时生效。请仔细阅读所有条款，了解您的权利和义务。'

// ===== 运营商角色面板数据（入驻营销静态文案，后端无端点）=====

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
  userId: number | string
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

// ===== 站长角色面板数据（入驻营销静态文案，后端无端点）=====

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
  id: number | string
  name: string
  joinDate: string
  status: 'active' | 'pending'
  users: number
  earnings: number
  myBonus: number
  totalEarning?: number
}

export interface DashboardQuotaRecord {
  id: number | string
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

// ===== 团队管理 team 静态展示常量（真连方法见 operatorApi）=====

// 站长团队（运营商视角·对齐后端 operator-dashboard 真实字段，无虚构推广员等级/分销）
export interface StationTeamOverview {
  totalStations: number     // 名下站长（分站）数
  activeStations: number    // 活跃站长
  silentStations: number    // 沉寂站长
  monthTeamEarned: number   // 本月团队佣金
  monthTeamAmount: number   // 本月团队成交额
  quotaUsed: number
  quotaTotal: number
}

export interface StationTeamMember {
  id: string
  name: string
  code: string
  status: 'active' | 'silent'
  totalEarning: number      // 累计收益
  monthEarning: number      // 本月收益
  mgmtBonus: number         // 本月管理奖（运营商分成）
  joinDate: string
}

export interface StationSuccessCase {
  id: string
  name: string
  intro: string
  totalEarning: number
  since: string
}

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

// ===== 后端真实结构 → 前端展示适配 =====

const STATION_STATUS_MAP: Record<string, 'active' | 'pending' | 'expired' | 'paused'> = {
  ACTIVE: 'active', PENDING: 'pending', EXPIRED: 'expired', DISABLED: 'paused',
}
const OPERATOR_LEVEL_LABEL: Record<string, string> = {
  SILVER: '白银运营商', GOLD: '黄金运营商', DIAMOND: '钻石运营商', BLACK_GOLD: '黑金运营商',
}
/** 截取 YYYY-MM-DD */
function toYmd(d?: string | null): string {
  return d ? String(d).slice(0, 10) : ''
}
/** 安全转数字（后端 Decimal 序列化多为 string） */
function toNum(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/* —— 后端原始响应类型（容错适配用，字段宽松；数值统一经 toNum 转换故用 number|string；不 export） —— */
interface RawUserLite { nickname?: string; avatar?: string }
/** GET /station/operator-dashboard/my 运营商仪表盘 */
interface RawOperatorDashboard {
  id: string
  brandName?: string
  user?: RawUserLite | null
  level?: string
  purchasedAt?: string | null
  containQuota?: number | string
  usedQuota?: number | string
  stationCount?: number | string
  monthNewStations?: number | string
  totalEarning?: number | string
  monthEarning?: number | string
}
/** GET /station/operator-dashboard/overview 团队概览 */
interface RawOperatorOverview {
  monthTeamEarned?: number | string
  totalStations?: number | string
  activeStations?: number | string
  silentStations?: number | string
  monthTeamAmount?: number | string
  monthTeamOrders?: number | string
  quotaUsed?: number | string
  quotaTotal?: number | string
}
/** GET /station/operator-dashboard/quota-usage 名额使用 */
interface RawQuotaUsage { used?: number | string; total?: number | string }
/** 名下分站列表元素（team-ranking / my/stations 通用） */
interface RawStationItem {
  id: string
  name?: string
  code?: string
  status?: string
  createdAt?: string | null
  totalEarning?: number | string
  monthEarning?: number | string
  mgmtBonus?: number | string
}
interface RawStationsResp { items?: RawStationItem[]; ranking?: RawStationItem[] }
/** GET /station/my 分站详情 */
interface RawStationMy {
  id: string
  name: string
  code: string
  logo?: string | null
  themeColor?: string | null
  status?: string
  createdAt?: string | null
  expireAt?: string | null
  intro?: string | null
  templateId?: string | null
  user?: RawUserLite | null
  totalEarning?: number | string
  monthEarning?: number | string
  monthOrders?: number | string
  lockedUsers?: number | string
}
/** GET /station/dashboard/overview 站长仪表盘概览 */
interface RawStationDashOverview { monthEarned?: number | string; monthAmount?: number | string; monthOrders?: number | string }
/** GET /station/dashboard/trends 收益趋势 */
interface RawStationTrendsResp { trends?: { date: string; earned?: number | string }[] }
/** GET /station/dashboard/settlement-timer 结算倒计时 */
interface RawSettlementTimer { pendingSettlement?: number | string; nextSettleDate?: string; remainingDays?: number | string }
/** GET /station/my/earnings 收益明细 */
interface RawStationEarning {
  id?: string | number; type?: string; orderId?: string
  amount?: number | string; rate?: number | string; earned?: number | string; createdAt?: string
}
interface RawEarningsResp { earnings?: RawStationEarning[]; total?: number }
/** GET /station/promotion/materials 推广素材 */
interface RawPromotionMaterial {
  id?: string | number; type?: string; title?: string; content?: string
  imageUrl?: string; tags?: string[]; usageCount?: number | string; createdAt?: string
}
/** GET /station/templates/list 模板 */
interface RawTemplate {
  id: string; name: string; desc?: string
  preview?: { hero?: string | null; tabs?: string[]; modules?: string[] } | null
}
interface RawTemplatesResp { items?: RawTemplate[] }
/** GET /station/team/success-cases 成功案例 */
interface RawSuccessCase { id: string; name?: string; intro?: string; totalEarning?: number | string; createdAt?: string | null }
interface RawSuccessCasesResp { items?: RawSuccessCase[]; list?: RawSuccessCase[] }

// 站长分站信息（GET /station/my 适配后）
export interface StationPanelInfo {
  id: string
  name: string
  code: string
  logo: string
  themeColor: string
  status: 'active' | 'pending' | 'expired' | 'paused'
  createTime: string
  expireTime: string
}

// 站长收益余额（真实字段，无虚构的可提现/冻结）
export interface StationBalanceInfo {
  totalEarning: number
  monthEarning: number
  pendingSettlement: number
  nextSettleDate: string
  remainingDays: number
}

// 站长收益明细（对齐后端 StationEarning：佣金流水，无 status/标题/来源用户等虚构字段）
export type StationEarningType = 'COURSE' | 'PRODUCT' | 'MEMBER' | 'CIRCLE' | 'BOT' | string
export interface StationEarningItem {
  id: string
  type: StationEarningType
  orderId: string
  amount: number // 订单金额
  rate: number // 佣金比例（0-1）
  earned: number // 实得佣金
  createdAt: string
}
export const STATION_EARNING_TYPE_LABELS: Record<string, string> = {
  COURSE: '课程佣金',
  PRODUCT: '商品佣金',
  MEMBER: '会员佣金',
  CIRCLE: '圈子佣金',
  BOT: '智能体佣金',
}

// 站长推广素材（对齐后端 PromotionMaterial：type=poster/qrcode/copy）
export interface PromotionMaterialItem {
  id: string
  type: 'poster' | 'qrcode' | 'copy' | string
  title: string
  content: string
  imageUrl: string
  tags: string[]
  usageCount: number
  createdAt: string
}

// 分站首页模板选项（后端 STATION_TEMPLATES，5套）
export interface StationTemplateOption {
  id: string
  name: string
  desc: string
  hero: string | null
  tabs: string[]
  modules: string[]
}

// 分站配置（站长「分站装修」页可编辑字段，皆对齐 Station 表真实字段）
export interface StationConfigData {
  id: string
  name: string
  code: string
  logo: string
  themeColor: string
  intro: string
  status: 'active' | 'pending' | 'expired' | 'paused'
  templateId: string
  createTime: string
  // 站长信息（来自 /station/my 关联，只读展示）
  masterNickname: string
  masterAvatar: string
  // 真实经营统计（只读展示）
  totalEarning: number
  monthEarning: number
  monthOrders: number
  lockedUsers: number
}

// 站长更新分站的入参（仅含后端 UpdateStationDto 支持的字段）
export interface UpdateStationPayload {
  name?: string
  intro?: string
  logo?: string
  themeColor?: string
  templateId?: string
}

// ===== operatorApi — 运营商/站长数据 API 层 =====
// 注：入驻营销内容（定价/方案/权益/收益案例/FAQ/协议）后端无对应端点，属前端运营配置（静态展示文案），
//     非业务数据，直接返回常量即可（保留 async 以兼容调用方 await）。
export const operatorApi = {
  // === 运营商入驻 (用于 join-operator 页·静态运营文案) ===
  async getOperatorPricing() { return operatorPricing },
  async getPlanComparison() { return planComparison },
  async getOperatorBenefits() { return operatorBenefits },
  async getOperatorFaqs() { return operatorFaqs },

  // === 站长入驻 (用于 join-station 页·静态运营文案) ===
  async getStationPricing() { return stationPricing },
  async getStationBenefits() { return stationBenefits },
  async getStationFaqs() { return stationFaqs },

  // === 协议 (用于 agreement-operator, agreement-station 页·静态条款) ===
  async getOperatorAgreement() { return { sections: operatorAgreementSections, tip: operatorAgreementTip } },
  async getStationAgreement() { return { sections: stationAgreementSections, tip: stationAgreementTip } },

  // === 运营商面板 (用于 operator-panel 页) ===
  // 后端 GET /station/operator-dashboard/my：非运营商抛 403 → 页面据此走"未开通"引导态
  async getPanelInfo() {
    const op = await apiGet<RawOperatorDashboard>('/station/operator-dashboard/my')
    return {
      // 消费页 operator-panel 的本地 PanelInfo.id 声明为 number，而后端运营商 id 实为 cuid 字符串；
      // 保留 any 以兼容该页（页面不在本次收敛范围，不改其类型），等同收敛前行为
      id: op.id as any,
      name: op.brandName || op.user?.nickname || '我的运营中心',
      level: OPERATOR_LEVEL_LABEL[op.level || ''] || '运营商',
      joinDate: toYmd(op.purchasedAt),
    }
  },
  async getOverview(): Promise<OperatorOverviewItem[]> {
    const o = await apiGet<RawOperatorOverview>('/station/operator-dashboard/overview')
    // 后端无环比 trend，诚实不展示趋势
    return [
      { key: 'monthTeamEarned', label: '本月团队佣金', value: toNum(o.monthTeamEarned), unit: '元' },
      { key: 'totalStations', label: '名下站长', value: toNum(o.totalStations), unit: '人' },
      { key: 'activeStations', label: '活跃站长', value: toNum(o.activeStations), unit: '人' },
      { key: 'monthTeamAmount', label: '本月成交额', value: toNum(o.monthTeamAmount), unit: '元' },
      { key: 'monthTeamOrders', label: '本月订单', value: toNum(o.monthTeamOrders), unit: '单' },
      { key: 'quota', label: '名额使用', value: `${toNum(o.quotaUsed)}/${toNum(o.quotaTotal)}` },
    ]
  },
  async getTeamRanking(): Promise<TeamMemberRanking[]> {
    const res = await apiGet<RawStationsResp>('/station/operator-dashboard/team-ranking')
    const ranking: RawStationItem[] = res?.ranking || []
    // 后端按 totalEarning 排序的名下站长；无 change 环比 → 诚实不展示
    return ranking.map((s, i) => ({
      rank: i + 1,
      userId: s.id,
      nickname: s.name || '未命名分站',
      performance: toNum(s.totalEarning),
      performanceUnit: '元',
    }))
  },
  async getQuotaUsage(): Promise<QuotaUsageItem[]> {
    const q = await apiGet<RawQuotaUsage>('/station/operator-dashboard/quota-usage')
    const used = toNum(q.used), total = toNum(q.total)
    // 后端仅"分站名额"一种配额；原型的课程/直播/存储配额后端无 → 诚实不展示
    return [{
      key: 'station', label: '分站名额', used, total, unit: '个',
      isLow: total > 0 && used / total >= 0.8,
    }]
  },
  getQuickActions() {
    return operatorQuickActions
  },

  // === 站长面板 (用于 station-master-panel 页) ===
  // 后端 GET /station/my：未开通分站抛 404 → 页面据此走"未开通"引导态
  async getStationPanelInfo(): Promise<StationPanelInfo> {
    const s = await apiGet<RawStationMy>('/station/my')
    return {
      id: s.id,
      name: s.name,
      code: s.code,
      logo: s.logo || '',
      themeColor: s.themeColor || '#C41E3A',
      status: STATION_STATUS_MAP[s.status || ''] || 'active',
      createTime: toYmd(s.createdAt),
      expireTime: s.expireAt ? toYmd(s.expireAt) : '长期有效',
    }
  },
  // 概览指标：组装 站长仪表盘 overview + 分站 my 统计（皆真实）
  async getStationPanelOverview(): Promise<StationOverviewItem[]> {
    const [ov, my] = await Promise.all([
      apiGet<RawStationDashOverview>('/station/dashboard/overview'),
      apiGet<RawStationMy>('/station/my'),
    ])
    // 后端 conversionRate 为占位 "0"、无环比 trend → 诚实不展示，统一 flat
    return [
      { label: '本月收益', value: toNum(ov.monthEarned), unit: '元', trendType: 'flat', icon: 'revenue' },
      { label: '本月成交', value: toNum(ov.monthAmount), unit: '元', trendType: 'flat', icon: 'total' },
      { label: '本月订单', value: toNum(ov.monthOrders), unit: '单', trendType: 'flat', icon: 'orders' },
      { label: '锁定用户', value: toNum(my.lockedUsers), unit: '人', trendType: 'flat', icon: 'users' },
      { label: '累计收益', value: toNum(my.totalEarning), unit: '元', trendType: 'flat', icon: 'total' },
    ]
  },
  getStationOverviewIconMap() {
    return stationOverviewIconMap
  },
  // 收益趋势：后端近30天每日收益（真实）；环比按近7天 vs 前7天真实计算
  async getStationPanelTrends(): Promise<StationTrendData[]> {
    const res = await apiGet<RawStationTrendsResp>('/station/dashboard/trends')
    const trends = res?.trends || []
    const total = trends.reduce((sum, t) => sum + toNum(t.earned), 0)
    const last7 = trends.slice(-7).reduce((sum, t) => sum + toNum(t.earned), 0)
    const prev7 = trends.slice(-14, -7).reduce((sum, t) => sum + toNum(t.earned), 0)
    const change = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 1000) / 10 : 0
    return [{
      type: 'revenue', label: '收益趋势', total, change,
      data: trends.map(t => ({ date: t.date.slice(5), value: toNum(t.earned) })),
    }]
  },
  // 余额：累计/本月/待结算 + 结算倒计时（皆真实）；可提现走平台钱包
  async getStationPanelBalance(): Promise<StationBalanceInfo> {
    const [my, timer] = await Promise.all([
      apiGet<RawStationMy>('/station/my'),
      apiGet<RawSettlementTimer>('/station/dashboard/settlement-timer'),
    ])
    return {
      totalEarning: toNum(my.totalEarning),
      monthEarning: toNum(my.monthEarning),
      pendingSettlement: toNum(timer.pendingSettlement),
      nextSettleDate: timer.nextSettleDate || '',
      remainingDays: toNum(timer.remainingDays),
    }
  },
  // 站长收益明细（GET /station/my/earnings；earnings 非分页 row key → 不拆包，apiGet 取 .earnings）
  async getMyStationEarnings(page = 1, pageSize = 20): Promise<{ items: StationEarningItem[]; total: number }> {
    const res = await apiGet<RawEarningsResp>(`/station/my/earnings?page=${page}&pageSize=${pageSize}`)
    const items = (res.earnings || []).map((e): StationEarningItem => ({
      id: String(e.id),
      type: e.type || 'COURSE',
      orderId: e.orderId || '',
      amount: toNum(e.amount),
      rate: toNum(e.rate),
      earned: toNum(e.earned),
      createdAt: e.createdAt || '',
    }))
    return { items, total: res.total || 0 }
  },
  // 站长推广素材（GET /station/promotion/materials，需先取自己 stationId；返回裸数组）
  async getMyStationMaterials(): Promise<PromotionMaterialItem[]> {
    const my = await apiGet<RawStationMy>('/station/my')
    const list = await apiGet<RawPromotionMaterial[]>(`/station/promotion/materials?stationId=${my.id}`)
    return (list || []).map((m): PromotionMaterialItem => ({
      id: String(m.id),
      type: m.type || 'poster',
      title: m.title || '',
      content: m.content || '',
      imageUrl: m.imageUrl || '',
      tags: m.tags || [],
      usageCount: Number(m.usageCount) || 0,
      createdAt: m.createdAt || '',
    }))
  },
  // 记录素材使用（POST /station/promotion/materials/:id/use）
  async useStationMaterial(id: string): Promise<void> {
    await apiPost(`/station/promotion/materials/${id}/use`, {})
  },
  getStationPanelQuickActions() {
    return stationPanelQuickActions
  },
  getStationActionIconMap() {
    return stationActionIconMap
  },
  // 分站通知：后端无分站专属通知模型 → 诚实降级空（页面隐藏通知卡）
  async getStationPanelNotices(): Promise<StationNotice[]> {
    return []
  },

  // === 运营商 Dashboard (用于 dashboard 页) ===
  async getDashboardData(): Promise<OperatorDashboardData> {
    const op = await apiGet<RawOperatorDashboard>('/station/operator-dashboard/my')
    const total = toNum(op.containQuota)
    const used = toNum(op.usedQuota)
    // 后端 quota 仅 总/已用/可用；原型的自用vs已售区分后端无 → sold 等同 used 诚实展示
    return {
      name: op.brandName || op.user?.nickname || '我的运营中心',
      level: OPERATOR_LEVEL_LABEL[op.level || ''] || '运营商',
      joinDate: toYmd(op.purchasedAt),
      quota: { total, used, sold: used, available: Math.max(0, total - used) },
      team: { total: toNum(op.stationCount), thisMonth: toNum(op.monthNewStations) },
      // pending/teamBonus/quotaSales 后端无单独字段 → 0，页面降级隐藏对应卡片
      earnings: {
        total: toNum(op.totalEarning), thisMonth: toNum(op.monthEarning),
        pending: 0, teamBonus: 0, quotaSales: 0,
      },
      stats: { totalUsers: 0, thisMonthUsers: 0, conversionRate: 0 },
    }
  },
  async getDashboardTeamMembers(): Promise<DashboardTeamMember[]> {
    const stations = await apiGet<RawStationItem[]>('/station/operator-dashboard/my/stations')
    return (stations || []).map((s) => ({
      id: s.id,
      name: s.name || '未命名分站',
      joinDate: toYmd(s.createdAt),
      status: s.status === 'ACTIVE' ? 'active' : 'pending',
      users: 0, // 该端点无名下站长的用户数 → 页面以累计收益替代展示
      earnings: toNum(s.monthEarning),
      myBonus: toNum(s.mgmtBonus),
      totalEarning: toNum(s.totalEarning),
    }))
  },
  async getDashboardQuotaRecords(): Promise<DashboardQuotaRecord[]> {
    // 后端无名额销售流水表 → 用名下站长映射为"已用名额记录"（真实）
    const stations = await apiGet<RawStationItem[]>('/station/operator-dashboard/my/stations')
    return (stations || []).map((s) => ({
      id: s.id,
      type: 'sold' as const,
      name: s.name || '未命名分站',
      date: toYmd(s.createdAt),
      status: s.status === 'ACTIVE' ? ('active' as const) : ('pending' as const),
    }))
  },
  async getDashboardInviteLink(): Promise<string> {
    const op = await apiGet<RawOperatorDashboard>('/station/operator-dashboard/my')
    const base = (import.meta as unknown as { env?: { VITE_H5_URL?: string } }).env?.VITE_H5_URL || ''
    return `${base}/#/pkg-operator/join-station/index?op=${op.id}`
  },

  // === 分站装修/配置 (用于 station-config 页) ===
  // 后端 GET /station/my：未开通分站抛 404 → 页面据此走"未开通"引导态
  async getStationConfig(): Promise<StationConfigData> {
    const s = await apiGet<RawStationMy>('/station/my')
    return {
      id: s.id,
      name: s.name || '',
      code: s.code || '',
      logo: s.logo || '',
      themeColor: s.themeColor || '#C41E3A',
      intro: s.intro || '',
      status: STATION_STATUS_MAP[s.status || ''] || 'active',
      templateId: s.templateId || 'default',
      createTime: toYmd(s.createdAt),
      masterNickname: s.user?.nickname || '',
      masterAvatar: s.user?.avatar || '',
      totalEarning: toNum(s.totalEarning),
      monthEarning: toNum(s.monthEarning),
      monthOrders: toNum(s.monthOrders),
      lockedUsers: toNum(s.lockedUsers),
    }
  },
  // 分站首页模板列表（后端 STATION_TEMPLATES 5套）
  async getStationTemplates(): Promise<StationTemplateOption[]> {
    const list = await apiGet<RawTemplatesResp>('/station/templates/list')
    const arr: RawTemplate[] = Array.isArray(list) ? list : (list?.items || [])
    return arr.map((t) => ({
      id: t.id,
      name: t.name,
      desc: t.desc || '',
      hero: t.preview?.hero ?? null,
      tabs: t.preview?.tabs || [],
      modules: t.preview?.modules || [],
    }))
  },
  // 保存分站配置（PUT /station/my，UpdateStationDto 支持 name/intro/logo/themeColor/templateId）
  async updateStationConfig(payload: UpdateStationPayload): Promise<void> {
    await apiPut<void>('/station/my', payload)
  },

  // === 站长团队管理 (用于 team 页·真连 operator-dashboard·无虚构推广员分销) ===
  async getTeamOverview(): Promise<StationTeamOverview> {
    const o = await apiGet<RawOperatorOverview>('/station/operator-dashboard/overview')
    return {
      totalStations: toNum(o.totalStations),
      activeStations: toNum(o.activeStations),
      silentStations: toNum(o.silentStations),
      monthTeamEarned: toNum(o.monthTeamEarned),
      monthTeamAmount: toNum(o.monthTeamAmount),
      quotaUsed: toNum(o.quotaUsed),
      quotaTotal: toNum(o.quotaTotal),
    }
  },
  // 名下站长列表（运营商团队成员=分站站长，按 operatorId 真实归属）
  async getTeamMembers(): Promise<StationTeamMember[]> {
    const res = await apiGet<RawStationsResp>('/station/operator-dashboard/my/stations')
    const arr: RawStationItem[] = Array.isArray(res) ? res : (res?.items || [])
    return arr.map((s) => ({
      id: s.id,
      name: s.name || '未命名分站',
      code: s.code || '',
      status: s.status === 'ACTIVE' ? 'active' : 'silent',
      totalEarning: toNum(s.totalEarning),
      monthEarning: toNum(s.monthEarning),
      mgmtBonus: toNum(s.mgmtBonus),
      joinDate: toYmd(s.createdAt),
    }))
  },
  // 成功案例（高收益分站·激励团队）
  async getTeamSuccessCases(): Promise<StationSuccessCase[]> {
    const res = await apiGet<RawSuccessCasesResp>('/station/team/success-cases')
    const arr: RawSuccessCase[] = res?.items || res?.list || (Array.isArray(res) ? res : [])
    return arr.map((s) => ({ id: s.id, name: s.name || '', intro: s.intro || '', totalEarning: toNum(s.totalEarning), since: toYmd(s.createdAt) }))
  },
  // 邀请站长加入链接（复用运营商招募口）
  async getTeamInviteLink(): Promise<string> {
    const op = await apiGet<RawOperatorDashboard>('/station/operator-dashboard/my')
    const base = (import.meta as unknown as { env?: { VITE_H5_URL?: string } }).env?.VITE_H5_URL || ''
    return `${base}/#/pkg-operator/join-station/index?op=${op.id}`
  },

  // === 名额管理 (用于 quota 页·真连 quota-usage·名额交易体系后端未实现→诚实降级) ===
  async getQuotaData() {
    const [q, op] = await Promise.all([
      apiGet<RawQuotaUsage>('/station/operator-dashboard/quota-usage'),
      apiGet<RawOperatorDashboard>('/station/operator-dashboard/my'),
    ])
    const total = toNum(q.total) || toNum(op.containQuota)
    const used = toNum(q.used)
    return {
      total,
      used,
      sold: 0,    // 后端无名额交易记录 → 诚实为 0
      gifted: 0,
      available: Math.max(0, total - used),
      price: operatorPricing.quotaUnitPrice, // 名额单价：运营配置常量
    }
  },
  // 名额交易记录：后端暂无名额售卖/赠送模型 → 诚实返回空（页面展示"剩余N个待分配"）
  async getQuotaRecords(): Promise<QuotaRecord[]> {
    return []
  },
  async getQuotaSaleLink(): Promise<string> {
    const op = await apiGet<RawOperatorDashboard>('/station/operator-dashboard/my')
    const base = (import.meta as unknown as { env?: { VITE_H5_URL?: string } }).env?.VITE_H5_URL || ''
    return `${base}/#/pkg-operator/join-station/index?op=${op.id}`
  },

  // === 邀请站长 (用于 invite 页·真连名下站长 + 构造邀请入口) ===
  async getInvitedStations(): Promise<InvitedStation[]> {
    const res = await apiGet<RawStationsResp>('/station/operator-dashboard/my/stations')
    const arr: RawStationItem[] = Array.isArray(res) ? res : (res?.items || [])
    return arr.map((s) => ({
      id: s.id,
      name: s.name || '未命名分站',
      joinedAt: toYmd(s.createdAt),
      status: s.status === 'ACTIVE' ? 'active' : 'pending',
      revenue: `¥${toNum(s.totalEarning).toLocaleString()}`,
      commission: `¥${toNum(s.mgmtBonus).toLocaleString()}`,
    }))
  },
  async getInviteLinkFull(): Promise<string> {
    const op = await apiGet<RawOperatorDashboard>('/station/operator-dashboard/my')
    const base = (import.meta as unknown as { env?: { VITE_H5_URL?: string } }).env?.VITE_H5_URL || ''
    return `${base}/#/pkg-operator/join-station/index?op=${op.id}`
  },
  async getInviteCode(): Promise<string> {
    const op = await apiGet<RawOperatorDashboard>('/station/operator-dashboard/my')
    // 后端无专门邀请码字段 → 用运营商ID派生稳定邀请码
    return `OP${String(op.id).replace(/-/g, '').slice(0, 8).toUpperCase()}`
  },

  // === 沉寂预警 (用于 dormant 页) ===
  // 沉寂站长 = 名下本月无收益(monthEarning=0)的站长（后端无最后活跃时间/等级→诚实降级）
  async getDormantMembers(): Promise<DormantMember[]> {
    const res = await apiGet<RawStationsResp>('/station/operator-dashboard/my/stations')
    const arr: RawStationItem[] = Array.isArray(res) ? res : (res?.items || [])
    return arr
      .filter((s) => toNum(s.monthEarning) === 0)
      .map((s) => ({
        id: s.id,
        name: s.name || '未命名分站',
        level: s.code || '',     // 后端无站长等级 → 展示分站码
        lastActiveDays: 0,        // 后端无最后活跃时间 → 降级（页面不展示天数）
        totalCommission: toNum(s.totalEarning),
        reminded: false,
      }))
  },

  // === 业绩分析 (用于 analysis 页·真连收益·流量漏斗后端无埋点→降级) ===
  async getAnalysisMembers(): Promise<MemberPerf[]> {
    const res = await apiGet<RawStationsResp>('/station/operator-dashboard/my/stations')
    const arr: RawStationItem[] = Array.isArray(res) ? res : (res?.items || [])
    return arr.map((s) => {
      const month = toNum(s.monthEarning)
      return {
        id: s.id,
        name: s.name || '未命名分站',
        level: s.code || '',
        visits: 0, clicks: 0, orders: 0, // 后端无流量埋点 → 诚实降级
        commission: month,
        trend: 0, // 后端无环比 → 降级
        diagnosis: month > 0
          ? { type: 'good' as const, text: '本月收益稳定，运营状态良好' }
          : { type: 'warn' as const, text: '本月暂无收益，建议关怀唤醒' },
      }
    })
  },
}
