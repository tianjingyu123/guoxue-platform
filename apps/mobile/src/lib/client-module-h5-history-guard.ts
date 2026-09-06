import { hydrateRemoteConfig } from '@/lib/remote-config'
import { clientModuleForRoute, clientFeatureUnavailableRoute, isClientModuleEnabled } from '@/lib/client-module-policy'

interface ModuleHistoryRouter {
  beforeEach(guard: (to: { fullPath: string }) => Promise<boolean | string>): unknown
  isReady?(): Promise<void>
  currentRoute?: { value: { fullPath: string } }
  replace?(path: string): Promise<unknown>
}
const installed = new WeakSet<object>()

/** H5 直达与历史恢复使用同一模块总闸，不靠首屏渲染后的定时器补救。 */
export function installClientModuleH5HistoryGuard(router?: ModuleHistoryRouter): void {
  if (!router || installed.has(router)) return
  installed.add(router)
  let generation = 0
  const check = async (to: { fullPath: string }): Promise<boolean | string> => {
    const current = ++generation
    const module = clientModuleForRoute(to.fullPath)
    if (!module) return true
    try { await hydrateRemoteConfig() } catch { /* 网络异常由已有安全默认值判定，不开放模块。 */ }
    if (current !== generation) return false
    return isClientModuleEnabled(module) ? true : clientFeatureUnavailableRoute(module)
  }
  router.beforeEach(check)
  // uni H5 首次导航可能已在根组件创建前开始，补验 ready 后的精确当前路由。
  // replace 保持历史栈，不把模块停用页反复压栈；用户离开后不追回旧路由。
  if (router.isReady && router.currentRoute && router.replace) {
    void router.isReady().then(async () => {
      const path = router.currentRoute!.value.fullPath
      const result = await check({ fullPath: path })
      if (typeof result === 'string' && router.currentRoute!.value.fullPath === path) await router.replace!(result)
    }).catch(() => { /* 导航取消不触发重复重试；后续导航仍由守卫处理。 */ })
  }
}
