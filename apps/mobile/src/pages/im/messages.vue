<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-left">
        <text class="nav-back" @click="goBack">←</text>
        <text class="nav-title">消息中心</text>
      </view>
      <text v-if="currentUnread > 0" class="nav-action" @click="markAllRead">
        {{ markingAllRead ? '处理中...' : '✅ 全部已读' }}
      </text>
    </view>

    <!-- 分类Tab -->
    <scroll-view scroll-x class="tabs-scroll" show-scrollbar="false">
      <view class="tabs-inner">
        <view v-for="t in messageTabs" :key="t.key" class="tab" :class="{ active: activeTab === t.key }" @click="switchTab(t.key)">
          <view class="tab-icon-wrap">
            <text class="tab-icon">{{ t.icon }}</text>
            <text v-if="getUnreadCount(t.key) > 0" class="tab-badge">
              {{ getUnreadCount(t.key) > 99 ? '99+' : getUnreadCount(t.key) }}
            </text>
          </view>
          <text class="tab-label">{{ t.label }}</text>
          <view v-if="activeTab === t.key" class="tab-active-bar" />
        </view>
      </view>
    </scroll-view>

    <!-- 消息列表 -->
    <DataState
      :is-loading="loading && messages.length === 0"
      :error="loadError"
      :is-empty="!loading && filteredMessages.length === 0"
      empty-icon="🔔"
      empty-title="暂无消息"
      empty-description="当前分类下没有消息"
      skeleton-type="list"
      @retry="loadMessages"
    >
      <view class="message-list">
        <view
          v-for="m in filteredMessages"
          :key="m.id"
          class="message-item"
          :class="{ unread: !m.isRead }"
          @click="handleClick(m)"
        >
          <!-- 图标/头像 -->
          <view class="msg-icon-wrap">
            <image v-if="m.avatar" :src="m.avatar" class="msg-avatar" mode="aspectFill" />
            <view v-else class="msg-icon-bg" :class="getIconBg(m.type)">
              <text class="msg-icon-emoji">{{ getIconEmoji(m) }}</text>
            </view>
            <view v-if="!m.isRead" class="msg-unread-dot" />
          </view>
          <!-- 内容 -->
          <view class="msg-content">
            <view class="msg-top">
              <view class="msg-title-row">
                <text class="msg-title" :class="{ bold: !m.isRead }">{{ m.title }}</text>
                <text class="msg-category">{{ m.category }}</text>
              </view>
              <text class="msg-time">{{ formatTime(m.createdAt) }}</text>
            </view>
            <text class="msg-desc" :class="{ bold: !m.isRead }">{{ m.content }}</text>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view v-if="filteredMessages.length > 0" class="list-footer">
        <text>— 已显示全部消息 —</text>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { notifyApi } from '../../api'

interface MessageItem {
  id: string
  type: 'system' | 'interaction' | 'transaction' | 'service' | 'income'
  category: string
  title: string
  content: string
  avatar?: string
  isRead: boolean
  link?: string
  createdAt: string | number
}

interface UnreadCounts {
  system: number
  interaction: number
  transaction: number
  service: number
  income: number
  total: number
}

// 后端 type 枚举值到前端分类的映射
const msgTypeMap: Record<string, string> = {
  SYSTEM: 'system', system: 'system', System: 'system',
  INTERACTION: 'interaction', interaction: 'interaction', Interaction: 'interaction',
  TRANSACTION: 'transaction', transaction: 'transaction', Transaction: 'transaction',
  SERVICE: 'service', service: 'service', Service: 'service',
  INCOME: 'income', income: 'income', Income: 'income',
}

// 消息分类配置
const messageTabs = [
  { key: 'system', label: '系统通知', icon: '🔔' },
  { key: 'interaction', label: '互动消息', icon: '❤' },
  { key: 'transaction', label: '交易消息', icon: '💳' },
  { key: 'service', label: '客服消息', icon: '🎧' },
]

const activeTab = ref<string>('system')
const messages = ref<MessageItem[]>([])
const tabMessages = ref<Record<string, MessageItem[]>>({})
const unreadCounts = ref<UnreadCounts | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const markingAllRead = ref(false)

