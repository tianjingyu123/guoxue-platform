import { defineStore } from 'pinia'
import { ref } from 'vue'
import { interactApi } from '@/api'

/** 评论 */
export interface CommentItem {
  id: string
  targetType: string
  targetId: string
  content: string
  author: {
    id: string
    nickname: string
    avatar: string
  }
  replyTo?: {
    id: string
    nickname: string
  }
  likeCount?: number
  createdAt: string
}

/** 收藏项 */
export interface CollectItem {
  id: string
  targetType: string
  targetId: string
  title?: string
  cover?: string
  createdAt: string
}

export const useInteractionStore = defineStore('interaction', () => {
  // ========== State ==========
  /** 点赞状态 Map，key 为 `${targetType}:${targetId}` */
  const likes = ref<Map<string, boolean>>(new Map())
  /** 收藏列表 */
  const collects = ref<CollectItem[]>([])
  /** 评论列表 */
  const comments = ref<CommentItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ========== Getters ==========
  /** 是否已点赞 */
  function isLiked(targetType: string, targetId: string): boolean {
    return likes.value.get(`${targetType}:${targetId}`) ?? false
  }

  /** 是否已收藏 */
  function isCollected(targetType: string, targetId: string): boolean {
    return collects.value.some(
      (c) => c.targetType === targetType && c.targetId === targetId,
    )
  }

  // ========== Actions ==========

  /** 切换点赞 */
  async function toggleLike(targetType: string, targetId: string) {
    loading.value = true
    error.value = null
    const key = `${targetType}:${targetId}`
    const previous = likes.value.get(key) ?? false
    // 乐观更新
    likes.value.set(key, !previous)
    try {
      const res: any = await interactApi.toggleLike(targetType, targetId)
      // 以服务端返回为准
      if (res?.isLiked !== undefined) {
        likes.value.set(key, res.isLiked)
      }
    } catch (e: any) {
      // 失败回滚
      likes.value.set(key, previous)
      error.value = e.errMsg || e.message || '操作失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 切换收藏 */
  async function toggleCollect(targetType: string, targetId: string) {
    loading.value = true
    error.value = null
    try {
      const res: any = await interactApi.toggleCollect(targetType, targetId)
      // 刷新收藏列表
      await fetchCollects()
      return res
    } catch (e: any) {
      error.value = e.errMsg || e.message || '操作失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 获取收藏列表 */
  async function fetchCollects() {
    loading.value = true
    error.value = null
    try {
      const res: any = await interactApi.myCollects()
      if (Array.isArray(res)) {
        collects.value = res as CollectItem[]
      } else if (res.list || res.items) {
        collects.value = (res.list || res.items) as CollectItem[]
      }
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取收藏列表失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 获取评论列表 */
  async function fetchComments(targetType: string, targetId: string) {
    loading.value = true
    error.value = null
    try {
      const res: any = await interactApi.comments(targetType, targetId)
      if (Array.isArray(res)) {
        comments.value = res as CommentItem[]
      } else if (res.list || res.items) {
        comments.value = (res.list || res.items) as CommentItem[]
      }
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取评论失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 添加评论 */
  async function addComment(targetType: string, targetId: string, content: string) {
    loading.value = true
    error.value = null
    try {
      const res: any = await interactApi.addComment({ targetType, targetId, content })
      // 将新评论追加到列表头部
      if (res) {
        comments.value.unshift(res as CommentItem)
      }
      uni.showToast({ title: '评论成功', icon: 'success' })
      return res
    } catch (e: any) {
      error.value = e.errMsg || e.message || '评论失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 切换关注用户 */
  async function toggleFollow(userId: string) {
    loading.value = true
    error.value = null
    try {
      const res: any = await interactApi.toggleFollow(userId)
      return res
    } catch (e: any) {
      error.value = e.errMsg || e.message || '操作失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 批量检查点赞状态 */
  async function checkLikeStatus(targetType: string, targetIds: string[]) {
    // 由于 API 没有提供批量查询接口，逐个从本地状态查询
    // 若需要从服务端同步，可在此扩展
    targetIds.forEach((id) => {
      const key = `${targetType}:${id}`
      if (!likes.value.has(key)) {
        likes.value.set(key, false)
      }
    })
    return targetIds.map((id) => ({
      targetId: id,
      isLiked: isLiked(targetType, id),
    }))
  }

  return {
    // state
    likes,
    collects,
    comments,
    loading,
    error,
    // getters
    isLiked,
    isCollected,
    // actions
    toggleLike,
    toggleCollect,
    fetchCollects,
    fetchComments,
    addComment,
    toggleFollow,
    checkLikeStatus,
  }
})
