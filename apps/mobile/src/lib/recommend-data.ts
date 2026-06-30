import { apiGet } from '@/utils/request'
import type { RecommendItem } from '@/components/common/recommend-section.vue'

/**
 * 全平台统一「相关推荐 / 猜你喜欢」数据层。
 * 后端真源：GET /recommend/:scene（智能推荐模块，按 scene + contentId 召回）。
 * 注意：该端点受功能开关 `recommend_algorithm` 门禁，未开启时后端返回 404；
 *       本层统一 try/catch 降级为空数组，recommend-section 组件 items 为空时自动不渲染（诚实降级）。
 */

/** 后端推荐内容类型（recommend.dto RecommendItemType） */
type RecommendVOType =
  | 'ARTICLE' | 'COURSE' | 'PRODUCT' | 'CIRCLE'
  | 'VIDEO' | 'CONTENT' | 'CLASSIC' | 'EBOOK'

/** 后端 RecommendItemVO */
interface RecommendVO {
  id: string
  type: RecommendVOType
  title: string
  cover?: string
  excerpt?: string
  tags?: string[]
  reason?: string
  metadata?: Record<string, unknown>
}

interface RecommendResponse {
  items?: RecommendVO[]
  recommendId?: string
}

/** 支持的推荐场景（recommend.dto RecommendScene 子集，前端实际用到的几个） */
export type RecommendScene = 'course_detail' | 'product_detail' | 'guess_like'

/** 内容类型 → 原型详情路由（navigateTo 走 router.ts 动态表，未注册项有 toast 兜底） */
function hrefOf(vo: RecommendVO): string {
  const id = vo.id
  switch (vo.type) {
    case 'COURSE': return `/courses/${id}`
    case 'PRODUCT': return `/mall/product/${id}`
    case 'CIRCLE': return `/circles/${id}`
    case 'VIDEO': return `/video/${id}`
    case 'EBOOK': return `/ebook/${id}`
    case 'CLASSIC': return `/classics/${id}`
    case 'ARTICLE':
    case 'CONTENT':
    default: return `/articles/${id}`
  }
}

function formatCount(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n)
}

/** metadata → 一条社交证明副标题；无则回退 excerpt */
function subtitleOf(vo: RecommendVO): string | undefined {
  const m = vo.metadata || {}
  if (typeof m.studentCount === 'number') return `${formatCount(m.studentCount)}人在学`
  if (typeof m.salesCount === 'number') return `已售${formatCount(m.salesCount)}`
  if (typeof m.memberCount === 'number') return `${formatCount(m.memberCount)}名成员`
  if (typeof m.viewCount === 'number') return `${formatCount(m.viewCount)}次浏览`
  return vo.excerpt
}

/** 后端 VO → 统一推荐卡 */
function toRecommendItem(vo: RecommendVO): RecommendItem {
  const price = typeof vo.metadata?.price === 'number' ? vo.metadata.price : undefined
  return {
    id: vo.id,
    cover: vo.cover || '',
    title: vo.title,
    subtitle: subtitleOf(vo),
    price: price && price > 0 ? price : undefined,
    tag: vo.reason || vo.tags?.[0],
    href: hrefOf(vo),
  }
}

export const recommendApi = {
  /**
   * 拉取某场景的智能推荐，返回标准化推荐卡。
   * @param scene  推荐场景（详情页传 *_detail，通用区块传 guess_like）
   * @param contentId  当前内容 id（详情页场景必传，用于关联召回）
   * @param pageSize  数量（默认 6，三列一行两排）
   */
  async getForScene(scene: RecommendScene, contentId?: string, pageSize = 6): Promise<RecommendItem[]> {
    try {
      let url = `/recommend/${scene}?pageSize=${pageSize}`
      if (contentId) url += `&contentId=${encodeURIComponent(contentId)}`
      const res = await apiGet<RecommendResponse>(url)
      const items = Array.isArray(res?.items) ? res.items : []
      return items.map(toRecommendItem).filter(it => it.title)
    } catch {
      return []
    }
  },
}
