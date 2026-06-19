// 课程模块数据(从原型 app/courses/page.tsx 迁移)
import type { CourseCardData } from '@/lib/card-utils'
import type { BannerItem } from '@/lib/home-data'

// 课程首页 Banner
export const courseBanners: BannerItem[] = [
  { id: 'b1', image: '/static/images/banners/banner-1.png', title: '八字命理系统精讲 · 限时五折', link: '/course/c4' },
  { id: 'b2', image: '/static/images/banners/banner-2.png', title: '紫微斗数大师直播课 火热报名', link: '/course/c1' },
  { id: 'b3', image: '/static/images/banners/banner-3.png', title: '新人专享 · 名师好课首单立减', link: '/courses/flash-sale' },
]

// 分类导航(图标式)
export interface CourseCategory { id: string; label: string; icon: string; color: string }
export const categoryNav: CourseCategory[] = [
  { id: 'bazi', label: '八字命理', icon: 'scroll-text', color: '#c0392b' },
  { id: 'ziwei', label: '紫微斗数', icon: 'star', color: '#8e44ad' },
  { id: 'fengshui', label: '风水堪舆', icon: 'compass', color: '#16a085' },
  { id: 'yijing', label: '易经', icon: 'book-marked', color: '#2980b9' },
  { id: 'zhongyi', label: '中医养生', icon: 'stethoscope', color: '#27ae60' },
  { id: 'yangsheng', label: '养生', icon: 'leaf', color: '#7f8c8d' },
  { id: 'shufa', label: '书法', icon: 'pen-tool', color: '#d35400' },
  { id: 'qimen', label: '奇门遁甲', icon: 'mountain', color: '#2c3e50' },
]

export type Course = CourseCardData & { category: string; isNew?: boolean; flashSale?: boolean }

export const allCourses: Course[] = [
  { id: 'c1', category: 'ziwei', title: '紫微斗数入门到精通', cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80', coverRatio: '1:1', teacher: '林道长', teacherAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80', price: 199, originalPrice: 399, students: 3200, lessons: 36, rating: 4.9, tag: '热销', flashSale: true },
  { id: 'c2', category: 'fengshui', title: '风水堪舆实战班', cover: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80', coverRatio: '1:1', teacher: '王大师', teacherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', price: 299, originalPrice: 599, students: 1800, lessons: 48, rating: 4.8, tag: '热销' },
  { id: 'c3', category: 'liuyao', title: '六爻预测从零开始', cover: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=400&q=80', coverRatio: '3:4', teacher: '陈老师', teacherAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80', price: 128, originalPrice: 299, students: 1300, lessons: 24, rating: 4.7, flashSale: true },
  { id: 'c4', category: 'bazi', title: '八字命理系统精讲', cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80', coverRatio: '1:1', teacher: '张师傅', teacherAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&q=80', price: 268, originalPrice: 498, students: 4100, lessons: 52, rating: 4.9, tag: '热销' },
  { id: 'c5', category: 'qimen', title: '奇门遁甲实战应用', cover: 'https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=400&q=80', coverRatio: '3:4', teacher: '赵先生', teacherAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80', price: 388, originalPrice: 688, students: 920, lessons: 40, rating: 4.8 },
  { id: 'c6', category: 'qiming', title: '宝宝起名改名全攻略', cover: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&q=80', coverRatio: '1:1', teacher: '李老师', teacherAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80', price: 99, originalPrice: 199, students: 2700, lessons: 18, rating: 4.7, tag: '新品', isNew: true },
  { id: 'c7', category: 'mianxiang', title: '面相识人快速入门', cover: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&q=80', coverRatio: '3:4', teacher: '周老师', teacherAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&q=80', price: 0, free: true, students: 8600, lessons: 12, rating: 4.6 },
  { id: 'c8', category: 'bazi', title: '八字合婚实操课', cover: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&q=80', coverRatio: '1:1', teacher: '孙大师', teacherAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&q=80', price: 0, free: true, students: 1500, lessons: 20, rating: 4.8 },
  { id: 'c9', category: 'ziwei', title: '紫微飞星进阶秘传', cover: 'https://images.unsplash.com/photo-1532074205216-d0e1f4b87368?w=400&q=80', coverRatio: '3:4', teacher: '林道长', teacherAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80', price: 458, originalPrice: 888, students: 680, lessons: 60, rating: 4.9, tag: '新品', isNew: true },
  { id: 'c10', category: 'fengshui', title: '阳宅风水布局详解', cover: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80', coverRatio: '1:1', teacher: '王大师', teacherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', price: 199, originalPrice: 399, students: 2200, lessons: 32, rating: 4.7, isNew: true },
]

// 派生专栏(与原型一致)
export const featured = allCourses.filter((c) => c.tag === '热销').slice(0, 6)
export const ranking = [...allCourses].sort((a, b) => (b.students ?? 0) - (a.students ?? 0)).slice(0, 5)
export const flashSaleCourses = allCourses.filter((c) => c.flashSale)
export const freeCourses = allCourses.filter((c) => c.free)
export const newCourses = allCourses.filter((c) => c.isNew)

// 为你精选 分类筛选项
export const feedFilters = [
  { id: 'all', label: '全部' },
  { id: 'bazi', label: '八字命理' },
  { id: 'ziwei', label: '紫微斗数' },
  { id: 'fengshui', label: '风水堪舆' },
  { id: 'qimen', label: '奇门遁甲' },
  { id: 'mianxiang', label: '面相手相' },
]
