// 课程模块数据(从原型 app/courses/page.tsx 迁移)
import type { CourseCardData } from '@/lib/card-utils'
import type { BannerItem } from '@/lib/home-data'
import { apiGet, useMock } from '@/utils/request'

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

// ============ 课程详情页 mock(从原型 app/courses/[id]/page.tsx 迁移) ============
// @data-needs: 课程详情, 参数 courseId, 返回 {id,title,cover,instructor:{id,name,avatar,title},price,originalPrice,students,rating,chapters,category,tag,isFree,description,objectives[],suitable[],isEnrolled,progress}
export interface CourseInstructor { id: string; name: string; avatar: string; title: string }
export interface CourseDetail {
  id: string; title: string; cover: string; instructor: CourseInstructor
  price: number; originalPrice: number; students: number; rating: number
  chapters: number; category: string; tag?: string; isFree: boolean
  description: string; objectives: string[]; suitable: string[]
  isEnrolled: boolean; progress: number
}
export const courseDetail: CourseDetail = {
  id: '1', title: '八字命理入门到精通',
  cover: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&h=450&fit=crop',
  instructor: { id: 'ins1', name: '张明远', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=master1', title: '资深命理师' },
  price: 299, originalPrice: 599, students: 12860, rating: 4.9, chapters: 32,
  category: '命理', tag: '热门', isFree: false,
  description: '本课程由资深命理师张明远老师主讲，从零基础开始，系统讲解八字命理的核心理论与实战技巧。课程涵盖天干地支、五行生克、十神论命、大运流年等核心内容，配合大量真实案例分析，让你快速掌握八字命理的精髓。',
  objectives: ['掌握天干地支的基本概念和五行属性', '理解八字排盘的原理和方法', '学会分析日主强弱和用神取用', '能够独立进行八字命盘分析'],
  suitable: ['对命理学感兴趣的初学者', '希望系统学习八字的爱好者', '想要提升命理水平的从业者'],
  isEnrolled: false, progress: 0,
}

// @data-needs: 课程章节, 参数 courseId, 返回 [{id,title,duration,isFree,lessons:[{id,title,duration,isFree,isCompleted}]}]
export interface CourseLesson { id: string; title: string; duration: number; isFree: boolean; isCompleted?: boolean }
export interface CourseChapter { id: string; title: string; duration: number; isFree: boolean; lessons: CourseLesson[] }
export const courseChapters: CourseChapter[] = [
  { id: 'c1', title: '第一章 八字命理概述', duration: 45, isFree: true, lessons: [
    { id: 'l1', title: '1.1 什么是八字命理', duration: 15, isFree: true },
    { id: 'l2', title: '1.2 八字命理的历史渊源', duration: 18, isFree: true },
    { id: 'l3', title: '1.3 学习八字的正确方法', duration: 12, isFree: false },
  ] },
  { id: 'c2', title: '第二章 天干地支基础', duration: 68, isFree: false, lessons: [
    { id: 'l4', title: '2.1 十天干详解', duration: 22, isFree: false },
    { id: 'l5', title: '2.2 十二地支详解', duration: 25, isFree: false },
    { id: 'l6', title: '2.3 干支配合规律', duration: 21, isFree: false },
  ] },
  { id: 'c3', title: '第三章 五行生克制化', duration: 72, isFree: false, lessons: [
    { id: 'l7', title: '3.1 五行的基本概念', duration: 18, isFree: false },
    { id: 'l8', title: '3.2 五行生克关系', duration: 28, isFree: false },
    { id: 'l9', title: '3.3 五行在命理中的应用', duration: 26, isFree: false },
  ] },
  { id: 'c4', title: '第四章 八字排盘实战', duration: 85, isFree: false, lessons: [
    { id: 'l10', title: '4.1 年柱的排法', duration: 20, isFree: false },
    { id: 'l11', title: '4.2 月柱的排法', duration: 22, isFree: false },
    { id: 'l12', title: '4.3 日柱的排法', duration: 18, isFree: false },
    { id: 'l13', title: '4.4 时柱的排法', duration: 25, isFree: false },
  ] },
]

// @data-needs: 课程评价, 参数 courseId, 返回 [{id,user:{id,name,avatar},rating,content,createdAt}]
export interface CourseReview { id: string; user: { id: string; name: string; avatar: string }; rating: number; content: string; createdAt: string }
export const courseReviews: CourseReview[] = [
  { id: 'r1', user: { id: 'u1', name: '易学爱好者', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=user1' }, rating: 5, content: '张老师讲得非常清晰，从零基础开始学完全能听懂。案例分析特别实用，已经可以给朋友简单看看八字了！', createdAt: '2024-01-15' },
  { id: 'r2', user: { id: 'u2', name: '命理新手', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=user2' }, rating: 5, content: '课程内容很系统，比看书效率高多了。特别是五行生克那部分，老师用图解的方式讲解，一下子就理解了。', createdAt: '2024-01-10' },
  { id: 'r3', user: { id: 'u3', name: '学习中', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=user3' }, rating: 4, content: '整体不错，就是希望能多一些实战案例的讲解。期待老师出进阶课程！', createdAt: '2024-01-05' },
]

// ============ 章节列表页(学习进度) mock(从原型 courses/[id]/chapters 迁移) ============
// @data-needs: 课程学习进度概览, 参数 courseId, 返回 {id,title,totalLessons,completedLessons,progressPercent}
export interface CourseProgress { id: string; title: string; totalLessons: number; completedLessons: number; progressPercent: number }
export const courseProgress: CourseProgress = {
  id: '1', title: '八字命理入门到精通', totalLessons: 32, completedLessons: 12, progressPercent: 38,
}

// @data-needs: 带学习状态的章节列表, 参数 courseId, 返回 [{id,title,lessons:[{id,title,duration(秒),status}]}], status∈completed|in-progress|available|locked
export type LessonStatus = 'completed' | 'in-progress' | 'available' | 'locked'
export interface ProgressLesson { id: string; title: string; duration: number; status: LessonStatus }
export interface ProgressChapter { id: string; title: string; lessons: ProgressLesson[] }
export const progressChapters: ProgressChapter[] = [
  { id: 'ch1', title: '第一章 八字基础概念', lessons: [
    { id: 'l1', title: '1.1 什么是八字命理', duration: 1520, status: 'completed' },
    { id: 'l2', title: '1.2 天干地支详解', duration: 1830, status: 'completed' },
    { id: 'l3', title: '1.3 阴阳五行基础', duration: 2100, status: 'completed' },
    { id: 'l4', title: '1.4 干支配合规律', duration: 1650, status: 'completed' },
  ] },
  { id: 'ch2', title: '第二章 排盘方法', lessons: [
    { id: 'l5', title: '2.1 年柱的排法', duration: 1420, status: 'completed' },
    { id: 'l6', title: '2.2 月柱的排法', duration: 1680, status: 'completed' },
    { id: 'l7', title: '2.3 日柱的排法', duration: 1550, status: 'completed' },
    { id: 'l8', title: '2.4 时柱的排法', duration: 1720, status: 'completed' },
  ] },
  { id: 'ch3', title: '第三章 十神详解', lessons: [
    { id: 'l9', title: '3.1 比劫的含义与作用', duration: 1850, status: 'completed' },
    { id: 'l10', title: '3.2 食伤的含义与作用', duration: 1920, status: 'completed' },
    { id: 'l11', title: '3.3 财星的含义与作用', duration: 1780, status: 'completed' },
    { id: 'l12', title: '3.4 官杀的含义与作用', duration: 1650, status: 'in-progress' },
    { id: 'l13', title: '3.5 印星的含义与作用', duration: 1880, status: 'available' },
  ] },
  { id: 'ch4', title: '第四章 格局分析', lessons: [
    { id: 'l14', title: '4.1 八格的判定方法', duration: 2100, status: 'available' },
    { id: 'l15', title: '4.2 正格与变格', duration: 1950, status: 'available' },
    { id: 'l16', title: '4.3 用神的取法', duration: 2250, status: 'available' },
    { id: 'l17', title: '4.4 格局高低判断', duration: 1820, status: 'available' },
  ] },
  { id: 'ch5', title: '第五章 大运流年', lessons: [
    { id: 'l18', title: '5.1 大运的排法', duration: 1680, status: 'locked' },
    { id: 'l19', title: '5.2 流年的看法', duration: 1750, status: 'locked' },
    { id: 'l20', title: '5.3 运年作用关系', duration: 1920, status: 'locked' },
    { id: 'l21', title: '5.4 吉凶判断要点', duration: 2080, status: 'locked' },
  ] },
]

// ============ 学习中心页(learn) mock(从原型 courses/[id]/learn 迁移) ============
// @data-needs: 学习中心聚合, 参数 courseId, 返回 { course, progress, chapters, notes, questions }
export interface LearnCourse { id: string; title: string; cover: string; instructor: { id: string; name: string; avatar: string; title: string }; totalLessons: number; totalDuration: number }
export const learnCourse: LearnCourse = {
  id: '1', title: '八字命理入门到精通',
  cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
  instructor: { id: '1', name: '李明远', avatar: 'https://i.pravatar.cc/100?img=11', title: '资深命理师' },
  totalLessons: 32, totalDuration: 1920,
}
export interface LearnProgress { courseId: string; completedLessons: string[]; totalLessons: number; progressPercent: number; lastLesson: { id: string; chapterId: string; title: string }; studyTime: number }
export const learnProgress: LearnProgress = {
  courseId: '1', completedLessons: ['l1', 'l2', 'l3', 'l4', 'l5'], totalLessons: 32, progressPercent: 15,
  lastLesson: { id: 'l6', chapterId: 'c2', title: '天干地支的阴阳属性' }, studyTime: 180,
}
export interface LearnLesson { id: string; title: string; duration: number; isFree: boolean; isCompleted: boolean }
export interface LearnChapter { id: string; title: string; duration: number; isFree: boolean; lessons: LearnLesson[] }
export const learnChapters: LearnChapter[] = [
  { id: 'c1', title: '第一章 八字基础概念', duration: 180, isFree: true, lessons: [
    { id: 'l1', title: '什么是八字命理', duration: 15, isFree: true, isCompleted: true },
    { id: 'l2', title: '八字的起源与发展', duration: 18, isFree: true, isCompleted: true },
    { id: 'l3', title: '四柱八字的构成', duration: 20, isFree: true, isCompleted: true },
  ] },
  { id: 'c2', title: '第二章 天干地支详解', duration: 240, isFree: false, lessons: [
    { id: 'l4', title: '十天干基础', duration: 25, isFree: false, isCompleted: true },
    { id: 'l5', title: '十二地支基础', duration: 25, isFree: false, isCompleted: true },
    { id: 'l6', title: '天干地支的阴阳属性', duration: 22, isFree: false, isCompleted: false },
    { id: 'l7', title: '干支的五行属性', duration: 28, isFree: false, isCompleted: false },
  ] },
  { id: 'c3', title: '第三章 排盘方法', duration: 300, isFree: false, lessons: [
    { id: 'l8', title: '年柱的推算', duration: 30, isFree: false, isCompleted: false },
    { id: 'l9', title: '月柱的推算', duration: 32, isFree: false, isCompleted: false },
    { id: 'l10', title: '日柱的推算', duration: 28, isFree: false, isCompleted: false },
  ] },
]
export interface LearnNote { id: string; content: string; chapterId: string; chapterTitle: string; lessonTitle: string; timestamp?: number; createdAt: string }
export const learnNotes: LearnNote[] = [
  { id: 'n1', content: '八字由年、月、日、时四柱组成，每柱包含天干地支，共八个字。', chapterId: 'c1', chapterTitle: '第一章 八字基础概念', lessonTitle: '四柱八字的构成', createdAt: '2024-01-15' },
  { id: 'n2', content: '十天干：甲乙丙丁戊己庚辛壬癸。其中甲丙戊庚壬为阳干，乙丁己辛癸为阴干。', chapterId: 'c2', chapterTitle: '第二章 天干地支详解', lessonTitle: '十天干基础', timestamp: 320, createdAt: '2024-01-16' },
  { id: 'n3', content: '十二地支：子丑寅卯辰巳午未申酉戌亥。对应十二生肖。', chapterId: 'c2', chapterTitle: '第二章 天干地支详解', lessonTitle: '十二地支基础', timestamp: 180, createdAt: '2024-01-16' },
]
export interface LearnQuestion { id: string; content: string; author: { id: string; name: string; avatar: string }; chapterTitle: string; createdAt: string; answers: number; isAnswered: boolean }
export const learnQuestions: LearnQuestion[] = [
  { id: 'q1', content: '请问老师，为什么说八字中日柱最重要？', author: { id: 'u1', name: '学习者小王', avatar: 'https://i.pravatar.cc/100?img=33' }, chapterTitle: '第一章', createdAt: '2024-01-18', answers: 3, isAnswered: true },
  { id: 'q2', content: '天干地支的阴阳划分有什么实际应用意义？', author: { id: 'u2', name: '命理新手', avatar: 'https://i.pravatar.cc/100?img=44' }, chapterTitle: '第二章', createdAt: '2024-01-17', answers: 5, isAnswered: true },
  { id: 'q3', content: '如何判断一个八字的五行是否平衡？', author: { id: 'u3', name: '易学爱好者', avatar: 'https://i.pravatar.cc/100?img=55' }, chapterTitle: '第三章', createdAt: '2024-01-16', answers: 0, isAnswered: false },
]

// ============ 视频播放页(player) mock(从原型 courses/[id]/player 迁移) ============
// @data-needs: 课时播放内容, 参数 lessonId, 返回 ChapterContent
export interface PlayerLesson { id: string; title: string; chapterId: string }
export interface ChapterContent { id: string; title: string; courseId: string; courseTitle: string; videoUrl: string; duration: number; currentProgress: number; nextLesson?: PlayerLesson; prevLesson?: PlayerLesson }
export const playerContent: ChapterContent = {
  id: '1', title: '第一课：八字基础概念', courseId: '1', courseTitle: '八字命理入门精讲',
  videoUrl: '', duration: 1800, currentProgress: 300,
  nextLesson: { id: '2', title: '第二课：天干地支', chapterId: 'ch1' }, prevLesson: undefined,
}
// @data-needs: 播放页章节目录, 参数 courseId, 返回 PlayerChapter[]
export interface PlayerChapterLesson { id: string; title: string; duration: number; isFree: boolean; isCompleted: boolean }
export interface PlayerChapter { id: string; title: string; duration: number; isFree: boolean; lessons: PlayerChapterLesson[] }
export const playerChapters: PlayerChapter[] = [
  { id: 'ch1', title: '第一章：基础入门', duration: 3600, isFree: true, lessons: [
    { id: '1', title: '八字基础概念', duration: 1800, isFree: true, isCompleted: true },
    { id: '2', title: '天干地支详解', duration: 1500, isFree: true, isCompleted: false },
    { id: '3', title: '五行生克关系', duration: 1200, isFree: false, isCompleted: false },
  ] },
  { id: 'ch2', title: '第二章：进阶应用', duration: 5400, isFree: false, lessons: [
    { id: '4', title: '八字排盘方法', duration: 1800, isFree: false, isCompleted: false },
    { id: '5', title: '十神详解', duration: 2000, isFree: false, isCompleted: false },
  ] },
]

// ============ 课程限时特惠页(flash-sale) mock(从原型 courses/flash-sale 迁移) ============
// @data-needs: 限时特惠场次, 参数 无, 返回 [{id,label,startTime,endTime,status}], status∈past|active|upcoming
export interface SaleSession { id: string; label: string; startTime: string; endTime: string; status: 'past' | 'active' | 'upcoming' }
export const saleSessions: SaleSession[] = [
  { id: '1', label: '10:00场', startTime: '10:00', endTime: '12:00', status: 'past' },
  { id: '2', label: '14:00场', startTime: '14:00', endTime: '16:00', status: 'active' },
  { id: '3', label: '20:00场', startTime: '20:00', endTime: '22:00', status: 'upcoming' },
]
// @data-needs: 特惠课程, 参数 sessionId, 返回 [{id,title,instructor,cover,originalPrice,salePrice,discount,students,rating,sessionId,sold,total,category}]
export interface SaleCourse { id: string; title: string; instructor: string; cover: string; originalPrice: number; salePrice: number; discount: number; students: number; rating: number; sessionId: string; sold: number; total: number; category: string }
export const saleCourses: SaleCourse[] = [
  { id: '1', title: '八字入门实战课', instructor: '周易大师', cover: '/static/marketing/course.png', originalPrice: 299, salePrice: 99, discount: 33, students: 2680, rating: 4.9, sessionId: '2', sold: 180, total: 200, category: '八字' },
  { id: '2', title: '紫微斗数精讲班', instructor: '张玄风', cover: '/static/marketing/course.png', originalPrice: 499, salePrice: 149, discount: 30, students: 1520, rating: 4.8, sessionId: '2', sold: 95, total: 100, category: '紫微' },
  { id: '3', title: '奇门遁甲高阶课', instructor: '林奇门', cover: '/static/marketing/luopan.png', originalPrice: 399, salePrice: 128, discount: 32, students: 980, rating: 4.7, sessionId: '2', sold: 48, total: 80, category: '奇门' },
  { id: '4', title: '风水堪舆实操班', instructor: '王德华', cover: '/static/marketing/luopan.png', originalPrice: 599, salePrice: 199, discount: 33, students: 860, rating: 4.8, sessionId: '3', sold: 0, total: 50, category: '风水' },
  { id: '5', title: '易经六十四卦速解', instructor: '李玄机', cover: '/static/marketing/course.png', originalPrice: 199, salePrice: 59, discount: 30, students: 3400, rating: 4.6, sessionId: '3', sold: 0, total: 100, category: '易经' },
]

// ============ 课程购买确认页(purchase-confirm) mock(从原型 courses/purchase-confirm 迁移) ============
// @data-needs: 待购课程信息, 参数 courseId, 返回 {id,title,cover,instructorName,chapters,price,originalPrice}
export interface PurchaseCourse { id: string; title: string; cover: string; instructorName: string; chapters: number; price: number; originalPrice: number }
export const purchaseCourse: PurchaseCourse = {
  id: '1', title: '八字命理入门到精通', cover: '/static/marketing/course.png',
  instructorName: '张老师', chapters: 32, price: 299, originalPrice: 599,
}
// @data-needs: 可用优惠券, 参数 scope=course, 返回 [{id,name,type,value,minAmount,maxDiscount,expireAt,isAvailable}], type∈amount|percent
export interface PurchaseCoupon { id: string; name: string; type: 'amount' | 'percent'; value: number; minAmount: number; maxDiscount?: number; expireAt: string; isAvailable: boolean }
export const purchaseCoupons: PurchaseCoupon[] = [
  { id: '1', name: '新人专享券', type: 'amount', value: 50, minAmount: 100, expireAt: '2024-12-31', isAvailable: true },
  { id: '2', name: '课程9折券', type: 'percent', value: 10, minAmount: 200, maxDiscount: 100, expireAt: '2024-06-30', isAvailable: true },
  { id: '3', name: '满300减30', type: 'amount', value: 30, minAmount: 300, expireAt: '2024-07-15', isAvailable: false },
]

// ============ 课程结业证书页(certificate) mock(从原型 courses/certificate 迁移) ============
// @data-needs: 结业证书, 参数 courseId, 返回 Certificate（证书图建议由后端/canvas 生成 imageUrl）
export interface Certificate { id: string; courseId: string; courseName: string; studentName: string; completedAt: string; certificateNo: string; instructor: string; totalHours: number; score?: number }
export const courseCertificate: Certificate = {
  id: 'cert-001', courseId: '1', courseName: '八字命理入门精讲', studentName: '张三',
  completedAt: '2026-06-16', certificateNo: 'RB2024010001', instructor: '李明德', totalHours: 32, score: 95,
}

// ============ 学习计划页(study-plan) mock(从原型 courses/study-plan 迁移) ============
// @data-needs: 学习目标, 参数 无, 返回 {daysPerWeek,minutesPerDay}
export interface StudyGoal { daysPerWeek: number; minutesPerDay: number }
export const studyGoal: StudyGoal = { daysPerWeek: 5, minutesPerDay: 30 }
// @data-needs: 计划中的课程, 参数 无, 返回 PlannedCourse[]（scheduledDays:0=周日…6=周六）
export interface PlannedCourse { id: string; courseId: string; title: string; cover: string; totalLessons: number; completedLessons: number; scheduledDays: number[]; order: number }
export const plannedCourses: PlannedCourse[] = [
  { id: 'pc1', courseId: 'c1', title: '八字命理入门精讲', cover: '/static/marketing/course.png', totalLessons: 32, completedLessons: 12, scheduledDays: [1, 3, 5], order: 0 },
  { id: 'pc2', courseId: 'c2', title: '紫微斗数基础课', cover: '/static/marketing/course.png', totalLessons: 24, completedLessons: 6, scheduledDays: [2, 4], order: 1 },
  { id: 'pc3', courseId: 'c3', title: '周易易经入门', cover: '/static/marketing/course.png', totalLessons: 18, completedLessons: 0, scheduledDays: [6], order: 2 },
]
// @data-needs: 连续打卡天数, 参数 无, 返回 number
export const studyStreak = 7
// 近30天打卡热力图（level:0-3）。原型用 Math.random() 生成（每次不同）；此处用确定性 pattern 保证可复现验收
export const checkInLevels: number[] = [
  2, 0, 1, 3, 2, 1, 0, 1, 2, 3, 1, 0, 2, 1, 3, 2, 0, 1, 2, 1, 3, 0, 2, 1, 1, 2, 3, 1, 2, 1,
]

// ============ 作业提交页(work-submit) mock(从原型 courses/work-submit 迁移) ============
// @data-needs: 作业要求, 参数 chapterId, 返回 WorkRequirement
export interface WorkRequirement { id: string; title: string; description: string; chapterTitle: string; courseTitle: string; deadline?: string; maxImages: number; minWords: number }
export const workRequirement: WorkRequirement = {
  id: '1', title: '八字命理基础练习',
  description: '请根据本章节所学内容，分析以下八字命盘的五行分布，并写出你的解读思路。要求：\n1. 分析命盘五行强弱\n2. 找出命主的喜用神\n3. 简要分析命主性格特点\n\n提示：可以参考课程中的案例分析方法，结合自己的理解进行作答。',
  chapterTitle: '第三章：五行生克与喜用神', courseTitle: '八字命理入门精讲',
  deadline: '2024-12-31 23:59', maxImages: 9, minWords: 100,
}

// ============ 作业批改页(work-review) mock(从原型 courses/work-review 迁移) ============
// @data-needs: 作业提交列表, 参数 courseId, 返回 WorkSubmission[]
export interface WorkSubmission { id: string; student: { id: string; name: string; avatar: string }; chapterId: string; chapterTitle: string; content: string; images: string[]; submittedAt: string; status: 'pending' | 'graded' | 'returned'; wordCount: number }
export const workSubmissions: WorkSubmission[] = [
  {
    id: '1', student: { id: 's1', name: '张三', avatar: '' }, chapterId: 'c1', chapterTitle: '第一章：八字基础',
    content: '通过本章学习，我了解到八字命理的核心是以出生时间为基础，用天干地支来表示。天干有十个：甲、乙、丙、丁、戊、己、庚、辛、壬、癸；地支有十二个：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。\n\n八字中最重要的是日主，代表命主本人。通过分析日主与其他七个字的关系，可以推断一个人的性格特点和命运走向。',
    images: ['/images/courses/work-1.jpg', '/images/courses/work-2.jpg'], submittedAt: '2024-01-15 14:30', status: 'pending', wordCount: 156,
  },
  {
    id: '2', student: { id: 's2', name: '李四', avatar: '' }, chapterId: 'c1', chapterTitle: '第一章：八字基础',
    content: '八字命理学习心得：天干地支是基础，需要熟练掌握。日主很重要，是分析的核心。',
    images: [], submittedAt: '2024-01-15 15:20', status: 'pending', wordCount: 42,
  },
  {
    id: '3', student: { id: 's3', name: '王五', avatar: '' }, chapterId: 'c2', chapterTitle: '第二章：五行生克',
    content: '五行相生：木生火、火生土、土生金、金生水、水生木。五行相克：木克土、土克水、水克火、火克金、金克木。这些关系在八字分析中非常重要。',
    images: ['/images/courses/work-3.jpg'], submittedAt: '2024-01-14 10:15', status: 'graded', wordCount: 78,
  },
]

// ============ 作业批改结果页(work-result) mock(从原型 courses/work-result 迁移) ============
// @data-needs: 作业批改结果, 参数 workId, 返回 WorkResult（status∈pending|graded|returned）
export interface WorkResult {
  id: string; chapterId: string; status: 'pending' | 'graded' | 'returned'
  chapterTitle: string; courseTitle: string
  content: string; images: string[]; submittedAt: string
  score?: number; maxScore: number
  gradedBy?: { name: string; avatar: string }
  teacherComment?: string; gradedAt?: string
  suggestions?: string[]
  canResubmit?: boolean
}
export const workResult: WorkResult = {
  id: '1', chapterId: 'c1', status: 'graded',
  chapterTitle: '第一章：八字基础', courseTitle: '八字命理入门精讲',
  content: '通过本章学习，我对八字命理有了初步的认识。八字由年柱、月柱、日柱、时柱组成，每柱包含一个天干和一个地支。天干有甲、乙、丙、丁、戊、己、庚、辛、壬、癸十个，地支有子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥十二个。\n\n日主代表命主本人，是分析的核心。',
  images: ['/static/marketing/course.png', '/static/marketing/course.png'],
  submittedAt: '2024-01-15 14:30',
  score: 85, maxScore: 100,
  gradedBy: { name: '周易大师', avatar: '/static/marketing/course.png' },
  teacherComment: '作业完成得很好！对八字的基本概念理解准确，举例也很恰当。建议在后续学习中多练习排盘，加深对天干地支的记忆。',
  gradedAt: '2024-01-16 09:15',
  suggestions: ['建议补充五行生克关系的说明', '可以尝试分析自己的八字加深理解'],
  canResubmit: true,
}

// ── API ──
export const courseApi = {
  /** 获取课程列表 GET /courses */
  async getList(params?: Record<string, any>): Promise<Course[]> {
    if (useMock()) return allCourses
    try { return await apiGet<Course[]>('/courses', params) } catch { return allCourses }
  },

  /** 获取课程详情 GET /courses/:id */
  async getDetail(id: string): Promise<CourseDetail> {
    if (useMock()) return courseDetail
    try { return await apiGet<CourseDetail>(`/courses/${id}`) } catch { return courseDetail }
  },

  /** 获取课程章节 GET /courses/:id/chapters */
  async getChapters(id: string): Promise<CourseChapter[]> {
    if (useMock()) return courseChapters
    try { return await apiGet<CourseChapter[]>(`/courses/${id}/chapters`) } catch { return courseChapters }
  },

  /** 获取课程评价 GET /courses/:id/reviews */
  async getReviews(id: string): Promise<CourseReview[]> {
    if (useMock()) return courseReviews
    try { return await apiGet<CourseReview[]>(`/courses/${id}/reviews`) } catch { return courseReviews }
  },

  /** 获取课程学习进度 GET /courses/:id/progress */
  async getProgress(id: string): Promise<CourseProgress> {
    if (useMock()) return courseProgress
    try { return await apiGet<CourseProgress>(`/courses/${id}/progress`) } catch { return courseProgress }
  },

  /** 获取课程轮播 Banner GET /courses/banners */
  async getBanners(): Promise<BannerItem[]> {
    if (useMock()) return courseBanners
    try { return await apiGet<BannerItem[]>('/courses/banners') } catch { return courseBanners }
  },

  /** 获取课程结业证书 GET /courses/:id/certificate */
  async getCertificate(id: string): Promise<Certificate> {
    if (useMock()) return courseCertificate
    try { return await apiGet<Certificate>(`/courses/${id}/certificate`) } catch { return courseCertificate }
  },

  /** 获取限时特惠聚合 GET /courses/flash-sale */
  async getFlashSale(): Promise<{ sessions: SaleSession[]; courses: SaleCourse[] }> {
    if (useMock()) return { sessions: saleSessions, courses: saleCourses }
    try { return await apiGet<{ sessions: SaleSession[]; courses: SaleCourse[] }>('/courses/flash-sale') } catch { return { sessions: saleSessions, courses: saleCourses } }
  },

  /** 获取学习计划聚合 GET /courses/study-plan */
  async getStudyPlan(): Promise<{ goal: StudyGoal; courses: PlannedCourse[]; streak: number; checkInLevels: number[] }> {
    if (useMock()) return { goal: studyGoal, courses: plannedCourses, streak: studyStreak, checkInLevels }
    try { return await apiGet('/courses/study-plan') } catch { return { goal: studyGoal, courses: plannedCourses, streak: studyStreak, checkInLevels } }
  },

  /** 获取课程章节学习进度（含状态） GET /courses/:id/progress-chapters */
  async getProgressChapters(id: string): Promise<ProgressChapter[]> {
    if (useMock()) return progressChapters
    try { return await apiGet<ProgressChapter[]>(`/courses/${id}/progress-chapters`) } catch { return progressChapters }
  },

  /** 获取课程分类导航 GET /courses/categories */
  async getCategoryNav(): Promise<CourseCategory[]> {
    if (useMock()) return categoryNav
    try { return await apiGet<CourseCategory[]>('/courses/categories') } catch { return categoryNav }
  },

  /** 获取精选筛选项 GET /courses/feed-filters */
  async getFeedFilters(): Promise<{ id: string; label: string }[]> {
    if (useMock()) return feedFilters
    try { return await apiGet<{ id: string; label: string }[]>('/courses/feed-filters') } catch { return feedFilters }
  },
}