const tabUnreadMap: Record<string, string> = {
  system: 'system',
  interaction: 'interaction',
  transaction: 'transaction',
  service: 'service',
}

const currentUnread = computed(() => {
  if (!unreadCounts.value) return 0
  if (activeTab.value === 'all') return unreadCounts.value.total
  const key = activeTab.value as keyof UnreadCounts
  return unreadCounts.value[key] || 0
})

const filteredMessages = computed(() => {
  if (activeTab.value === 'all') return messages.value
  return messages.value.filter(m => m.type === activeTab.value)
})

function goBack() { uni.navigateBack() }

function getUnreadCount(key: string): number {
  if (!unreadCounts.value) return 0
  if (key === 'all') return unreadCounts.value.total
  const k = key as keyof UnreadCounts
  return unreadCounts.value[k] || 0
}

function getIconEmoji(m: MessageItem): string {
  if (m.type === 'interaction') {
    if (m.category === '评论') return '💬'
    if (m.category === '点赞') return '👍'
    if (m.category === '关注') return '👤'
    return '❤'
  }
  if (m.type === 'system') {
    if (m.category.includes('直播')) return '🎁'
    if (m.category.includes('课程')) return '📚'
    return '🔔'
  }
  if (m.type === 'transaction') {
    if (m.category === '订单') return '🛒'
    if (m.category === '退款') return '🔄'
    return '📦'
  }
  if (m.type === 'service') return '🎧'
  if (m.type === 'income') return '💰'
  return '🔔'
}

function getIconBg(type: string): string {
  const bgMap: Record<string, string> = {
    interaction: 'bg-pink',
    system: 'bg-amber',
    transaction: 'bg-green',
    service: 'bg-red',
    income: 'bg-green',
  }
  return bgMap[type] || 'bg-gray'
}

