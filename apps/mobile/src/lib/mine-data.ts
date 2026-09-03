/**
 * 个人中心 - 设置与账号安全板块数据层
 * 对应原型 app/mine/{settings,security,change-password,change-phone,payment-password,bind-accounts}
 * 主题色沿用原型 #C41E3A
 */
import { apiGet, apiGetOptionalAuth, apiPost, apiPut, apiDelete } from '@/utils/request'
import type { AccountInterestState } from '@/utils/interests'

/* —— 头像生成辅助（沿用工程 dicebear 约定） —— */
const AVATAR = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`

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
  /** 空串 = 纯展示行，不可点（如登录设备：只有数量展示，无独立管理页，别再指回本页造成"点了没反应"） */
  href: string
}
export const securityLoginItems: SecurityItem[] = [
  { id: 'password', icon: 'key', iconBg: '#3b82f6', label: '登录密码', value: `上次修改 ${mineProfile.passwordUpdatedAt}`, status: 'set', href: '/mine/change-password' },
  { id: 'phone', icon: 'smartphone', iconBg: '#22c55e', label: '手机号码', value: mineProfile.phone, status: 'set', href: '/mine/change-phone' },
  { id: 'email', icon: 'mail', iconBg: '#f97316', label: '邮箱绑定', value: mineProfile.email, status: 'set', href: '/mine/bind-accounts' },
]
export const securityPaymentItems: SecurityItem[] = [
  { id: 'pay-password', icon: 'credit-card', iconBg: '#a855f7', label: '支付密码', status: mineProfile.payPasswordSet ? 'set' : 'unset', href: '/mine/payment-password' },
  { id: 'real-name', icon: 'shield', iconBg: '#C41E3A', label: '实名认证', value: mineProfile.realNameVerified ? mineProfile.realName : undefined, status: mineProfile.realNameVerified ? 'verified' : 'unverified', href: '/mine/verification' },
]
export const securityDeviceItems: SecurityItem[] = [
  { id: 'devices', icon: 'monitor', iconBg: '#64748b', label: '登录设备管理', value: '2 台设备已登录', href: '' },
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
  { id: 'photos', name: '相册', icon: 'image', description: '访问您的照片和视频', purpose: '用于选择头像、发布图片/视频内容、保存图片', status: 'always', required: false, degradedFeature: '无法选择本地图片' },
  { id: 'contacts', name: '通讯录', icon: 'users', description: '读取联系人信息', purpose: '用于发现已注册的朋友、邀请好友', status: 'denied', required: false, degradedFeature: '无法发现通讯录好友' },
  { id: 'calendar', name: '日历', icon: 'calendar', description: '访问日历事件', purpose: '用于添加课程提醒、直播预约到日历', status: 'not_determined', required: false, degradedFeature: '无法添加日历提醒' },
  { id: 'notifications', name: '通知', icon: 'bell', description: '发送推送通知', purpose: '用于消息提醒、课程提醒、直播开播提醒', status: 'authorized', required: true },
]
/** 隐私授权本地存储 key（客户端权限·后端无端点·诚实降级，授权选择存本地） */
const PERMISSION_STORAGE_KEY = 'mine_app_permissions'

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


/* —— 数据导出 —— */
export interface ExportDataType {
  id: string
  name: string
  description: string
  icon: string
}
export interface PersonalDataExportPackage {
  schemaVersion: string
  exportedAt: string
  accountId: string
  selectedTypes: string[]
  summary: Record<string, number>
  notice: string
  sections: Record<string, unknown>
}
export const exportDataTypes: ExportDataType[] = [
  { id: 'profile', name: '个人信息', description: '账号资料、会员状态、偏好与角色信息', icon: 'user' },
  { id: 'posts', name: '创作内容', description: '发布的圈子帖子与原创文章正文', icon: 'file-text' },
  { id: 'comments', name: '评论互动', description: '评论、点赞及课程、商品与直播评价', icon: 'message-square' },
  { id: 'favorites', name: '收藏内容', description: '收藏的内容、工具、古籍与电子书', icon: 'bookmark' },
  { id: 'orders', name: '订单数据', description: '平台订单、会员与电子书购买、发票记录', icon: 'shopping-bag' },
  { id: 'learning', name: '学习记录', description: '课程、古籍与电子书进度及阅读时长', icon: 'graduation-cap' },
  { id: 'notes', name: '笔记内容', description: '古籍与电子书的书签、批注和笔记', icon: 'book-open' },
  { id: 'follows', name: '关注与加入', description: '关注的用户及已加入的圈子', icon: 'users' },
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
  /** 冻结中的国学币（提现审批/风控冻结·后端 VirtualCoinAccount.frozen），>0 时页面须可见 */
  frozen: number
  /** 累计充值（单位：国学币·后端 totalRecharged 即币数，不是人民币，展示不可加 ¥） */
  totalRecharge: number
  /** 累计消费（单位：国学币·同上） */
  totalSpent: number
}
export interface RechargeOption {
  coins: number
  price: number
  bonus: number
  popular?: boolean
}
/** 微信 JSAPI 支付参数（uni.requestPayment 所需，后端 signJsapiConfig 生成） */
export interface WechatPayParams {
  appId: string
  timeStamp: string
  nonceStr: string
  package: string
  signType: string
  paySign: string
}
export interface RechargePaymentResult {
  orderNo: string
  amountRmb: number
  payParams?: WechatPayParams
  mwebUrl?: string
}
export interface RechargePaymentStatus {
  orderNo: string
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  amountCoin: number | null
  amountRmb: number | null
  paidAt: string | null
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
  frozen: 0,
  totalRecharge: 2500,
  totalSpent: 1220,
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
      { id: '1', type: 'course', title: '周易入门：从零开始学习易经', cover: `.webp`, progress: 45, duration: 3600, viewedAt: '14:30' },
      { id: '2', type: 'video', title: '梅花易数实战案例分析', cover: `.webp`, progress: 100, duration: 1200, viewedAt: '12:15' },
      { id: '3', type: 'article', title: '八字命理中的十神详解', viewedAt: '10:20' },
    ],
  },
  {
    date: '2026-06-02', label: '昨天',
    items: [
      { id: '4', type: 'live', title: '风水布局直播答疑', cover: `.webp`, viewedAt: '20:00' },
      { id: '5', type: 'product', title: '开光铜葫芦摆件', cover: `.webp`, viewedAt: '16:45' },
    ],
  },
  {
    date: '2026-05-31', label: '5月31日',
    items: [
      { id: '6', type: 'course', title: '六爻预测高级班', cover: `.webp`, progress: 30, duration: 7200, viewedAt: '19:30' },
      { id: '7', type: 'circle', title: '易学爱好者交流圈', cover: `.webp`, viewedAt: '15:00' },
      { id: '8', type: 'article', title: '紫微斗数入门指南', viewedAt: '11:20' },
    ],
  },
]

/* —— 我的点赞 —— */
export type LikeTargetType = 'article' | 'course' | 'video' | 'product' | 'circle_post' | 'question' | 'answer' | 'comment'
export interface LikeItem {
  id: string | number
  createdAt: string
  target: {
    id: string | number
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
  id: string | number
  content: string
  createdAt: string
  likeCount: number
  replyCount: number
  hasReply: boolean
  target: { id: string | number; type: CommentTargetType; title: string; cover?: string }
}
export const myComments: MyCommentItem[] = [
  { id: 1, content: '老师讲得太透彻了，把天干地支的关系讲得很清楚，受益匪浅！', createdAt: '2026-06-03 15:20', likeCount: 28, replyCount: 3, hasReply: true, target: { id: 201, type: 'course', title: '八字命理基础精讲班', cover: `.webp` } },
  { id: 2, content: '这篇文章关于五行生克的解读很有深度，收藏了。', createdAt: '2026-06-02 10:30', likeCount: 12, replyCount: 0, hasReply: false, target: { id: 202, type: 'article', title: '五行生克与人生运势' } },
  { id: 3, content: '案例分析很实用，期待更多实战内容。', createdAt: '2026-06-01 19:45', likeCount: 6, replyCount: 1, hasReply: false, target: { id: 203, type: 'video', title: '风水实战案例第三期', cover: `.webp` } },
  { id: 4, content: '请问这个摆件适合摆放在客厅哪个方位？', createdAt: '2026-05-29 14:00', likeCount: 2, replyCount: 5, hasReply: true, target: { id: 204, type: 'product', title: '开光铜葫芦摆件', cover: `.webp` } },
]
export interface ReceivedCommentItem {
  id: string | number
  content: string
  createdAt: string
  isReplied: boolean
  commenter: { nickname: string; avatar: string; level?: number }
  myContent: { id: string | number; type: CommentTargetType; title: string }
  myReply?: { content: string; createdAt: string }
}
export const receivedComments: ReceivedCommentItem[] = [
  { id: 1, content: '请问老师，本命年佩戴什么材质的手链比较好？', createdAt: '2026-06-03 16:30', isReplied: false, commenter: { nickname: '求学者', avatar: AVATAR('rc-1'), level: 3 }, myContent: { id: 301, type: 'article', title: '本命年开运指南' } },
  { id: 2, content: '讲得真好，已经三刷了，每次都有新收获！', createdAt: '2026-06-03 11:00', isReplied: true, commenter: { nickname: '易学迷', avatar: AVATAR('rc-2'), level: 5 }, myContent: { id: 302, type: 'course', title: '紫微斗数入门课' }, myReply: { content: '感谢支持，后续会更新更多进阶内容~', createdAt: '2026-06-03 12:15' } },
  { id: 3, content: '这个观点我不太认同，能再展开讲讲吗？', createdAt: '2026-06-02 20:10', isReplied: false, commenter: { nickname: '思辨者', avatar: AVATAR('rc-3'), level: 2 }, myContent: { id: 303, type: 'circle_post', title: '关于六爻起卦的几点思考' } },
  { id: 4, content: '太实用了，感谢分享！', createdAt: '2026-06-01 09:30', isReplied: true, commenter: { nickname: '小白入门', avatar: AVATAR('rc-4'), level: 1 }, myContent: { id: 304, type: 'video', title: '风水入门第一课' }, myReply: { content: '不客气，有问题随时交流！', createdAt: '2026-06-01 10:00' } },
]

/* —— 意见反馈(feedback) —— */
// 反馈类型(图标/颜色与原型一致)
export interface FeedbackType {
  id: string
  label: string
  icon: string
  color: string
  bgColor: string
}
export const feedbackTypes: FeedbackType[] = [
  { id: 'bug', label: '问题反馈', icon: 'bug', color: '#ff4d4f', bgColor: 'rgba(255,77,79,0.1)' },
  { id: 'suggestion', label: '功能建议', icon: 'lightbulb', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.1)' },
  { id: 'complaint', label: '投诉举报', icon: 'alert-triangle', color: '#f97316', bgColor: 'rgba(249,115,22,0.1)' },
  { id: 'other', label: '其他问题', icon: 'help-circle', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.1)' },
]

export interface FeedbackStatusConfig {
  label: string
  color: string
  bg: string
}
export const feedbackStatusConfig: Record<string, FeedbackStatusConfig> = {
  pending: { label: '待处理', color: '#d48806', bg: 'rgba(245,158,11,0.1)' },
  processing: { label: '处理中', color: '#2563eb', bg: 'rgba(59,130,246,0.1)' },
  resolved: { label: '已解决', color: '#16a34a', bg: 'rgba(34,197,94,0.1)' },
}

// @data-needs: 我的历史反馈列表, 参数 {}, 返回 [{id,type,title,content,time,status,reply}]
export interface HistoryFeedbackItem {
  id: number
  type: string
  title: string
  content: string
  time: string
  status: string
  reply: string | null
}
export const historyFeedbacks: HistoryFeedbackItem[] = [
  { id: 1, type: 'bug', title: '课程视频播放卡顿', content: '在观看八字入门课程时，视频经常卡顿...', time: '2024-03-15', status: 'resolved', reply: '感谢您的反馈，我们已优化视频服务器，请您再试试。' },
  { id: 2, type: 'suggestion', title: '建议增加离线下载功能', content: '希望能支持课程视频离线下载...', time: '2024-03-10', status: 'processing', reply: null },
  { id: 3, type: 'other', title: '如何申请成为讲师', content: '想了解成为平台讲师的条件...', time: '2024-02-28', status: 'resolved', reply: '您好，您可以在研究院页面查看讲师申请条件和流程。' },
]

/* —— 编辑资料(profile/edit) —— */
export interface TagCategory {
  name: string
  tags: string[]
}
export const editTagCategories: TagCategory[] = [
  { name: '命理术数', tags: ['八字命理', '紫微斗数', '六爻占卜', '奇门遁甲', '梅花易数'] },
  { name: '风水堪舆', tags: ['阳宅风水', '阴宅风水', '办公风水', '商业风水', '家居布局'] },
  { name: '姓名学', tags: ['起名改名', '公司取名', '姓名分析', '数理五格'] },
  { name: '中医养生', tags: ['中医基础', '经络养生', '食疗养生', '气功导引'] },
  { name: '传统文化', tags: ['道家文化', '儒家经典', '佛学智慧', '诗词歌赋', '书法绘画'] },
]

export const editProvinces: string[] = ['北京市', '上海市', '广东省', '浙江省', '江苏省', '四川省', '湖北省', '湖南省']
export const editCities: Record<string, string[]> = {
  北京市: ['东城区', '西城区', '朝阳区', '海淀区', '丰台区'],
  上海市: ['黄浦区', '徐汇区', '长宁区', '静安区', '浦东新区'],
  广东省: ['广州市', '深圳市', '东莞市', '佛山市', '珠海市'],
  浙江省: ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市'],
}

// @data-needs: 当前用户资料, 参数 {}, 返回 {avatar,nickname,bio,gender,birthday,province,city,tags[]}
export interface EditProfileData {
  avatar: string
  nickname: string
  bio: string
  gender: 'male' | 'female' | 'unknown'
  birthday: string
  province: string
  city: string
  tags: string[]
}
export const editProfileDefault: EditProfileData = {
  avatar: '',
  nickname: '易学爱好者',
  bio: '探索命理奥秘，传承国学智慧',
  gender: 'male',
  birthday: '1990-01-01',
  province: '广东省',
  city: '深圳市',
  tags: ['八字命理', '紫微斗数'],
}

/* —— 钱包提现页 —— */
/**
 * 提现方式。
 * wechat = 微信零钱（走微信商家转账·自动到账，是唯一自动化的通道）
 *   🔴 但它不是无感到账：转账发起后用户还要在【微信小程序内】点「确认收款」钱才到账。
 *      wx.requestMerchantTransfer 是小程序 API，H5 调不了 —— H5 用户只能去小程序确认。
 * alipay / bank = 目前仍走人工打款（支付宝转账、汇付代付尚未接入）
 */
export type WithdrawMethod = 'wechat' | 'alipay' | 'bank'
export interface WithdrawAccount {
  method: WithdrawMethod
  /** 微信零钱：收款人真实姓名（≥2000元微信强制校验实名，加密后提交） */
  realName?: string
  alipayAccount?: string
  alipayName?: string
  bankName?: string
  bankAccount?: string
  bankHolder?: string
}

/** 待确认收款的转账（微信商家转账 WAIT_USER_CONFIRM 时返回） */
export interface TransferConfirmInfo {
  needConfirm: boolean
  /** 微信确认收款凭据，前端凭它调 wx.requestMerchantTransfer；敏感，只有本人拿得到 */
  packageInfo: string | null
  status: string
  transferState?: string
  amount?: number
}
/** 我的提现记录一条 */
export interface WithdrawRecord {
  id: string
  amount: number
  fee: number
  taxAmount: number
  actualAmount: number
  payMethod: string
  /** PENDING 待审 / APPROVED 待打款 / TRANSFERRING 已发起转账（钱还没到你手上）/ PAID 已到账 / REJECTED 驳回 */
  status: string
  transferState?: string | null
  transferFailReason?: string | null
  reviewNote?: string | null
  /** true = 微信转账已发起，等你在微信里点「确认收款」，不点会自动退回 */
  needConfirm: boolean
  createdAt: string
}

export interface WithdrawBalanceInfo {
  availableBalance: number
  frozenBalance: number
  pendingBalance: number
  minWithdraw: number
  maxWithdraw: number
  feeRate: number
  minFee: number
  /** 代扣代缴开关（后台 finance.tax.enabled·开着时提现要扣税，预览必须算进去否则到账额虚高） */
  taxEnabled: boolean
  /** 代扣代缴税率（0~1·未开启为 0） */
  taxRate: number
  savedAccounts: WithdrawAccount[]
}
// @data-needs: 提现余额与已存收款账户，返回 [{availableBalance,frozenBalance,pendingBalance,minWithdraw,maxWithdraw,feeRate,minFee,savedAccounts}]
export const withdrawBalanceInfo: WithdrawBalanceInfo = {
  availableBalance: 2580.5,
  frozenBalance: 200.0,
  pendingBalance: 450.0,
  minWithdraw: 10,
  maxWithdraw: 50000,
  feeRate: 0.006,
  minFee: 1,
  taxEnabled: false,
  taxRate: 0,
  savedAccounts: [
    { method: 'alipay', alipayAccount: '138****8888', alipayName: '张*明' },
    { method: 'bank', bankName: '中国工商银行', bankAccount: '6222****1234', bankHolder: '张*明' },
  ],
}

/* —— 钱包交易记录页 —— */
export type WalletTxFlow = 'income' | 'expense'
export type WalletTxCategory = 'purchase' | 'refund' | 'reward' | 'recharge' | 'withdraw' | 'transfer' | 'other'
export interface WalletTxRecord {
  id: string
  type: WalletTxFlow
  category: WalletTxCategory
  title: string
  description: string
  amount: number
  balance: number
  createdAt: string
  orderNo?: string
}
export interface WalletBalanceBrief {
  coin: number
  points: number
  frozen: number
}
// @data-needs: 钱包币/积分余额，返回 [{coin,points,frozen}]
export const walletBalanceBrief: WalletBalanceBrief = {
  coin: 2580,
  points: 12600,
  frozen: 100,
}
// @data-needs: 交易流水（支持按type收支/月份筛选），返回 [{id,type,category,title,description,amount,balance,createdAt,orderNo}]
export const walletTxRecords: WalletTxRecord[] = [
  { id: '1', type: 'expense', category: 'purchase', title: '购买课程', description: '紫微斗数入门精讲', amount: -299, balance: 2580, createdAt: '2024-01-15 14:30', orderNo: '202401151430001' },
  { id: '2', type: 'income', category: 'refund', title: '退款到账', description: '订单退款', amount: 199, balance: 2879, createdAt: '2024-01-14 10:20', orderNo: '202401141020001' },
  { id: '3', type: 'income', category: 'recharge', title: '充值国学币', description: '微信支付充值', amount: 500, balance: 2680, createdAt: '2024-01-13 09:15' },
  { id: '4', type: 'expense', category: 'purchase', title: '购买商品', description: '周易六十四卦详解', amount: -168, balance: 2180, createdAt: '2024-01-12 16:45', orderNo: '202401121645001' },
  { id: '5', type: 'income', category: 'reward', title: '签到奖励', description: '连续签到7天奖励', amount: 50, balance: 2348, createdAt: '2024-01-11 08:00' },
  { id: '6', type: 'expense', category: 'transfer', title: '打赏作者', description: '打赏文章《八字命理基础》', amount: -20, balance: 2298, createdAt: '2024-01-10 20:30' },
]

/* ============================================================
   后端原始响应类型（容错适配用·不 export·字段宽松仅声明 adapter 实际访问到的）
   说明：喂给 new Date()/格式化函数或被强转为 number 的字段（如各 createdAt、各 id）
        类型收窄为必填，以满足 TS 构造/算术约束（后端这些字段恒返回，等价于原 any 行为）
   ============================================================ */
/** GET /auth/me 当前用户原始资料 */
interface RawMe {
  id?: string | number
  phone?: string | null
  email?: string | null
  nickname?: string | null
  avatar?: string | null
  bio?: string | null
  gender?: number | null
  birthday?: string | null
  interestCategories?: string[]
  identityVerified?: boolean
  paymentPasswordSet?: boolean
}
/** 后端 VirtualCoinTransaction 原始项 */
interface RawWalletTx {
  id?: string | number
  amountCoin?: number | string
  amount?: number | string
  scene?: string | null
  description?: string | null
  balanceAfter?: number | string
  balance?: number | string
  createdAt: string
  refId?: string | null
}
/** 已存收款账户原始项 */
interface RawSavedAccount {
  method?: WithdrawMethod
  alipayAccount?: string
  alipayName?: string
  bankName?: string
  bankAccount?: string
  bankHolder?: string
}
/** GET /users/wallet/withdraw-info 原始响应 */
interface RawWithdrawInfo {
  availableBalance?: number | string
  minWithdraw?: number | string
  maxWithdraw?: number | string
  feeRate?: number | string
  minFee?: number | string
  taxEnabled?: boolean
  taxRate?: number | string
  savedAccounts?: RawSavedAccount[]
}
/** GET /users/wallet/recharge-options 原始项 */
interface RawRechargeOption {
  amountCoin?: number | string
  coins?: number | string
  amountRmb?: number | string
  price?: number | string
  bonus?: number | string
}
/** 后端 BrowseHistory 原始项 */
interface RawBrowseHistory {
  id?: string | number
  targetType: string
  title?: string | null
  cover?: string | null
  createdAt: string
}
/** 后端 Blacklist 原始项 */
interface RawBlacklist {
  id: string | number
  blockedUserId: number
  blockedUser?: { id?: number; nickname?: string | null; avatar?: string | null } | null
  createdAt?: string | null
}
/** 后端 Feedback 原始项 */
interface RawFeedback {
  id: string | number
  type?: string
  content?: string | null
  status?: string
  reply?: string | null
  createdAt?: string | null
}
/** GET /users/delete-account/info 原始响应 */
interface RawDeleteAccountInfo {
  phone?: string | null
  reasons?: { id: string; label: string }[]
  dataItems?: { icon: string; label: string; color: string }[]
  assets?: { balance?: number | string; points?: number | string; coupons?: number | string; memberDays?: number | string } | null
}
/** 点赞/收藏多态目标作者 */
interface RawTargetAuthor { nickname?: string | null; avatar?: string | null }
/** 后端点赞项原始结构（target 多态详情，已删为 null） */
interface RawLike {
  id: string | number
  targetId: string | number
  targetType?: string
  createdAt: string
  target?: { id: string | number; type?: string; title?: string | null; author?: RawTargetAuthor | null } | null
}
/** 后端我的评论项原始结构 */
interface RawComment {
  id: string | number
  targetId: string | number
  targetType?: string
  content?: string | null
  createdAt: string
  likeCount?: number | string
  replyCount?: number | string
  hasReply?: boolean
  target?: { id: string | number; type?: string; title?: string | null; cover?: string | null } | null
}
/** 后端收到的评论项原始结构 */
interface RawReceivedComment {
  id: string | number
  userId?: string | number
  targetId: string | number
  targetType?: string
  content?: string | null
  createdAt: string
  isReplied?: boolean
  user?: { nickname?: string | null; avatar?: string | null } | null
  target?: { id: string | number; type?: string; title?: string | null } | null
  myReply?: { content?: string | null; createdAt: string } | null
}
/** 后端收藏项原始结构（target-resolver 已补全，已删为 null） */
interface RawFavorite {
  id?: string | number
  targetId?: string | number
  targetType: string
  createdAt: string
  target?: { type?: string; title?: string | null; cover?: string | null; author?: { nickname?: string | null } | null } | null
}
/** 后端 Notification 原始项 */
interface RawNotification {
  id?: string | number
  type?: string | null
  title?: string | null
  content?: string | null
  createdAt: string
  isRead?: boolean
  targetType?: string | null
  targetId?: string | null
}
/** GET /courses/my 报名项内嵌课程 */
interface RawCourseLite {
  id?: string | number
  title?: string | null
  cover?: string | null
  user?: { nickname?: string | null } | null
}
interface RawCourseEnrollment { course?: RawCourseLite | null }
interface RawMyCourses { courses?: RawCourseEnrollment[] }
/** GET /courses/study-plan 原始响应 */
interface RawStudyPlan {
  streak?: number | string
  courses?: { courseId?: string | number; id?: string | number; totalLessons?: number | string; completedLessons?: number | string }[]
}
/** GET /courses/dashboard 原始响应 */
interface RawDashboard {
  recentProgress?: { course?: { id?: string | number } | null; courseId?: string | number; chapter?: { title?: string } | null; updatedAt?: string }[]
}
/** 关注/粉丝列表用户原始项 */
interface RawFollowUser { id?: string | number; nickname?: string | null; avatar?: string | null }
/** GET /users/:id/following|followers 原始响应 */
interface RawFollowWrap { following?: RawFollowUser[]; followers?: RawFollowUser[] }
/** GET /member/status 原始响应 */
interface RawMemberStatus {
  memberLevel?: string
  isActive?: boolean
  remainingDays?: number | string
  memberExpire?: string | null
}
/** GET /member/plans 原始项 */
interface RawMemberPlan {
  level?: string
  name?: string
  price?: number | string
  benefits?: string[]
}

// ============ 钱包适配（后端 users/wallet/* 真实结构 → 前端类型）============
/** ISO/日期 → 'YYYY-MM-DD HH:mm'（交易记录页按此切片做月份过滤/分组，格式不可变） */
function formatDateTime(v: string | number | Date): string {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const _txCatTitle: Record<WalletTxCategory, string> = {
  purchase: '消费支出', refund: '退款到账', reward: '奖励收入',
  recharge: '充值', withdraw: '提现', transfer: '转账', other: '账户变动',
}
/** 后端 VirtualCoinTransaction → 前端 WalletTxRecord（收支按 amountCoin 正负，类别按 scene 关键词归类，无则 other） */
function adaptWalletTx(t: RawWalletTx): WalletTxRecord {
  const amt = Number(t.amountCoin ?? t.amount ?? 0)
  const scene = String(t.scene ?? '').toLowerCase()
  const category: WalletTxCategory =
    scene.includes('recharge') ? 'recharge'
      : scene.includes('withdraw') ? 'withdraw'
        : scene.includes('refund') ? 'refund'
          : (scene.includes('reward') || scene.includes('gift') || scene.includes('sign') || scene.includes('checkin')) ? 'reward'
            : scene.includes('transfer') ? 'transfer'
              : (scene.includes('order') || scene.includes('purchase') || scene.includes('consume') || scene.includes('buy') || scene.includes('pay')) ? 'purchase'
                : 'other'
  return {
    id: String(t.id),
    type: amt >= 0 ? 'income' : 'expense',
    category,
    title: t.description || _txCatTitle[category],
    description: t.description || '',
    amount: amt,
    balance: Number(t.balanceAfter ?? t.balance ?? 0),
    createdAt: formatDateTime(t.createdAt),
    orderNo: t.refId || undefined,
  }
}
/** 后端已存收款账户 accountInfo(Record) → 前端 WithdrawAccount（缺 method 时按字段推断） */
function adaptSavedAccount(a: RawSavedAccount): WithdrawAccount {
  const method: WithdrawMethod = a?.method || (a?.bankAccount || a?.bankName ? 'bank' : 'alipay')
  return { method, ...(a || {}) }
}

// ============ 个人资料 / 安全 / 历史 / 黑名单 / 青少年 / 反馈 适配 ============

/** 手机号脱敏：138****8888 */
function maskPhone(p?: string | null): string {
  if (!p) return ''
  const s = String(p)
  if (s.length < 7) return s
  return s.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}
/** 邮箱脱敏：u***@example.com */
function maskEmail(e?: string | null): string {
  if (!e) return ''
  const [name, domain] = String(e).split('@')
  if (!domain) return String(e)
  return `${name.slice(0, 1)}***@${domain}`
}

/** 当前用户资料（来源 /auth/me，脱敏用于展示，phoneFull 用于发码） */
export interface MineProfileData {
  phone: string
  phoneFull: string
  email: string
  nickname: string
  avatar: string
  bio: string
  gender?: number
  birthday: string
  interests: string[]
  identityVerified: boolean
  paymentPasswordSet: boolean
}
function adaptProfile(me: RawMe): MineProfileData {
  return {
    phone: maskPhone(me?.phone),
    phoneFull: me?.phone || '',
    email: maskEmail(me?.email),
    nickname: me?.nickname || '',
    avatar: me?.avatar || '',
    bio: me?.bio || '',
    gender: me?.gender ?? undefined,
    birthday: me?.birthday ? String(me.birthday).slice(0, 10) : '',
    interests: Array.isArray(me?.interestCategories) ? me.interestCategories : [],
    identityVerified: !!me?.identityVerified,
    paymentPasswordSet: !!me?.paymentPasswordSet,
  }
}

/** 后端 BrowseHistory.targetType → 前端 HistoryItemType（未知归 article） */
function adaptHistoryType(t: string): HistoryItemType {
  const k = String(t || '').toLowerCase()
  if (k === 'course') return 'course'
  if (k === 'video') return 'video'
  if (k === 'live') return 'live'
  if (k === 'product') return 'product'
  if (k === 'circle' || k === 'post') return 'circle'
  return 'article'
}
/** 浏览历史日期分组标签 */
function historyDateLabel(d: Date): { date: string; label: string } {
  const p = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`
  const yest = new Date(today.getTime() - 86400000)
  const yestStr = `${yest.getFullYear()}-${p(yest.getMonth() + 1)}-${p(yest.getDate())}`
  let label = `${d.getMonth() + 1}月${d.getDate()}日`
  if (date === todayStr) label = '今天'
  else if (date === yestStr) label = '昨天'
  return { date, label }
}
/** 后端 BrowseHistory[] → 前端按日期分组的 HistoryGroup[] */
function adaptHistory(items: RawBrowseHistory[]): HistoryGroup[] {
  const map = new Map<string, HistoryGroup>()
  for (const it of items) {
    const created = new Date(it.createdAt)
    const { date, label } = historyDateLabel(created)
    const p = (n: number) => String(n).padStart(2, '0')
    const viewedAt = `${p(created.getHours())}:${p(created.getMinutes())}`
    const item: HistoryItem = {
      id: String(it.id),
      type: adaptHistoryType(it.targetType),
      title: it.title || '',
      cover: it.cover || undefined,
      viewedAt,
    }
    if (!map.has(date)) map.set(date, { date, label, items: [] })
    map.get(date)!.items.push(item)
  }
  return [...map.values()]
}

