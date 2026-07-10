// 课程模块数据(从原型 app/courses/page.tsx 迁移)
import type { CourseCardData } from '@/lib/card-utils'
import type { BannerItem } from '@/lib/home-data'
import { apiGet, apiPost, apiPut, apiGetPaged, useMock } from '@/utils/request'

// 课程首页 Banner
export const courseBanners: BannerItem[] = [
  { id: 'b1', image: 'https://api.rebugx.cn/assets/images/banners/banner-1.webp', title: '八字命理系统精讲 · 限时五折', link: '/course/c4' },
  { id: 'b2', image: 'https://api.rebugx.cn/assets/images/banners/banner-2.webp', title: '紫微斗数大师直播课 火热报名', link: '/course/c1' },
  { id: 'b3', image: 'https://api.rebugx.cn/assets/images/banners/banner-3.webp', title: '新人专享 · 名师好课首单立减', link: '/courses/flash-sale' },
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

// 为你精选 分类筛选项（运营配置，非 mock）
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
  memberFree: boolean // 会员专属精品课（有效会员免费学习·2026-07-03 会员权益）
  description: string; objectives: string[]; suitable: string[]
  detailImages: string[] // 课程介绍详情图（后台编辑器上传·简介区按顺序无缝拼接展示）
  isEnrolled: boolean; progress: number
}
// @data-needs: 课程章节, 参数 courseId, 返回 [{id,title,duration,isFree,lessons:[{id,title,duration,isFree,isCompleted}]}]
export interface CourseLesson { id: string; title: string; duration: number; isFree: boolean; isCompleted?: boolean }
export interface CourseChapter { id: string; title: string; duration: number; isFree: boolean; lessons: CourseLesson[] }
// @data-needs: 课程评价, 参数 courseId, 返回 [{id,user:{id,name,avatar},rating,content,createdAt}]
export interface CourseReview { id: string; user: { id: string; name: string; avatar: string }; rating: number; content: string; reply?: string; createdAt: string }
// ============ 章节列表页(学习进度) ============
// @data-needs: 课程学习进度概览, 参数 courseId, 返回 {id,title,totalLessons,completedLessons,progressPercent}
export interface CourseProgress { id: string; title: string; totalLessons: number; completedLessons: number; progressPercent: number }
// @data-needs: 带学习状态的章节列表, 参数 courseId, 返回 [{id,title,lessons:[{id,title,duration(秒),status}]}], status∈completed|in-progress|available|locked
export type LessonStatus = 'completed' | 'in-progress' | 'available' | 'locked'
export interface ProgressLesson { id: string; title: string; duration: number; status: LessonStatus }
export interface ProgressChapter { id: string; title: string; lessons: ProgressLesson[] }
// ============ 学习中心页(learn) ============
// @data-needs: 学习中心聚合, 参数 courseId, 返回 { course, progress, chapters, notes, questions }
export interface LearnCourse { id: string; title: string; cover: string; instructor: { id: string; name: string; avatar: string; title: string }; totalLessons: number; totalDuration: number }
export interface LearnProgress { courseId: string; completedLessons: string[]; totalLessons: number; progressPercent: number; lastLesson: { id: string; chapterId: string; title: string }; studyTime: number }
export interface LearnLesson { id: string; title: string; duration: number; isFree: boolean; isCompleted: boolean }
export interface LearnChapter { id: string; title: string; duration: number; isFree: boolean; lessons: LearnLesson[] }
export interface LearnNote { id: string; content: string; chapterId: string; chapterTitle: string; lessonTitle: string; timestamp?: number; createdAt: string }
export interface LearnQuestion { id: string; content: string; author: { id: string; name: string; avatar: string }; chapterTitle: string; createdAt: string; answers: number; isAnswered: boolean }

