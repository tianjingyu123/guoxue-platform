import { apiGet, apiPut } from '@/utils/request'
import { getToken, getUserInfo } from '@/utils/storage'
import { hydrateAccountInterests, hydrateConfirmedInterestSave, interestCategoriesForThemes, interestGuideStatus, type AccountInterestState, type InterestGuideStatus } from '@/utils/interests'
import { track } from '@/composables/useTrack'

/** 登录响应优先；旧响应缺字段时读取资料，不把网络失败当作首次登录。 */
export async function loadAccountInterestStatus(): Promise<InterestGuideStatus> {
  const account = getUserInfo<AccountInterestState>()
  const token = getToken()
  if (!token || !account?.id) throw new Error('请先登录后设置兴趣')
  const known = interestGuideStatus(account)
  if (known !== 'unknown') return known
  const remote = await apiGet<AccountInterestState>('/auth/me')
  if (getToken() !== token || getUserInfo<AccountInterestState>()?.id !== account.id || remote?.id !== account.id) throw new Error('账号状态已变化，请重新进入')
  if (!hydrateAccountInterests(remote)) throw new Error('兴趣状态暂不可用，请稍后重试')
  return interestGuideStatus(remote)
}

/** undefined 表示跳过：不覆盖既有兴趣；只有服务端确认后才更新当前账号缓存。 */
export async function completeAccountInterestGuide(keys?: string[]): Promise<void> {
  const account = getUserInfo<AccountInterestState>()
  const token = getToken()
  if (!token || !account?.id) throw new Error('请先登录后设置兴趣')
  const categories = keys === undefined ? undefined : interestCategoriesForThemes(keys)
  if (keys !== undefined && !categories?.length) throw new Error('请至少选择一个兴趣')
  const saved = await apiPut<AccountInterestState>('/users/profile', {
    interestGuideCompleted: true,
    ...(categories === undefined ? {} : { interestCategories: categories }),
  })
  if (getToken() !== token || getUserInfo<AccountInterestState>()?.id !== account.id) throw new Error('账号状态已变化，请重新进入')
  hydrateConfirmedInterestSave(saved, account.id)
  try { track.custom(keys === undefined ? 'interests_skipped' : 'interests_selected', keys === undefined ? {} : { themes: keys }) } catch { /* 埋点失败不影响已确认的保存 */ }
}