async function loadMessages() {
  const tabKey = activeTab.value
  // 如果该 tab 已有缓存且不是首次加载，直接恢复
  if (tabMessages.value[tabKey] && tabMessages.value[tabKey].length > 0 && !loading.value) {
    messages.value = tabMessages.value[tabKey]
    return
  }
  loading.value = true
  loadError.value = null
  try {
    const [listData, countsData] = await Promise.all([
      notifyApi.list({ type: tabKey === 'all' ? undefined : tabKey }),
      notifyApi.unreadCount(),
    ])
    const parsed: MessageItem[] = (Array.isArray(listData) ? listData : listData?.list || listData?.data || []).map((m: any) => ({
      id: String(m.id || ''),
      type: msgTypeMap[m.type || m.messageType || 'system'] || 'system',
      category: m.category || '',
      title: m.title || '',
      content: m.content || '',
      avatar: m.avatar || '',
      isRead: m.isRead ?? m.read ?? false,
      link: m.link || '',
      createdAt: m.createdAt || m.time || m.created_at || '',
    }))
    // 缓存当前 tab 的消息
    tabMessages.value[tabKey] = parsed
    messages.value = parsed
    const counts = countsData || {}
    unreadCounts.value = {
      system: counts.system || counts.SYSTEM || 0,
      interaction: counts.interaction || counts.INTERACTION || 0,
      transaction: counts.transaction || counts.TRANSACTION || 0,
      service: counts.service || counts.SERVICE || 0,
      income: counts.income || counts.INCOME || 0,
      total: counts.total || counts.TOTAL || 0,
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadMessages() })

function switchTab(key: string) {
  if (activeTab.value === key) return
  activeTab.value = key
  // 恢复该 tab 的缓存或重新加载
  if (tabMessages.value[key]) {
    messages.value = tabMessages.value[key]
  } else {
    loadMessages()
  }
}

function handleClick(m: MessageItem) {
  if (!m.isRead) {
    // 标记已读
    m.isRead = true
    if (unreadCounts.value) {
      const k = m.type as keyof UnreadCounts
      unreadCounts.value[k] = Math.max(0, (unreadCounts.value[k] || 0) - 1)
      unreadCounts.value.total = Math.max(0, unreadCounts.value.total - 1)
    }
    // 调用API
    notifyApi.markRead(m.id).catch(() => {})
  }
  if (m.link) {
    uni.navigateTo({ url: m.link })
  }
}

async function markAllRead() {
  markingAllRead.value = true
  try {
    await notifyApi.readAll()
    messages.value.forEach(m => { m.isRead = true })
    // 同步更新 tab 缓存中的已读状态
    Object.values(tabMessages.value).forEach(list => list.forEach(m => { m.isRead = true }))
    if (unreadCounts.value) {
      Object.keys(unreadCounts.value).forEach(k => {
        (unreadCounts.value as any)[k] = 0
      })
    }
    uni.showToast({ title: '已全部标为已读', icon: 'none' })
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    markingAllRead.value = false
  }
}

function formatTime(t: string | number): string {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const time = pad(d.getHours()) + ':' + pad(d.getMinutes())
  if (d.toDateString() === now.toDateString()) return time
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return '昨天'
  return month + '/' + day
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

/* 导航 */
.nav { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; border-bottom: 1px solid #E5E1DB; }
.nav-left { display: flex; align-items: center; gap: 10px; }
.nav-back { font-size: 22px; color: #2C2C2C; padding: 4px; }
.nav-title { font-size: 16px; font-weight: 600; color: #2C2C2C; }
.nav-action { font-size: 13px; color: #C41E3A; padding: 4px 8px; }

/* Tabs */
.tabs-scroll { white-space: nowrap; background: #fff; border-bottom: 1px solid #E5E1DB; }
.tabs-inner { display: inline-flex; width: 100%; }
.tab {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  gap: 4px; padding: 10px 4px 8px; position: relative; min-width: 80px;
  transition: color 0.2s;
}
.tab.active { color: #C41E3A; }
.tab:not(.active) { color: #999; }

.tab-icon-wrap { position: relative; }
.tab-icon { font-size: 20px; }
.tab-badge {
  position: absolute; top: -6px; right: -10px;
  min-width: 16px; height: 16px; line-height: 16px;
  background: #C41E3A; color: #fff; font-size: 9px;
  text-align: center; padding: 0 4px; border-radius: 8px;
  white-space: nowrap;
}
.tab-label { font-size: 11px; }
.tab-active-bar {
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 24px; height: 2px; background: #C41E3A; border-radius: 1px;
}

/* 消息列表 */
.message-list { background: #fff; }
.message-item {
  display: flex; gap: 12px; padding: 14px 16px;
  border-bottom: 1px solid #f5f0e8;
}
.message-item:active { background: #FAF8F5; }
.message-item.unread { background: rgba(196,30,58,0.02); }

.msg-icon-wrap { position: relative; flex-shrink: 0; }
.msg-avatar { width: 40px; height: 40px; border-radius: 50%; }
.msg-icon-bg { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.msg-icon-bg.bg-pink { background: #fce4ec; }
.msg-icon-bg.bg-amber { background: #fef7e6; }
.msg-icon-bg.bg-green { background: #e8f5e9; }
.msg-icon-bg.bg-red { background: #ffebee; }
.msg-icon-bg.bg-gray { background: #f5f5f5; }
.msg-icon-emoji { font-size: 18px; }
.msg-unread-dot {
  position: absolute; top: -2px; right: -2px;
  width: 8px; height: 8px; border-radius: 50%;
  background: #C41E3A; border: 2px solid #fff;
}

.msg-content { flex: 1; min-width: 0; }
.msg-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.msg-title-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.msg-title { font-size: 14px; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.msg-title.bold { font-weight: 600; }
.msg-category { font-size: 10px; color: #999; background: #F5F0E8; padding: 1px 6px; border-radius: 4px; flex-shrink: 0; }
.msg-time { font-size: 11px; color: #ccc; flex-shrink: 0; }
.msg-desc { font-size: 13px; color: #999; display: block; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.4; }
.msg-desc.bold { color: #666; }

.list-footer { text-align: center; padding: 20px 0; font-size: 12px; color: #ccc; }
</style>
