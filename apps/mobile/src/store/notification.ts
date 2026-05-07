import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notifyApi } from '@/api'

/** 通知条目 */
export interface NotificationItem {
  id: string
  type: string // system | like | comment | follow | course
  title: string
  content?: string
  cover?: string
  isRead: boolean
  targetType?: string
  targetId?: string
  createdAt: string
}

export const useNotificationStore = defineStore('notification', () => {
  // ========== State ==========
  const notifications = ref<NotificationItem[]>([])
  const unreadCount = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ========== Actions ==========

  /** 获取通知列表 */
  async function fetchNotifications(params?: { type?: string; page?: number; pageSize?: number }) {
    loading.value = true
    error.value = null
    try {
      const res: any = await notifyApi.list(params)
      if (Array.isArray(res)) {
        notifications.value = res as NotificationItem[]
      } else if (res.list || res.items) {
        notifications.value = (res.list || res.items) as NotificationItem[]
      }
      // 同时拉取未读数
      await fetchUnreadCount()
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取通知失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 获取未读通知数 */
  async function fetchUnreadCount() {
    try {
      const res: any = await notifyApi.unreadCount()
      if (typeof res === 'number') {
        unreadCount.value = res
      } else if (res?.count !== undefined) {
        unreadCount.value = res.count
      } else if (res?.unreadCount !== undefined) {
        unreadCount.value = res.unreadCount
      }
    } catch {
      // 未读数获取失败不影响主流程
    }
  }

  /** 标记单条通知为已读 */
  async function markRead(id: string) {
    error.value = null
    try {
      await notifyApi.markRead(id)
      // 更新本地状态
      const item = notifications.value.find((n) => n.id === id)
      if (item && !item.isRead) {
        item.isRead = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch (e: any) {
      error.value = e.errMsg || e.message || '操作失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    }
  }

  /** 标记全部已读 */
  async function markAllRead() {
    loading.value = true
    error.value = null
    try {
      await notifyApi.readAll()
      // 更新本地状态
      notifications.value.forEach((n) => {
        n.isRead = true
      })
      unreadCount.value = 0
      uni.showToast({ title: '全部已读', icon: 'success' })
    } catch (e: any) {
      error.value = e.errMsg || e.message || '操作失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    notifications,
    unreadCount,
    loading,
    error,
    // actions
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead,
  }
})
