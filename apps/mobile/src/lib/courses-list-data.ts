// 课程列表页数据层（真连后端 /courses）
// 后端契约确认（apps/server/src/modules/course/course.controller.ts + course.service.ts）：
//   - GET /courses            → { courses, total, page, pageSize }；course 字段见 adaptCard
//   - GET /courses/flash-sale → { sessions, courses:[{id,title,salePrice,originalPrice,discount,...}] }
//   注：列表端点 select 未返回逐课分类（categoryLevel1），分类 tab 从真实课程的
//       categoryLevel1 / circle.name 去重派生，保证分类筛选作用于真实数据。
import type { CourseCardData } from '@/lib/card-utils'
import { apiGet, apiGetPaged } from '@/utils/request'

// 分类 - 纯文字，不带图标（运行时从真实课程派生，类型保留）
export interface CourseListCategory { id: string; name: string }

// 排序（前端客户端排序的运营配置，非 mock 数据）
export interface CourseSortOption { id: string; name: string }
export const courseSortOptions: CourseSortOption[] = [
  { id: 'recommend', name: '综合推荐' },
  { id: 'popular', name: '最受欢迎' },
  { id: 'newest', name: '最新上架' },
  { id: 'price-asc', name: '价格最低' },
]

// 推荐课程 Banner 数据
export interface RecommendedCourse {
  id: string
  title: string
  subtitle: string
  price: number
  originalPrice: number
  tag: string
  image: string
  hours: number // 页面 banner 未消费，保留供联调
}

// 限时优惠课程（倒计时初始偏移，单位毫秒）
export interface FlashSaleCourse {
  id: string
  title: string
  price: number
  originalPrice: number
  discount: string
  offsetMs: number // 距结束的毫秒数初值
}

// ============ 适配器 ============

/* —— 后端原始响应类型（容错适配用，字段宽松全 optional，仅声明 adapter 实际访问到的字段） —— */
/** 后端课程原始响应（/courses 列表项） */
interface RawCourse {
  id?: string
  title?: string
  cover?: string
  price?: number | string
  originalPrice?: number | string
  studentCount?: number | string
  intro?: string
  categoryLevel1?: string
  circle?: { name?: string } | null
  user?: { nickname?: string; avatar?: string } | null
  _count?: { chapters?: number } | null
}
/** 后端限时优惠课程原始响应（/courses/flash-sale 的 courses 项） */
interface RawFlashCourse {
  id?: string
  title?: string
  salePrice?: number | string
  originalPrice?: number | string
  discount?: number | string
}
/** 后端一级分类 tab 原始响应（/courses/category-tabs 项） */
interface RawCategoryTab { name?: string }

function toNum(v: unknown): number { const x = Number(v); return Number.isFinite(x) ? x : 0 }

/** 取课程数组（后端 /courses 返回 { courses } 包裹，兼容数组/items/list） */
function toCourseList<T = unknown>(d: unknown): T[] {
  if (Array.isArray(d)) return d as T[]
  const o = d as { courses?: T[]; items?: T[]; list?: T[] } | null | undefined
  return o?.courses ?? o?.items ?? o?.list ?? []
}

/** 单课程分类名（列表端点未返回 categoryLevel1 → 退到 circle.name；都无→空） */
function courseCategory(c: RawCourse): string {
  return c.categoryLevel1 || c.circle?.name || ''
}

/** 后端课程 → 前端课程卡 */
function adaptCard(c: RawCourse): CourseCardData & { category: string; free: boolean } {
  const price = toNum(c.price)
  const orig = toNum(c.originalPrice)
  return {
    id: c.id || '',
    title: c.title || '',
    cover: c.cover || '',
    coverRatio: '3:4',
    intro: c.intro || '',
    category: courseCategory(c),
    price,
    originalPrice: orig || price,
    free: price === 0,
    students: toNum(c.studentCount),
    lessons: toNum(c._count?.chapters),
    rating: 0, // 列表无评分，详情页另取
    teacher: c.user?.nickname || '',
    teacherAvatar: c.user?.avatar || '',
    tag: orig > price && price > 0 ? '优惠' : undefined,
  }
}

