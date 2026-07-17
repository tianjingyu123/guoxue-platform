<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="nav-left">
        <view class="nav-btn" @click="onBack">
          <app-icon name="arrow-left" :size="20" color="#2c2c2c" />
        </view>
        <text class="nav-title">通知</text>
        <view v-if="unreadTotal > 0" class="unread-badge">
          <text class="unread-badge-text">{{ unreadTotal > 99 ? '99+' : unreadTotal }}</text>
        </view>
      </view>
      <view class="nav-right">
        <view class="nav-btn" @click="handleRefresh">
          <app-icon name="refresh-cw" :size="20" color="#2c2c2c" :class="refreshing ? 'spin' : ''" />
        </view>
        <view class="markall-btn" :class="{ disabled: markAllDisabled }" @click="handleMarkAllRead">
          <app-icon name="check-check" :size="16" :color="markAllDisabled ? '#cccccc' : '#2c2c2c'" />
          <text class="markall-text" :style="{ color: markAllDisabled ? '#cccccc' : '#2c2c2c' }">全部已读</text>
        </view>
      </view>
    </view>

    <!-- 分类 Tab（公告并入消息中心：系统公告/互动/交易统一在此） -->
    <view class="cat-tabs">
      <view
        v-for="cat in CATEGORY_TABS"
        :key="cat.key"
        class="cat-tab"
        :class="{ active: activeCat === cat.key }"
        @click="activeCat = cat.key"
      >
        <text class="cat-tab-text" :class="{ active: activeCat === cat.key }">{{ cat.label }}</text>
        <view v-if="catUnread(cat.key) > 0" class="cat-dot" />
      </view>
    </view>

    <!-- 🔴 私信入口：会话列表页（真连腾讯 IM）此前是**孤岛** —— 全项目没有任何地方能跳进去，
         用户根本看不到别人发来的私信。而私信是达人咨询、圈友交流的承载。
         消息中心只管系统/互动/交易通知，私信独立一栏。 -->
    <view class="dm-entry" @click="goConversations">
      <view class="dm-icon"><app-icon name="message-circle" :size="22" color="#C41E3A" /></view>
      <view class="dm-main">
        <text class="dm-title">私信</text>
        <text class="dm-sub">与老师、圈友的一对一对话</text>
      </view>
      <view v-if="dmUnread > 0" class="dm-badge">
        <text class="dm-badge-text">{{ dmUnread > 99 ? '99+' : dmUnread }}</text>
      </view>
      <app-icon name="chevron-right" :size="18" color="#c8c8cd" />
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="loading" class="skeleton-wrap">
      <view v-for="i in 5" :key="i" class="skel-row">
        <view class="skel-avatar" />
        <view class="skel-content">
          <view class="skel-line w33" />
          <view class="skel-line w100" />
          <view class="skel-line w16" />
        </view>
      </view>
    </view>

    <!-- 错误态（首屏加载失败，可重试） -->
    <app-error v-else-if="error" title="通知加载失败" desc="网络异常，请稍后重试" @retry="() => fetchNotifications()" />

    <!-- 空态 -->
    <view v-else-if="filteredNotifications.length === 0" class="empty">
      <view class="empty-icon-circle">
        <app-icon name="bell" :size="32" color="#cccccc" />
      </view>
      <text class="empty-text">{{ activeCat === 'all' ? '暂无通知' : '该分类暂无通知' }}</text>
    </view>

    <!-- 通知列表 -->
    <view v-else class="list">
      <view
        v-for="n in filteredNotifications"
        :key="n.id"
        class="notify-item"
        :class="{ unread: !n.isRead }"
        @click="handleMarkRead(n)"
      >
        <view class="notify-icon" :style="{ background: typeColors[n.kind].bg }">
          <app-icon :name="getIcon(n.category)" :size="20" :color="typeColors[n.kind].color" />
        </view>
        <view class="notify-body">
          <view class="notify-top">
            <view class="notify-title-wrap">
              <text class="notify-title" :style="{ color: n.isRead ? '#999999' : '#2c2c2c' }">{{ n.title }}</text>
              <view v-if="!n.isRead" class="red-dot" />
            </view>
            <text class="notify-time">{{ n.time }}</text>
          </view>
          <text class="notify-content" :style="{ color: n.isRead ? '#999999' : '#2c2c2c' }">{{ n.content }}</text>
          <view class="notify-cat">
            <text class="notify-cat-text">{{ n.category }}</text>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="list-end">
        <text class="list-end-text">已显示全部通知</text>
      </view>
    </view>

    <!-- toast -->
    <view v-if="toastMsg" class="toast">
      <text class="toast-text">{{ toastMsg }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { goBack, navigateTo } from '@/utils/router'
import { mineApi, type NotifyItem, type NotifyKind } from '@/lib/mine-data'
import { imApi } from '@/lib/im-data'

const ICON_MAP: Record<string, string> = {
  评论: 'message-circle',
  点赞: 'heart',
  关注: 'user-plus',
  系统通知: 'bell',
  审核通知: 'shield',
  订单: 'shopping-bag',
  收益: 'credit-card',
}

const typeColors: Record<NotifyKind, { bg: string; color: string }> = {
  interaction: { bg: '#dbeafe', color: '#2563eb' },
  system: { bg: '#fef3c7', color: '#d97706' },
  income: { bg: '#dcfce7', color: '#16a34a' },
  transaction: { bg: '#f3e8ff', color: '#9333ea' },
  service: { bg: '#ffe4e6', color: '#e11d48' },
}

const notifications = ref<NotifyItem[]>([])
const loading = ref(true)
const error = ref(false)
const refreshing = ref(false)
const markingAllRead = ref(false)
const toastMsg = ref('')

// 分类 Tab：公告(系统)/互动/交易统一并入消息中心。kind→分类映射见 belongsTo
type CatKey = 'all' | 'system' | 'interaction' | 'transaction'
const CATEGORY_TABS: { key: CatKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'system', label: '系统公告' },
  { key: 'interaction', label: '互动' },
  { key: 'transaction', label: '交易' },
]
const activeCat = ref<CatKey>('all')

