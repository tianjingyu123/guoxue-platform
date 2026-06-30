<template>
  <view v-if="loading" class="load-state"><text class="load-state-text">加载中...</text></view>
  <view v-else-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <view v-else class="msg-page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner">
        <view class="navbar__left">
          <view class="navbar__back" @tap="goBack">
            <AppIcon name="arrow-left" :size="40" color="#2c2c2c" />
          </view>
          <text class="navbar__title">消息中心</text>
        </view>
        <view v-if="(counts.total || 0) > 0" class="navbar__action" :class="{ 'navbar__action--busy': marking }" @tap="markAllRead">
          <AppIcon name="check-check" :size="32" color="#c41e3a" />
          <text class="navbar__action-txt">全部已读</text>
        </view>
      </view>

      <!-- 分类 Tab -->
      <view class="tabs">
        <view
          v-for="tab in messageTabs"
          :key="tab.key"
          class="tab"
          :class="{ 'tab--active': activeTab === tab.key }"
          @tap="activeTab = tab.key"
        >
          <view class="tab__icon-wrap">
            <AppIcon
              :name="tab.icon"
              :size="32"
              :color="activeTab === tab.key ? '#c41e3a' : '#9c9388'"
            />
            <text v-if="counts[tab.key] > 0" class="tab__badge">
              {{ counts[tab.key] > 99 ? '99+' : counts[tab.key] }}
            </text>
          </view>
          <text class="tab__label">{{ tab.label }}</text>
          <view v-if="activeTab === tab.key" class="tab__indicator" />
        </view>
      </view>
    </view>

    <!-- 消息列表 -->
    <view v-if="filteredMessages.length > 0" class="msg-list">
      <view
        v-for="msg in filteredMessages"
        :key="msg.id"
        class="msg-item"
        :class="{ 'msg-item--unread': !msg.isRead }"
        @tap="onMessageTap(msg)"
      >
        <!-- 图标/头像 -->
        <view class="msg-item__lead">
          <image lazy-load v-if="msg.avatar" :src="msg.avatar" class="msg-item__avatar" mode="aspectFill" />
          <view v-else class="msg-item__icon" :style="{ background: iconBg(msg) }">
            <AppIcon :name="categoryIcon(msg).name" :size="40" :color="categoryIcon(msg).color" />
          </view>
          <view v-if="!msg.isRead" class="msg-item__dot" />
        </view>

        <!-- 内容 -->
        <view class="msg-item__body">
          <view class="msg-item__head">
            <view class="msg-item__title-wrap">
              <text class="msg-item__title" :class="{ 'msg-item__title--read': msg.isRead }">{{ msg.title }}</text>
              <text class="msg-item__cate">{{ msg.category }}</text>
            </view>
            <text class="msg-item__time">{{ msg.time }}</text>
          </view>
          <text class="msg-item__content" :class="{ 'msg-item__content--read': msg.isRead }">{{ msg.content }}</text>
        </view>
      </view>

      <view class="msg-list__end">— 已显示全部消息 —</view>
    </view>

    <!-- 空态 -->
    <view v-else class="msg-empty">
      <view class="msg-empty__icon">
        <AppIcon name="bell" :size="80" color="#d6cdbf" />
      </view>
      <text class="msg-empty__title">暂无消息</text>
      <text class="msg-empty__desc">当前分类下没有消息</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  imApi,
  messageTabs,
  type NotifyMessage,
  type NotifyType,
} from '@/lib/im-data'

const statusBarHeight = ref(0)

// 列表数据
const messages = ref<NotifyMessage[]>([])
const counts = ref<Record<string, number>>({})
const loading = ref(true)
const error = ref('')