// ============ API 层 ============

export const coursesListApi = {
  /**
   * 课程列表 — GET /courses（分类/搜索/免费/排序全下沉后端，分页返回 {items,total}）。
   * 错误向上抛走三态，不回退假数据。
   */
  async list(params: {
    category?: string; keyword?: string; free?: boolean; sort?: string; page?: number; pageSize?: number
    minPrice?: number; maxPrice?: number
  }): Promise<{ items: (CourseCardData & { category: string; free: boolean })[]; total: number }> {
    const { category, keyword, free, sort, page = 1, pageSize = 20, minPrice, maxPrice } = params
    const qs: string[] = [`page=${page}`, `pageSize=${pageSize}`]
    if (category && category !== 'all') qs.push(`categoryLevel1=${encodeURIComponent(category)}`)
    if (keyword) qs.push(`keyword=${encodeURIComponent(keyword)}`)
    if (free) qs.push('free=true')
    if (sort) qs.push(`sort=${sort}`)
    if (minPrice !== undefined) qs.push(`minPrice=${minPrice}`)
    if (maxPrice !== undefined) qs.push(`maxPrice=${maxPrice}`)
    // /courses 含分页行键 courses → 拦截器转 {data:数组,pagination}，用 apiGetPaged 保留 total
    const { items, total } = await apiGetPaged<RawCourse>(`/courses?${qs.join('&')}`)
    return { items: items.map(adaptCard), total }
  },

  /**
   * 分类 tab — GET /courses/category-tabs（仅含真实有课程的一级品类+计数，不受分页影响）。
   * 无任何分类时仅返回「全部」（诚实降级）。
   */
  async getCategoryTabs(): Promise<CourseListCategory[]> {
    const list = await apiGet<RawCategoryTab[]>('/courses/category-tabs')
    const arr = Array.isArray(list) ? list : []
    return [{ id: 'all', name: '全部' }, ...arr.map((c: RawCategoryTab) => ({ id: c.name || '', name: c.name || '' }))]
  },

  /**
   * 推荐 Banner — 后端无专门推荐端点，复用 GET /courses?sort=popular 取学习人数最高的前 3 条。
   */
  async getRecommended(): Promise<RecommendedCourse[]> {
    const res = await apiGet<unknown>('/courses?page=1&pageSize=3&sort=popular')
    return toCourseList<RawCourse>(res)
      .slice(0, 3)
      .map((c: RawCourse) => {
        const price = toNum(c.price)
        const orig = toNum(c.originalPrice)
        return {
          id: c.id || '',
          title: c.title || '',
          subtitle: String(c.intro || '').slice(0, 20),
          price,
          originalPrice: orig || price,
          tag: orig > price && price > 0 ? '限时优惠' : '精品好课',
          image: c.cover || '',
          hours: 0,
        }
      })
  },

  /**
   * 限时优惠 — GET /courses/flash-sale。后端 discount 为 round(price/orig*100)，
   * 折算为「x.x折」；倒计时按会话当日 23:59:59 派生 offsetMs。
   */
  async getFlashSale(): Promise<FlashSaleCourse[]> {
    const res = await apiGet<{ courses?: RawFlashCourse[] }>('/courses/flash-sale')
    const courses = Array.isArray(res?.courses) ? res.courses : []
    const now = new Date()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime()
    const offsetMs = Math.max(0, endOfDay - now.getTime())
    return courses.map((c: RawFlashCourse) => {
      const orig = toNum(c.originalPrice)
      const price = toNum(c.salePrice)
      const pct = toNum(c.discount) // 占原价百分比，如 25 → 2.5折
      return {
        id: c.id || '',
        title: c.title || '',
        price,
        originalPrice: orig,
        discount: pct > 0 ? `${(pct / 10).toFixed(1)}折` : '',
        offsetMs,
      }
    })
  },
}
