import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { courseApi } from '@/api'

/** 课程条目 */
export interface CourseItem {
  id: string
  title: string
  description?: string
  cover?: string
  instructor?: string
  category?: string
  totalChapters?: number
  difficulty?: string
  duration?: number
  studentCount?: number
  createdAt?: string
}

/** 课程章节 */
export interface ChapterItem {
  id: string
  courseId: string
  title: string
  summary?: string
  duration?: number
  sort?: number
  isFree?: boolean
  videoUrl?: string
  content?: string
  createdAt?: string
}

/** 学习进度 */
export interface ProgressData {
  courseId: string
  courseProgress: number // 0-100 总进度百分比
  completedChapters: string[] // 已完成的章节ID列表
  chapterProgress: Record<string, number> // 章节ID -> 进度(0-100)
  lastChapterId?: string
  lastStudyAt?: string
}

export const useCourseStore = defineStore('course', () => {
  // ========== State ==========
  const courses = ref<CourseItem[]>([])
  const currentCourse = ref<CourseItem | null>(null)
  const chapters = ref<ChapterItem[]>([])
  const progress = ref<ProgressData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ========== Getters ==========
  /** 已完成的章节列表 */
  const completedChapters = computed<(ChapterItem & { progress: number })[]>(() => {
    if (!progress.value || !chapters.value.length) return []
    return chapters.value
      .filter((ch) => progress.value!.completedChapters.includes(ch.id))
      .map((ch) => ({
        ...ch,
        progress: progress.value!.chapterProgress[ch.id] ?? 100,
      }))
  })

  /** 当前课程的总进度百分比 */
  const totalProgress = computed(() => progress.value?.courseProgress ?? 0)

  // ========== Actions ==========

  /** 获取课程列表 */
  async function fetchCourses(params?: Record<string, any>) {
    loading.value = true
    error.value = null
    try {
      const res: any = await courseApi.list(params)
      if (Array.isArray(res)) {
        courses.value = res as CourseItem[]
      } else if (res.list || res.items) {
        courses.value = (res.list || res.items) as CourseItem[]
      }
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取课程列表失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 获取课程详情 */
  async function fetchDetail(id: string) {
    loading.value = true
    error.value = null
    try {
      const res: any = await courseApi.detail(id)
      currentCourse.value = res as CourseItem
      // 自动拉取进度
      await fetchProgress(id)
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取课程详情失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 获取课程章节列表 */
  async function fetchChapters(courseId: string) {
    loading.value = true
    error.value = null
    try {
      const res: any = await courseApi.chapters(courseId)
      if (Array.isArray(res)) {
        chapters.value = res as ChapterItem[]
      } else if (res.list || res.items) {
        chapters.value = (res.list || res.items) as ChapterItem[]
      }
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取章节列表失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 获取学习进度 */
  async function fetchProgress(courseId: string) {
    try {
      const res: any = await courseApi.myProgress(courseId)
      progress.value = res as ProgressData
    } catch {
      // 进度拉取失败不阻塞主流程
      progress.value = null
    }
  }

  /** 更新章节进度 */
  async function updateProgress(chapterId: string, chapterProgress: number) {
    loading.value = true
    error.value = null
    try {
      await courseApi.updateProgress(chapterId, chapterProgress)
      // 更新本地进度缓存
      if (progress.value) {
        progress.value.chapterProgress[chapterId] = chapterProgress
        if (chapterProgress >= 100 && !progress.value.completedChapters.includes(chapterId)) {
          progress.value.completedChapters.push(chapterId)
        }
        // 重新计算总进度
        if (currentCourse.value?.totalChapters && chapters.value.length > 0) {
          const completed = progress.value.completedChapters.length
          const total = chapters.value.length
          progress.value.courseProgress = Math.round((completed / total) * 100)
        }
      }
    } catch (e: any) {
      error.value = e.errMsg || e.message || '更新进度失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 提交作业/练习（由具体章节页面调用） */
  async function submitWork(chapterId: string, content: string) {
    loading.value = true
    error.value = null
    try {
      const res: any = await courseApi.submitWork(chapterId, content)
      uni.showToast({ title: '提交成功', icon: 'success' })
      return res
    } catch (e: any) {
      error.value = e.errMsg || e.message || '提交失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    courses,
    currentCourse,
    chapters,
    progress,
    loading,
    error,
    // getters
    completedChapters,
    totalProgress,
    // actions
    fetchCourses,
    fetchDetail,
    fetchChapters,
    updateProgress,
    submitWork,
  }
})
