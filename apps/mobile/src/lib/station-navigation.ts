import { getTempReferrer } from '@/utils/referral'

// 页面导航上下文与账号永久归属分开；只接受实际加载成功的分站。
let current: { code: string; id: string } | undefined
export function rememberStationNavigation(code: string, id: string) {
  if (code && id) current = { code, id }
}
export function stationNavigationTarget(kind: string, fallback: string): string {
  if (!current || getTempReferrer() !== current.code) return fallback
  if (kind === 'home') return `/pkg-operator/station-home/index?ref=${encodeURIComponent(current.code)}`
  if (kind === 'paipan') return `/pages/paipan/index?target=station&stationId=${encodeURIComponent(current.id)}`
  return fallback
}
