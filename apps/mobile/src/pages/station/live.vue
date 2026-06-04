<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-content">
        <text
          class="back-btn"
          @click="uni.navigateBack"
        >
          ‹
        </text>
        <image
          v-if="stationLogo"
          :src="stationLogo"
          class="nav-logo"
          mode="aspectFill"
        />
        <text class="nav-title">
          {{ stationName || '国学' }} - 直播
        </text>
        <text
          class="nav-refresh"
          :class="{ refreshing }"
          @click="onRefresh"
        >
          🔄
        </text>
      </view>
      <!-- 搜索框 -->
      <view class="search-box">
        <input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索直播间"
          @input="onSearchInput"
        >
        <text class="search-icon">
          🔍
        </text>
      </view>
    </view>

    <!-- 筛选标签 -->
    <scroll-view
      scroll-x
      class="filter-bar"
      :show-scrollbar="false"
    >
      <view class="filter-track">
        <text
          v-for="opt in filterOptions"
          :key="opt.value"
          class="filter-tag"
          :class="{ 'filter-active': currentFilter === opt.value }"
          @click="switchFilter(opt.value)"
        >
          {{ opt.label }}
          <text
            v-if="opt.value === 'live' && liveCount > 0"
            class="filter-count"
          >
            ({{ liveCount }})
          </text>
        </text>
      </view>
    </scroll-view>

    <!-- 直播列表 -->
    <scroll-view
      scroll-y
      class="scroll-area"
      @scrolltolower="loadMore"
    >
      <DataState
        :is-loading="loading"
        :error="loadError"
        :is-empty="!loading && filteredList.length === 0 && !hasMore"
        empty-icon="📺"
        empty-title="暂无直播"
        skeleton-type="card"
        @retry="fetchData"
      >
        <view class="live-list">
          <view
            v-for="room in filteredList"
            :key="room.id"
            class="live-card"
            :class="{ 'live-now': room.status === 'live' }"
            @click="goLive(room)"
          >
            <!-- 封面 -->
            <view class="live-cover-wrap">
              <image
                :src="room.cover"
                class="live-cover"
                mode="aspectFill"
              />
              <!-- 状态标签 -->
              <view
                class="live-status-tag"
                :style="{ background: statusInfo(room.status).bg, color: statusInfo(room.status).color }"
              >
                <text
                  v-if="room.status === 'live'"
                  class="live-pulse"
                />
                {{ statusInfo(room.status).label }}
              </view>
              <!-- LIVE角标 -->
              <view
                v-if="room.status === 'live'"
                class="live-badge"
              >
                <text>LIVE</text>
              </view>
              <!-- 回放时长 -->
              <text
                v-if="room.status === 'replay' && room.duration"
                class="live-duration"
              >
                {{ formatDuration(room.duration) }}
              </text>
              <!-- 预告倒计时 -->
              <view
                v-if="room.status === 'preview' && countdowns[room.id]"
                class="live-countdown"
              >
                <text class="countdown-text">
                  {{ countdowns[room.id] }}
                </text>
              </view>
              <!-- 商品数量 -->
              <text
                v-if="room.productCount"
                class="live-product-badge"
              >
                🛍️ {{ room.productCount }}件商品
              </text>
            </view>
            <!-- 信息 -->
            <view class="live-info">
              <text class="live-title">
                {{ room.title }}
              </text>
              <view class="live-anchor">
                <image
                  :src="room.anchor?.avatar"
                  class="anchor-avatar"
                  mode="aspectFill"
                />
                <text class="anchor-name">
                  {{ room.anchor?.nickname }}
                </text>
                <text
                  v-if="room.isExclusive"
                  class="anchor-badge"
                >
                  专属
                </text>
              </view>
              <view class="live-stats">
                <text>👁 {{ formatViewCount(room.viewCount) }}</text>
                <text>❤ {{ formatViewCount(room.likeCount) }}</text>
              </view>
              <view
                v-if="room.tags?.length"
                class="live-tags"
              >
                <text
                  v-for="(tag, ti) in room.tags.slice(0, 3)"
                  :key="ti"
                  class="live-tag"
                >
                  {{ tag }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view
          v-if="hasMore"
          class="load-more"
          @click="loadMore"
        >
          <text>{{ loadingMore ? '加载中...' : '加载更多' }}</text>
        </view>

        <!-- 直播中空态 -->
        <view
          v-if="!loading && filteredList.length === 0 && currentFilter === 'live'"
          class="empty-live"
        >
          <text class="empty-text">
            暂无正在直播的内容
          </text>
          <text
            class="empty-action"
            @click="switchFilter('preview')"
          >
            查看直播预告
          </text>
        </view>
      </DataState>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const loadError = ref<string | null>(null)
const loadingMore = ref(false)
const refreshing = ref(false)
const list = ref<any[]>([])
const currentFilter = ref('all')
const searchKeyword = ref('')
const stationLogo = ref('')
const stationName = ref('')
const hasMore = ref(true)
const page = ref(1)
const countdowns = ref<Record<string, string>>({})
let countdownTimer: any = null

const filterOptions = [
  { value: 'all', label: '全部' },
  { value: 'live', label: '直播中' },
  { value: 'preview', label: '预告' },
  { value: 'replay', label: '回放' },
]

const liveCount = computed(() => list.value.filter((r: any) => r.status === 'live').length)

const filteredList = computed(() => {
  let items = list.value
  if (currentFilter.value !== 'all') {
    items = items.filter((r: any) => r.status === currentFilter.value)
  }
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim().toLowerCase()
    items = items.filter((r: any) =>
      (r.title || '').toLowerCase().includes(kw) ||
      (r.anchor?.nickname || '').toLowerCase().includes(kw)
    )
  }
  return items
})

