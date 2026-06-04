<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-top">
        <text class="header-title">直播</text>
        <view class="header-actions">
          <text class="header-search" @click="goSearch">🔍</text>
          <text class="header-create" @click="goCreate">＋ 开播</text>
        </view>
      </view>
      <text class="header-sub">国学讲堂 · 在线互动</text>
    </view>

    <!-- Tab 切换 -->
    <scroll-view scroll-x class="tabs-scroll" show-scrollbar="false">
      <view class="tabs-inner">
        <text
          v-for="t in tabs"
          :key="t.value"
          class="tab"
          :class="{ active: activeTab === t.value }"
          @click="switchTab(t.value)"
        >{{ t.label }}</text>
      </view>
    </scroll-view>

    <!-- 直播中横幅 -->
    <view v-if="livingCount > 0 && activeTab === 'all'" class="living-bar" @click="switchTab('LIVING')">
      <view class="living-dot" />
      <text class="living-text">{{ livingCount }} 场直播正在进行中</text>
      <text class="living-arrow">去看看 →</text>
    </view>

    <!-- 列表区域 -->
    <DataState
      :is-loading="loading && rooms.length === 0"
      :error="loadError"
      :is-empty="!loading && rooms.length === 0"
      empty-icon="📡"
      empty-title="暂无直播"
      empty-description="还没有直播内容，快去开播吧"
      empty-action-text="创建直播"
      :empty-show-action="true"
      skeleton-type="card"
      @retry="fetchRooms"
      @empty-action="goCreate"
    >
      <scroll-view
        scroll-y
        class="room-list"
        refresher-enabled
        @refresherrefresh="onRefresh"
        :refresher-triggered="refreshing"
        @scrolltolower="onLoadMore"
      >
        <view
          v-for="room in rooms"
          :key="room.id"
          class="room-card"
          @click="goRoom(room)"
        >
          <!-- 封面区 (16:9) -->
          <view class="rc-cover-wrap">
            <image
              v-if="room.cover"
              :src="room.cover"
              class="rc-cover"
              mode="aspectFill"
            />
            <view v-else class="rc-placeholder">
              <text class="rc-placeholder-icon">📡</text>
            </view>

            <!-- 状态标签 -->
            <view class="rc-status" :class="'rc-' + room.status">
              <view v-if="room.status === 'LIVING'" class="rc-live-dot" />
              <text>{{ statusLabel(room.status) }}</text>
            </view>

            <!-- 观看人数 -->
            <view class="rc-viewers" v-if="room.status === 'LIVING'">
              <text class="rc-viewers-icon">👁</text>
              <text>{{ formatCount(room.viewCount) }}</text>
            </view>

            <!-- 预约人数 -->
            <view class="rc-viewers rc-viewers-book" v-else-if="room.status === 'UPCOMING' && room.bookingCount">
              <text>{{ room.bookingCount }}人预约</text>
            </view>
          </view>

          <!-- 信息区 -->
          <view class="rc-info">
            <text class="rc-title">{{ room.title }}</text>

            <view class="rc-host-row">
              <image
                v-if="room.hostAvatar || room.user?.avatar"
                :src="room.hostAvatar || room.user?.avatar"
                class="rc-host-avatar"
                mode="aspectFill"
              />
              <view v-else class="rc-host-avatar-placeholder" />
              <text class="rc-host-name">{{ room.hostName || room.user?.nickname || '国学讲师' }}</text>
              <text v-if="room.hostTitle" class="rc-host-title">{{ room.hostTitle }}</text>
            </view>

            <view class="rc-bottom">
              <text class="rc-time" v-if="room.status === 'UPCOMING' && room.startAt">
                🕐 {{ formatDateTime(room.startAt) }}
              </text>
              <text class="rc-time" v-else-if="room.status === 'REPLAY'">
                ▶ 回放
              </text>
              <text class="rc-time rc-time-hot" v-else>
                热度 {{ formatCount(room.viewCount || 0) }}
              </text>

              <view class="rc-tags">
                <text v-if="room.isPinned" class="rc-tag rc-tag-pin">📌 置顶</text>
                <text v-if="room.tags?.length" class="rc-tag">{{ room.tags[0] }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="loadingMore" class="load-more">
          <text>加载更多...</text>
        </view>
        <view v-if="!hasMore && rooms.length > 0" class="no-more">
          <text>— 已全部加载 —</text>
        </view>
      </scroll-view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { liveApi } from '../../api'
import DataState from '../../components/DataState.vue'

interface LiveRoomItem {
  id: string
  title: string
  cover?: string
  status: string
  viewCount: number
  hostName?: string
  hostAvatar?: string
  hostTitle?: string
  user?: { nickname?: string; avatar?: string }
  startAt?: string
  tags?: string[]
  isPinned?: boolean
  bookingCount?: number
}

const rooms = ref<LiveRoomItem[]>([])
const activeTab = ref('all')
const loading = ref(false)
const refreshing = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const livingCount = ref(0)
const loadError = ref<string | null>(null)
const page = ref(1)
const pageSize = 20

const tabs = [
  { label: '全部', value: 'all' },
  { label: '直播中', value: 'LIVING' },
  { label: '预告', value: 'UPCOMING' },
  { label: '回放', value: 'REPLAY' },
]

onMounted(() => {
  fetchRooms(true)
})

async function fetchRooms(reset: boolean = true) {
  if (reset && !refreshing.value) {
    loading.value = true
  }
  loadError.value = null
  try {
    const params: Record<string, any> = { page: page.value, pageSize }
    if (activeTab.value !== 'all') params.status = activeTab.value
    const data = await liveApi.rooms(params)
    const items: LiveRoomItem[] = data.list || data.items || data.rooms || data || []

    if (reset) {
      rooms.value = items
    } else {
      const existIds = new Set(rooms.value.map((r) => r.id))
      const news = items.filter((r) => !existIds.has(r.id))
      rooms.value.push(...news)
    }

    hasMore.value = items.length >= pageSize

    // 统计直播中个数
    if (activeTab.value === 'all') {
      livingCount.value = rooms.value.filter((r) => r.status === 'LIVING').length
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
    if (reset) rooms.value = []
  } finally {
    loading.value = false
    refreshing.value = false
    loadingMore.value = false
  }
}

function onRefresh() {
  refreshing.value = true
  page.value = 1
  hasMore.value = true
  fetchRooms(true)
}

function onLoadMore() {
  if (!hasMore.value || loadingMore.value || loading.value) return
  loadingMore.value = true
  page.value++
  fetchRooms(false)
}

function switchTab(tab: string) {
  if (activeTab.value === tab) return
  activeTab.value = tab
  page.value = 1
  hasMore.value = true
  fetchRooms(true)
}

function goCreate() {
  uni.navigateTo({ url: '/pages/live/create' })
}

function goRoom(room: LiveRoomItem) {
  uni.navigateTo({ url: `/pages/live/live-room?id=${room.id}` })
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/search?type=live' })
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    LIVING: '直播中',
    UPCOMING: '预告',
    REPLAY: '回放',
  }
  return map[s] || s
}

function formatCount(n: number | undefined): string {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function formatDateTime(t: string): string {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000)
  const time =
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0')
  const date = d.getMonth() + 1 + '/' + d.getDate()
  if (diffDays === 0) return '今天 ' + time
  if (diffDays === 1) return '明天 ' + time
  return date + ' ' + time
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 20rpx;
}

/* ===== 头部 ===== */
.header {
  padding: 32rpx 24rpx 16rpx;
  background: linear-gradient(180deg, #fff, #F5F0E8);
}
.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #C41E3A;
  font-family: 'Noto Serif SC', serif;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.header-search {
  font-size: 36rpx;
  color: #999;
}
.header-create {
  font-size: 26rpx;
  color: #fff;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  padding: 10rpx 28rpx;
  border-radius: 28rpx;
  font-weight: 500;
  box-shadow: 0 4rpx 16rpx rgba(196, 30, 58, 0.25);
}
.header-sub {
  font-size: 24rpx;
  color: #C9A96E;
  margin-top: 8rpx;
  letter-spacing: 2rpx;
}

/* ===== Tab切换 ===== */
.tabs-scroll {
  white-space: nowrap;
  padding: 0 24rpx 16rpx;
  background: #F5F0E8;
}
.tabs-inner {
  display: inline-flex;
  gap: 16rpx;
}
.tab {
  display: inline-block;
  font-size: 26rpx;
  color: #666;
  padding: 10rpx 28rpx;
  border-radius: 28rpx;
  background: #fff;
  border: 1rpx solid #E8E0D5;
  transition: all 0.2s;
}
.tab.active {
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  font-weight: 600;
  border-color: #C41E3A;
  box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.2);
}

/* ===== 直播中横幅 ===== */
.living-bar {
  margin: 0 24rpx 16rpx;
  background: linear-gradient(90deg, #fef0f0, #fde2e2);
  border: 1rpx solid #f5c6c6;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.living-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #C41E3A;
  animation: breathe 1.5s ease-in-out infinite;
}
.living-text {
  font-size: 26rpx;
  color: #C41E3A;
  font-weight: 500;
  flex: 1;
}
.living-arrow {
  font-size: 24rpx;
  color: #C41E3A;
  font-weight: bold;
}

/* ===== 直播列表 ===== */
.room-list {
  padding: 0 24rpx;
}
.room-card {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  transition: transform 0.2s;
}
.room-card:active {
  transform: scale(0.98);
}

/* 封面 */
.rc-cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a3e, #2a2a5e);
}
.rc-cover {
  width: 100%;
  height: 100%;
}
.rc-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rc-placeholder-icon {
  font-size: 72rpx;
  opacity: 0.6;
}

/* 状态标签 */
.rc-status {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 6rpx;
  backdrop-filter: blur(4rpx);
}
.rc-LIVING {
  background: rgba(196, 30, 58, 0.9);
}
.rc-UPCOMING {
  background: rgba(243, 156, 18, 0.9);
}
.rc-REPLAY {
  background: rgba(0, 0, 0, 0.55);
}
.rc-live-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #fff;
  animation: breathe 1.5s ease-in-out infinite;
}

