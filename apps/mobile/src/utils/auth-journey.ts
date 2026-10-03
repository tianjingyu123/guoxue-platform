import { isRegisteredAppRoute, resolveRoute } from '@/utils/router'
import { getStorage, removeStorage, getToken, getUserInfo } from '@/utils/storage'
import { loadAccountInterestStatus } from '@/lib/interest-data'

const HOME = '/pages/index/index'

export function safeLoginRedirect(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length > 2048 || !raw.startsWith('/') || raw.startsWith('//') || /[\\\s#]/u.test(raw)
    || Array.from(raw).some((character) => character.charCodeAt(0) < 32)) return ''
  const path = raw.split('?')[0]
  if (path.includes('%') || path.split('/').some((segment) => segment === '.' || segment === '..')) return ''
  const resolved = resolveRoute(raw)
  const targetPath = resolved.split('?')[0]
  if (targetPath.startsWith('/pkg-auth/') || !isRegisteredAppRoute(targetPath)) return ''
  return resolved
}

/** 引导期间保留安全目标；只有完成流程真正离开时消费一次。 */
export function finishAuthJourney(): void {
  const target = safeLoginRedirect(getStorage('login:redirect')) || HOME
  removeStorage('login:redirect')
  uni.reLaunch({ url: target, fail: () => uni.reLaunch({ url: HOME }) })
}

export async function continueAfterLogin(): Promise<void> {
  const token = getToken()
  const accountId = getUserInfo<{ id?: string }>()?.id
  if (!token || !accountId) return
  const rawRedirect = getStorage('login:redirect')
  if (rawRedirect && !safeLoginRedirect(rawRedirect)) removeStorage('login:redirect')
  try {
    const status = await loadAccountInterestStatus()
    if (getToken() !== token || getUserInfo<{ id?: string }>()?.id !== accountId) return
    if (status === 'pending') { uni.reLaunch({ url: '/pkg-auth/welcome/index' }); return }
  } catch {
    if (getToken() !== token || getUserInfo<{ id?: string }>()?.id !== accountId) return
    // 登录已成功，兴趣网络故障不阻断浏览，也不伪造已完成；下次登录仍以服务器为准。
    uni.showToast({ title: '兴趣设置暂不可用，可稍后在个人资料中设置', icon: 'none' })
  }
  finishAuthJourney()
}
