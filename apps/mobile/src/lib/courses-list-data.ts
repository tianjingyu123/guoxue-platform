// 课程列表页数据层（真连后端 /courses）
// 后端契约确认（apps/server/src/modules/course/course.controller.ts + course.service.ts）：
//   - GET /courses            → { courses, total, page, pageSize }；course 字段见 adaptCard
//   - GET /courses/flash-sale → { sessions, courses:[{id,title,salePrice,originalPrice,discount,...}] }
//   注：列表端点 select 未返回逐课分类（categoryLevel1），分类 tab 从真实课程的
//       categoryLevel1 / circle.name 去重派生，保证分类筛选作用于真实数据。
import type { CourseCardData } from '@/lib/card-utils'
import { apiGet } from '@/utils/request'

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

function toNum(v: any): number { const x = Number(v); return Number.isFinite(x) ? x : 0 }

/** 取课程数组（后端 /courses 返回 { courses } 包裹，兼容数组/items/list） */
function toCourseList(d: any): any[] {
  if (Array.isArray(d)) return d
  return d?.courses ?? d?.items ?? d?.list ?? []
}

/** 单课程分类名（列表端点未返回 categoryLevel1 → 退到 circle.name；都无→空） */
function courseCategory(c: any): string {
  return c.categoryLevel1 || c.circle?.name || ''
}

/** 后端课程 → 前端课程卡 */
function adaptCard(c: any): CourseCardData & { category: string; free: boolean } {
  const price = toNum(c.price)
  const orig = toNum(c.originalPrice)
  return {
    id: c.id,
    title: c.title || '',
    cover: c.cover || '',
    coverRatio: '3:4',
    price,
    originalPrice: orig || price,
    free: price === 0,
    students: toNum(c.studentCount),
    lessons: toNum(c._count?.chapters),
    rating: 0, // 列表无评分，详情页另取
    teacher: c.user?.nickname || '',
    teacherAvatar: c.user?.avatar || '',
    category: courseCategory(c),
    tag: orig > price && price > 0 ? '优惠' : undefined,
  }
}

// ============ API 层 ============

export const coursesListApi = {
  /**
   * 课程列表 — GET /courses（错误向上抛走三态，不回退假数据）。
   * 后端无 category/sort 参数：分类按 card.category 客户端过滤；
   * 排序客户端处理（newest 复用后端 createdAt desc 原序）。
   */
  async list(category?: string, sort?: string): Promise<(CourseCardData & { category: string; free: boolean })[]> {
    const res = await apiGet<any>('/courses?page=1&pageSize=50')
    let data = toCourseList(res).map(adaptCard)
    if (category && category !== 'all') data = data.filter((c) => c.category === category)
    switch (sort) {
      case 'popular':
      case 'recommend':
        data = [...data].sort((a, b) => (b.students ?? 0) - (a.students ?? 0))
        break
      case 'price-asc':
        data = [...data].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
        break
      // 'newest' → 保持后端 createdAt desc 原序
    }
    return data
  },

  /**
   * 分类列表 — 从真实课程派生（后端列表端点无逐课分类字段，无独立分类筛选端点）。
   * 取真实课程的 categoryLevel1 / circle.name 去重，保证筛选作用于真实数据；
   * 无任何分类时仅返回「全部」（诚实降级）。
   */
  async getCategories(): Promise<CourseListCategory[]> {
    const res = await apiGet<any>('/courses?page=1&pageSize=50')
    const names = new Set<string>()
    for (const c of toCourseList(res)) {
      const name = courseCategory(c)
      if (name) names.add(name)
    }
    return [{ id: 'all', name: '全部' }, ...[...names].map((n) => ({ id: n, name: n }))]
  },

  /**
   * 推荐 Banner — 后端无专门推荐端点，复用 GET /courses 取学习人数最高的前 3 条。
   */
  async getRecommended(): Promise<RecommendedCourse[]> {
    const res = await apiGet<any>('/courses?page=1&pageSize=50')
    return toCourseList(res)
      .slice()
      .sort((a: any, b: any) => toNum(b.studentCount) - toNum(a.studentCount))
      .slice(0, 3)
      .map((c: any) => {
        const price = toNum(c.price)
        const orig = toNum(c.originalPrice)
        return {
          id: c.id,
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
    const res = await apiGet<any>('/courses/flash-sale')
    const courses = Array.isArray(res?.courses) ? res.courses : []
    const now = new Date()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime()
    const offsetMs = Math.max(0, endOfDay - now.getTime())
    return courses.map((c: any) => {
      const orig = toNum(c.originalPrice)
      const price = toNum(c.salePrice)
      const pct = toNum(c.discount) // 占原价百分比，如 25 → 2.5折
      return {
        id: c.id,
        title: c.title || '',
        price,
        originalPrice: orig,
        discount: pct > 0 ? `${(pct / 10).toFixed(1)}折` : '',
        offsetMs,
      }
    })
  },
}