// ============ 视频播放页(player) mock(从原型 courses/[id]/player 迁移) ============
// @data-needs: 课时播放内容, 参数 lessonId, 返回 ChapterContent
export interface PlayerLesson { id: string; title: string; chapterId: string }
export interface ChapterContent { id: string; title: string; courseId: string; courseTitle: string; cover: string; videoUrl: string; duration: number; currentProgress: number; nextLesson?: PlayerLesson; prevLesson?: PlayerLesson }
// @data-needs: 播放页章节目录, 参数 courseId, 返回 PlayerChapter[]
export interface PlayerChapterLesson { id: string; title: string; duration: number; isFree: boolean; isCompleted: boolean }
export interface PlayerChapter { id: string; title: string; duration: number; isFree: boolean; lessons: PlayerChapterLesson[] }
// ============ 课程限时特惠页(flash-sale) ============
// @data-needs: 限时特惠场次, 参数 无, 返回 [{id,label,startTime,endTime,status}], status∈past|active|upcoming
export interface SaleSession { id: string; label: string; startTime: string; endTime: string; status: 'past' | 'active' | 'upcoming' }
// @data-needs: 特惠课程, 参数 sessionId, 返回 [{id,title,instructor,cover,originalPrice,salePrice,discount,students,rating,sessionId,sold,total,category}]
export interface SaleCourse { id: string; title: string; instructor: string; cover: string; originalPrice: number; salePrice: number; discount: number; students: number; rating: number; sessionId: string; sold: number; total: number; category: string }

// ============ 课程购买确认页(purchase-confirm) ============
// @data-needs: 待购课程信息, 参数 courseId, 返回 {id,title,cover,instructorName,chapters,price,originalPrice}
export interface PurchaseCourse { id: string; title: string; cover: string; instructorName: string; chapters: number; price: number; originalPrice: number }
// @data-needs: 可用优惠券, 参数 scope=course, 返回 [{id,name,type,value,minAmount,maxDiscount,expireAt,isAvailable}], type∈amount|percent
export interface PurchaseCoupon { id: string; name: string; type: 'amount' | 'percent'; value: number; minAmount: number; maxDiscount?: number; expireAt: string; isAvailable: boolean }

// ============ 课程结业证书页(certificate) ============
// @data-needs: 结业证书, 参数 courseId, 返回 Certificate（证书图建议由后端/canvas 生成 imageUrl）
export interface Certificate { id: string; courseId: string; courseName: string; studentName: string; completedAt: string; certificateNo: string; instructor: string; totalHours: number; score?: number }

// ============ 学习计划页(study-plan) ============
export interface StudyGoal { daysPerWeek: number; minutesPerDay: number }
// @data-needs: 计划中的课程（scheduledDays:0=周日…6=周六）
export interface PlannedCourse { id: string; courseId: string; title: string; cover: string; totalLessons: number; completedLessons: number; scheduledDays: number[]; order: number }

// ============ 作业提交页(work-submit) ============
export interface WorkRequirement { id: string; title: string; description: string; chapterTitle: string; courseTitle: string; deadline?: string; maxImages: number; minWords: number }

// ============ 作业批改页(work-review) ============
export interface WorkSubmission { id: string; student: { id: string; name: string; avatar: string }; chapterId: string; chapterTitle: string; content: string; images: string[]; submittedAt: string; status: 'pending' | 'graded' | 'returned'; wordCount: number }

// ============ 作业批改结果页(work-result) ============
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

// ============ API 层 ============

// ───────── 后端字段适配（前端 /course 单数 → 后端 /courses 复数 + 结构适配）─────────

