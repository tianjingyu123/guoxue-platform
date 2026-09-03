/**
 * 用户兴趣主题（T4 新手旅程 · 2026-07-03 董事长拍板）
 * 六大主题替代原 24 个碎片标签：一步选完（1-3 个），驱动首页「今日学一点」个性化。
 * 真源为服务端当前账号资料；本机只读取已登录账号缓存，不继承历史全局兴趣键。
 */
import { getToken, getUserInfo, setUserInfo } from '@/utils/storage'

export interface InterestTheme {
  key: string
  label: string
  desc: string
  icon: string // app-icon 图标名
  tags: string[] // 映射的细分标签（供推荐/搜索联动）
}

export const INTEREST_THEMES: InterestTheme[] = [
  { key: 'yixue', label: '命理易学', desc: '八字 · 紫微 · 六爻 · 风水', icon: 'compass', tags: ['八字命理', '紫微斗数', '六爻占卜', '风水堪舆', '奇门遁甲', '周易易经'] },
  { key: 'jingdian', label: '经典研读', desc: '论语 · 道德经 · 古籍', icon: 'book-open', tags: ['儒家经典', '道家', '佛学', '中华历史'] },
  { key: 'shici', label: '诗词书画', desc: '唐诗宋词 · 书法 · 国画', icon: 'book-heart', tags: ['诗词歌赋', '唐诗宋词', '书法', '国画', '篆刻印章'] },
  { key: 'yangsheng', label: '养生武艺', desc: '中医 · 太极 · 茶道', icon: 'heart', tags: ['中医养生', '太极武术', '茶道'] },
  { key: 'minsu', label: '节气民俗', desc: '节气 · 民俗 · 择日', icon: 'calendar', tags: ['节气民俗', '花鸟虫鱼', '器物收藏'] },
  { key: 'yayi', label: '琴棋雅艺', desc: '古琴 · 香道 · 雅集', icon: 'music', tags: ['古典音乐', '琴棋书画'] },
]

export interface AccountInterestState {
  id?: string
  interestCategories?: string[]
  interestGuideCompleted?: boolean
}

export type InterestGuideStatus = 'complete' | 'pending' | 'unknown'

/** 非空历史兴趣也视为完成；缺字段不能被误判成首次登录。 */
export function interestGuideStatus(user: AccountInterestState | null | undefined): InterestGuideStatus {
  if (!user?.id) return 'unknown'
  if (user.interestCategories !== undefined && !Array.isArray(user.interestCategories)) return 'unknown'
  if (user.interestGuideCompleted === true || user.interestCategories?.some((value) => typeof value === 'string' && value.trim())) return 'complete'
  return user.interestGuideCompleted === false ? 'pending' : 'unknown'
}

/** 引导保存主题名称，资料页复用同一词表；兼容历史细分标签。 */
export function interestCategoriesForThemes(keys: string[]): string[] {
  return INTEREST_THEMES.filter((theme) => keys.includes(theme.key)).slice(0, 3).map((theme) => theme.label)
}

const LEGACY_THEME_TAGS: Record<string, string[]> = {
  yixue: ['易经', '风水', '八字', '梅花易数', '六爻', '面相', '手相', '姓名学', '择日', '阴宅', '阳宅', '命理', '占卜', '周易'],
  jingdian: ['国学', '道学', '儒学'],
}

export function interestThemesForCategories(categories: string[]): string[] {
  return INTEREST_THEMES.filter((theme) => [theme.key, theme.label, ...theme.tags, ...(LEGACY_THEME_TAGS[theme.key] || [])]
    .some((tag) => categories.includes(tag))).map((theme) => theme.key)
}

/** 只更新同一已登录账号；迟到响应不得覆盖另一账号资料。 */
export function hydrateAccountInterests(user: AccountInterestState): boolean {
  const current = getUserInfo<AccountInterestState>()
  if (!getToken() || !user.id || current?.id !== user.id || interestGuideStatus(user) === 'unknown') return false
  setUserInfo({ ...current, interestCategories: user.interestCategories || [], interestGuideCompleted: interestGuideStatus(user) === 'complete' })
  return true
}

/** 写入必须由服务端明确确认，不能把 HTTP 200 或请求参数当作持久化证据。 */
export function hydrateConfirmedInterestSave(user: AccountInterestState | null | undefined, accountId: string): void {
  if (user?.id !== accountId || user.interestGuideCompleted !== true || !Array.isArray(user.interestCategories)
    || !user.interestCategories.every((value) => typeof value === 'string') || !hydrateAccountInterests(user)) {
    throw new Error('兴趣保存尚未确认，请稍后重试')
  }
}

/** 读取所选主题 key 列表（未选过返回空数组） */
export function getInterestThemes(): string[] {
  if (!getToken()) return []
  const user = getUserInfo<AccountInterestState>()
  return user?.id && Array.isArray(user.interestCategories) ? interestThemesForCategories(user.interestCategories) : []
}

/** 是否已完成兴趣选择（welcome 页据此决定是否进入引导） */
export function hasSelectedInterests(): boolean {
  return getInterestThemes().length > 0
}

/** 是否已经完成过兴趣引导（选过或明确跳过），避免每次登录重复拦截。 */
export function hasCompletedInterestGuide(): boolean {
  return !!getToken() && interestGuideStatus(getUserInfo<AccountInterestState>()) === 'complete'
}

/** 一年中的第几天（稳定的「每日轮换」随机源，每天变化一次） */
function dayOfYear(date: Date): number {
  return Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000)
}

/**
 * 无用户选择时的默认主题：按 dayOfYear 每日轮换六主题，并做时段感知：
 * - 清晨 6:00–11:59 → 从「经典研读」（启蒙类）起头；
 * - 夜晚 18:00–23:59 → 从「命理易学」（进阶类）起头；
 * - 其余时段 → 按当天 dayOfYear % 6 起头。
 * 从起点连续取 3 个（环绕），保证每天/不同时段呈现不同组合。
 */
function rotateDefaultThemes(now: Date): InterestTheme[] {
  const n = INTEREST_THEMES.length // 6
  let start = dayOfYear(now) % n
  const hour = now.getHours()
  if (hour >= 6 && hour < 12) {
    const i = INTEREST_THEMES.findIndex((t) => t.key === 'jingdian')
    if (i >= 0) start = i
  } else if (hour >= 18 && hour < 24) {
    const i = INTEREST_THEMES.findIndex((t) => t.key === 'yixue')
    if (i >= 0) start = i
  }
  return [0, 1, 2].map((k) => INTEREST_THEMES[(start + k) % n])
}

/**
 * 取主题定义（用于首页「今日学一点」按主题拉内容）。
 * - 用户已选：优先返回用户所选主题；
 * - 未选：按 dayOfYear + 时段轮换默认三主题（每天不同，早晚有别），而非恒取前三个。
 */
export function getEffectiveThemes(now: Date = new Date()): InterestTheme[] {
  const keys = getInterestThemes()
  const picked = INTEREST_THEMES.filter((t) => keys.includes(t.key))
  return picked.length > 0 ? picked : rotateDefaultThemes(now)
}