/** 通知 kind 归入哪个分类 Tab（service 归系统、income 归交易） */
function belongsTo(n: NotifyItem, cat: CatKey): boolean {
  if (cat === 'all') return true
  if (cat === 'system') return n.kind === 'system' || n.kind === 'service'
  if (cat === 'transaction') return n.kind === 'transaction' || n.kind === 'income'
  return n.kind === 'interaction'
}

const filteredNotifications = computed(() =>
  notifications.value.filter((n) => belongsTo(n, activeCat.value)),
)

/** 某分类下的未读数（Tab 红点提示） */
function catUnread(cat: CatKey): number {
  if (cat === 'all') return 0 // 全部不显红点，避免与导航栏总数重复
  return notifications.value.filter((n) => !n.isRead && belongsTo(n, cat)).length
}

// 私信未读：复用会话列表 TIM 未读（与 pkg-im/im/conversations 同一算法 reduce unreadCount）。
// getConversations 内部会触发 TIM 登录，未登录/取数失败一律静默降级为 0（不显角标，绝不阻断通知页）
const dmUnread = ref(0)
async function fetchDmUnread() {
  try {
    const convs = await imApi.getConversations()
    dmUnread.value = convs.reduce((s, c) => s + c.unreadCount, 0)
  } catch {
    dmUnread.value = 0
  }
}

const unreadTotal = computed(() => notifications.value.filter((n) => !n.isRead).length)
const markAllDisabled = computed(() => markingAllRead.value || unreadTotal.value === 0)