function getStationCode(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  return page?.options?.code || page?.options?.stationCode || ''
}

onMounted(() => {
  fetchData()
  countdownTimer = setInterval(updateCountdowns, 1000)
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

async function fetchData(reset = true) {
  if (reset) { loading.value = true; page.value = 1; hasMore.value = true }
  loadError.value = null
  try {
    const api = require('../../api')
    const params: any = { page: page.value, pageSize: 10 }
    if (currentFilter.value !== 'all') params.status = currentFilter.value
    const res: any = await api.stationApi.getLives?.(params) || await api.stationApi.getStationLiveRooms?.(params)
    const items = Array.isArray(res) ? res : res?.list || res?.data || []
    if (reset) {
      list.value = items
      stationLogo.value = res?.stationLogo || ''
      stationName.value = res?.stationName || ''
    } else {
      const ids = new Set(list.value.map((r: any) => r.id))
      list.value.push(...items.filter((r: any) => !ids.has(r.id)))
    }
    hasMore.value = items.length >= 10
    initCountdowns()
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
    if (reset) list.value = []
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function onRefresh() {
  refreshing.value = true
  fetchData(true)
}

function loadMore() {
  if (!hasMore.value || loadingMore.value) return
  loadingMore.value = true
  page.value++
  fetchData(false).finally(() => { loadingMore.value = false })
}

function switchFilter(val: string) {
  currentFilter.value = val
  fetchData(true)
}

function onSearchInput() {
  // client-side filter only
}

function statusInfo(status?: string): { label: string; bg: string; color: string } {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    live: { label: '直播中', bg: '#C41E3A', color: '#fff' },
    preview: { label: '预告', bg: '#C9A96E', color: '#fff' },
    replay: { label: '回放', bg: 'rgba(0,0,0,0.6)', color: '#fff' },
  }
  return map[status || ''] || { label: status || '', bg: '#999', color: '#fff' }
}

function initCountdowns() {
  const now = Date.now()
  for (const room of list.value) {
    if (room.status === 'preview' && room.scheduledTime) {
      const diff = new Date(room.scheduledTime).getTime() - now
      if (diff > 0) {
        const d = Math.floor(diff / 86400000)
        const h = Math.floor((diff % 86400000) / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        countdowns.value[room.id] = `${d}天 ${h}时 ${m}分 ${s}秒`
      }
    }
  }
}

function updateCountdowns() {
  initCountdowns()
}

function formatDuration(seconds?: number): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
}

function formatViewCount(n?: number): string {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return String(n)
}

function goLive(room: any) {
  uni.navigateTo({ url: `/pages/live/room?id=${room.id}` })
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

.nav-bar { background: linear-gradient(135deg, #C41E3A, #A01830); padding: 60rpx 24rpx 20rpx; }
.nav-content { display: flex; align-items: center; gap: 16rpx; }
.back-btn { font-size: 44rpx; color: #fff; line-height: 1; }
.nav-logo { width: 40rpx; height: 40rpx; border-radius: 50%; }
.nav-title { flex: 1; font-size: 30rpx; font-weight: 600; color: #fff; }
.nav-refresh { font-size: 36rpx; color: #fff; }
.nav-refresh.refreshing { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.search-box { position: relative; margin-top: 16rpx; }
.search-input { width: 100%; height: 64rpx; background: rgba(255,255,255,0.9); border: none; border-radius: 32rpx; padding: 0 32rpx 0 64rpx; font-size: 24rpx; box-sizing: border-box; }
.search-icon { position: absolute; left: 24rpx; top: 50%; transform: translateY(-50%); font-size: 28rpx; }

.filter-bar { background: #fff; padding: 16rpx 24rpx; border-bottom: 1rpx solid #E8E0D5; }
.filter-track { display: flex; gap: 16rpx; }
.filter-tag { padding: 8rpx 28rpx; border-radius: 24rpx; font-size: 24rpx; color: #666; background: #F5F0E8; white-space: nowrap; }
.filter-active { background: #C41E3A; color: #fff; font-weight: 500; }
.filter-count { margin-left: 4rpx; }

.scroll-area { padding: 24rpx; }

.live-list { display: flex; flex-direction: column; gap: 20rpx; }
.live-card { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.live-now { border: 2rpx solid #C41E3A; }

.live-cover-wrap { position: relative; width: 100%; aspect-ratio: 16/9; }
.live-cover { width: 100%; height: 100%; }

.live-status-tag { position: absolute; top: 12rpx; left: 12rpx; padding: 4rpx 16rpx; border-radius: 16rpx; font-size: 22rpx; display: flex; align-items: center; gap: 8rpx; }
.live-pulse { width: 12rpx; height: 12rpx; border-radius: 50%; background: #fff; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

.live-badge { position: absolute; top: 12rpx; right: 12rpx; background: #C41E3A; color: #fff; font-size: 18rpx; padding: 4rpx 12rpx; border-radius: 8rpx; font-weight: bold; display: flex; align-items: center; gap: 4rpx; }

.live-duration { position: absolute; bottom: 12rpx; right: 12rpx; background: rgba(0,0,0,0.6); color: #fff; font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }

.live-countdown { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.countdown-text { color: #fff; font-size: 28rpx; font-weight: 500; }

.live-product-badge { position: absolute; bottom: 12rpx; left: 12rpx; background: #C9A96E; color: #fff; font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }

.live-info { padding: 20rpx; }
.live-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 12rpx; }
.live-anchor { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.anchor-avatar { width: 40rpx; height: 40rpx; border-radius: 50%; }
.anchor-name { font-size: 24rpx; color: #666; flex: 1; }
.anchor-badge { font-size: 20rpx; color: #C41E3A; background: rgba(196,30,58,0.08); padding: 2rpx 12rpx; border-radius: 8rpx; }

.live-stats { display: flex; gap: 24rpx; font-size: 22rpx; color: #999; margin-bottom: 12rpx; }
.live-tags { display: flex; gap: 8rpx; }
.live-tag { font-size: 20rpx; color: #999; background: #F5F0E8; padding: 4rpx 16rpx; border-radius: 12rpx; }

.load-more { text-align: center; padding: 32rpx 0; font-size: 26rpx; color: #C9A96E; }

.empty-live { text-align: center; padding: 60rpx 0; }
.empty-text { font-size: 28rpx; color: #999; display: block; margin-bottom: 16rpx; }
.empty-action { font-size: 26rpx; color: #C9A96E; border: 1rpx solid #C9A96E; padding: 12rpx 32rpx; border-radius: 24rpx; display: inline-block; }
</style>
