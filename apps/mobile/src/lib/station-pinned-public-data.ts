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
