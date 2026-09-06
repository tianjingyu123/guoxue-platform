import { getToken } from '@/utils/storage'

let active: { subjectId: string; token: string } | null = null

/** 仅本次服务端资格响应所对应的同步操作可取得历史命名空间。 */
export function withNativeHistoryScope(subjectId: string, token: string, action: () => void): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subjectId) ||
      !token || token !== getToken()) throw new Error('预览账号无法确认')
  const previous = active
  active = { subjectId, token }
  try { action() } finally { active = previous }
}

export function nativeHistoryKey(base: string): string | null {
  if (!active || active.token !== getToken()) return null
  return `${base}:account:${active.subjectId}`
}
