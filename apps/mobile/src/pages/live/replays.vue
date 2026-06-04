<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-header">
      <view class="nav-inner">
        <view class="nav-left">
          <text
            class="nav-back"
            @click="goBack"
          >
            ←
          </text>
          <text class="nav-title">
            直播回放
          </text>
        </view>
      </view>

      <!-- 搜索栏 -->
      <view class="search-bar">
        <view class="search-input-wrap">
          <text class="search-icon">
            🔍
          </text>
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="搜索讲师或标题"
            @confirm="doSearch"
          >
          <text
            v-if="searchQuery"
            class="search-clear"
            @click="searchQuery = ''"
          >
            ✕
          </text>
        </view>
        <view
          class="sort-btn"
          @click="showSortSheet = true"
        >
          <text class="sort-icon">
            ⚙️
          </text>
          <text class="sort-text">
            {{ sortOptions.find(o => o.value === sortBy)?.label }}
          </text>
        </view>
      </view>
    </view>

    <!-- 回放列表 -->
    <view class="list-section">
      <!-- 加载态 -->
      <view
        v-if="loading"
        class="skeleton-list"
      >
        <view
          v-for="i in 4"
          :key="i"
          class="skeleton-item"
        >
          <view class="skeleton-cover" />
          <view class="skeleton-info">
            <view class="skeleton-line w-full" />
            <view class="skeleton-line w-60" />
            <view class="skeleton-line-row">
              <view class="skeleton-line w-24" />
              <view class="skeleton-line w-24" />
            </view>
          </view>
        </view>
      </view>

      <!-- 错误态 -->
      <view
        v-else-if="loadError"
        class="error-wrap"
      >
        <view class="error-inner">
          <text class="error-icon">
            ⚠️
          </text>
          <text class="error-text">
            {{ loadError }}
          </text>
          <view
            class="error-retry"
            @click="loadReplays()"
          >
            重新加载
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view
        v-else-if="filteredReplays.length === 0"
        class="empty-state"
      >
        <view class="empty-icon-wrap">
          <text class="empty-icon">
            🎬
          </text>
        </view>
        <text class="empty-title">
          暂无回放内容
        </text>
        <text class="empty-desc">
          {{ searchQuery ? '换个关键词试试' : '精彩内容即将上线' }}
        </text>
      </view>

      <!-- 列表 -->
      <view
        v-else
        class="replay-list"
      >
        <view
          v-for="replay in filteredReplays"
          :key="replay.id"
          class="replay-card"
          @click="goPlay(replay)"
        >
          <view class="replay-card-inner">
            <!-- 封面 -->
            <view class="replay-cover-wrap">
              <image
                :src="replay.cover"
                mode="aspectFill"
                class="replay-cover"
              />
              <view class="replay-badge-row">
                <text class="replay-badge">
                  ▶ 回放
                </text>
              </view>
              <text class="replay-duration">
                {{ formatDuration(replay.duration || 0) }}
              </text>
            </view>

            <!-- 信息 -->
            <view class="replay-info">
              <text class="replay-title">
                {{ replay.title }}
              </text>
              <view class="replay-host-row">
                <image
                  :src="replay.host.avatar"
                  mode="aspectFill"
                  class="replay-host-avatar"
                />
                <text class="replay-host-name">
                  {{ replay.host.name }}
                </text>
                <text class="replay-category">
                  {{ replay.category }}
                </text>
              </view>
              <view class="replay-stats">
                <text class="replay-stat">
                  👁️ {{ formatViews(replay.viewers) }}次播放
                </text>
                <text class="replay-stat">
                  {{ formatDate(replay.endTime || '') }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view
          v-if="loadingMore"
          class="load-more-btn"
        >
          <text>加载中...</text>
        </view>
        <view
          v-else-if="hasMore"
          class="load-more-btn"
          @click="loadMore"
        >
          <text>加载更多</text>
        </view>
        <view
          v-else
          class="load-end"
        >
          <text>已显示全部回放</text>
        </view>
      </view>
    </view>

    <!-- 排序面板 -->
    <view
      v-if="showSortSheet"
      class="sort-sheet"
    >
      <view
        class="sort-mask"
        @click="showSortSheet = false"
      />
      <view class="sort-panel">
        <view class="sort-panel-header">
          <text class="sort-panel-title">
            排序方式
          </text>
          <text
            class="sort-panel-close"
            @click="showSortSheet = false"
          >
            ✕
          </text>
        </view>
        <view class="sort-options">
          <text
            v-for="opt in sortOptions"
            :key="opt.value"
            :class="['sort-option', sortBy === opt.value ? 'sort-option-active' : '']"
            @click="selectSort(opt.value)"
          >
            {{ opt.label }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { liveApi } from '../../api'

interface ReplayItem {
  id: string; title: string; cover: string; status: string
  host: { id: string; name: string; avatar: string; followers: number }
  viewers: number; likes: number; duration?: number
  endTime?: string; category?: string
}

const sortOptions = [
  { value: 'latest', label: '最新发布' },
  { value: 'popular', label: '最多播放' },
  { value: 'duration', label: '时长最长' },
]

const pageSize = 20

const loading = ref(true)
const loadingMore = ref(false)
const loadError = ref<string | null>(null)
const replays = ref<ReplayItem[]>([])
const searchQuery = ref('')
const sortBy = ref('latest')
const showSortSheet = ref(false)
const hasMore = ref(true)
const page = ref(1)

const filteredReplays = computed(() => {
  let list = replays.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(r => r.title.toLowerCase().includes(q) || r.host.name.toLowerCase().includes(q))
  }
  return list
})

onMounted(() => {
  loadReplays()
})

async function loadReplays(reset: boolean = true) {
  if (reset) {
    loading.value = true
    page.value = 1
  } else {
    loadingMore.value = true
  }
  loadError.value = null
  try {
    const params: Record<string, any> = { status: 'REPLAY', sort: sortBy.value, page: page.value, pageSize }
    const res = await liveApi.rooms(params)
    const rawList = res?.list || res?.items || res?.rooms || (Array.isArray(res) ? res : [])
    const items = rawList.map(mapReplayItem)

    if (reset) {
      replays.value = items
    } else {
      const existIds = new Set(replays.value.map(r => r.id))
      const news = items.filter(r => !existIds.has(r.id))
      replays.value.push(...news)
    }

    hasMore.value = items.length >= pageSize
  } catch (e: any) {
    if (reset) loadError.value = e?.errMsg || e?.message || '加载失败'
    console.error(e)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  page.value++
  loadReplays(false)
}

function mapReplayItem(raw: any): ReplayItem {
  return {
    id: raw.id || '',
    title: raw.title || '',
    cover: raw.cover || '',
    status: raw.status || 'replay',
    host: {
      id: raw.hostId || raw.userId || raw.host?.id || '',
      name: raw.hostName || raw.host?.name || raw.user?.nickname || '',
      avatar: raw.hostAvatar || raw.host?.avatar || raw.user?.avatar || '',
      followers: raw.hostFans || raw.host?.followers || 0,
    },
    viewers: raw.viewCount || raw.views || 0,
    likes: raw.likeCount || raw.likes || 0,
    duration: raw.duration || 0,
    endTime: raw.endAt || raw.endTime || '',
    category: raw.category || '',
  }
}

function selectSort(value: string) {
  sortBy.value = value
  showSortSheet.value = false
  loadReplays()
}

function doSearch() { /* v-model handles filter, no extra action needed */ }

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
}

function formatViews(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toString()
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function goBack() { uni.navigateBack() }
function goPlay(replay: ReplayItem) { uni.navigateTo({ url: `/pages/live/replay-player?id=${replay.id}` }) }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; }

/* 导航 */
.nav-header { position: sticky; top: 0; z-index: 20; background: #fff; border-bottom: 1rpx solid #E8E3DB; }
.nav-inner { display: flex; align-items: center; padding: 20rpx 24rpx; }
.nav-left { display: flex; align-items: center; gap: 12rpx; }
.nav-back { font-size: 36rpx; color: #2C2C2C; padding: 4rpx; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }

/* 搜索栏 */
.search-bar { display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx 16rpx; }
.search-input-wrap { flex: 1; display: flex; align-items: center; gap: 12rpx; background: #F5F5F5; border-radius: 40rpx; padding: 0 20rpx; }
.search-icon { font-size: 24rpx; color: #999; }
.search-input { flex: 1; height: 60rpx; font-size: 24rpx; color: #2C2C2C; background: transparent; }
.search-clear { font-size: 24rpx; color: #999; padding: 4rpx; }
.sort-btn { display: flex; align-items: center; gap: 4rpx; padding: 12rpx 20rpx; background: #F5F5F5; border-radius: 40rpx; }
.sort-icon { font-size: 24rpx; }
.sort-text { font-size: 24rpx; color: #666; }

/* 错误态 */
.error-wrap { display: flex; align-items: center; justify-content: center; min-height: 50vh; padding: 48rpx; }
.error-inner { text-align: center; }
.error-icon { font-size: 72rpx; display: block; margin-bottom: 16rpx; }
.error-text { font-size: 26rpx; color: #999; margin-bottom: 24rpx; display: block; }
.error-retry { display: inline-block; padding: 16rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 40rpx; font-size: 26rpx; }

/* 列表区 */
.list-section { padding: 24rpx; }

/* 骨架 */
.skeleton-list { display: flex; flex-direction: column; gap: 16rpx; }
.skeleton-item { display: flex; gap: 16rpx; background: #fff; border-radius: 24rpx; padding: 16rpx; }
.skeleton-cover { width: 216rpx; height: 120rpx; background: #E8E3DB; border-radius: 16rpx; flex-shrink: 0; }
.skeleton-info { flex: 1; display: flex; flex-direction: column; gap: 8rpx; padding: 4rpx 0; }
.skeleton-line { height: 24rpx; background: #E8E3DB; border-radius: 6rpx; }
.skeleton-line-row { display: flex; gap: 16rpx; }
.w-full { width: 100%; }
.w-60 { width: 60%; }
.w-24 { width: 96rpx; }

/* 空状态 */
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon-wrap { width: 120rpx; height: 120rpx; border-radius: 50%; background: #F5F5F5; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.empty-icon { font-size: 64rpx; color: #ccc; }
.empty-title { display: block; font-size: 28rpx; color: #999; margin-bottom: 8rpx; }
.empty-desc { display: block; font-size: 24rpx; color: #ccc; }

/* 回放列表 */
.replay-list { display: flex; flex-direction: column; gap: 16rpx; }
.replay-card { background: #fff; border-radius: 24rpx; overflow: hidden; }
.replay-card-inner { display: flex; gap: 16rpx; padding: 16rpx; }
.replay-cover-wrap { position: relative; width: 216rpx; height: 120rpx; border-radius: 16rpx; overflow: hidden; flex-shrink: 0; background: #E8E3DB; }
.replay-cover { width: 100%; height: 100%; }
.replay-badge-row { position: absolute; top: 8rpx; left: 8rpx; }
.replay-badge { padding: 4rpx 10rpx; background: rgba(0,0,0,0.6); color: #fff; border-radius: 6rpx; font-size: 18rpx; display: flex; align-items: center; gap: 4rpx; }
.replay-duration { position: absolute; bottom: 8rpx; right: 8rpx; padding: 4rpx 10rpx; background: rgba(0,0,0,0.6); color: #fff; border-radius: 6rpx; font-size: 18rpx; }

.replay-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 4rpx 0; }
.replay-title { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4; }
.replay-host-row { display: flex; align-items: center; gap: 8rpx; }
.replay-host-avatar { width: 28rpx; height: 28rpx; border-radius: 50%; background: #E8E3DB; flex-shrink: 0; }
.replay-host-name { font-size: 22rpx; color: #666; }
.replay-category { font-size: 18rpx; color: #999; padding: 2rpx 10rpx; background: #F5F5F5; border-radius: 6rpx; }
.replay-stats { display: flex; align-items: center; gap: 16rpx; }
.replay-stat { font-size: 20rpx; color: #999; display: flex; align-items: center; gap: 4rpx; }

/* 加载更多 */
.load-more-btn { text-align: center; padding: 24rpx; font-size: 24rpx; color: #666; }
.load-end { text-align: center; padding: 24rpx; font-size: 22rpx; color: #ccc; }

/* 排序面板 */
.sort-sheet { position: fixed; inset: 0; z-index: 50; }
.sort-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
.sort-panel { position: absolute; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 32rpx 32rpx 0 0; }
.sort-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 32rpx 24rpx; border-bottom: 1rpx solid #E8E3DB; }
.sort-panel-title { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.sort-panel-close { font-size: 28rpx; color: #999; padding: 8rpx; }
.sort-options { padding: 24rpx; display: flex; flex-direction: column; gap: 12rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); }
.sort-option { padding: 20rpx; border-radius: 16rpx; text-align: center; font-size: 26rpx; background: #F5F5F5; color: #666; }
.sort-option-active { background: rgba(196,30,58,0.1); color: #C41E3A; font-weight: 500; }
</style>
