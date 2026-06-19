/**
 * 个人中心 - 设置与账号安全板块数据层
 * 对应原型 app/mine/{settings,security,change-password,change-phone,payment-password,bind-accounts}
 * 主题色沿用原型 #C41E3A
 */

/* —— 头像生成辅助（沿用工程 dicebear 约定） —— */
const AVATAR = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`
/* —— 商品/封面图基址（沿用 shop-data 约定） —— */
const P = '/static/images/products'

/* —— 通用账户资料 —— */
export const mineProfile = {
  phone: '138****8888',
  phoneFull: '13888888888',
  email: 'u***@example.com',
  passwordUpdatedAt: '2024-09-15',
  payPasswordSet: true,
  realNameVerified: true,
  realName: '张*明',
  securityScore: 82,
}

/* —— 设置主页 —— */
export interface SettingNotifyItem {
  key: string
  label: string
  icon: string
  value: boolean
}
export const settingNotifyItems: SettingNotifyItem[] = [
  { key: 'message', label: '新消息通知', icon: 'bell', value: true },
  { key: 'course', label: '课程提醒', icon: 'book-open', value: true },
  { key: 'live', label: '直播提醒', icon: 'radio', value: false },
  { key: 'interact', label: '互动提醒', icon: 'message-square', value: true },
  { key: 'system', label: '系统通知', icon: 'settings', value: true },
]
export interface SettingOption {
  label: string
  value: string
}
export const settingCollectOptions: SettingOption[] = [
  { label: '公开', value: 'public' },
  { label: '仅好友', value: 'friends' },
  { label: '仅自己', value: 'private' },
]
export const settingFontOptions: SettingOption[] = [
  { label: '小', value: 'small' },
  { label: '中（推荐）', value: 'medium' },
  { label: '大', value: 'large' },
]
export const settingDarkOptions: SettingOption[] = [
  { label: '跟随系统', value: 'system' },
  { label: '浅色模式', value: 'light' },
  { label: '深色模式', value: 'dark' },
]
export const settingCacheSize = '47.3 MB'

/* —— 账号安全中心 —— */
export interface SecurityItem {
  id: string
  icon: string
  iconBg: string
  label: string
  value?: string
  status?: 'set' | 'unset' | 'verified' | 'unverified'
  href: string
}
export const securityLoginItems: SecurityItem[] = [
  { id: 'password', icon: 'key', iconBg: '#3b82f6', label: '登录密码', value: `上次修改 ${mineProfile.passwordUpdatedAt}`, status: 'set', href: '/mine/change-password' },
  { id: 'phone', icon: 'smartphone', iconBg: '#22c55e', label: '手机号码', value: mineProfile.phone, status: 'set', href: '/mine/change-phone' },
  { id: 'email', icon: 'mail', iconBg: '#f97316', label: '邮箱绑定', value: mineProfile.email, status: 'set', href: '/mine/bind-accounts' },
]
export const securityPaymentItems: SecurityItem[] = [
  { id: 'pay-password', icon: 'credit-card', iconBg: '#a855f7', label: '支付密码', status: mineProfile.payPasswordSet ? 'set' : 'unset', href: '/mine/payment-password' },
  { id: 'real-name', icon: 'shield', iconBg: '#C41E3A', label: '实名认证', value: mineProfile.realNameVerified ? mineProfile.realName : undefined, status: mineProfile.realNameVerified ? 'verified' : 'unverified', href: '/mine/security' },
]
export const securityDeviceItems: SecurityItem[] = [
  { id: 'devices', icon: 'monitor', iconBg: '#64748b', label: '登录设备管理', value: '2 台设备已登录', href: '/mine/security' },
]
export const securityScoreItems = [
  { label: '密码', done: true },
  { label: '手机', done: true },
  { label: '邮箱', done: true },
  { label: '支付', done: mineProfile.payPasswordSet },
  { label: '实名', done: mineProfile.realNameVerified },
]
export const securityDeactivateLossList = [
  '个人资料、头像及所有内容',
  '圈子成员资格及圈主权限',
  '课程购买记录及学习进度',
  '钱包余额及积分将作废',
  '问答记录及悬赏奖励',
]

/* —— 修改密码：强度与规则 —— */
export interface PwdRule {
  label: string
  test: (p: string) => boolean
}
export const pwdRules: PwdRule[] = [
  { label: '长度至少 8 位', test: (p) => p.length >= 8 },
  { label: '包含大写字母', test: (p) => /[A-Z]/.test(p) },
  { label: '包含数字', test: (p) => /[0-9]/.test(p) },
  { label: '包含特殊符号', test: (p) => /[^A-Za-z0-9]/.test(p) },
]
export function calcPwdStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '' }
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { score: 1, label: '弱', color: '#ef4444' }
  if (score <= 2) return { score: 2, label: '较弱', color: '#fb923c' }
  if (score <= 3) return { score: 3, label: '中', color: '#facc15' }
  if (score <= 4) return { score: 4, label: '强', color: '#4ade80' }
  return { score: 5, label: '极强', color: '#16a34a' }
}

/* —— 第三方账号绑定 —— */
export interface BoundAccount {
  provider: 'wechat' | 'qq' | 'apple'
  name: string
  color: string
  isBound: boolean
  accountInfo?: string
  boundAt?: string
}
export const boundAccounts: BoundAccount[] = [
  { provider: 'wechat', name: '微信', color: '#07C160', isBound: true, accountInfo: 'wx_user***89', boundAt: '2024-01-15' },
  { provider: 'qq', name: 'QQ', color: '#12B7F5', isBound: false },
  { provider: 'apple', name: 'Apple ID', color: '#000000', isBound: true, accountInfo: 'user***@icloud.com', boundAt: '2024-03-20' },
]
export const bindBenefits = [
  { icon: 'zap', title: '快速登录', desc: '一键授权登录' },
  { icon: 'shield', title: '账号安全', desc: '多重验证保护' },
  { icon: 'smartphone', title: '多端同步', desc: '数据云端同步' },
  { icon: 'gift', title: '专属福利', desc: '绑定送积分' },
]

/* ============================================================
   隐私与账号管理（隐私授权 / 黑名单 / 青少年模式 / 数据导出 / 注销）
   ============================================================ */

/* —— 隐私授权管理 —— */
export type PermissionStatus = 'authorized' | 'denied' | 'always' | 'while_using' | 'not_determined'
export interface AppPermission {
  id: string
  name: string
  icon: string
  description: string
  purpose: string
  status: PermissionStatus
  required: boolean
  degradedFeature?: string
}
export const appPermissions: AppPermission[] = [
  { id: 'location', name: '位置信息', icon: 'map-pin', description: '获取您的地理位置', purpose: '用于推荐附近驿站、本地化内容推荐、发布位置标记', status: 'while_using', required: false, degradedFeature: '无法使用附近推荐功能' },
  { id: 'camera', name: '相机', icon: 'camera', description: '拍摄照片和视频', purpose: '用于拍摄头像、发布图片/视频内容、扫码功能', status: 'authorized', required: false, degradedFeature: '无法拍摄照片和视频' },
  { id: 'microphone', name: '麦克风', icon: 'mic', description: '录制音频', purpose: '用于语音搜索、发布语音内容、直播连麦', status: 'authorized', required: false, degradedFeature: '无法使用语音功能' },
  { id: 'photos', name: '相册', icon: 'image', description: '访问您的照片和视频', purpose: '用于选择头像、发布图片/视频内容、保存图片', status: 'always', required: false, degradedFeature: '无法选择本地图��' },
  { id: 'contacts', name: '通讯录', icon: 'users', description: '读取联系人信息', purpose: '���于发现已注册的朋友、邀请好友', status: 'denied', required: false, degradedFeature: '无法发现通讯录好友' },
  { id: 'calendar', name: '日历', icon: 'calendar', description: '访问日历事件', purpose: '用于添加课程提醒、直播预约到日历', status: 'not_determined', required: false, degradedFeature: '无法添加日历提醒' },
  { id: 'notifications', name: '通知', icon: 'bell', description: '发送推送通知', purpose: '用于消息提醒、课程提醒、直播开播提醒', status: 'authorized', required: true },
]

/* —— 黑名单 —— */
export interface BlacklistItem {
  id: number
  userId: number
  nickname: string
  avatar: string
  blockedAt: string
  reason?: string
}
export interface SearchUserItem {
  id: number
  nickname: string
  avatar: string
  isBlocked: boolean
}
export const blacklistUsers: BlacklistItem[] = [
  { id: 1, userId: 1001, nickname: '玄机子', avatar: AVATAR('bl-1'), blockedAt: '2026-05-12', reason: '骚扰私信' },
  { id: 2, userId: 1002, nickname: '六爻小生', avatar: AVATAR('bl-2'), blockedAt: '2026-04-28', reason: '恶意评论' },
  { id: 3, userId: 1003, nickname: '风水老李', avatar: AVATAR('bl-3'), blockedAt: '2026-03-15' },
]
export const blacklistSearchPool: SearchUserItem[] = [
  { id: 2001, nickname: '紫微星君', avatar: AVATAR('sp-1'), isBlocked: false },
  { id: 2002, nickname: '奇门遁甲', avatar: AVATAR('sp-2'), isBlocked: false },
  { id: 2003, nickname: '梅花易数', avatar: AVATAR('sp-3'), isBlocked: false },
  { id: 2004, nickname: '八字小王', avatar: AVATAR('sp-4'), isBlocked: true },
]

/* —— 青少年模式 —— */
export interface TeenModeSettings {
  enabled: boolean
  dailyLimit: number
  restrictedStartHour: number
  restrictedEndHour: number
  autoNightMode: boolean
  filterLevel: 'strict' | 'moderate'
  hasPassword: boolean
}
export const defaultTeenModeSettings: TeenModeSettings = {
  enabled: false,
  dailyLimit: 40,
  restrictedStartHour: 22,
  restrictedEndHour: 6,
  autoNightMode: true,
  filterLevel: 'moderate',
  hasPassword: false,
}
export const teenTimeLimitOptions = [
  { value: 15, label: '15分钟' },
  { value: 30, label: '30分钟' },
  { value: 40, label: '40分钟（默认）' },
  { value: 60, label: '60分钟' },
  { value: 90, label: '90分钟' },
  { value: 120, label: '120分钟' },
]
export const teenFilterLevels = [
  { value: 'strict', label: '严格', desc: '仅显示适合青少年的教育内容' },
  { value: 'moderate', label: '适中', desc: '过滤不适内容，保留大部分功能' },
]

/* —— 数据导出 —— */
export interface ExportDataType {
  id: string
  name: string
  description: string
  icon: string
  estimatedSize: string
}
export type ExportRecordStatus = 'processing' | 'completed' | 'expired' | 'failed'
export interface ExportRecord {
  id: string
  types: string[]
  status: ExportRecordStatus
  createdAt: string
  completedAt?: string
  expireAt?: string
  fileSize?: string
}
export const exportDataTypes: ExportDataType[] = [
  { id: 'profile', name: '个人信息', description: '账号资料、头像、昵称、简介等', icon: 'user', estimatedSize: '< 1MB' },
  { id: 'posts', name: '帖子内容', description: '发布的圈子帖子、评论、回复', icon: 'file-text', estimatedSize: '约 5MB' },
  { id: 'comments', name: '评论互动', description: '课程评论、视频评论、点赞记录', icon: 'message-square', estimatedSize: '约 2MB' },
  { id: 'favorites', name: '收藏内容', description: '收藏的课程、帖子、商品等', icon: 'bookmark', estimatedSize: '约 1MB' },
  { id: 'orders', name: '订单数据', description: '购买记录、支付信息、发票', icon: 'shopping-bag', estimatedSize: '约 3MB' },
  { id: 'learning', name: '学习记录', description: '课程进度、学习时长、测验成绩', icon: 'graduation-cap', estimatedSize: '约 2MB' },
  { id: 'notes', name: '笔记内容', description: '课程笔记、批注、高亮标记', icon: 'book-open', estimatedSize: '约 4MB' },
  { id: 'follows', name: '关注列表', description: '关注的用户、圈子、讲师', icon: 'users', estimatedSize: '< 1MB' },
]
export const exportRecords: ExportRecord[] = [
  { id: '1', types: ['profile', 'posts', 'comments'], status: 'completed', createdAt: '2026-06-01T10:30:00', completedAt: '2026-06-01T10:35:00', expireAt: '2026-06-08T10:35:00', fileSize: '8.2MB' },
  { id: '2', types: ['orders', 'learning'], status: 'processing', createdAt: '2026-06-03T08:00:00' },
  { id: '3', types: ['profile', 'favorites', 'notes', 'follows'], status: 'expired', createdAt: '2026-05-20T14:00:00', completedAt: '2026-05-20T14:10:00', expireAt: '2026-05-27T14:10:00' },
]

/* —— 注销账号 —— */
export const deleteAccountReasons = [
  { id: 'not_useful', label: '不再使用该服务' },
  { id: 'privacy', label: '隐私安全考虑' },
  { id: 'found_better', label: '找到了更好的替代品' },
  { id: 'too_many_notifications', label: '通知太多' },
  { id: 'poor_experience', label: '使用体验不好' },
  { id: 'other', label: '其他原因' },
]
export const deleteAccountDataItems = [
  { icon: 'message-circle', label: '帖子、评论、消息等内容', color: '#3b82f6' },
  { icon: 'users', label: '圈子、关注、粉丝关系', color: '#22c55e' },
  { icon: 'shopping-bag', label: '订单记录和购买历史', color: '#f97316' },
  { icon: 'gift', label: '积分、优惠券和会员权益', color: '#a855f7' },
  { icon: 'credit-card', label: '钱包余额（需先提现）', color: '#ef4444' },
]
export const deleteAccountAssets = {
  balance: 128.5,
  points: 2680,
  coupons: 5,
  memberDays: 180,
}

/* ============================================================
   资产与互动（钱包 / 积分 / 浏览历史 / 我的点赞 / 我的评论 / 收到的评论）
   ============================================================ */

/* —— 我的钱包 —— */
export interface WalletInfo {
  balance: number
  rmb: number
  level: number
  growthValue: number
  nextLevelGrowth: number
  points: number
  totalRecharge: number
  totalSpent: number
}
export interface RechargeOption {
  coins: number
  price: number
  bonus: number
  popular?: boolean
}
export type WalletTxType = 'recharge' | 'spend' | 'bonus' | 'refund'
export interface WalletTransaction {
  id: string
  type: WalletTxType
  title: string
  time: string
  amount: number
}
export const walletInfo: WalletInfo = {
  balance: 1280,
  rmb: 128.0,
  level: 3,
  growthValue: 4520,
  nextLevelGrowth: 6000,
  points: 3680,
  totalRecharge: 2500.0,
  totalSpent: 1220.0,
}
export const rechargeOptions: RechargeOption[] = [
  { coins: 100, price: 10, bonus: 0 },
  { coins: 500, price: 50, bonus: 20 },
  { coins: 1000, price: 100, bonus: 50, popular: true },
  { coins: 2000, price: 200, bonus: 120 },
  { coins: 5000, price: 500, bonus: 350 },
  { coins: 10000, price: 1000, bonus: 800 },
]
export const walletTransactions: WalletTransaction[] = [
  { id: '1', type: 'recharge', title: '充值国学币', time: '2026-06-03 14:30', amount: 300 },
  { id: '2', type: 'spend', title: '购买《周易全解》', time: '2026-06-02 10:15', amount: -168 },
  { id: '3', type: 'bonus', title: '签到奖励', time: '2026-06-02 08:00', amount: 10 },
  { id: '4', type: 'spend', title: '大师在线咨询', time: '2026-06-01 16:40', amount: -200 },
  { id: '5', type: 'refund', title: '订单退款', time: '2026-05-30 11:20', amount: 88 },
]

/* —— 积分中心 —— */
export interface PointsInfo {
  balance: number
  todayEarned: number
  monthEarned: number
  totalEarned: number
  expiringSoon: number
  expireDate?: string
}
export interface GrowthInfo {
  value: number
  level: number
  levelName: string
  nextLevel: number
  nextLevelName: string
  nextLevelValue: number
  progress: number
}
export type PointsRecordType = 'income' | 'expense'
export interface PointsRecord {
  id: string
  type: PointsRecordType
  title: string
  description: string
  points: number
  balance: number
  createdAt: string
}
export interface EarnRule {
  id: string
  title: string
  description: string
  points: number
  icon: string
  limit?: string
  completed?: boolean
}
export const pointsInfo: PointsInfo = {
  balance: 2580,
  todayEarned: 30,
  monthEarned: 450,
  totalEarned: 12680,
  expiringSoon: 200,
  expireDate: '2026-12-31',
}
export const growthInfo: GrowthInfo = {
  value: 3250,
  level: 4,
  levelName: '金牌学员',
  nextLevel: 5,
  nextLevelName: '钻石学员',
  nextLevelValue: 5000,
  progress: 65,
}
export const pointsEarnRules: EarnRule[] = [
  { id: '1', title: '每日签到', description: '连续签到奖励翻倍', points: 10, icon: 'calendar', limit: '每日1次', completed: true },
  { id: '2', title: '完成学习', description: '学习课程满30分钟', points: 20, icon: 'book-open', limit: '每日3次', completed: false },
  { id: '3', title: '发表评论', description: '发表优质课程评论', points: 15, icon: 'message-circle', limit: '每日5次', completed: false },
  { id: '4', title: '分享内容', description: '分享课程或圈子内容', points: 10, icon: 'share-2', limit: '每日3次', completed: false },
  { id: '5', title: '购买课程', description: '每消费10元获1积分', points: 1, icon: 'shopping-bag', limit: '无上限' },
  { id: '6', title: '邀请好友', description: '好友注册成功', points: 100, icon: 'gift', limit: '无上限' },
]
export const pointsRecords: PointsRecord[] = [
  { id: '1', type: 'income', title: '每日签到', description: '连续签到第7天', points: 20, balance: 2580, createdAt: '2026-06-03 08:30' },
  { id: '2', type: 'income', title: '完成学习', description: '学习《易经入门》30分钟', points: 20, balance: 2560, createdAt: '2026-06-02 20:15' },
  { id: '3', type: 'expense', title: '积分兑换', description: '兑换优惠券', points: -100, balance: 2540, createdAt: '2026-06-02 15:00' },
  { id: '4', type: 'income', title: '发表评论', description: '课程评论获赞', points: 15, balance: 2640, createdAt: '2026-06-01 14:20' },
  { id: '5', type: 'income', title: '邀请好友', description: '好友张三注册成功', points: 100, balance: 2625, createdAt: '2026-05-30 10:00' },
]
export interface GrowthLevel {
  level: number
  name: string
  value: number
  benefits: string[]
}
export const growthLevels: GrowthLevel[] = [
  { level: 1, name: '青铜学员', value: 0, benefits: ['基础功能'] },
  { level: 2, name: '白银学员', value: 500, benefits: ['9.8折优惠', '专属客服'] },
  { level: 3, name: '黄金学员', value: 1500, benefits: ['9.5折优惠', '优先答疑'] },
  { level: 4, name: '金牌学员', value: 3000, benefits: ['9折优惠', '免费直播'] },
  { level: 5, name: '钻石学员', value: 5000, benefits: ['8.5折优惠', '专属课程'] },
  { level: 6, name: '至尊学员', value: 10000, benefits: ['8折优惠', '一对一'] },
]
export const growthRules = [
  { icon: 'shopping-bag', title: '购买课程', desc: '每消费10元获得10成长值', value: '+10/10元' },
  { icon: 'book-open', title: '完成学习', desc: '完成课程章节学习', value: '+5/章节' },
  { icon: 'star', title: '完成课程', desc: '完成整门课程学习', value: '+50/课程' },
  { icon: 'message-circle', title: '互动参与', desc: '发表评论、参与讨论', value: '+2/次' },
  { icon: 'trending-up', title: '连续学习', desc: '连续7天学习奖励', value: '+100' },
]

/* —— 浏览历史 —— */
export type HistoryItemType = 'course' | 'video' | 'live' | 'article' | 'product' | 'circle'
export interface HistoryItem {
  id: string
  type: HistoryItemType
  title: string
  cover?: string
  progress?: number
  duration?: number
  viewedAt: string
}
export interface HistoryGroup {
  date: string
  label: string
  items: HistoryItem[]
}
export const historyTypeConfig: Record<HistoryItemType, { icon: string; label: string; color: string }> = {
  course: { icon: 'book-open', label: '课程', color: '#3b82f6' },
  video: { icon: 'video', label: '视频', color: '#ec4899' },
  live: { icon: 'radio', label: '直播', color: '#ef4444' },
  article: { icon: 'file-text', label: '文章', color: '#22c55e' },
  product: { icon: 'shopping-bag', label: '商品', color: '#f97316' },
  circle: { icon: 'users', label: '圈子', color: '#a855f7' },
}
export const historyGroups: HistoryGroup[] = [
  {
    date: '2026-06-03', label: '今天',
    items: [
      { id: '1', type: 'course', title: '周易入门：从零开始学习易经', cover: `${P}/book1.jpg`, progress: 45, duration: 3600, viewedAt: '14:30' },
      { id: '2', type: 'video', title: '梅花易数实战案例分析', cover: `${P}/item4.jpg`, progress: 100, duration: 1200, viewedAt: '12:15' },
      { id: '3', type: 'article', title: '八字命理中的十神详解', viewedAt: '10:20' },
    ],
  },
  {
    date: '2026-06-02', label: '昨天',
    items: [
      { id: '4', type: 'live', title: '风水布局直播答疑', cover: `${P}/item5.jpg`, viewedAt: '20:00' },
      { id: '5', type: 'product', title: '开光铜葫芦摆件', cover: `${P}/item3.jpg`, viewedAt: '16:45' },
    ],
  },
  {
    date: '2026-05-31', label: '5月31日',
    items: [
      { id: '6', type: 'course', title: '六爻预测高级班', cover: `${P}/book2.jpg`, progress: 30, duration: 7200, viewedAt: '19:30' },
      { id: '7', type: 'circle', title: '易学爱好者交流圈', cover: `${P}/item2.jpg`, viewedAt: '15:00' },
      { id: '8', type: 'article', title: '紫微斗数入门指南', viewedAt: '11:20' },
    ],
  },
]

/* —— 我的点赞 —— */
export type LikeTargetType = 'article' | 'course' | 'video' | 'product' | 'circle_post' | 'question' | 'answer' | 'comment'
export interface LikeItem {
  id: number
  createdAt: string
  target: {
    id: number
    type: LikeTargetType
    title: string
    author?: { nickname: string; avatar: string }
  }
}
export const likeTypeNames: Record<LikeTargetType, string> = {
  article: '文章', course: '课程', video: '视频', product: '商品',
  circle_post: '帖子', question: '问题', answer: '回答', comment: '评论',
}
export const likeTypeStyles: Record<LikeTargetType, { icon: string; color: string; bg: string }> = {
  article: { icon: 'file-text', color: '#2563eb', bg: '#dbeafe' },
  course: { icon: 'book-open', color: '#d97706', bg: '#fef3c7' },
  video: { icon: 'video', color: '#dc2626', bg: '#fee2e2' },
  product: { icon: 'shopping-bag', color: '#16a34a', bg: '#dcfce7' },
  circle_post: { icon: 'users', color: '#9333ea', bg: '#f3e8ff' },
  question: { icon: 'help-circle', color: '#ea580c', bg: '#ffedd5' },
  answer: { icon: 'message-square', color: '#0d9488', bg: '#ccfbf1' },
  comment: { icon: 'message-square', color: '#4b5563', bg: '#f3f4f6' },
}
export const likeFilterOptions: { label: string; value: LikeTargetType | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '文章', value: 'article' },
  { label: '课程', value: 'course' },
  { label: '视频', value: 'video' },
  { label: '帖子', value: 'circle_post' },
  { label: '问答', value: 'question' },
  { label: '商品', value: 'product' },
]
export const myLikes: LikeItem[] = [
  { id: 1, createdAt: '2026-06-03', target: { id: 101, type: 'article', title: '八字命理基础：天干地支与五行生克', author: { nickname: '玄学老师', avatar: AVATAR('like-1') } } },
  { id: 2, createdAt: '2026-06-02', target: { id: 102, type: 'course', title: '紫微斗数命盘精讲（全集）', author: { nickname: '紫微星君', avatar: AVATAR('like-2') } } },
  { id: 3, createdAt: '2026-06-01', target: { id: 103, type: 'video', title: '风水布局案例：办公室招财方位', author: { nickname: '风水大师', avatar: AVATAR('like-3') } } },
  { id: 4, createdAt: '2026-05-30', target: { id: 104, type: 'circle_post', title: '分享我的六爻预测心得', author: { nickname: '六爻小生', avatar: AVATAR('like-4') } } },
  { id: 5, createdAt: '2026-05-28', target: { id: 105, type: 'product', title: '天然黑曜石貔貅手链', author: { nickname: '国学优选', avatar: AVATAR('like-5') } } },
  { id: 6, createdAt: '2026-05-26', target: { id: 106, type: 'question', title: '本命年应该注意哪些事项？', author: { nickname: '易友123', avatar: AVATAR('like-6') } } },
]

/* —— 我的评论 / 收到的评论 —— */
export type CommentTargetType = 'article' | 'course' | 'video' | 'product' | 'circle_post' | 'question'
export const commentTypeNames: Record<CommentTargetType, string> = {
  article: '文章', course: '课程', video: '视频', product: '商品', circle_post: '帖子', question: '问题',
}
export const commentTypeStyles: Record<CommentTargetType, { icon: string; color: string; bg: string }> = {
  article: { icon: 'file-text', color: '#9333ea', bg: '#f3e8ff' },
  course: { icon: 'play', color: '#2563eb', bg: '#dbeafe' },
  video: { icon: 'video', color: '#db2777', bg: '#fce7f3' },
  product: { icon: 'shopping-bag', color: '#ea580c', bg: '#ffedd5' },
  circle_post: { icon: 'users', color: '#16a34a', bg: '#dcfce7' },
  question: { icon: 'help-circle', color: '#d97706', bg: '#fef3c7' },
}
export interface MyCommentItem {
  id: number
  content: string
  createdAt: string
  likeCount: number
  replyCount: number
  hasReply: boolean
  target: { id: number; type: CommentTargetType; title: string; cover?: string }
}
export const myComments: MyCommentItem[] = [
  { id: 1, content: '老师讲得太透彻了，把天干地支的关系讲得很清楚，受益匪浅！', createdAt: '2026-06-03 15:20', likeCount: 28, replyCount: 3, hasReply: true, target: { id: 201, type: 'course', title: '八字命理基础精讲班', cover: `${P}/book1.jpg` } },
  { id: 2, content: '这篇文章关于五行生克的解读很有深度，收藏了。', createdAt: '2026-06-02 10:30', likeCount: 12, replyCount: 0, hasReply: false, target: { id: 202, type: 'article', title: '五行生克与人生运势' } },
  { id: 3, content: '案例分析很实用，期待更多实战内容。', createdAt: '2026-06-01 19:45', likeCount: 6, replyCount: 1, hasReply: false, target: { id: 203, type: 'video', title: '风水实战案例第三期', cover: `${P}/item4.jpg` } },
  { id: 4, content: '请问这个摆件适合摆放在客厅哪个方位？', createdAt: '2026-05-29 14:00', likeCount: 2, replyCount: 5, hasReply: true, target: { id: 204, type: 'product', title: '开光铜葫芦摆件', cover: `${P}/item3.jpg` } },
]
export interface ReceivedCommentItem {
  id: number
  content: string
  createdAt: string
  isReplied: boolean
  commenter: { nickname: string; avatar: string; level?: number }
  myContent: { id: number; type: CommentTargetType; title: string }
  myReply?: { content: string; createdAt: string }
}
export const receivedComments: ReceivedCommentItem[] = [
  { id: 1, content: '请问老师，本命年佩戴什么材质的手链比较好？', createdAt: '2026-06-03 16:30', isReplied: false, commenter: { nickname: '求学者', avatar: AVATAR('rc-1'), level: 3 }, myContent: { id: 301, type: 'article', title: '本命年开运指南' } },
  { id: 2, content: '讲得真好，已经三刷了，每次都有新收获！', createdAt: '2026-06-03 11:00', isReplied: true, commenter: { nickname: '易学迷', avatar: AVATAR('rc-2'), level: 5 }, myContent: { id: 302, type: 'course', title: '紫微斗数入门课' }, myReply: { content: '感谢支持，后续会更新更多进阶内容~', createdAt: '2026-06-03 12:15' } },
  { id: 3, content: '这个观点我不太认同，能再展开讲讲吗？', createdAt: '2026-06-02 20:10', isReplied: false, commenter: { nickname: '思辨者', avatar: AVATAR('rc-3'), level: 2 }, myContent: { id: 303, type: 'circle_post', title: '关于六爻起卦的几点思考' } },
  { id: 4, content: '太实用了，感谢分享！', createdAt: '2026-06-01 09:30', isReplied: true, commenter: { nickname: '小白入门', avatar: AVATAR('rc-4'), level: 1 }, myContent: { id: 304, type: 'video', title: '风水入门第一课' }, myReply: { content: '不客气，有问题随时交流！', createdAt: '2026-06-01 10:00' } },
]
