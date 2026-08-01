import { apiGetOptionalAuth, apiPostOptionalAuth } from '@/utils/request'
import { getTempReferrer } from '@/utils/referral'

export type StationPinnedBoard = 'home' | 'mall' | 'course' | 'circle' | 'agent' | 'ebook' | 'article' | 'video' | 'live'

export interface PublicPinnedStation {
  id: string
  userId: string
  name: string
  code: string
  logo?: string | null
  themeColor?: string | null
}

export interface PublicPinnedItem {
  id: string
  title: string
  cover?: string | null
  price?: number | null
  contentType: string
  sourceBoard: string
  liveStatus?: 'live' | 'scheduled' | 'ended'
  scheduledAt?: string | null
  viewerCount?: number
}

export interface PublicPinnedResult {
  station: PublicPinnedStation | null
  board: StationPinnedBoard
  label: string
  items: PublicPinnedItem[]
}
/** 站长主推内容统一详情路由；C 端主推横轨与分站品牌首页共用，避免同一内容在两处错跳。 */
export function stationPinnedTargetUrl(contentType: string, id: string | number): string {
  const sid = encodeURIComponent(String(id || ''))
  if (!sid) return ''
  const routes: Record<string, string> = {
    course: `/course/${sid}`,
    product: `/mall/product/${sid}`,
    circle: `/circles/${sid}`,
    agent: `/agent/${sid}`,
    ebook: `/classics/${sid}`,
    classic: `/classics/${sid}`,
    article: `/articles/${sid}`,
    video: `/video/${sid}`,
    live_room: `/live/${sid}`,
    live: `/live/${sid}`,
  }
  return routes[contentType] || ''
}


export const stationPinnedPublicApi = {
  async getCurrent(board: StationPinnedBoard): Promise<PublicPinnedResult> {
    const ref = getTempReferrer()
    const query = `board=${encodeURIComponent(board)}` + (ref ? `&ref=${encodeURIComponent(ref)}` : '')
    return apiGetOptionalAuth<PublicPinnedResult>(`/public/station-pinned?${query}`)
  },

  async reportClick(stationId: string): Promise<void> {
    if (!stationId) return
    try {
      await apiPostOptionalAuth('/commission/channel-click', {
        subjectType: 'STATION',
        subjectId: stationId,
        targetType: 'SHOP_ALL',
      })
    } catch {
      // 未登录或上报失败不阻断内容浏览；下单仍会携带本地临时推荐人。
    }
  },
}
