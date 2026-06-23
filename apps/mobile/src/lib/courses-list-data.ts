// 课程列表页数据（从原型 app/courses-list/page.tsx 迁移，mock 照抄原型）
import type { CourseCardData } from '@/lib/card-utils'
import { apiGet, useMock } from '@/utils/request'

// 分类 - 纯文字，不带图标
export interface CourseListCategory { id: string; name: string }
export const courseListCategories: CourseListCategory[] = [
  { id: 'all', name: '全部' },
  { id: 'bazi', name: '八字命理' },
  { id: 'ziwei', name: '紫微斗数' },
  { id: 'fengshui', name: '风水堪舆' },
  { id: 'yijing', name: '易经' },
  { id: 'mianxiang', name: '面相手相' },
  { id: 'qimen', name: '奇门遁甲' },
  { id: 'liuyao', name: '六爻预测' },
]

// 排序
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
  hours: number // 距结束的小时数(原型为 endTime, 此处保留相对值供联调替换)
}
export const recommendedCourses: RecommendedCourse[] = [
  { id: 'featured-1', title: '八字命理大师班', subtitle: '零基础到精通', price: 1999, originalPrice: 3999, tag: '限时5折', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80', hours: 48 },
  { id: 'featured-2', title: '紫微斗数精讲', subtitle: '名师亲授', price: 999, originalPrice: 1999, tag: '即将涨价', image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80', hours: 24 },
  { id: 'featured-3', title: '风水堪舆实战', subtitle: '案例教学', price: 1299, originalPrice: 2599, tag: '新课首发', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80', hours: 72 },
]

// 限时优惠课程(倒计时初始值, 单位:毫秒偏移)
export interface FlashSaleCourse {
  id: string
  title: string
  price: number
  originalPrice: number
  discount: string
  offsetMs: number // 距结束的毫秒数初值
}
export const flashSaleCourses: FlashSaleCourse[] = [
  { id: 'flash-1', title: '六爻预测入门', price: 49, originalPrice: 199, discount: '2.5折', offsetMs: 3600 * 1000 * 5 },
  { id: 'flash-2', title: '面相识人术', price: 69, originalPrice: 299, discount: '2.3折', offsetMs: 3600 * 1000 * 8 },
  { id: 'flash-3', title: '姓名学精讲', price: 39, originalPrice: 149, discount: '2.6折', offsetMs: 3600 * 1000 * 12 },
]

// 课程列表 mock(照抄原型 mockCourses, 映射为 CourseCardData 供 course-card 复用)
export const courseListMock: (CourseCardData & { category: string; free: boolean })[] = [
  { id: '1', title: '八字入门实战课：从零开始学命理', teacher: '周易大师', teacherAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&q=80', price: 199, originalPrice: 399, students: 2860, rating: 4.9, lessons: 48, category: 'bazi', tag: 'TOP1', free: false, cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80', coverRatio: '3:4' },
  { id: '2', title: '紫微斗数命盘解读进阶', teacher: '张玄风', teacherAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80', price: 299, originalPrice: 599, students: 1560, rating: 4.8, lessons: 36, category: 'ziwei', tag: '新品', free: false, cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80', coverRatio: '3:4' },
  { id: '3', title: '风水布局入门精讲', teacher: '陈风水', teacherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', price: 0, originalPrice: 99, students: 5280, rating: 4.7, lessons: 12, category: 'fengshui', free: true, cover: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80', coverRatio: '3:4' },
  { id: '4', title: '姓名学与起名技巧', teacher: '李国学', teacherAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80', price: 149, originalPrice: 199, students: 1280, rating: 4.8, lessons: 18, category: 'bazi', free: false, cover: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&q=80', coverRatio: '3:4' },
  { id: '5', title: '易经六十四卦精讲', teacher: '周易大师', teacherAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&q=80', price: 399, originalPrice: 599, students: 3560, rating: 4.9, lessons: 64, category: 'yijing', tag: '热销', free: false, cover: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=400&q=80', coverRatio: '3:4' },
  { id: '6', title: '面相入门与识人术', teacher: '王相师', teacherAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&q=80', price: 99, originalPrice: 149, students: 2180, rating: 4.6, lessons: 15, category: 'mianxiang', free: false, cover: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&q=80', coverRatio: '3:4' },
  { id: '7', title: '奇门遁甲入门班', teacher: '玄学居士', teacherAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80', price: 299, originalPrice: 499, students: 980, rating: 4.8, lessons: 24, category: 'qimen', tag: '高阶', free: false, cover: 'https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=400&q=80', coverRatio: '3:4' },
  { id: '8', title: '六爻预测实战技法', teacher: '张玄风', teacherAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80', price: 199, originalPrice: 299, students: 1520, rating: 4.7, lessons: 20, category: 'liuyao', free: false, cover: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=400&q=80', coverRatio: '3:4' },
]

export interface CoursesListResponse {
  categories: CourseListCategory[]
  sortOptions: CourseSortOption[]
  recommended: RecommendedCourse[]
  flashSale: FlashSaleCourse[]
  courses: (CourseCardData & { category: string; free: boolean })[]
}

export const coursesListApi = {
  /** 获取课程列表页数据 GET /courses */
  async getList(params?: { category?: string; sort?: string }): Promise<CoursesListResponse> {
    if (useMock()) return {
      categories: courseListCategories,
      sortOptions: courseSortOptions,
      recommended: recommendedCourses,
      flashSale: flashSaleCourses,
      courses: courseListMock,
    }
    try { return await apiGet<CoursesListResponse>('/courses', params) } catch {
      return {
        categories: courseListCategories,
        sortOptions: courseSortOptions,
        recommended: recommendedCourses,
        flashSale: flashSaleCourses,
        courses: courseListMock,
      }
    }
  },
}
