import { isNativeSuiteRoute, resolvePaipanSuiteNavigation } from '@/lib/paipan-suite-navigation'

interface HistoryRouter {
  beforeEach(guard: (to: { fullPath: string }) => Promise<boolean | string>): unknown
}
const installed = new WeakSet<object>()
/** 浏览器历史恢复也经过整套门禁；只接入H5现有Router，不自行重建页面栈。 */
export function installPaipanH5HistoryGuard(router?: HistoryRouter): void {
  if (!router || installed.has(router)) return
  installed.add(router)
  let generation = 0
  router.beforeEach(async to => {
    const current = ++generation
    if (!isNativeSuiteRoute(to.fullPath)) return true
    const target = await resolvePaipanSuiteNavigation(to.fullPath)
    // 路由守卫返回重定向会开启新导航；旧请求必须取消，不能覆盖用户的新去向。
    if (current !== generation) return false
    return target === to.fullPath ? true : target
  })
}
