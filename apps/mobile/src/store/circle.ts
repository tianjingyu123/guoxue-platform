import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { circleApi } from '@/api'

/** 圈子 */
export interface CircleItem {
  id: string
  name: string
  description?: string
  cover?: string
  icon?: string
  memberCount?: number
  postCount?: number
  category?: string
  isJoined?: boolean
  createdAt?: string
}

/** 帖子 */
export interface CirclePost {
  id: string
  circleId: string
  title: string
  content?: string
  images?: string[]
  author?: {
    id: string
    nickname: string
    avatar: string
  }
  likeCount?: number
  commentCount?: number
  isLiked?: boolean
  isCollected?: boolean
  createdAt?: string
}

export const useCircleStore = defineStore('circle', () => {
  // ========== State ==========
  const circles = ref<CircleItem[]>([])
  const currentCircle = ref<CircleItem | null>(null)
  const posts = ref<CirclePost[]>([])
  const myCircles = ref<CircleItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ========== Getters ==========
  /** 当前圈子是否已加入 */
  const isMember = computed(() => currentCircle.value?.isJoined ?? false)

  /** 当前圈子帖子数 */
  const postCount = computed(() => currentCircle.value?.postCount ?? 0)

  // ========== Actions ==========

  /** 获取圈子列表 */
  async function fetchCircles(params?: Record<string, any>) {
    loading.value = true
    error.value = null
    try {
      const res: any = await circleApi.list(params)
      if (Array.isArray(res)) {
        circles.value = res as CircleItem[]
      } else if (res.list || res.items) {
        circles.value = (res.list || res.items) as CircleItem[]
      }
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取圈子列表失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 获取圈子详情 */
  async function fetchDetail(id: string) {
    loading.value = true
    error.value = null
    try {
      const res: any = await circleApi.detail(id)
      currentCircle.value = res as CircleItem
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取圈子详情失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 获取圈子帖子列表 */
  async function fetchPosts(circleId: string, params?: Record<string, any>) {
    loading.value = true
    error.value = null
    try {
      const res: any = await circleApi.posts(circleId, params)
      if (Array.isArray(res)) {
        posts.value = res as CirclePost[]
      } else if (res.list || res.items) {
        posts.value = (res.list || res.items) as CirclePost[]
      }
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取帖子列表失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 加入圈子 */
  async function joinCircle(id: string) {
    loading.value = true
    error.value = null
    try {
      await circleApi.join(id)
      // 更新本地状态
      if (currentCircle.value?.id === id) {
        currentCircle.value.isJoined = true
      }
      const circle = circles.value.find((c) => c.id === id)
      if (circle) circle.isJoined = true
      uni.showToast({ title: '加入成功', icon: 'success' })
    } catch (e: any) {
      error.value = e.errMsg || e.message || '加入圈子失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 退出圈子 */
  async function leaveCircle(id: string) {
    loading.value = true
    error.value = null
    try {
      await circleApi.leave(id)
      // 更新本地状态
      if (currentCircle.value?.id === id) {
        currentCircle.value.isJoined = false
      }
      const circle = circles.value.find((c) => c.id === id)
      if (circle) circle.isJoined = false
      uni.showToast({ title: '已退出圈子', icon: 'none' })
    } catch (e: any) {
      error.value = e.errMsg || e.message || '退出圈子失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 发帖 */
  async function createPost(circleId: string, data: { title: string; content?: string; images?: string[] }) {
    loading.value = true
    error.value = null
    try {
      const res: any = await circleApi.createPost(circleId, data)
      uni.showToast({ title: '发布成功', icon: 'success' })
      return res
    } catch (e: any) {
      error.value = e.errMsg || e.message || '发布失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 获取我的圈子列表 */
  async function fetchMyCircles() {
    loading.value = true
    error.value = null
    try {
      // 后端应支持 ?joined=true 参数来过滤已加入的圈子
      const res: any = await circleApi.list({ joined: true })
      if (Array.isArray(res)) {
        myCircles.value = res as CircleItem[]
        // 同步到 circles 列表中的状态
        for (const mc of myCircles.value) {
          const found = circles.value.find((c) => c.id === mc.id)
          if (found) found.isJoined = true
        }
      } else if (res.list || res.items) {
        myCircles.value = (res.list || res.items) as CircleItem[]
      }
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取我的圈子失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    circles,
    currentCircle,
    posts,
    myCircles,
    loading,
    error,
    // getters
    isMember,
    postCount,
    // actions
    fetchCircles,
    fetchDetail,
    fetchPosts,
    joinCircle,
    leaveCircle,
    createPost,
    fetchMyCircles,
  }
})
