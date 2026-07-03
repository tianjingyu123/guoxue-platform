/**
 * 用户兴趣主题（T4 新手旅程 · 2026-07-03 董事长拍板）
 * 六大主题替代原 24 个碎片标签：一步选完（1-3 个），驱动首页「今日学一点」个性化。
 * 存储：本地 storage 为真源（未登录也可用）；同时上报埋点供后端个性化演进。
 */
import { getStorage, setStorage } from '@/utils/storage'
import { track } from '@/composables/useTrack'

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

const KEY = 'user_interest_themes'

/** 保存所选主题（key 列表），并上报埋点供个性化演进 */
export function saveInterestThemes(keys: string[]): void {
  const valid = keys.filter((k) => INTEREST_THEMES.some((t) => t.key === k)).slice(0, 3)
  setStorage(KEY, valid)
  try {
    track.custom('interests_selected', { themes: valid })
  } catch {
    /* 埋点失败不影响主流程 */
  }
}

/** 读取所选主题 key 列表（未选过返回空数组） */
export function getInterestThemes(): string[] {
  const v = getStorage<string[]>(KEY, [])
  return Array.isArray(v) ? v : []
}

/** 是否已完成兴趣选择（welcome 页据此决定是否进入引导） */
export function hasSelectedInterests(): boolean {
  return getInterestThemes().length > 0
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
