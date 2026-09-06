import { isNativeSuiteRoute } from '@/lib/paipan-suite-navigation'
import { getToken } from '@/utils/storage'

let pending: { target: string; token: string } | null = null
/** H5初始化路由之前改写当前历史项，不创建页面栈或持久化私有工具参数。 */
export function preparePaipanH5ColdEntry(): void {
  if (typeof window === 'undefined') return
  const base = '/h5'
  if (!window.location.pathname.startsWith(base + '/')) return
  let path: string
  try { path = decodeURIComponent(window.location.pathname.slice(base.length)) } catch { return }
  if (!isNativeSuiteRoute(path)) return
  const target = path + window.location.search
  const token = getToken()
  window.history.replaceState(window.history.state, '', base + '/pages/paipan/index')
  pending = { target, token }
}

/** 仅在整套资格核验通过后消费；换账号或原先未登录不恢复旧工具参数。 */
export function consumePaipanColdTarget(): string | null {
  const entry = pending
  pending = null
  return entry?.token && entry.token === getToken() ? entry.target : null
}
