import { legacyPaipanApi } from '@/lib/legacy-paipan-data'
import { getToken } from '@/utils/storage'

const ENTRY = '/pages/paipan/index'
let navigationGeneration = 0
const permits = new WeakSet<object>()
type NavigationArgs = { url?: string; success?: (...args: unknown[]) => void; fail?: (error: { errMsg: string }) => void; complete?: (error: { errMsg: string }) => void; __paipanPermit?: object }
export function invalidatePaipanNavigation(): void { navigationGeneration++ }

/** 同步暂停原跳转，异步核验后仅恢复最后一次跳转；原调用回调由恢复请求完成。 */
export function interceptPaipanNavigation(args: NavigationArgs, resume: (args: NavigationArgs) => void): false | undefined {
  if (args.__paipanPermit && permits.has(args.__paipanPermit)) {
    permits.delete(args.__paipanPermit)
    delete args.__paipanPermit
    return
  }
  const current = ++navigationGeneration
  if (!isNativeSuiteRoute(args.url || '')) return
  const original = { ...args }
  const fail = (reason = 'navigation superseded') => {
    const error = { errMsg: `navigateTo:fail ${reason}` }
    try { original.fail?.(error) } catch { /* 调用方异常不阻止complete。 */ }
    try { original.complete?.(error) } catch { /* 不重复恢复或提交跳转。 */ }
  }
  void resolvePaipanSuiteNavigation(args.url || '').then(url => {
    if (current !== navigationGeneration) { fail(); return }
    const permit = {}
    permits.add(permit)
    resume({ ...original, url, __paipanPermit: permit })
  }).catch(() => fail('navigation resume failed'))
  return false
}
/** 整套自研分包统一识别；共用罗盘与第三方承接页不属于自研权限。 */
export function isNativeSuiteRoute(url: string): boolean {
  const path = ('/' + url.replace(/^\/+/, '')).split(/[?#]/)[0]
  return /^\/pkg-paipan(?:2|3)?\//.test(path) && path !== '/pkg-paipan3/luopan/index'
}

/** 仅处理站内排盘跳转；不缓存资格、不更改其他板块页面栈。冷启动另需页面层保护。 */
export async function resolvePaipanSuiteNavigation(target: string): Promise<string> {
  if (!isNativeSuiteRoute(target)) return target
  const token = getToken()
  if (!token) return ENTRY
  try {
    const result = await legacyPaipanApi.nativeQaAccess()
    return token === getToken() && result.allowed === true ? target : ENTRY
  } catch { return ENTRY }
}