/* —— 后端原始响应类型（容错适配用，字段宽松全 optional，仅声明 adapter 实际访问到的字段） —— */
/** 后端 User 精简字段（讲师/学员/作者通用） */
interface RawUserLite { id?: string; nickname?: string; avatar?: string }
/** 后端 _count 聚合 */
interface RawCount { chapters?: number; reviews?: number; answers?: number }
/** 后端课程原始响应 */
interface RawCourse {
  id?: string
  title?: string
  cover?: string | null
  intro?: string
  price?: number | string
  originalPrice?: number | string
  studentCount?: number
  type?: string
  auditStatus?: string
  circleId?: string | null
  categoryLevel1?: string
  circle?: { name?: string } | null
  user?: RawUserLite | null
  chapters?: unknown[]
  _count?: RawCount | null
}
/** 后端课程评分聚合 */
interface RawRating { avgRating?: number }
/** 后端章节原始响应 */
interface RawChapter {
  id?: string
  title?: string
  duration?: number | string
  freeTrial?: boolean
  sortOrder?: number
  courseId?: string
  course?: { id?: string; title?: string } | null
  mediaUrl?: string
  content?: string
}
/** 后端学习进度记录 */
interface RawProgress { chapterId?: string; completed?: boolean; progress?: number | string; updatedAt?: string | null }
/** 后端课程评价 */
interface RawReview { id?: string; user?: RawUserLite | null; rating?: number | string; content?: string; reply?: string; createdAt?: string | null }
/** 后端课程提问 */
interface RawQuestion { id?: string; content?: string; user?: RawUserLite | null; chapter?: { title?: string } | null; createdAt?: string | null; answerCount?: number; status?: string; _count?: RawCount | null }
/** 后端作业（含 user/chapter/course join） */
interface RawWork { id?: string; userId?: string; user?: RawUserLite | null; chapterId?: string; chapter?: { title?: string } | null; course?: { title?: string } | null; content?: string; createdAt?: string | null; score?: number | null; feedback?: string }
/** 后端结业证书 */
interface RawCertificate { id?: string; courseId?: string; courseName?: string; studentName?: string; completedAt?: string; certificateNo?: string; instructor?: string; totalHours?: number | string; score?: number | null }
/** 后端限时特惠课程 */
interface RawSaleCourse { id?: string; title?: string; instructor?: string; cover?: string; originalPrice?: number | string; salePrice?: number | string; discount?: number | string; students?: number | string; rating?: number | string; sessionId?: string; sold?: number | string; total?: number | string; category?: string }
/** 后端学习计划中的课程 */
interface RawPlannedCourse { id?: string; courseId?: string; title?: string; cover?: string; totalLessons?: number | string; completedLessons?: number | string; scheduledDays?: number[]; order?: number | string }
/** 后端我创建的课程（讲师管理台） */
interface RawCreatedCourse { id?: string; title?: string; cover?: string | null; type?: string; price?: number | string; auditStatus?: string; studentCount?: number; circleId?: string | null; createdAt?: string | null; _count?: RawCount | null }

function toNum(v: unknown): number { const x = Number(v); return Number.isFinite(x) ? x : 0 }

/** 后端课程 → 前端课程卡 Course */
function adaptCourseCard(c: RawCourse): Course {
  const price = toNum(c.price)
  const orig = toNum(c.originalPrice)
  return {
    // id 由后端真实返回理论恒在，补 || '' 满足 Course.id 必填类型
    id: c.id || '',
    title: c.title || '',
    cover: c.cover || '',
    coverRatio: '1:1',
    price,
    originalPrice: orig || price,
    free: price === 0,
    students: toNum(c.studentCount),
    lessons: toNum(c._count?.chapters),
    rating: 0, // 列表无评分，详情页另取
    teacher: c.user?.nickname || '',
    teacherAvatar: c.user?.avatar || '',
    category: c.categoryLevel1 || c.circle?.name || '',
    isNew: false,
    flashSale: orig > price && price > 0,
  }
}

/** 后端课程详情 → 前端 CourseDetail（objectives/suitable 后端无→空，页面隐藏） */
function adaptCourseDetail(c: RawCourse, rating?: RawRating | null): CourseDetail {
  const price = toNum(c.price)
  const orig = toNum(c.originalPrice)
  return {
    id: c.id || '',
    title: c.title || '',
    cover: c.cover || '',
    instructor: { id: c.user?.id || '', name: c.user?.nickname || '讲师', avatar: c.user?.avatar || '', title: '主讲老师' },
    price,
    originalPrice: orig || price,
    students: toNum(c.studentCount),
    rating: rating?.avgRating ?? 0,
    chapters: Array.isArray(c.chapters) ? c.chapters.length : toNum(c._count?.chapters),
    category: c.categoryLevel1 || '',
    tag: undefined,
    isFree: price === 0,
    memberFree: !!(c as { memberFree?: boolean }).memberFree,
    description: c.intro || '',
    objectives: [],
    suitable: [],
    detailImages: Array.isArray((c as { detailImages?: string[] }).detailImages)
      ? ((c as { detailImages?: string[] }).detailImages as string[])
      : [],
    isEnrolled: false,
    progress: 0,
  }
}

/** 后端单级章节 → 前端「章-课时」结构（后端每章节包成一个含单课时的章） */
function adaptChapters(arr: unknown): CourseChapter[] {
  const list = Array.isArray(arr) ? (arr as RawChapter[]) : ((arr as { items?: RawChapter[] })?.items ?? [])
  return list.map((ch) => ({
    id: ch.id || '',
    title: ch.title || '',
    duration: toNum(ch.duration),
    isFree: !!ch.freeTrial,
    lessons: [{ id: ch.id || '', title: ch.title || '', duration: toNum(ch.duration), isFree: !!ch.freeTrial }],
  }))
}

