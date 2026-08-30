/**
 * 平台微页面布局数据层（P2 运营配置·复用现有 MarketingPage 基础设施）
 * - 真连 GET /marketing/pages/by-route?route=（公开·已发布页）→ 有序组件区块
 * - 预览：GET /marketing/pages/:id（草稿·需 admin 鉴权）——preview 模式用
 * 后台在「微页面编辑器」搭平台级页面（stationId=null）并发布 → H5 按 route 拉取渲染。
 * 无已发布页 → 返回空 blocks，页面回退各自硬编码默认（平滑迁移不留白）。
 */
import { apiGetOptionalAuth } from '@/utils/request'

/** 单个区块（对齐 MarketingPageComponent）*/
export interface LayoutBlock {
  id: string
  type: string // banner/notice/richtext/tabs/flashsale/groupbuy/coupon/recommend/feed/bigCard/rail/rank/kingkong…
  title?: string
  config: Record<string, unknown>
  sortOrder: number
}

export interface PageLayout {
  id: string | null
  route: string
  name?: string
  blocks: LayoutBlock[]
}

interface RawComp { id?: string; type?: string; title?: string; config?: unknown; sortOrder?: number }
interface RawPage { id?: string; route?: string; name?: string; components?: RawComp[] }

function adapt(route: string, raw: RawPage | null): PageLayout {
  const comps = Array.isArray(raw?.components) ? raw!.components! : []
  const blocks: LayoutBlock[] = comps
    .map((c, i): LayoutBlock => ({
      id: c.id || String(i),
      type: String(c.type || '').trim(),
      title: c.title || undefined,
      config: (c.config && typeof c.config === 'object' ? c.config : {}) as Record<string, unknown>,
      sortOrder: Number(c.sortOrder) || i,
    }))
    .filter((b) => b.type)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  return { id: raw?.id ?? null, route, name: raw?.name, blocks }
}

/**
 * 拉取已发布的平台微页面布局。无页面/失败 → 空 blocks（调用方回退默认）。
 * @param route 页面路由标识（如 'home' / 'course_home' / 'discover'）
 */
export async function getPublishedLayout(route: string): Promise<PageLayout> {
  try {
    const raw = await apiGetOptionalAuth<RawPage | null>(`/marketing/pages/by-route?route=${encodeURIComponent(route)}`)
    return adapt(route, raw)
  } catch {
    return { id: null, route, blocks: [] }
  }
}