/** 后端 Blacklist 项 → 前端 BlacklistItem */
function adaptBlacklist(b: RawBlacklist): BlacklistItem {
  const u = b.blockedUser ?? {}
  return {
    // b.id 后端为数字主键，非数字时原样回退（宽松值塞进 number 字段，保留 as any 不破坏运行时）
    id: Number.isFinite(+b.id) ? +b.id : (b.id as any),
    userId: u.id ?? b.blockedUserId,
    nickname: u.nickname || '未知用户',
    avatar: u.avatar || AVATAR(String(u.id || b.id)),
    blockedAt: b.createdAt ? String(b.createdAt).slice(0, 10) : '',
  }
}


/** 后端 Feedback 记录 → 前端 HistoryFeedbackItem（后端无独立 title，取内容首行） */
function adaptFeedbackHistory(f: RawFeedback): HistoryFeedbackItem {
  const content = f.content || ''
  const firstLine = content.split('\n')[0]
  const title = firstLine.length > 20 ? `${firstLine.slice(0, 20)}…` : (firstLine || '反馈')
  return {
    // f.id 后端为数字主键，非数字时原样回退（宽松值塞进 number 字段，保留 as any 不破坏运行时）
    id: Number.isFinite(+f.id) ? +f.id : (f.id as any),
    type: f.type || 'other',
    title,
    content,
    time: f.createdAt ? String(f.createdAt).slice(0, 10) : '',
    status: f.status || 'pending',
    reply: f.reply ?? null,
  }
}

