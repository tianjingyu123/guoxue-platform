// 分站主推位数据层（V0 重构·S1 汇总 / S2 管理面板 / S3 选品库）
// 后端：/station-pinned/*（StationMasterGuard 鉴权，需站长本人）
// 三个「没有」模型：站长唯一动作=在 9 板块×6 主推位选品，无装修/无独立分站页/无独立账号。

import { apiGet, apiPut, apiDelete } from '@/utils/request'

/** 9 大板块（顺序固定·与 S2 稿一致） */
export interface BoardMeta {
  key: string
  label: string
  scope: string
}
export const PINNED_BOARDS: BoardMeta[] = [
  { key: 'home', label: '首页', scope: '可选全部类别' },
  { key: 'mall', label: '商城', scope: '仅商品' },
  { key: 'course', label: '课堂', scope: '仅课程' },
  { key: 'circle', label: '圈子', scope: '仅圈子' },
  { key: 'agent', label: '智能体', scope: '仅智能体' },
  { key: 'ebook', label: '古籍', scope: '仅古籍' },
  { key: 'article', label: '文章', scope: '仅文章' },
  { key: 'video', label: '短视频', scope: '仅短视频' },
  { key: 'live', label: '直播', scope: '仅直播中/预约·结束自动下架' },
]

/** 首页选品面板分类 Tab（★按平台板块分，绝不是八字/六爻等排盘工具分类） */
export const HOME_FILTER_TABS: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'course', label: '课堂' },
  { key: 'mall', label: '商城' },
  { key: 'circle', label: '圈子' },
  { key: 'agent', label: '智能体' },
  { key: 'ebook', label: '古籍' },
  { key: 'article', label: '文章' },
  { key: 'video', label: '短视频' },
  { key: 'live', label: '直播' },
]

/** 直播选品分类 Tab */
export const LIVE_STATUS_TABS: { key: string; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'live', label: '正在直播' },
  { key: 'scheduled', label: '预约直播' },
]

/** 内容类型中文标（列表行角标） */
export const CONTENT_TYPE_LABEL: Record<string, string> = {
  course: '课堂',
  product: '商城',
  circle: '圈子',
  agent: '智能体',
  ebook: '古籍',
  article: '文章',
  video: '短视频',
  live_room: '直播',
}

/** 统一内容简报（选品列表行 / 已锁主推位卡） */
export interface PinnedContentBrief {
  id: string
  title: string
  cover: string | null
  price: number | null
  contentType: string
  sourceBoard: string
  liveStatus?: 'live' | 'scheduled' | 'ended'
  scheduledAt?: string | null
  viewerCount?: number
}

/** 单个主推位（空位 content=null） */
export interface PinnedSlot {
  slotIndex: number
  content: PinnedContentBrief | null
}

/** 一个板块的 6 位主推位 */
export interface PinnedBoardData {
  board: string
  label: string
  scope: string
  filled: number
  slots: PinnedSlot[]
}

/** S1 工作台板块汇总 */
export interface PinnedSummaryItem {
  board: string
  label: string
  count: number
  total: number
}

/** 提交某板块保存的槽位 */
export interface PinnedSlotInput {
  slotIndex: number
  contentType: string | null
  contentId: string | null
}

export interface CatalogQuery {
  board: string
  filterBoard?: string
  q?: string
  status?: string
  page?: number
  pageSize?: number
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    parts.push(`${k}=${encodeURIComponent(String(v))}`)
  }
  return parts.length ? `?${parts.join('&')}` : ''
}

export const pinnedApi = {
  /** S2：读取 9 板块 × 6 位主推位 */
  getBoards(stationId: string) {
    return apiGet<PinnedBoardData[]>(`/station-pinned/${stationId}`)
  },

  /** S1：9 板块主推位数量汇总 */
  getSummary(stationId: string) {
    return apiGet<PinnedSummaryItem[]>(`/station-pinned/${stationId}/summary`)
  },

  /** S3：选品库列表 */
  getCatalog(stationId: string, query: CatalogQuery) {
    const qs = buildQuery({
      board: query.board,
      filterBoard: query.filterBoard,
      q: query.q,
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
    })
    return apiGet<{ items: PinnedContentBrief[]; total: number }>(`/station-pinned/${stationId}/catalog${qs}`)
  },

  /** S2：保存某板块全部主推位（快照覆盖写） */
  saveBatch(stationId: string, board: string, slots: PinnedSlotInput[]) {
    return apiPut<{ board: string; saved: number }>(`/station-pinned/${stationId}/batch`, { board, slots })
  },

  /** S2：清空某个主推位 */
  removeSlot(stationId: string, board: string, slotIndex: number) {
    return apiDelete<{ board: string; slotIndex: number; removed: boolean }>(`/station-pinned/${stationId}/${board}/${slotIndex}`)
  },
}
