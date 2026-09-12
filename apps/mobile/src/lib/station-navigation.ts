import { getStorage, setStorage, removeStorage } from '@/utils/storage'

// 页面导航上下文与账号永久归属分开；只接受实际加载成功的分站。
const KEY = 'station_navigation'
const TTL = 30 * 60 * 1000
export function clearStationNavigation() { removeStorage(KEY) }
export function rememberStationNavigation(code: string, id: string) {
  if (code && id) setStorage(KEY, { code, id, expires: Date.now() + TTL })
}
export function stationNavigationTarget(kind: string, fallback: string): string {
  const current = getStorage<{code: string; id: string; expires: number}>(KEY)
  if (!current?.code || !current.id || !(current.expires > Date.now())) return fallback
  if (kind === 'home') return `/pkg-operator/station-home/index?code=${encodeURIComponent(current.code)}`
  if (kind === 'paipan') return `/pages/paipan/index?target=station&stationId=${encodeURIComponent(current.id)}`
  return fallback
}