// UI 状态
const activeTab = ref<NotifyType>('system')

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await imApi.getMessages()
    messages.value = res.list
    counts.value = res.unreadCounts as unknown as Record<string, number>
  } catch (e: any) {
    error.value = e?.message || '加载消息列表失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

const filteredMessages = computed(() =>
  messages.value.filter((m) => m.type === activeTab.value),
)

// 分类图标 + 配色（照原型 getCategoryIcon 映射）
function categoryIcon(msg: NotifyMessage): { name: string; color: string } {
  if (msg.type === 'interaction') {
    if (msg.category === '评论') return { name: 'message-circle', color: '#3b82f6' }
    if (msg.category === '点赞') return { name: 'thumbs-up', color: '#ef4444' }
    if (msg.category === '关注') return { name: 'user-plus', color: '#22c55e' }
    return { name: 'heart', color: '#ec4899' }
  }
  if (msg.type === 'system') {
    if (msg.category.includes('直播')) return { name: 'gift', color: '#8b5cf6' }
    if (msg.category.includes('课程')) return { name: 'bell', color: '#3b82f6' }
    return { name: 'bell', color: '#d99423' }
  }
  if (msg.type === 'transaction') {
    if (msg.category === '订单') return { name: 'shopping-cart', color: '#22c55e' }
    if (msg.category === '退款') return { name: 'refresh-ccw', color: '#f97316' }
    return { name: 'package', color: '#3b82f6' }
  }
  if (msg.type === 'service') return { name: 'headphones', color: '#c41e3a' }
  if (msg.type === 'income') return { name: 'credit-card', color: '#22c55e' }
  return { name: 'bell', color: '#9ca3af' }
}

function iconBg(_msg: NotifyMessage): string {
  return '#f2ece1'
}

function onMessageTap(msg: NotifyMessage) {
  if (!msg.isRead) {
    // 乐观更新：先改 UI，再后台同步后端；同步失败不回滚（已读是幂等的低风险操作）
    msg.isRead = true
    counts.value[msg.type] = Math.max(0, (counts.value[msg.type] || 0) - 1)
    counts.value.total = Math.max(0, (counts.value.total || 0) - 1)
    imApi.markNotifyRead(msg.id).catch(() => {})
  }
  if (msg.link) navigateTo(msg.link)
}

const marking = ref(false)
async function markAllRead() {
  if (marking.value) return
  marking.value = true
  try {
    await imApi.markAllNotifyRead()
    messages.value.forEach((m) => (m.isRead = true))
    counts.value = { system: 0, interaction: 0, transaction: 0, service: 0, income: 0, total: 0 }
  } finally {
    marking.value = false
  }
}
</script>

<style scoped>
.msg-page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 顶部导航 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #faf8f5;
  border-bottom: 2rpx solid #ede7dc;
}
.navbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 16rpx 0 8rpx;
}
.navbar__left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.navbar__back {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.navbar__title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.navbar__action {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 20rpx;
}
.navbar__action-txt {
  font-size: 26rpx;
  color: var(--brand);
}
.navbar__action--busy {
  opacity: 0.5;
  pointer-events: none;
}

/* 分类 Tab */
.tabs {
  display: flex;
  border-top: 2rpx solid #f2ece1;
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 24rpx 16rpx;
  position: relative;
}
.tab__icon-wrap {
  position: relative;
}
.tab__badge {
  position: absolute;
  top: -8rpx;
  right: -18rpx;
  min-width: 30rpx;
  height: 30rpx;
  padding: 0 6rpx;
  background: var(--brand);
  color: #ffffff;
  font-size: 18rpx;
  line-height: 30rpx;
  text-align: center;
  border-radius: 999rpx;
}
.tab__label {
  font-size: 24rpx;
  color: #9c9388;
  white-space: nowrap;
}
.tab--active .tab__label {
  color: var(--brand);
}
.tab__indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  background: var(--brand);
  border-radius: 999rpx;
}

/* 消息列表 */
.msg-list {
  background: #ffffff;
}
.msg-item {
  display: flex;
  gap: 24rpx;
  padding: 32rpx;
  border-bottom: 2rpx solid #f2ece1;
}
.msg-item--unread {
  background: rgba(196, 30, 58, 0.05);
}
.msg-item__lead {
  position: relative;
  flex-shrink: 0;
}
.msg-item__avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
}
.msg-item__icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.msg-item__dot {
  position: absolute;
  top: -2rpx;
  right: -2rpx;
  width: 20rpx;
  height: 20rpx;
  background: var(--brand);
  border-radius: 50%;
  border: 4rpx solid #ffffff;
}
.msg-item__body {
  flex: 1;
  min-width: 0;
}
.msg-item__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}
.msg-item__title-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}
.msg-item__title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  white-space: nowrap;
}
.msg-item__title--read {
  color: #9c9388;
  font-weight: 400;
}
.msg-item__cate {
  flex-shrink: 0;
  font-size: 20rpx;
  color: #8a8178;
  background: #f2ece1;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}
.msg-item__time {
  flex-shrink: 0;
  font-size: 22rpx;
  color: #9c9388;
}
.msg-item__content {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  line-height: 1.5;
  color: #5c5650;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.msg-item__content--read {
  color: #9c9388;
}
.msg-list__end {
  padding: 48rpx 0;
  text-align: center;
  font-size: 22rpx;
  color: #9c9388;
}

/* 空态 */
.msg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;
}
.msg-empty__icon {
  margin-bottom: 24rpx;
}
.msg-empty__title {
  font-size: 30rpx;
  color: #5c5650;
  margin-bottom: 8rpx;
}
.msg-empty__desc {
  font-size: 26rpx;
  color: #9c9388;
}

/* 加载/错误状态 */
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
