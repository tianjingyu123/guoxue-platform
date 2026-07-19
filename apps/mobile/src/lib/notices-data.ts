/** 平台公告公开数据层：只读取后台已启用且处于展示时间窗内的 SiteNotice。 */
import { apiGet } from '@/utils/request'

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
  list: (page = 1, pageSize = 50) =>
    apiGet<PublicNoticePage>(`/system/public/site-notices?page=${page}&pageSize=${pageSize}`),
  detail: (id: string) => apiGet<PublicNotice>(`/system/public/site-notices/${encodeURIComponent(id)}`),
}