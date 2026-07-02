/**
 * 推荐归因（2026-07-02 拍板规则）
 * 全平台只有一种分享链接：分享路径统一携带 ref 参数（值 = 分享者用户ID 或 分站推广码，后端统一解析）。
 * 系统自动把「最近点击的分享链接」记为临时推荐人（覆盖式，7 天有效）；
 * 下单/注册时：临时推荐人优先于用户的永久归属分站（ReferralRelation）；无临时推荐人则永久归属生效。
 */
import { getStorage, setStorage, getUserInfo } from '@/utils/storage'
import { track } from '@/composables/useTrack'

const REF_KEY = 'temp_referrer'
const REF_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 天有效期

interface RefRecord {
  id: string
  expires: number
}

/** 记录最近分享者（覆盖式：最近的分享链接生效），并上报 ref_click 埋点供推广漏斗统计 */
export function saveTempReferrer(ref: string): void {
  if (!ref || ref.length < 4 || ref.length > 64) return
  setStorage(REF_KEY, { id: ref, expires: Date.now() + REF_TTL_MS } as RefRecord)
  try {
    track.custom('ref_click', { ref })
  } catch {
    /* 埋点失败不影响归因 */
  }
}

/** 取当前有效的临时推荐人（过期返回 undefined） */
export function getTempReferrer(): string | undefined {
  const rec = getStorage<RefRecord>(REF_KEY)
  if (!rec?.id || !rec.expires || Date.now() > rec.expires) return undefined
  return String(rec.id)
}

/** 从页面 URL 捕获 ref/s 参数（s 为分站推广链接旧参数别名） */
export function captureRefFromUrl(url?: string): void {
  if (!url) return
  const m = /[?&](?:ref|s)=([^&#]+)/.exec(url)
  if (!m) return
  try {
    saveTempReferrer(decodeURIComponent(m[1]))
  } catch {
    saveTempReferrer(m[1])
  }
}

/** 从启动参数 query 捕获 ref/s 参数 */
export function captureRefFromQuery(query?: Record<string, unknown>): void {
  const ref = query?.ref ?? query?.s
  if (typeof ref === 'string' && ref) saveTempReferrer(ref)
}

/** 给分享路径追加当前登录用户的 ref 参数（全平台唯一分享链接） */
export function withRef(path: string): string {
  const self = getUserInfo<{ id?: string | number }>()?.id
  if (!self || /[?&]ref=/.test(path)) return path
  return path + (path.includes('?') ? '&' : '?') + 'ref=' + encodeURIComponent(String(self))
}