/** 后端评价 → 前端 CourseReview */
function adaptReviews(arr: unknown): CourseReview[] {
  const list = Array.isArray(arr) ? (arr as RawReview[]) : ((arr as { reviews?: RawReview[]; items?: RawReview[] })?.reviews ?? (arr as { items?: RawReview[] })?.items ?? [])
  return list.map((r) => ({
    id: r.id || '',
    user: { id: r.user?.id || '', name: r.user?.nickname || '匿名', avatar: r.user?.avatar || '' },
    rating: toNum(r.rating),
    content: r.content || '',
    reply: r.reply || '',
    createdAt: r.createdAt ? String(r.createdAt).slice(0, 10) : '',
  }))
}

/** 取列表（后端可能返回数组或 {list/items/courses} 包裹），泛型化避免 any[] */
function toList<T = unknown>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const d = data as { list?: T[]; items?: T[]; courses?: T[] } | null | undefined
  return d?.list ?? d?.items ?? d?.courses ?? []
}

/** 后端作业(含 user/chapter join) → 前端 WorkSubmission（图片从 content 末尾 markdown 提取） */
function adaptWorkSubmission(w: RawWork): WorkSubmission {
  const images: string[] = []
  const content = String(w.content || '')
    .replace(/!\[作业图片\]\(([^)]+)\)/g, (_m: string, url: string) => { images.push(url); return '' })
    .trim()
  return {
    id: w.id || '',
    student: { id: w.user?.id || w.userId || '', name: w.user?.nickname || '学员', avatar: w.user?.avatar || '' },
    chapterId: w.chapterId || '',
    chapterTitle: w.chapter?.title || '',
    content,
    images,
    submittedAt: w.createdAt ? String(w.createdAt).replace('T', ' ').slice(0, 16) : '',
    status: w.score != null ? 'graded' : 'pending',
    wordCount: content.length,
  }
}

/** 讲师创作管理台 - 我创建的课程卡片 */
export interface CreatedCourse {
  id: string
  title: string
  cover: string
  type: string
  price: number
  auditStatus: string
  visibility: string // SELF_ONLY=机审降级仅自己可见（列表灰色小标·点击看说明与申诉指引）
  studentCount: number
  circleId: string | null
  chapterCount: number
  reviewCount: number
  createdAt: string
}

