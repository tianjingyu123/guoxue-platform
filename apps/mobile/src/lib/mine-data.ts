/**
 * 个人中心 - 设置与账号安全板块数据层
 * 对应原型 app/mine/{settings,security,change-password,change-phone,payment-password,bind-accounts}
 * 主题色沿用原型 #C41E3A
 */

import { apiGet, apiPost, apiPut, apiDelete, useMock } from '@/utils/request'

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
  { id: 'photos', name: '相册', icon: 'image', description: '访问您的照片和视频', purpose: '用于选择头像、发布图片/视频内容、保存图片', status: 'always', required: false, degradedFeature: '无法选择本地图片' },
  { id: 'contacts', name: '通讯录', icon: 'users', description: '读取联系人信息', purpose: '用于发现已注册的朋友、邀请好友', status: 'denied', required: false, degradedFeature: '无法发现通讯录好友' },
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

// ============================================
// API 层：useMock 开关控制真实/模拟数据切换
// ============================================

export const mineSettingsApi = {
  async getNotifySettings() {
    if (useMock()) return settingNotifyItems
    try {
      return await apiGet<any>('/users/notify-settings')
    } catch { return settingNotifyItems }
  },

  async updateNotifySettings(key: string, value: boolean) {
    if (useMock()) return { success: true }
    return apiPut<any>('/users/notify-settings', { key, value })
  },

  async getSecurityInfo() {
    if (useMock()) return { ...mineProfile, loginItems: securityLoginItems, paymentItems: securityPaymentItems, deviceItems: securityDeviceItems, scoreItems: securityScoreItems }
    try {
      return await apiGet<any>('/users/security')
    } catch { return mineProfile }
  },

  async changePassword(params: { oldPassword: string; newPassword: string }) {
    if (useMock()) return { success: true }
    return apiPut<any>('/users/password', params)
  },

  async setPayPassword(params: { password: string }) {
    if (useMock()) return { success: true }
    return apiPost<any>('/users/pay-password', params)
  },

  async getBlocklist() {
    if (useMock()) return { items: blacklistUsers, total: blacklistUsers.length }
    try {
      const res = await apiGet<any>('/users/blocklist')
      return { items: res.items || res.list || [], total: res.total || 0 }
    } catch { return { items: blacklistUsers, total: blacklistUsers.length } }
  },

  async addToBlocklist(userId: number) {
    if (useMock()) return { success: true }
    return apiPost<any>('/users/blocklist', { userId })
  },

  async removeFromBlocklist(userId: number) {
    if (useMock()) return { success: true }
    return apiDelete<any>(`/users/blocklist/${userId}`)
  },

  async getBoundAccounts() {
    if (useMock()) return boundAccounts
    try {
      return await apiGet<any>('/users/bound-accounts')
    } catch { return boundAccounts }
  },

  async getExportRecords() {
    if (useMock()) return exportRecords
    try {
      const res = await apiGet<any>('/users/export-records')
      return res.items || res.list || res || []
    } catch { return exportRecords }
  },

  async requestExport(types: string[]) {
    if (useMock()) return { success: true, id: `exp-${Date.now()}` }
    return apiPost<any>('/users/export', { types })
  },

  async deleteAccount(reason: string, description?: string) {
    if (useMock()) return { success: true }
    return apiPost<any>('/users/deactivate', { reason, description })
  },

  /** 签到 — 今日状态 */
  async getCheckinStatus() {
    if (useMock()) return { todayChecked: false, continuousDays: 7, totalPoints: 350 }
    try { return await apiGet<any>('/users/me/checkin/status') } catch { return { todayChecked: false, continuousDays: 0, totalPoints: 0 } }
  },

  /** 签到 — 日历 */
  async getCheckinCalendar(month?: string) {
    if (useMock()) {
      const days = Array.from({ length: 30 }, (_, i) => ({ date: i + 1, checked: i < 7, isToday: i === 7 }))
      return { days, continuousDays: 7, totalPoints: 350 }
    }
    try { return await apiGet<any>(`/users/me/checkin/calendar${month ? `?month=${month}` : ''}`) } catch { return { days: [], continuousDays: 0, totalPoints: 0 } }
  },

  /** 签到 — 执行签到 */
  async doCheckin() {
    if (useMock()) return { success: true, points: 10 }
    return apiPost<any>('/users/me/checkin')
  },

  /** 积分 — 获取积分信息 */
  async getPoints() {
    if (useMock()) return { total: 1280, available: 850, frozen: 430 }
    try { return await apiGet<any>('/users/me/points') } catch { return { total: 0, available: 0, frozen: 0 } }
  },

  /** 积分 — 积分记录 */
  async getPointsRecords(params?: { page?: number; pageSize?: number }) {
    const qs = `page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`
    if (useMock()) return { items: [], total: 0 }
    try { return await apiGet<any>(`/users/me/points/records?${qs}`) } catch { return { items: [], total: 0 } }
  },

  /** 积分 — 积分兑换 */
  async exchangePoints(data: { itemId: string }) {
    if (useMock()) return { success: true }
    return apiPost<any>('/users/me/points/exchange', data)
  },

  /** 青少年模式 — 获取状态 */
  async getTeenMode() {
    if (useMock()) return { enabled: false, timeLimit: 0, filterLevel: 'moderate' }
    try { return await apiGet<any>('/users/me/teen-mode') } catch { return { enabled: false, timeLimit: 0, filterLevel: 'moderate' } }
  },

  /** 青少年模式 — 更新设置 */
  async updateTeenMode(data: { enabled?: boolean; timeLimit?: number; filterLevel?: string }) {
    if (useMock()) return { success: true }
    return apiPut<any>('/users/me/teen-mode', data)
  },
}
