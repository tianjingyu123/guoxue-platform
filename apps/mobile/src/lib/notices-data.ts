/** 平台公告公开数据层：只读取后台已启用且处于展示时间窗内的 SiteNotice。 */
import { apiGet, apiGetPaged } from '@/utils/request'

export interface PublicNotice {
  id: string
  title: string
  content: string
  type: string
  startTime?: string | null
  endTime?: string | null
  createdAt: string
  updatedAt: string
}

export interface PublicNoticePage {
  items: PublicNotice[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const noticesApi = {
  list: async (page = 1, pageSize = 50): Promise<PublicNoticePage> => {
    const result = await apiGetPaged<PublicNotice>(`/system/public/site-notices?page=${page}&pageSize=${pageSize}`)
    return {
      ...result,
      totalPages: result.pageSize > 0 ? Math.ceil(result.total / result.pageSize) : 1,
    }
  },
  detail: (id: string) => apiGet<PublicNotice>(`/system/public/site-notices/${encodeURIComponent(id)}`),
}