export const courseApi = {
  /** 创建课程 — POST /courses（需讲师认证 APPROVED，后端 CourseCreatorGuard 拦截 + course_publish 开关；detailImages 介绍详情图最多6张；visibility 开放范围 CIRCLE_ONLY 默认/PLATFORM 全平台·发布即可见，机审后台异步） */
  create: (body: { circleId?: string; title: string; cover?: string; intro?: string; type?: string; price?: number; tags?: string[]; categoryLevel1?: string; categoryLevel2?: string; validityDays?: number; detailImages?: string[]; visibility?: 'CIRCLE_ONLY' | 'PLATFORM' }) =>
    apiPost<{ id: string }>('/courses', body),

  /** 我创建的课程（讲师管理台）— GET /courses/created（含审核状态/章节·评价计数；空→空态，错→错误态） */
  async getCreatedCourses(page = 1, pageSize = 20): Promise<{ items: CreatedCourse[]; total: number }> {
    const res = await apiGetPaged<RawCreatedCourse>(`/courses/created?page=${page}&pageSize=${pageSize}`)
    return {
      items: res.items.map((c) => ({
        id: c.id || '',
        title: c.title || '',
        cover: c.cover || '',
        type: c.type || '',
        price: Number(c.price ?? 0),
        auditStatus: c.auditStatus || 'PENDING',
        visibility: (c as { visibility?: string }).visibility || 'CIRCLE_ONLY',
        studentCount: c.studentCount ?? 0,
        circleId: c.circleId ?? null,
        chapterCount: c._count?.chapters ?? 0,
        reviewCount: c._count?.reviews ?? 0,
        createdAt: c.createdAt ? String(c.createdAt).slice(0, 10) : '',
      })),
      total: res.total,
    }
  },

  /** 讲师回复课程评价 — PUT /courses/reviews/:reviewId/reply（仅本人课程，后端归属校验） */
  replyReview: (reviewId: string, reply: string) =>
    apiPut(`/courses/reviews/${reviewId}/reply`, { reply }),

  /** 课程首页 — GET /courses 列表 + 前端派生（banner/分类=运营配置；错误传播给页面三态，不回退假数据）*/
  async getHome(): Promise<{
    banners: BannerItem[]
    categories: CourseCategory[]
    featured: Course[]
    ranking: Course[]
    flashSale: Course[]
    free: Course[]
    newCourses: Course[]
    allCourses: Course[]
    feedFilters: typeof feedFilters
  }> {
    const res = await apiGet<unknown>('/courses?pageSize=50')
    const courses: Course[] = toList<RawCourse>(res).map(adaptCourseCard)
    return {
      banners: courseBanners,
      categories: categoryNav,
      featured: courses.filter((c) => c.flashSale).slice(0, 6),
      ranking: [...courses].sort((a, b) => (b.students ?? 0) - (a.students ?? 0)).slice(0, 5),
      flashSale: courses.filter((c) => c.flashSale),
      free: courses.filter((c) => c.free),
      newCourses: courses.slice(0, 6),
      allCourses: courses,
      feedFilters,
    }
  },

  /** 课程详情 — GET /courses/:id (+ /rating)；错误传播给页面三态 */
  async getDetail(id: string): Promise<CourseDetail> {
    const [c, rating] = await Promise.all([
      apiGet<RawCourse>(`/courses/${id}`),
      apiGet<RawRating>(`/courses/${id}/rating`).catch(() => null),
    ])
    return adaptCourseDetail(c, rating)
  },

  /** 课程章节 — GET /courses/:id/chapters（空→空态，错→错误态，不回退假数据） */
  async getChapters(id: string): Promise<CourseChapter[]> {
    return adaptChapters(await apiGet<unknown>(`/courses/${id}/chapters`))
  },

  /** 课程评价 — GET /courses/:id/reviews（空→空态，错→错误态） */
  async getReviews(id: string): Promise<CourseReview[]> {
    return adaptReviews(await apiGet<unknown>(`/courses/${id}/reviews`))
  },

  /** 课程访问权限 — GET /courses/:id/access（已购/会员→true；未登录/未购→false，静默降级不抛错） */
  async checkAccess(id: string): Promise<boolean> {
    try {
      const res = await apiGet<{ hasAccess?: boolean }>(`/courses/${id}/access`)
      return !!res?.hasAccess
    } catch {
      return false
    }
  },

  /** 是否已收藏 — GET /interaction/collect（在我的收藏中匹配 COURSE·未登录静默 false） */
  async isFavorited(id: string): Promise<boolean> {
    try {
      const res = await apiGet<{ items?: { targetType?: string; targetId?: string }[] }>('/interaction/collect?pageSize=200')
      return (res?.items ?? []).some((it) => it.targetType === 'COURSE' && it.targetId === id)
    } catch {
      return false
    }
  },

  /** 收藏/取消收藏课程 — POST /interaction/collect（后端 toggle，返回最新收藏态 collected） */
  async toggleFavorite(id: string): Promise<boolean> {
    const res = await apiPost<{ collected?: boolean }>('/interaction/collect', { targetType: 'COURSE', targetId: id })
    return !!res?.collected
  },

  /** 学习进度概览 — 合并 GET /courses/:id/chapters + /progress + 课程标题 */
  async getProgress(id: string): Promise<CourseProgress> {
    const [chapters, progress, course] = await Promise.all([
      apiGet<unknown>(`/courses/${id}/chapters`),
      apiGet<unknown>(`/courses/${id}/progress`),
      apiGet<RawCourse>(`/courses/${id}`).catch(() => null),
    ])
    const chList = toList<RawChapter>(chapters)
    const prog = toList<RawProgress>(progress)
    const total = chList.length
    const completed = prog.filter((p) => p.completed).length
    return {
      id,
      title: course?.title || '',
      totalLessons: total,
      completedLessons: completed,
      progressPercent: total ? Math.round((completed / total) * 100) : 0,
    }
  },

  /** 带学习状态的章节列表 — 合并 GET /courses/:id/chapters + /progress（后端单级章节包成「章含一课时」） */
  async getProgressChapters(id: string): Promise<ProgressChapter[]> {
    const [chapters, progress] = await Promise.all([
      apiGet<unknown>(`/courses/${id}/chapters`),
      apiGet<unknown>(`/courses/${id}/progress`).catch(() => []),
    ])
    const chList = toList<RawChapter>(chapters).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const progMap = new Map<string, RawProgress>(toList<RawProgress>(progress).map((p): [string, RawProgress] => [p.chapterId || '', p]))
    return chList.map((ch) => {
      const p = progMap.get(ch.id || '')
      let status: LessonStatus
      if (p?.completed) status = 'completed'
      else if (p && toNum(p.progress) > 0) status = 'in-progress'
      else status = 'available' // 无逐章购买信息时不臆造 locked，访问权由章节内容接口服务端兜底
      return { id: ch.id || '', title: ch.title || '', lessons: [{ id: ch.id || '', title: ch.title || '', duration: toNum(ch.duration), status }] }
    })
  },

  /** 学习中心聚合 — 组合 GET /courses/:id (+/chapters +/progress +/questions)；笔记/学习时长后端暂无→空/0诚实降级 */
  async getLearnData(id: string): Promise<{
    course: LearnCourse
    progress: LearnProgress
    chapters: LearnChapter[]
    notes: LearnNote[]
    questions: LearnQuestion[]
  }> {
    const [course, chaptersRaw, progressRaw, questionsRaw] = await Promise.all([
      apiGet<RawCourse>(`/courses/${id}`),
      apiGet<unknown>(`/courses/${id}/chapters`),
      apiGet<unknown>(`/courses/${id}/progress`).catch(() => []),
      apiGet<{ questions?: RawQuestion[] }>(`/courses/${id}/questions`).catch(() => ({ questions: [] })),
    ])
    const chs = toList<RawChapter>(chaptersRaw).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const prog = toList<RawProgress>(progressRaw)
    const progMap = new Map<string, RawProgress>(prog.map((p): [string, RawProgress] => [p.chapterId || '', p]))
    const completedIds = prog.filter((p) => p.completed).map((p) => p.chapterId || '')
    const totalLessons = chs.length
    const totalDuration = chs.reduce((s: number, c) => s + toNum(c.duration), 0)
    const learnCourseData: LearnCourse = {
      id: course.id || '', title: course.title || '', cover: course.cover || '',
      instructor: { id: course.user?.id || '', name: course.user?.nickname || '讲师', avatar: course.user?.avatar || '', title: '主讲老师' },
      totalLessons, totalDuration,
    }
    const sortedProg = [...prog].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    const lastP = sortedProg[0]
    const lastCh = (lastP ? chs.find((c) => c.id === lastP.chapterId) : chs[0]) || chs[0]
    const learnProgressData: LearnProgress = {
      courseId: id, completedLessons: completedIds, totalLessons,
      progressPercent: totalLessons ? Math.round((completedIds.length / totalLessons) * 100) : 0,
      lastLesson: lastCh ? { id: lastCh.id || '', chapterId: lastCh.id || '', title: lastCh.title || '' } : { id: '', chapterId: '', title: '' },
      studyTime: 0,
    }
    const learnChaptersData: LearnChapter[] = chs.map((ch) => ({
      id: ch.id || '', title: ch.title || '', duration: toNum(ch.duration), isFree: !!ch.freeTrial,
      lessons: [{ id: ch.id || '', title: ch.title || '', duration: toNum(ch.duration), isFree: !!ch.freeTrial, isCompleted: !!progMap.get(ch.id || '')?.completed }],
    }))
    const qList = questionsRaw?.questions ?? toList<RawQuestion>(questionsRaw)
    const learnQuestionsData: LearnQuestion[] = qList.map((q) => ({
      id: q.id || '', content: q.content || '',
      author: { id: q.user?.id || '', name: q.user?.nickname || '匿名', avatar: q.user?.avatar || '' },
      chapterTitle: q.chapter?.title || '',
      createdAt: q.createdAt ? String(q.createdAt).slice(0, 10) : '',
      answers: toNum(q.answerCount ?? q._count?.answers),
      isAnswered: q.status === 'ANSWERED' || !!q.answerCount,
    }))
    return { course: learnCourseData, progress: learnProgressData, chapters: learnChaptersData, notes: [], questions: learnQuestionsData }
  },

  /** 学生提问 — POST /courses/:id/questions（需登录·后端 AskQuestionDto={question,chapterId?}） */
  async askQuestion(courseId: string, question: string, chapterId?: string): Promise<void> {
    await apiPost(`/courses/${courseId}/questions`, chapterId ? { question, chapterId } : { question })
  },

  /** 课时播放内容 — GET /courses/chapters/:chapterId/content（需购买/会员，服务端鉴权）+ 兄弟章节做前后课时 */
  async getPlayerContent(lessonId: string): Promise<ChapterContent> {
    const ch = await apiGet<RawChapter>(`/courses/chapters/${lessonId}/content`)
    const courseId = ch.courseId || ch.course?.id || ''
    const [chapters, course, progress] = await Promise.all([
      courseId ? apiGet<unknown>(`/courses/${courseId}/chapters`).catch(() => []) : Promise.resolve([]),
      courseId ? apiGet<RawCourse>(`/courses/${courseId}`).catch(() => null) : Promise.resolve(null),
      courseId ? apiGet<unknown>(`/courses/${courseId}/progress`).catch(() => []) : Promise.resolve([]),
    ])
    const list = toList<RawChapter>(chapters).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const idx = list.findIndex((c) => c.id === lessonId)
    const prev = idx > 0 ? list[idx - 1] : undefined
    const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : undefined
    const myProg = toList<RawProgress>(progress).find((p) => p.chapterId === lessonId)
    const duration = toNum(ch.duration)
    return {
      id: ch.id || '',
      title: ch.title || '',
      courseId,
      courseTitle: course?.title || '',
      cover: course?.cover || '',
      videoUrl: ch.mediaUrl || ch.content || '',
      duration,
      currentProgress: myProg ? Math.round((toNum(myProg.progress) / 100) * duration) : 0,
      nextLesson: next ? { id: next.id || '', title: next.title || '', chapterId: next.id || '' } : undefined,
      prevLesson: prev ? { id: prev.id || '', title: prev.title || '', chapterId: prev.id || '' } : undefined,
    }
  },

  /** 播放页章节目录 — GET /courses/:id/chapters + /progress（单级章节包成「章含一课时」） */
  async getPlayerChapters(id: string): Promise<PlayerChapter[]> {
    const [chapters, progress] = await Promise.all([
      apiGet<unknown>(`/courses/${id}/chapters`),
      apiGet<unknown>(`/courses/${id}/progress`).catch(() => []),
    ])
    const chList = toList<RawChapter>(chapters).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const progMap = new Map<string, RawProgress>(toList<RawProgress>(progress).map((p): [string, RawProgress] => [p.chapterId || '', p]))
    return chList.map((ch) => ({
      id: ch.id || '',
      title: ch.title || '',
      duration: toNum(ch.duration),
      isFree: !!ch.freeTrial,
      lessons: [{ id: ch.id || '', title: ch.title || '', duration: toNum(ch.duration), isFree: !!ch.freeTrial, isCompleted: !!progMap.get(ch.id || '')?.completed }],
    }))
  },

  /** 限时特惠场次 — GET /courses/flash-sale（折扣课派生，单场进行中） */
  async getSaleSessions(): Promise<SaleSession[]> {
    const d = await apiGet<{ sessions?: SaleSession[]; courses?: RawSaleCourse[] }>('/courses/flash-sale')
    return d.sessions ?? []
  },

  /** 特惠课程 — GET /courses/flash-sale */
  async getSaleCourses(sessionId?: string): Promise<SaleCourse[]> {
    const d = await apiGet<{ sessions?: SaleSession[]; courses?: RawSaleCourse[] }>('/courses/flash-sale')
    const list: SaleCourse[] = (d.courses ?? []).map((c) => ({
      id: c.id || '', title: c.title || '', instructor: c.instructor || '讲师', cover: c.cover || '',
      originalPrice: toNum(c.originalPrice), salePrice: toNum(c.salePrice), discount: toNum(c.discount),
      students: toNum(c.students), rating: toNum(c.rating), sessionId: c.sessionId || 'active',
      sold: toNum(c.sold), total: toNum(c.total), category: c.category || '',
    }))
    return sessionId ? list.filter((c) => c.sessionId === sessionId) : list
  },

  /** 待购课程信息 — GET /courses/:id 取子集 */
  async getPurchaseCourse(id: string): Promise<PurchaseCourse> {
    const c = await apiGet<RawCourse>(`/courses/${id}`)
    return {
      id: c.id || '',
      title: c.title || '',
      cover: c.cover || '',
      instructorName: c.user?.nickname || '讲师',
      chapters: Array.isArray(c.chapters) ? c.chapters.length : toNum(c._count?.chapters),
      price: toNum(c.price),
      originalPrice: toNum(c.originalPrice) || toNum(c.price),
    }
  },

  /** 可用优惠券 — 课程券为独立功能，后端券系统面向商城商品，课程暂无→诚实空态 */
  async getPurchaseCoupons(): Promise<PurchaseCoupon[]> {
    return []
  },

  /** 结业证书 — GET /courses/:id/certificate（未学完则后端 403→页面错误态提示） */
  async getCertificate(id: string): Promise<Certificate> {
    const c = await apiGet<RawCertificate>(`/courses/${id}/certificate`)
    return {
      id: c.id || '',
      courseId: c.courseId || '',
      courseName: c.courseName || '',
      studentName: c.studentName || '',
      completedAt: c.completedAt || '',
      certificateNo: c.certificateNo || '',
      instructor: c.instructor || '',
      totalHours: toNum(c.totalHours),
      score: c.score != null ? toNum(c.score) : undefined,
    }
  },

  /** 学习计划 — GET /courses/study-plan（从已购课+进度派生，需登录） */
  async getStudyPlan(): Promise<{
    goal: StudyGoal
    courses: PlannedCourse[]
    streak: number
    checkInLevels: number[]
  }> {
    const d = await apiGet<{ goal?: StudyGoal; courses?: RawPlannedCourse[]; streak?: number; checkInLevels?: number[] }>('/courses/study-plan')
    return {
      goal: d.goal ?? { daysPerWeek: 5, minutesPerDay: 30 },
      courses: (d.courses ?? []).map((c) => ({
        id: c.id || '', courseId: c.courseId || '', title: c.title || '', cover: c.cover || '',
        totalLessons: toNum(c.totalLessons), completedLessons: toNum(c.completedLessons),
        scheduledDays: c.scheduledDays ?? [], order: toNum(c.order),
      })),
      streak: toNum(d.streak),
      checkInLevels: d.checkInLevels ?? [],
    }
  },

  /** 作业要求 — 后端无作业题库，取真实章节/课程名 + 通用提交指引（非臆造具体题目） */
  async getWorkRequirement(chapterId: string): Promise<WorkRequirement> {
    const ch = await apiGet<RawChapter>(`/courses/chapters/${chapterId}/content`)
    const courseId = ch.courseId || ch.course?.id || ''
    const course = courseId ? await apiGet<RawCourse>(`/courses/${courseId}`).catch(() => null) : null
    return {
      id: chapterId,
      title: `${ch.title || '本章'} · 课后作业`,
      description: '请结合本章所学内容，提交你的学习心得与练习思考。要求：条理清晰、结合课程案例展开，鼓励图文并茂。',
      chapterTitle: ch.title || '',
      courseTitle: course?.title || '',
      maxImages: 9,
      minWords: 100,
    }
  },

  /** 作业提交列表 — GET /courses/:id/works（后端已 join user/chapter） */
  async getWorkSubmissions(id: string): Promise<WorkSubmission[]> {
    const data = await apiGet<unknown>(`/courses/${id}/works`)
    return toList<RawWork>(data).map(adaptWorkSubmission)
  },

  /** 作业批改结果 — GET /courses/works/:workId（gradedAt/批改人名/建议 后端暂无→降级） */
  async getWorkResult(workId: string): Promise<WorkResult> {
    const w = await apiGet<RawWork>(`/courses/works/${workId}`)
    const images: string[] = []
    const content = String(w.content || '')
      .replace(/!\[作业图片\]\(([^)]+)\)/g, (_m: string, url: string) => { images.push(url); return '' })
      .trim()
    const graded = w.score != null
    return {
      id: w.id || '',
      chapterId: w.chapterId || '',
      status: graded ? 'graded' : 'pending',
      chapterTitle: w.chapter?.title || '',
      courseTitle: w.course?.title || '',
      content,
      images,
      submittedAt: w.createdAt ? String(w.createdAt).replace('T', ' ').slice(0, 16) : '',
      score: graded ? toNum(w.score) : undefined,
      maxScore: 100,
      gradedBy: graded ? { name: '讲师', avatar: '' } : undefined,
      teacherComment: w.feedback || undefined,
      suggestions: [],
      canResubmit: false,
    }
  },
}