/* 观看人数 */
.rc-viewers {
  position: absolute;
  bottom: 12rpx;
  right: 12rpx;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  backdrop-filter: blur(4rpx);
}
.rc-viewers-icon {
  font-size: 20rpx;
}
.rc-viewers-book {
  background: rgba(243, 156, 18, 0.85);
}

/* 呼吸灯动画 */
@keyframes breathe {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

/* 信息区 */
.rc-info {
  padding: 20rpx 24rpx 24rpx;
}
.rc-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #2C2C2C;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 12rpx;
}

.rc-host-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 12rpx;
}
.rc-host-avatar {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.rc-host-avatar-placeholder {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #E8E0D5;
  flex-shrink: 0;
}
.rc-host-name {
  font-size: 24rpx;
  color: #C41E3A;
  font-weight: 500;
}
.rc-host-title {
  font-size: 22rpx;
  color: #C9A96E;
  background: #F5F0E8;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}

.rc-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rc-time {
  font-size: 24rpx;
  color: #999;
}
.rc-time-hot {
  color: #C41E3A;
}
.rc-tags {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.rc-tag {
  font-size: 22rpx;
  color: #C9A96E;
  background: rgba(196, 148, 58, 0.1);
  padding: 2rpx 16rpx;
  border-radius: 16rpx;
}
.rc-tag-pin {
  color: #e6a23c;
  background: #fdf5e6;
}

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 24rpx 0;
  font-size: 26rpx;
  color: #C9A96E;
}
.no-more {
  text-align: center;
  padding: 24rpx 0;
  font-size: 24rpx;
  color: #ccc;
}
</style>