// ============ 互动（点赞/评论/收到的评论）适配 ============
/** ISO/日期 → 'YYYY-MM-DD'（点赞列表只显示到日） */
function formatDate(v: string | number | Date): string {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
/** 后端 targetType/type → 前端点赞类型（POST/CIRCLE_POST→circle_post，未知归 article） */
function normLikeType(t?: string): LikeTargetType {
  const k = String(t || '').toLowerCase()
  if (k === 'post' || k === 'circle_post') return 'circle_post'
  if (['article', 'course', 'video', 'product', 'question', 'answer', 'comment'].includes(k)) return k as LikeTargetType
  return 'article'
}
/** 后端 targetType/type → 前端评论类型（评论目标无 comment/answer，未知归 article） */
function normCommentType(t?: string): CommentTargetType {
  const k = String(t || '').toLowerCase()
  if (k === 'post' || k === 'circle_post') return 'circle_post'
  if (['article', 'course', 'video', 'product', 'question'].includes(k)) return k as CommentTargetType
  return 'article'
}
/** 后端点赞项（含 target 多态详情，已删为 null）→ 前端 LikeItem */
function adaptLike(it: RawLike): LikeItem {
  const tgt = it.target
  const type = normLikeType(tgt?.type ?? it.targetType)
  if (tgt) {
    return {
      id: it.id,
      createdAt: formatDate(it.createdAt),
      target: {
        id: tgt.id,
        type,
        title: tgt.title || '内容已删除',
        author: tgt.author ? { nickname: tgt.author.nickname || '', avatar: tgt.author.avatar || AVATAR(String(tgt.id)) } : undefined,
      },
    }
  }
  // 目标已删除：诚实降级
  return { id: it.id, createdAt: formatDate(it.createdAt), target: { id: it.targetId, type, title: '内容已删除' } }
}
/** 后端我的评论项（含 target/replyCount/hasReply）→ 前端 MyCommentItem */
function adaptMyComment(it: RawComment): MyCommentItem {
  const tgt = it.target
  const type = normCommentType(tgt?.type ?? it.targetType)
  return {
    id: it.id,
    content: it.content || '',
    createdAt: formatDateTime(it.createdAt),
    likeCount: Number(it.likeCount ?? 0),
    replyCount: Number(it.replyCount ?? 0),
    hasReply: !!it.hasReply,
    target: tgt
      ? { id: tgt.id, type, title: tgt.title || '内容已删除', cover: tgt.cover || undefined }
      : { id: it.targetId, type, title: '内容已删除' },
  }
}
/** 后端收到的评论项（含 user/target/isReplied/myReply）→ 前端 ReceivedCommentItem */
function adaptReceivedComment(it: RawReceivedComment): ReceivedCommentItem {
  const tgt = it.target
  const type = normCommentType(tgt?.type ?? it.targetType)
  return {
    id: it.id,
    content: it.content || '',
    createdAt: formatDateTime(it.createdAt),
    isReplied: !!it.isReplied,
    // 后端无评论者等级 → level 省略，页面 v-if 降级隐藏
    commenter: { nickname: it.user?.nickname || '匿名用户', avatar: it.user?.avatar || AVATAR(String(it.userId || it.id)) },
    myContent: tgt
      ? { id: tgt.id, type, title: tgt.title || '内容已删除' }
      : { id: it.targetId, type, title: '内容已删除' },
    myReply: it.myReply ? { content: it.myReply.content || '', createdAt: formatDateTime(it.myReply.createdAt) } : undefined,
  }
}

/* ============================================================
   个人中心二级页（课程/收藏/关注/通知/会员）真连数据层
   ============================================================ */

/* —— 我的课程 —— */
export interface MyCourseItem {
  id: string
  title: string
  cover: string
  instructor: string
  totalLessons: number
  completedLessons: number
  progressPercent: number
  status: 'learning' | 'completed'
  lastStudyAt?: string
  lastLesson?: string
}
export interface MyCoursesResult {
  courses: MyCourseItem[]
  streak: number
  learningCount: number
  completedCount: number
}

/* —— 收藏 —— */
export type FavType = 'course' | 'article' | 'video' | 'product' | 'circle_post' | 'comment' | 'poem' | 'classic' | 'ebook'
export interface FavItem {
  id: string
  targetType: string
  targetId: string
  type: FavType
  title: string
  subtitle: string
  cover: string
  collectedAt: string
  isInvalid: boolean
}

/* —— 我的笔记（跨模块聚合：古籍读书笔记 + 电子书笔记） —— */
export type NoteSource = 'classic' | 'ebook'
export interface NoteItem {
  id: string
  source: NoteSource
  sourceName: string   // 古籍 / 电子书
  bookId: string       // 用于跳转对应阅读/详情
  bookTitle: string
  chapter: string
  content: string
  updatedAt: string
}

/* —— 关注/粉丝 —— */
export interface FollowUserItem {
  id: string
  name: string
  avatar: string
  isFollowing: boolean
  isFollowedBy: boolean
}

/* —— 通知 —— */
export type NotifyKind = 'interaction' | 'system' | 'income' | 'transaction' | 'service'
export interface NotifyItem {
  id: string
  kind: NotifyKind
  category: string
  title: string
  content: string
  time: string
  isRead: boolean
  link: string
}

/* —— 会员权益（仅平台VIP，圈子/分站/研究院属独立子系统） —— */
export interface MembershipItem {
  id: string
  name: string
  level: string
  startDate: string
  expireDate: string
  daysLeft: number
  isLifetime: boolean
  status: 'active' | 'expiring' | 'expired'
  price: number
  benefits: string[]
}

/* —— 收藏适配（target-resolver 已补全多态详情，目标已删 target=null 降级） —— */
const _favTypeName: Record<string, string> = {
  course: '课程', article: '文章', video: '视频', product: '商品', circle_post: '帖子', comment: '评论',
}
function adaptFavorite(it: RawFavorite): FavItem {
  const tgt = it.target
  const rawType = String(tgt?.type ?? it.targetType ?? '').toLowerCase()
  const type = (['course', 'article', 'video', 'product', 'circle_post', 'comment'].includes(rawType) ? rawType : 'article') as FavType
  return {
    id: String(it.id),
    targetType: it.targetType,
    targetId: String(it.targetId),
    type,
    title: tgt?.title || '内容已删除',
    subtitle: tgt?.author?.nickname || _favTypeName[type] || '',
    cover: tgt?.cover || '',
    collectedAt: formatDate(it.createdAt),
    isInvalid: !tgt,
  }
}

/* —— 诗词/古籍/电子书收藏适配（各自独立收藏表·统一并入"我的收藏"展示） —— */
/** 古籍收藏项（GET /classic/favorites → items[]） */
function adaptClassicFav(b: { id: string; title?: string; author?: string; dynasty?: string; addedAt?: string }): FavItem {
  return {
    id: `classic_${b.id}`, targetType: 'CLASSIC', targetId: String(b.id), type: 'classic',
    title: b.title || '古籍', subtitle: [b.author, b.dynasty].filter(Boolean).join(' · ') || '古籍',
    cover: '', collectedAt: formatDate(b.addedAt ?? ''), isInvalid: false,
  }
}

/* —— 通知适配（后端 type → 前端 kind/category/跳转） —— */
function relativeTime(v: string | number | Date): string {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  const day = Math.floor(h / 24)
  if (day < 30) return `${day}天前`
  return formatDate(v)
}
const _notifyMeta: Record<string, { kind: NotifyKind; category: string }> = {
  COMMENT: { kind: 'interaction', category: '评论' },
  LIKE: { kind: 'interaction', category: '点赞' },
  FOLLOW: { kind: 'interaction', category: '关注' },
  SYSTEM: { kind: 'system', category: '系统通知' },
  AUDIT: { kind: 'system', category: '审核通知' },
  PURCHASE: { kind: 'transaction', category: '订单' },
  EARNING: { kind: 'income', category: '收益' },
}
function notifyLink(targetType?: string | null, targetId?: string | null): string {
  if (!targetType || !targetId) return ''
  const t = String(targetType).toLowerCase()
  const map: Record<string, string> = {
    article: `/article/${targetId}`, course: `/course/${targetId}`,
    video: `/video/${targetId}`, product: `/shop/product/${targetId}`,
    post: `/post/${targetId}`, circle_post: `/post/${targetId}`,
    circle: `/circle/${targetId}`, order: `/orders/${targetId}`, live: `/live/${targetId}`,
    station: '/pkg-operator/station-home/index',
    report: `/report/result/${targetId}`,
  }
  return map[t] || ''
}
function adaptNotification(n: RawNotification): NotifyItem {
  const meta = _notifyMeta[String(n.type || '').toUpperCase()] || { kind: 'system' as NotifyKind, category: '通知' }
  return {
    id: String(n.id),
    kind: meta.kind,
    category: meta.category,
    title: n.title || '',
    content: n.content || '',
    time: relativeTime(n.createdAt),
    isRead: !!n.isRead,
    link: notifyLink(n.targetType, n.targetId),
  }
}

// ============ API 层 ============

export const mineApi = {
  /** 获取当前用户资料 —— GET /auth/me（脱敏展示 + phoneFull 供发码） */
  async getProfile(): Promise<MineProfileData> {
    const me = await apiGet<RawMe>('/auth/me')
    return adaptProfile(me)
  },

  /** 更新用户资料 —— PUT /users/profile（nickname/avatar/bio/gender/兴趣品类） */
  async updateProfile(_data: { nickname?: string; avatar?: string; bio?: string; gender?: number; interestCategories?: string[]; interestGuideCompleted?: true }): Promise<AccountInterestState & { nickname?: string; avatar?: string; bio?: string }> {
    return await apiPut('/users/profile', _data)
  },

  /** 获取设置通知项 —— GET /users/notify-settings（后端真返 [{key,label,icon,value}]） */
  async getNotifySettings(): Promise<SettingNotifyItem[]> {
    return await apiGet<SettingNotifyItem[]>('/users/notify-settings')
  },

  /** 更新单项通知开关 —— PUT /users/notify-settings（后端按 {key,value} 单项合并） */
  async updateNotifySetting(_key: string, _value: boolean): Promise<boolean> {
    await apiPut('/users/notify-settings', { key: _key, value: _value })
    return true
  },

  /** 获取账号安全项 —— /auth/me + /auth/devices 真实数据组装（后端无聚合端点，无的字段诚实降级） */
  async getSecurityItems(): Promise<{ login: SecurityItem[]; payment: SecurityItem[]; device: SecurityItem[]; score: { label: string; done: boolean }[] }> {
    const [me, devices] = await Promise.all([
      apiGet<RawMe>('/auth/me'),
      apiGet<unknown[]>('/auth/devices').catch(() => [] as unknown[]),
    ])
    const hasPhone = !!me?.phone
    const hasEmail = !!me?.email
    const paySet = !!me?.paymentPasswordSet
    const verified = !!me?.identityVerified
    const login: SecurityItem[] = [
      { id: 'password', icon: 'key', iconBg: '#3b82f6', label: '登录密码', value: '定期修改更安全', status: 'set', href: '/mine/change-password' },
      { id: 'phone', icon: 'smartphone', iconBg: '#22c55e', label: '手机号码', value: hasPhone ? maskPhone(me.phone) : '未绑定', status: hasPhone ? 'set' : 'unset', href: '/mine/change-phone' },
    ]
    if (hasEmail) {
      login.push({ id: 'email', icon: 'mail', iconBg: '#f97316', label: '邮箱绑定', value: maskEmail(me.email), status: 'set', href: '/mine/bind-accounts' })
    }
    const payment: SecurityItem[] = [
      { id: 'pay-password', icon: 'credit-card', iconBg: '#a855f7', label: '支付密码', status: paySet ? 'set' : 'unset', href: '/mine/payment-password' },
      // 🔴 原 href 指向 /mine/security（本页自己）→ 点了原地跳回，实名永远做不了；后端 identity 模块整套是好的
      { id: 'real-name', icon: 'shield', iconBg: '#C41E3A', label: '实名认证', status: verified ? 'verified' : 'unverified', href: '/mine/verification' },
    ]
    const deviceCount = Array.isArray(devices) ? devices.length : 0
    const device: SecurityItem[] = [
      // 无独立设备管理页，此行仅展示数量（原 href 同样指回本页）
      { id: 'devices', icon: 'monitor', iconBg: '#64748b', label: '登录设备管理', value: `${deviceCount} 台设备已登录`, href: '' },
    ]
    const score = [
      { label: '密码', done: true },
      { label: '手机', done: hasPhone },
      { label: '邮箱', done: hasEmail },
      { label: '支付', done: paySet },
      { label: '实名', done: verified },
    ]
    return { login, payment, device, score }
  },

  /** 修改登录密码 —— PUT /auth/password（失败抛错，页面 catch 提示） */
  async changePassword(_oldPwd: string, _newPwd: string): Promise<{ success: boolean; message: string }> {
    await apiPut('/auth/password', { oldPassword: _oldPwd, newPassword: _newPwd })
    return { success: true, message: '密码修改成功' }
  },

  /** 发送短信验证码 —— POST /auth/sms/send（换手机号场景需带 scene） */
  async sendPhoneCode(_phone: string, _scene: string): Promise<boolean> {
    await apiPost('/auth/sms/send', { phone: _phone, scene: _scene })
    return true
  },

  /** 更换手机号 —— PUT /auth/phone（旧号验证码 + 新号 + 新号验证码，后端一次性校验） */
  async changePhone(_oldCode: string, _newPhone: string, _newCode: string): Promise<{ success: boolean; message: string }> {
    await apiPut('/auth/phone', { oldCode: _oldCode, newPhone: _newPhone, newCode: _newCode })
    return { success: true, message: '手机号修改成功' }
  },

  /** 获取绑定账号列表 —— GET /users/bound-accounts（后端真返 {provider,name,color,isBound,accountInfo,boundAt}） */
  async getBoundAccounts(): Promise<BoundAccount[]> {
    return await apiGet<BoundAccount[]>('/users/bound-accounts')
  },

  /** 解绑第三方账号 —— DELETE /users/bound-accounts/:provider；绑定走 OAuth 后端暂无简单端点→诚实降级抛错 */
  async toggleBind(_provider: string, _bind: boolean): Promise<boolean> {
    if (_bind) {
      throw new Error('第三方账号绑定即将开放')
    }
    await apiDelete(`/users/bound-accounts/${_provider}`)
    return true
  },

  /** 获取黑名单 —— GET /users/blacklist/list（后端 {items:[{id,blockedUser}]} → 适配） */
  async getBlacklist(): Promise<BlacklistItem[]> {
    const res = await apiGet<{ items?: RawBlacklist[] } | RawBlacklist[]>('/users/blacklist/list')
    const list = Array.isArray(res) ? res : (res?.items ?? [])
    return list.map(adaptBlacklist)
  },

  /** 移出黑名单 —— DELETE /users/:id/block（:id 为被拉黑用户ID） */
  async unblockUser(_userId: number | string): Promise<boolean> {
    await apiDelete(`/users/${_userId}/block`)
    return true
  },

  /** 拉黑用户 —— POST /users/:id/block */
  async blockUser(_userId: number | string): Promise<boolean> {
    await apiPost(`/users/${_userId}/block`, {})
    return true
  },



  /** 注销账号信息 —— GET /users/delete-account/info（脱敏手机号 + 原因 + 影响数据 + 真实资产） */
  async getDeleteAccountInfo(): Promise<{
    phone: string
    reasons: { id: string; label: string }[]
    dataItems: { icon: string; label: string; color: string }[]
    assets: { balance: number; points: number; coupons: number; memberDays: number }
  }> {
    const r = await apiGet<RawDeleteAccountInfo>('/users/delete-account/info')
    return {
      phone: r?.phone || '',
      reasons: Array.isArray(r?.reasons) ? r.reasons : deleteAccountReasons,
      dataItems: Array.isArray(r?.dataItems) ? r.dataItems : deleteAccountDataItems,
      assets: {
        balance: Number(r?.assets?.balance ?? 0),
        points: Number(r?.assets?.points ?? 0),
        coupons: Number(r?.assets?.coupons ?? 0),
        memberDays: Number(r?.assets?.memberDays ?? 0),
      },
    }
  },

  /** 申请注销账号 —— POST /auth/delete-account（需登录密码 + 原因，进入7天冷静期） */
  async deleteAccount(_password: string, _reason?: string): Promise<{ success: boolean; message: string }> {
    await apiPost('/auth/delete-account', { password: _password, reason: _reason })
    return { success: true, message: '注销申请已提交' }
  },

  /** 数据导出类型目录（说明性静态配置，非用户数据） */
  async getExportTypes(): Promise<typeof exportDataTypes> {
    return exportDataTypes
  },

  /** 即时生成当前登录账号的个人数据包（后端字段白名单，60 秒长请求预算） */
  async requestExport(typeIds: string[]): Promise<PersonalDataExportPackage> {
    return apiPost<PersonalDataExportPackage>('/users/me/data-export', { types: typeIds }, undefined, 60000)
  },

  /** 获取钱包信息 —— GET /users/wallet/balance（后端返回币/积分/累计；会员等级属成长体系不在此接口→0，页面降级隐藏） */
  async getWallet(): Promise<WalletInfo> {
    // 防 data:null —— 接口返回 { data: null } 时 apiGet 会给到 null，直接读 b.coin 裸崩 TypeError
    const b = (await apiGet<{ coin?: number; points?: number; frozen?: number; totalRecharged?: number; totalSpent?: number }>('/users/wallet/balance')) ?? {}
    return {
      balance: Number(b.coin ?? 0),
      rmb: 0,
      level: 0,
      growthValue: 0,
      nextLevelGrowth: 1,
      points: Number(b.points ?? 0),
      // 冻结币透传：后端一直有返回、前端原来丢弃 → 用户看到「余额变少」却查不到钱在哪
      frozen: Number(b.frozen ?? 0),
      // 🔴 totalRecharged/totalSpent 是币数（VirtualCoinAccount 整数币），不是人民币，展示端不得加 ¥
      totalRecharge: Number(b.totalRecharged ?? 0),
      totalSpent: Number(b.totalSpent ?? 0),
    }
  },

  /** 获取充值选项 —— GET /users/wallet/recharge-options（后端 {amountRmb,amountCoin,bonus} → 前端 {coins,price,bonus}） */
  async getRechargeOptions(): Promise<RechargeOption[]> {
    const res = await apiGet<RawRechargeOption[]>('/users/wallet/recharge-options')
    const list = Array.isArray(res) ? res : []
    return list.map((t: RawRechargeOption, i: number) => ({
      coins: Number(t.amountCoin ?? t.coins ?? 0),
      price: Number(t.amountRmb ?? t.price ?? 0),
      bonus: Number(t.bonus ?? 0),
      popular: i === 2,
    }))
  },

  /** 充值页配置：服务端同时返回营销档位和自定义充值权威汇率。 */
  async getRechargeConfig(): Promise<{ options: RechargeOption[]; coinRate: number }> {
    const res = await apiGet<{ tiers?: RawRechargeOption[]; coinRate?: number }>('/users/wallet/recharge-config')
    const tiers = Array.isArray(res?.tiers) ? res.tiers : []
    const options = tiers.map((t: RawRechargeOption, i: number) => ({
      coins: Number(t.amountCoin ?? t.coins ?? 0),
      price: Number(t.amountRmb ?? t.price ?? 0),
      bonus: Number(t.bonus ?? 0),
      popular: i === 2,
    }))
    const coinRate = Number(res?.coinRate)
    if (!Number.isFinite(coinRate) || coinRate <= 0) throw new Error('充值汇率配置异常，请稍后重试')
    return { options, coinRate }
  },

  /** 微信 JSAPI 充值下单（小程序或公众号内 H5）。 */
  async rechargeWechat(amountCoin: number, opts?: { openid?: string; channel?: 'MINI' | 'OFFICIAL' }): Promise<RechargePaymentResult & { payParams: WechatPayParams }> {
    return await apiPost<RechargePaymentResult & { payParams: WechatPayParams }>('/shop/recharge/jsapi', {
      amountCoin,
      ...(opts?.openid ? { openid: opts.openid } : {}),
      ...(opts?.channel ? { channel: opts.channel } : {}),
    })
  },

  /** 微信外部浏览器 H5 充值下单，返回 mweb_url。 */
  async rechargeWechatH5(amountCoin: number): Promise<RechargePaymentResult & { mwebUrl: string }> {
    return await apiPost<RechargePaymentResult & { mwebUrl: string }>('/shop/recharge/h5', { amountCoin })
  },

  /** 查询本人充值到账状态（支付回跳后轮询）。 */
  async getRechargePaymentStatus(orderNo: string): Promise<RechargePaymentStatus> {
    return await apiGet<RechargePaymentStatus>(`/shop/recharge/${encodeURIComponent(orderNo)}/payment-status`)
  },

  /**
   * 获取交易记录（服务端分页）—— GET /users/wallet/transactions?page=&pageSize=[&type=][&month=]
   * 后端返回 { transactions, total, page, pageSize }。
   * 🔴 后端查证（wallet.controller:22-37 + coin.service.getTransactions:242）：
   *   - page/pageSize 真分页可用；
   *   - type 是 CoinTransType 枚举（RECHARGE/SPEND/REFUND/GRANT/INCOME），不是前端的 income/expense——
   *     「支出」可精确映射 type=SPEND；「收入」是 4 个枚举的并集，单值参数表达不了，只能客户端过滤；
   *   - month 参数 controller 收了但 wallet.service:57 没往下传（服务端月份过滤是后端缺口），
   *     这里仍然拼上（契约已声明、后端补上即生效），客户端过滤兜底。
   */
  async getTransactions(opts?: { page?: number; pageSize?: number; type?: string; month?: string }): Promise<{ list: WalletTxRecord[]; total: number }> {
    const page = opts?.page || 1
    const pageSize = opts?.pageSize || 20
    const qs = [`page=${page}`, `pageSize=${pageSize}`]
    if (opts?.type) qs.push(`type=${encodeURIComponent(opts.type)}`)
    if (opts?.month) qs.push(`month=${encodeURIComponent(opts.month)}`)
    const res = await apiGet<{ transactions?: RawWalletTx[]; total?: number } | RawWalletTx[]>(`/users/wallet/transactions?${qs.join('&')}`)
    const list = Array.isArray(res) ? res : (res?.transactions ?? [])
    const total = Array.isArray(res) ? list.length : Number(res?.total ?? list.length)
    return { list: list.map(adaptWalletTx), total }
  },

  /** 获取提现信息 —— GET /users/wallet/withdraw-info（冻结/在途后端无→0，页面降级；savedAccounts 适配；
   *  taxEnabled/taxRate 透传：后台开了代扣代缴时前端预览不算税=到账金额虚高，属资金口径错误） */
  async getWithdrawInfo(): Promise<WithdrawBalanceInfo> {
    const r = await apiGet<RawWithdrawInfo>('/users/wallet/withdraw-info')
    return {
      availableBalance: Number(r.availableBalance ?? 0),
      frozenBalance: 0,
      pendingBalance: 0,
      minWithdraw: Number(r.minWithdraw ?? 100),
      maxWithdraw: Number(r.maxWithdraw ?? 50000),
      feeRate: Number(r.feeRate ?? 0.006),
      minFee: Number(r.minFee ?? 1),
      taxEnabled: !!r.taxEnabled,
      taxRate: Number(r.taxRate ?? 0),
      savedAccounts: Array.isArray(r.savedAccounts) ? r.savedAccounts.map(adaptSavedAccount) : [],
    }
  },

  /** 收益转金币 —— POST /users/wallet/convert-to-coin（可提现余额→金币·1元=10币·单向不可逆·董事长拍板2026-07-10） */
  async convertToCoin(amountRmb: number): Promise<{ amountRmb: number; amountCoin: number }> {
    return apiPost<{ amountRmb: number; amountCoin: number }>('/users/wallet/convert-to-coin', { amountRmb })
  },

  /** 申请提现 —— POST /users/wallet/withdraw（后端校验可提现余额/门槛100-50000/并发锁）。
   *  🔴 后端响应（wallet.service.submitWithdraw:307）带权威金额 {amount,fee,taxAmount,actualAmount}（含税快照），
   *  必须透传给成功页展示——前端本地公式只是预览，落库口径以后端为准。 */
  async withdraw(_amount: number, _method: string, _account: string | Record<string, string>): Promise<{
    success: boolean; message: string; amount?: number; fee?: number; taxAmount?: number; actualAmount?: number
  }> {
    try {
      const res = await apiPost<{ amount?: number | string; fee?: number | string; taxAmount?: number | string; actualAmount?: number | string }>(
        '/users/wallet/withdraw', { amount: _amount, method: _method, account: _account },
      )
      return {
        success: true,
        message: '提现申请已提交',
        amount: res?.amount != null ? Number(res.amount) : undefined,
        fee: res?.fee != null ? Number(res.fee) : undefined,
        taxAmount: res?.taxAmount != null ? Number(res.taxAmount) : undefined,
        actualAmount: res?.actualAmount != null ? Number(res.actualAmount) : undefined,
      }
    } catch (e: any) { return { success: false, message: e?.message || '提现失败' } }
  },

  /** 我的提现记录 —— GET /users/wallet/withdrawals（needConfirm=true 的要引导用户去微信确认收款） */
  async getMyWithdrawals(page = 1, pageSize = 20): Promise<{ list: WithdrawRecord[]; total: number }> {
    // apiGet 第二参是 header 不是 query —— 查询串必须拼进 path
    return apiGet<{ list: WithdrawRecord[]; total: number }>(
      `/users/wallet/withdrawals?page=${page}&pageSize=${pageSize}`,
    )
  },

  /**
   * 查我的待确认转账 —— GET /payout/my/:id/confirm
   * 🔴 微信商家转账不是无感到账：不点「确认收款」，钱永远不到账（超时自动退回）。
   */
  async getTransferConfirm(applicationId: string): Promise<TransferConfirmInfo> {
    return apiGet<TransferConfirmInfo>(`/payout/my/${applicationId}/confirm`)
  },

  /**
   * 调起微信「确认收款」页（仅小程序可用）。
   * wx.requestMerchantTransfer 是小程序 API —— H5/APP 调不了，只能引导用户去小程序确认。
   */
  async confirmWechatTransfer(packageInfo: string): Promise<{ success: boolean; message: string }> {
    // #ifdef MP-WEIXIN
    return new Promise((resolve) => {
      // 走 globalThis 取，避免 vue-tsc 在非小程序端找不到全局 wx 声明
      const wxAny = (globalThis as any).wx
      if (!wxAny?.requestMerchantTransfer) {
        resolve({ success: false, message: '当前微信版本过低，请升级微信后再确认收款' })
        return
      }
      wxAny.requestMerchantTransfer({
        mchId: import.meta.env.VITE_WECHAT_MCH_ID || '',
        appId: import.meta.env.VITE_WECHAT_APP_ID || '',
        package: packageInfo,
        success: () => resolve({ success: true, message: '已确认收款' }),
        fail: (err: any) => resolve({ success: false, message: err?.errMsg || '确认收款失败' }),
      })
    })
    // #endif
    // #ifndef MP-WEIXIN
    return { success: false, message: '请在微信小程序内打开并确认收款' }
    // #endif
  },

  /** 验证支付密码 —— POST /users/me/payment-password/verify（后端 bcrypt 校验 + 连续错误锁定30分钟） */
  async verifyPaymentPassword(_password: string): Promise<{ success: boolean; message?: string }> {
    try {
      await apiPost('/users/me/payment-password/verify', { password: _password })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e?.message || '支付密码验证失败' }
    }
  },

  /** 设置支付密码（首次） —— POST /users/me/payment-password（6位数字 + 短信码） */
  async setPaymentPassword(_password: string, _smsCode: string): Promise<{ success: boolean; message?: string }> {
    try {
      await apiPost('/users/me/payment-password', { password: _password, smsCode: _smsCode })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e?.message || '设置失败' }
    }
  },

  /** 修改支付密码 —— POST /users/me/payment-password/update（后端校验旧密码 + 爆破锁定） */
  async updatePaymentPassword(_oldPassword: string, _newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      await apiPost('/users/me/payment-password/update', { oldPassword: _oldPassword, newPassword: _newPassword })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e?.message || '修改失败' }
    }
  },

  /** 重置支付密码 —— POST /users/me/payment-password/reset（短信验证后设新密码） */
  async resetPaymentPassword(_newPassword: string, _smsCode: string): Promise<{ success: boolean; message?: string }> {
    try {
      await apiPost('/users/me/payment-password/reset', { newPassword: _newPassword, smsCode: _smsCode })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e?.message || '重置失败' }
    }
  },

  /** 获取积分信息 */
  async getPoints(): Promise<PointsInfo> {
    try { return await apiGet<PointsInfo>('/users/me/points') } catch { return pointsInfo }
  },

  /** 获取成长值 */
  async getGrowth(): Promise<GrowthInfo> {
    try { return await apiGet<GrowthInfo>('/users/me/growth') } catch { return growthInfo }
  },

  /** 获取积分记录 */
  async getPointsRecords(): Promise<PointsRecord[]> {
    try { return await apiGet<PointsRecord[]>('/users/me/points/records') } catch { return pointsRecords }
  },

  /** 获取浏览历史 —— GET /users/history（后端 {items:BrowseHistory[]} → 按日期分组适配） */
  async getHistory(): Promise<HistoryGroup[]> {
    const res = await apiGet<{ items?: RawBrowseHistory[] } | RawBrowseHistory[]>('/users/history?page=1&pageSize=50')
    const list = Array.isArray(res) ? res : (res?.items ?? [])
    return adaptHistory(list)
  },

  /** 清空当前用户全部浏览历史 —— DELETE /users/me/history（后端按登录用户隔离） */
  async clearHistory(): Promise<void> {
    await apiDelete('/users/me/history')
  },

  /** 获取我的点赞 —— GET /users/me/likes（后端 {items} 含多态 target 详情 → 适配，目标已删降级） */
  async getMyLikes(_filter?: string): Promise<LikeItem[]> {
    const res = await apiGet<{ items?: RawLike[] } | RawLike[]>('/users/me/likes?page=1&pageSize=50')
    const list = Array.isArray(res) ? res : (res?.items ?? [])
    return list.map(adaptLike)
  },

  /** 确定性取消一条自己的点赞记录，不使用可能反向创建的 toggle。 */
  async removeMyLike(id: string | number): Promise<void> {
    await apiDelete(`/interaction/like/${encodeURIComponent(String(id))}`)
  },

  /** 获取我的评论 —— GET /users/me/comments（后端 {items} 含 target/replyCount/hasReply → 适配） */
  async getMyComments(page = 1, pageSize = 20): Promise<MyCommentItem[]> {
    const res = await apiGet<{ items?: RawComment[] } | RawComment[]>(`/users/me/comments?page=${page}&pageSize=${pageSize}`)
    const list = Array.isArray(res) ? res : (res?.items ?? [])
    return list.map(adaptMyComment)
  },

  /** 删除自己的评论（后端同时清理该评论的直接回复）。 */
  async deleteMyComment(id: string | number): Promise<void> {
    await apiDelete(`/interaction/comment/${encodeURIComponent(String(id))}`)
  },

  /** 获取收到的评论 —— GET /users/me/received-comments（后端 {items} 含 user/target/isReplied/myReply → 适配） */
  async getReceivedComments(): Promise<ReceivedCommentItem[]> {
    const res = await apiGet<{ items?: RawReceivedComment[] } | RawReceivedComment[]>('/users/me/received-comments?page=1&pageSize=50')
    const list = Array.isArray(res) ? res : (res?.items ?? [])
    return list.map(adaptReceivedComment)
  },

  /** 回复收到的评论 —— POST /interaction/comment（parentId=对方评论 id·真连替代原 setTimeout 假回复）。
   *  前端小写内容类型 → 后端大写枚举（circle_post→POST，其余直接大写） */
  replyReceivedComment(item: ReceivedCommentItem, content: string): Promise<unknown> {
    const targetType = item.myContent.type === 'circle_post' ? 'POST' : item.myContent.type.toUpperCase()
    return apiPost<unknown>('/interaction/comment', {
      targetType,
      targetId: String(item.myContent.id),
      content,
      parentId: String(item.id),
    })
  },

  /** 获取反馈类型 —— GET /users/feedback/types（后端 {types,statusConfig} → 取 types） */
  async getFeedbackTypes(): Promise<FeedbackType[]> {
    const res = await apiGet<{ types?: FeedbackType[] } | FeedbackType[]>('/users/feedback/types')
    return Array.isArray(res) ? res : (res?.types ?? [])
  },

  /** 获取历史反馈 —— GET /users/feedback/history（后端 Feedback[] 无 title → 适配） */
  async getFeedbackHistory(): Promise<HistoryFeedbackItem[]> {
    const res = await apiGet<RawFeedback[]>('/users/feedback/history')
    return Array.isArray(res) ? res.map(adaptFeedbackHistory) : []
  },

  /** 提交反馈 —— POST /users/feedback（后端 {type,content,contact?,images?}，无 title 字段） */
  async submitFeedback(_type: string, _content: string, _contact?: string, _images?: string[]): Promise<{ success: boolean; message: string }> {
    await apiPost('/users/feedback', { type: _type, content: _content, contact: _contact, images: _images })
    return { success: true, message: '反馈已提交' }
  },

  /**
   * 获取隐私授权列表
   * 客户端权限·后端无端点·诚实降级：
   * 相机/定位/麦克风等是设备级（客户端）概念，后端不存储授权状态。
   * 返回 appPermissions 静态权限说明，并叠加本地（uni storage）记录的用户授权选择。
   */
  async getPermissions(): Promise<AppPermission[]> {
    let overrides: Record<string, PermissionStatus> = {}
    try { overrides = (uni.getStorageSync(PERMISSION_STORAGE_KEY) as Record<string, PermissionStatus>) || {} } catch { overrides = {} }
    return appPermissions.map((p) => (overrides[p.id] ? { ...p, status: overrides[p.id] } : { ...p }))
  },

  /**
   * 更新隐私授权
   * 客户端权限·后端无端点·诚实降级：将用户的授权选择持久化到本地 uni storage，
   * 真实的系统级授权需用户前往设备系统设置开启（页面已提供「前往系统设置」引导）。
   */
  async updatePermission(_permissionId: string, _status: PermissionStatus): Promise<boolean> {
    try {
      const overrides: Record<string, PermissionStatus> = (uni.getStorageSync(PERMISSION_STORAGE_KEY) as Record<string, PermissionStatus>) || {}
      overrides[_permissionId] = _status
      uni.setStorageSync(PERMISSION_STORAGE_KEY, overrides)
      return true
    } catch {
      return false
    }
  },

  /** 当前登录用户ID —— GET /auth/me（关注列表等公共端点需显式 :id） */
  async getMyUserId(): Promise<string> {
    const me = await apiGet<RawMe>('/auth/me')
    return me?.id ? String(me.id) : ''
  },

  /** 我的课程 —— GET /courses/my + /courses/study-plan + /courses/dashboard 组合 */
  async getMyCourses(): Promise<MyCoursesResult> {
    const [my, plan, dash] = await Promise.all([
      apiGet<RawMyCourses>('/courses/my?page=1&pageSize=50'),
      apiGet<RawStudyPlan>('/courses/study-plan').catch(() => null),
      apiGet<RawDashboard>('/courses/dashboard').catch(() => null),
    ])
    const progressByCourse = new Map<string, { total: number; done: number }>()
    for (const c of (plan?.courses ?? [])) {
      progressByCourse.set(String(c.courseId ?? c.id), { total: Number(c.totalLessons ?? 0), done: Number(c.completedLessons ?? 0) })
    }
    const recentByCourse = new Map<string, { lastLesson?: string; lastStudyAt?: string }>()
    for (const p of (dash?.recentProgress ?? [])) {
      const cid = String(p.course?.id ?? p.courseId ?? '')
      if (cid && !recentByCourse.has(cid)) {
        recentByCourse.set(cid, { lastLesson: p.chapter?.title, lastStudyAt: p.updatedAt })
      }
    }
    // ResponseInterceptor 把后端 {courses,total,page,pageSize} 分页结构重塑为数组，
    // 故 data 运行时是数组而非 {courses}。两种形态都兼容，防止已购课程被丢弃。
    const myList: RawCourseEnrollment[] = Array.isArray(my) ? my : (my?.courses ?? [])
    const courses: MyCourseItem[] = myList
      .filter((o: RawCourseEnrollment) => o.course)
      .map((o: RawCourseEnrollment) => {
        const c = o.course! // filter 已保证 course 非空
        const prog = progressByCourse.get(String(c.id))
        const total = prog?.total ?? 0
        const done = prog?.done ?? 0
        const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
        const recent = recentByCourse.get(String(c.id))
        return {
          id: String(c.id),
          title: c.title || '',
          cover: c.cover || '',
          instructor: c.user?.nickname || '',
          totalLessons: total,
          completedLessons: done,
          progressPercent: percent,
          status: (total > 0 && done >= total ? 'completed' : 'learning') as 'learning' | 'completed',
          lastStudyAt: recent?.lastStudyAt,
          lastLesson: recent?.lastLesson,
        }
      })
    return {
      courses,
      streak: Number(plan?.streak ?? 0),
      learningCount: courses.filter((c) => c.status === 'learning').length,
      completedCount: courses.filter((c) => c.status === 'completed').length,
    }
  },

  /**
   * 我的收藏 —— 聚合来源并按收藏时间倒序：
   *   ① /interaction/collect（课程/文章/视频/商品/帖子·多态 target 已补全）
   *   ② /classic/favorites（古籍·独立收藏表）
   * 诗词/电子书模块已下线，不再聚合其收藏。各来源独立容错，空则跳过。
   */
  async getFavorites(): Promise<FavItem[]> {
    const [collectRes, classicRes] = await Promise.all([
      apiGet<{ items?: RawFavorite[] }>('/interaction/collect?page=1&pageSize=50').catch(() => null),
      apiGet<{ items?: { id: string; title?: string; author?: string; dynasty?: string; addedAt?: string }[] }>('/classic/favorites').catch(() => null),
    ])
    const rawTs = (v: unknown): number => { const d = new Date(v as string); return Number.isNaN(d.getTime()) ? 0 : d.getTime() }
    const rows: { item: FavItem; ts: number }[] = []
    for (const it of (Array.isArray(collectRes?.items) ? collectRes!.items! : [])) rows.push({ item: adaptFavorite(it), ts: rawTs(it.createdAt) })
    for (const b of (Array.isArray(classicRes?.items) ? classicRes!.items! : [])) rows.push({ item: adaptClassicFav(b), ts: rawTs(b.addedAt) })
    rows.sort((a, b) => b.ts - a.ts)
    return rows.map((r) => r.item)
  },

  /** 取消收藏 —— POST /interaction/collect（已收藏 → toggle 关闭） */
  async removeFavorite(targetType: string, targetId: string): Promise<boolean> {
    // 按来源路由到对应取消收藏端点（诗词/古籍/电子书各有独立收藏表）
    const t = String(targetType || '').toUpperCase()
    if (t === 'POEM') await apiPost(`/poetry/${targetId}/collect`)          // toggle：已收藏 → 取消
    else if (t === 'CLASSIC') await apiDelete(`/classic/favorites/${targetId}`)
    else if (t === 'EBOOK') await apiDelete(`/ebook/favorites/${targetId}`)
    else await apiPost('/interaction/collect', { targetType, targetId })    // interaction toggle
    return true
  },

  /**
   * 我的笔记 —— 古籍读书笔记，按更新时间倒序。
   * 古籍 GET /classic/notes（{items,...}）；电子书模块已下线，不再聚合其笔记。
   */
  async getNotes(): Promise<NoteItem[]> {
    const classicRes = await apiGet<{ items?: { id?: string; bookId?: string; book?: { title?: string } | null; chapter?: { title?: string } | null; content?: string; updatedAt?: string }[] }>('/classic/notes?pageSize=100').catch(() => null)
    const rawTs = (v: unknown): number => { const d = new Date(v as string); return Number.isNaN(d.getTime()) ? 0 : d.getTime() }
    const fmt = (v?: string) => String(v || '').slice(0, 16).replace('T', ' ')
    const rows: { item: NoteItem; ts: number }[] = []
    for (const n of (Array.isArray(classicRes?.items) ? classicRes!.items! : [])) {
      rows.push({ ts: rawTs(n.updatedAt), item: {
        id: `classic_${n.id}`, source: 'classic', sourceName: '古籍', bookId: n.bookId || '',
        bookTitle: n.book?.title || '古籍', chapter: n.chapter?.title || '', content: n.content || '', updatedAt: fmt(n.updatedAt),
      } })
    }
    rows.sort((a, b) => b.ts - a.ts)
    return rows.map((r) => r.item)
  },

  /** 关注与粉丝 —— GET /users/:id/following + /users/:id/followers（交叉计算互关） */
  async getFollowData(): Promise<{ following: FollowUserItem[]; followers: FollowUserItem[] }> {
    const uid = await this.getMyUserId()
    if (!uid) return { following: [], followers: [] }
    const [fg, fr] = await Promise.all([
      apiGet<RawFollowWrap>(`/users/${uid}/following?page=1&pageSize=100`),
      apiGet<RawFollowWrap>(`/users/${uid}/followers?page=1&pageSize=100`),
    ])
    const followingUsers: RawFollowUser[] = fg?.following ?? []
    const followerUsers: RawFollowUser[] = fr?.followers ?? []
    const followingIds = new Set(followingUsers.map((u) => String(u.id)))
    const followerIds = new Set(followerUsers.map((u) => String(u.id)))
    const following: FollowUserItem[] = followingUsers.map((u) => ({
      id: String(u.id), name: u.nickname || '用户', avatar: u.avatar || '',
      isFollowing: true, isFollowedBy: followerIds.has(String(u.id)),
    }))
    const followers: FollowUserItem[] = followerUsers.map((u) => ({
      id: String(u.id), name: u.nickname || '用户', avatar: u.avatar || '',
      isFollowing: followingIds.has(String(u.id)), isFollowedBy: true,
    }))
    return { following, followers }
  },

  /** 关注用户 —— POST /users/:id/follow */
  async followUser(_userId: string): Promise<boolean> {
    await apiPost(`/users/${_userId}/follow`, {})
    return true
  },

  /** 取消关注 —— DELETE /users/:id/follow */
  async unfollowUser(_userId: string): Promise<boolean> {
    await apiDelete(`/users/${_userId}/follow`)
    return true
  },

  /** 通知列表 —— GET /notifications
   * 🔴 防御性清洗：后端曾把「依赖降级/熔断/监控巡检」等内部运维通知也写进用户通知流，
   *    对 C 端是看不懂的技术黑话且会刷屏。此处：① 过滤内部运维通知 ② 按标题+正文去重。
   *    根治需后端不向 C 端用户投递此类系统内部通知（见交接说明）。 */
  async getNotifications(): Promise<NotifyItem[]> {
    const res = await apiGet<{ notifications?: RawNotification[] }>('/notifications?page=1&pageSize=50')
    const list = Array.isArray(res?.notifications) ? res!.notifications! : []
    const OPS_PATTERN = /(依赖降级|服务降级|降级通知|熔断|限流|监控告警|健康检查|巡检|运维|mock|超时告警|回源失败|接口异常告警)/i
    const seen = new Set<string>()
    return list
      .map(adaptNotification)
      .filter((n) => !OPS_PATTERN.test(`${n.title} ${n.content}`)) // 剔除内部运维/技术黑话通知
      .filter((n) => {
        const key = `${n.title}|${n.content}` // 同标题+正文视为重复，仅保留首条
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  },

  /** 标记单条通知已读 —— PUT /notifications/:id/read */
  async markNotificationRead(_id: string): Promise<boolean> {
    await apiPut(`/notifications/${_id}/read`, {})
    return true
  },

  /** 全部通知标记已读 —— PUT /notifications/read-all */
  async markAllNotificationsRead(): Promise<boolean> {
    await apiPut('/notifications/read-all', {})
    return true
  },

  /** 未读通知数量 —— GET /notifications/unread-count（铃铛角标，未登录/异常时降级为 0） */
  async getUnreadNotifyCount(): Promise<number> {
    try {
      // 铃铛同时出现在首页、发现、搜索等公开枢纽，必须静默可选登录；
      // 无会话或陈旧凭证都只降级为 0，不能把正在浏览的游客劫持到登录页。
      const res = await apiGetOptionalAuth<{ unreadCount?: number }>('/notifications/unread-count')
      return Number(res?.unreadCount) || 0
    } catch {
      return 0
    }
  },

  /** 我的会员权益 —— GET /member/status + /member/plans（仅平台VIP） */
  async getMemberships(): Promise<MembershipItem[]> {
    const [status, plans] = await Promise.all([
      apiGet<RawMemberStatus>('/member/status'),
      apiGet<RawMemberPlan[]>('/member/plans').catch(() => [] as RawMemberPlan[]),
    ])
    if (!status || status.memberLevel === 'NONE') return []
    const planList = Array.isArray(plans) ? plans : []
    const config = planList.find((p: RawMemberPlan) => p.level === status.memberLevel)
    const isLifetime = status.memberLevel === 'LIFETIME' || status.remainingDays === -1
    const daysLeft = isLifetime ? -1 : Number(status.remainingDays ?? 0)
    const st: 'active' | 'expiring' | 'expired' =
      !status.isActive ? 'expired' : (!isLifetime && daysLeft <= 30 ? 'expiring' : 'active')
    return [{
      id: String(status.memberLevel),
      name: config?.name || '平台会员',
      level: String(status.memberLevel),
      startDate: '',
      expireDate: isLifetime ? '永久' : (status.memberExpire ? String(status.memberExpire).slice(0, 10) : ''),
      daysLeft,
      isLifetime,
      status: st,
      price: Number(config?.price ?? 0),
      benefits: Array.isArray(config?.benefits) ? config.benefits : [],
    }]
  },
}

/* ───────────────────────── 实名认证 ─────────────────────────
 * 🔴 2026-07-14 接线：后端 identity 模块（OCR/二要素核验/人脸核身 + admin 审核）早已整套做完，
 *    前端却零调用；账号安全页的「实名认证」href 还指向页面自己（点了原地跳回）——
 *    而实名是【提现 / 发课程 / 讲师认证】的前置，卡死一大片。
 *    本次接【二要素核验】（姓名+身份证号→腾讯云 CheckIdCardInformation），
 *    它不依赖 OCR 上传与活体配置，是最短可用路径；通过后后端写 user.identityVerified=true。
 */

export interface IdentityVerifyResult {
  passed: boolean
  result: string
  description: string
}

export const identityApi = {
  /** 二要素核验 — POST /identity/verify（每日限 3 次·防撞库；已认证用户再调会 400） */
  verify: (name: string, idCard: string): Promise<IdentityVerifyResult> =>
    apiPost<IdentityVerifyResult>('/identity/verify', { name, idCard }),
}