async function fetchNotifications(showRefreshing = false) {
  if (showRefreshing) refreshing.value = true
  else loading.value = true
  error.value = false
  try {
    notifications.value = await mineApi.getNotifications()
  } catch (e) {
    // 仅在首屏（无已有数据）展示整页错误态；刷新失败保留旧列表 + toast 提示
    if (notifications.value.length === 0) error.value = true
    showToast((e as Error)?.message || '加载失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

onMounted(() => { fetchNotifications(); fetchDmUnread() })

function getIcon(category: string) {
  return ICON_MAP[category] || 'bell'
}

async function handleMarkRead(n: NotifyItem) {
  if (!n.isRead) {
    n.isRead = true
    try {
      await mineApi.markNotificationRead(n.id)
      uni.$emit('notify:refresh') // 同步顶部铃铛角标
    } catch { n.isRead = false }
  }
  if (n.link) navigateTo(n.link)
}

async function handleMarkAllRead() {
  if (markAllDisabled.value) return
  markingAllRead.value = true
  try {
    await mineApi.markAllNotificationsRead()
    notifications.value.forEach((n) => { n.isRead = true })
    uni.$emit('notify:refresh') // 同步顶部铃铛角标
    showToast('已全部标记为已读')
  } catch (e) {
    showToast((e as Error)?.message || '操作失败')
  } finally {
    markingAllRead.value = false
  }
}

function handleRefresh() {
  if (refreshing.value) return
  fetchNotifications(true)
}

function showToast(msg: string) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2000)
}

/** 私信会话列表（原本零入口的孤岛页） */
function goConversations() {
  navigateTo('/im/conversations')
}

function onBack() {
  goBack()
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 导航栏 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 16rpx 0 8rpx;
  background: #faf8f5;
  border-bottom: 1rpx solid #e8e3db;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.nav-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.unread-badge {
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  background: #ff4d4f;
  display: flex;
  align-items: center;
  justify-content: center;
}
.unread-badge-text {
  font-size: 22rpx;
  color: #ffffff;
  line-height: 1;
}
.nav-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.markall-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 14rpx;
}
.markall-text {
  font-size: 26rpx;
}
.markall-btn.disabled {
  opacity: 0.6;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 分类 Tab */
/* 私信入口行 */
.dm-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: 16rpx 24rpx 0;
  padding: 24rpx 28rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.dm-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dm-main { flex: 1; min-width: 0; }
.dm-title { display: block; font-size: 30rpx; font-weight: 500; color: #2c2c2c; }
.dm-sub { display: block; margin-top: 4rpx; font-size: 24rpx; color: #999; }
.dm-badge {
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  background: #ff4d4f;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dm-badge-text { font-size: 22rpx; color: #ffffff; line-height: 1; }

.cat-tabs {
  position: sticky;
  top: 112rpx;
  z-index: 9;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: #faf8f5;
  border-bottom: 1rpx solid #e8e3db;
}
.cat-tab {
  position: relative;
  padding: 10rpx 28rpx;
  border-radius: 999rpx;
  background: #f0ebe3;
}
.cat-tab.active {
  background: var(--brand);
}
.cat-tab-text {
  font-size: 26rpx;
  color: #666666;
}
.cat-tab-text.active {
  color: #ffffff;
}
.cat-dot {
  position: absolute;
  top: 4rpx;
  right: 8rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #ff4d4f;
}

/* 骨架屏 */
.skeleton-wrap {
  padding: 16rpx;
}
.skel-row {
  display: flex;
  gap: 24rpx;
  margin-bottom: 32rpx;
}
.skel-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #ece7df;
  flex-shrink: 0;
}
.skel-content {
  flex: 1;
}
.skel-line {
  height: 28rpx;
  border-radius: 8rpx;
  background: #ece7df;
  margin-bottom: 16rpx;
}
.skel-line.w33 { width: 33%; }
.skel-line.w100 { width: 100%; }
.skel-line.w16 { width: 120rpx; }

/* 空态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}
.empty-icon-circle {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: #f5f1eb;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 列表 */
.list {
  display: flex;
  flex-direction: column;
}
.notify-item {
  display: flex;
  gap: 24rpx;
  padding: 32rpx;
  border-bottom: 1rpx solid #e8e3db;
}
.notify-item.unread {
  background: rgba(196, 30, 58, 0.05);
}
.notify-icon {
  flex-shrink: 0;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.notify-body {
  flex: 1;
  min-width: 0;
}
.notify-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}
.notify-title-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}
.notify-title {
  font-size: 28rpx;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.red-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #ff4d4f;
  flex-shrink: 0;
}
.notify-time {
  font-size: 22rpx;
  color: #999999;
  flex-shrink: 0;
}
.notify-content {
  font-size: 26rpx;
  line-height: 1.5;
  margin-top: 6rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.notify-cat {
  display: inline-flex;
  align-self: flex-start;
  margin-top: 16rpx;
  padding: 4rpx 12rpx;
  background: #f5f1eb;
  border-radius: 8rpx;
}
.notify-cat-text {
  font-size: 22rpx;
  color: #666666;
}
.list-end {
  padding: 64rpx 0;
  text-align: center;
}
.list-end-text {
  font-size: 26rpx;
  color: #999999;
}

/* toast */
.toast {
  position: fixed;
  bottom: 120rpx;
  left: 50%;
  transform: translateX(-50%);
  padding: 20rpx 40rpx;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12rpx;
  z-index: 100;
}
.toast-text {
  font-size: 26rpx;
  color: #ffffff;
}
</style>
